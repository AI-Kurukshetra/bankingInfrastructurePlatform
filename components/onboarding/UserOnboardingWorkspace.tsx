"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VerificationStatusCard } from "@/components/kyc/VerificationStatusCard";
import type { OnboardingStatus, OnboardingType } from "@/lib/onboarding/model";

type OnboardingDocument = {
  id: string;
  type: string;
  status: string;
  file_name: string;
  created_at: string;
};

type OnboardingApplication = {
  id: string;
  type: OnboardingType;
  status: OnboardingStatus;
  form_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  submitted_at?: string | null;
  documents?: OnboardingDocument[];
};

const CONSUMER_STEPS = ["Profile", "Contact", "Consent", "Identity", "Documents"];
const BUSINESS_STEPS = ["Business", "Tax", "Owners", "Documents"];

const DOCUMENT_OPTIONS = [
  "government_id",
  "passport",
  "drivers_license",
  "articles_of_incorporation",
  "ein_letter",
  "bank_statement",
  "proof_of_address",
  "other"
] as const;

function statusLabel(status: OnboardingStatus) {
  return status.replaceAll("_", " ");
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function buildRequiredFieldErrors(
  onboardingType: OnboardingType,
  formData: Record<string, unknown>,
  documentsCount: number
) {
  const errors: string[] = [];

  if (onboardingType === "consumer") {
    const required = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "dateOfBirth",
      "addressLine1",
      "city",
      "state",
      "postalCode",
      "country"
    ];

    for (const field of required) {
      if (!String(formData[field] ?? "").trim()) {
        errors.push(field);
      }
    }

    if (formData.consentAccepted !== true) {
      errors.push("consentAccepted");
    }
  } else {
    const required = ["legalBusinessName", "businessEmail", "businessPhone", "taxId"];
    for (const field of required) {
      if (!String(formData[field] ?? "").trim()) {
        errors.push(field);
      }
    }

    const owners = formData.owners;
    if (
      (Array.isArray(owners) && owners.length === 0) ||
      (!Array.isArray(owners) && !String(owners ?? "").trim())
    ) {
      errors.push("owners");
    }
  }

  if (documentsCount < 1) {
    errors.push("documents");
  }

  return errors;
}

export function UserOnboardingWorkspace() {
  const [tab, setTab] = useState<OnboardingType>("consumer");
  const [applications, setApplications] = useState<OnboardingApplication[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [documentType, setDocumentType] = useState<string>("government_id");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const selectedApplication = useMemo(
    () => applications.find((item) => item.id === selectedId) ?? null,
    [applications, selectedId]
  );

  const tabApplications = useMemo(
    () => applications.filter((item) => item.type === tab),
    [applications, tab]
  );

  const activeSteps = tab === "consumer" ? CONSUMER_STEPS : BUSINESS_STEPS;

  const loadApplications = useCallback(async () => {
    const response = await fetch("/api/onboarding/applications", { cache: "no-store" });
    const data = (await response.json()) as {
      error?: string;
      applications?: OnboardingApplication[];
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to load onboarding drafts.");
    }

    const nextApplications = data.applications ?? [];
    setApplications(nextApplications);

    if (selectedId) {
      const refreshed = nextApplications.find((item) => item.id === selectedId);
      if (refreshed) {
        setFormData((refreshed.form_data ?? {}) as Record<string, unknown>);
      } else {
        setSelectedId(null);
        setFormData({});
      }
    }
  }, [selectedId]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        await loadApplications();
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : "Unable to load applications.");
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [loadApplications]);

  useEffect(() => {
    setSelectedId(null);
    setFormData({});
    setValidationErrors([]);
    setMessage(null);
  }, [tab]);

  async function createDraft(onboardingType: OnboardingType) {
    setMessage(null);
    const response = await fetch("/api/onboarding/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: onboardingType })
    });

    const data = (await response.json()) as {
      error?: string;
      application?: OnboardingApplication;
    };

    if (!response.ok || !data.application) {
      throw new Error(data.error ?? "Unable to create onboarding draft.");
    }

    setApplications((previous) => [data.application as OnboardingApplication, ...previous]);
    setSelectedId(data.application.id);
    setFormData((data.application.form_data ?? {}) as Record<string, unknown>);
    setTab(onboardingType);
  }

  async function saveDraft() {
    if (!selectedApplication) {
      setMessage("Create or select a draft before saving.");
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const normalizedFormData = { ...formData };
      if (selectedApplication.type === "business") {
        const ownersValue = normalizedFormData.owners;
        if (typeof ownersValue === "string") {
          normalizedFormData.owners = ownersValue
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
        }
      }

      const response = await fetch(`/api/onboarding/applications/${selectedApplication.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ formData: normalizedFormData })
      });

      const data = (await response.json()) as {
        error?: string;
        application?: OnboardingApplication;
      };

      if (!response.ok || !data.application) {
        throw new Error(data.error ?? "Unable to save draft.");
      }

      setApplications((previous) =>
        previous.map((item) => (item.id === data.application?.id ? { ...item, ...data.application } : item))
      );
      setMessage("Draft saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save draft.");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitApplication() {
    if (!selectedApplication) {
      setMessage("Create or select an application before submission.");
      return;
    }

    const currentDocumentCount = selectedApplication.documents?.length ?? 0;
    const errors = buildRequiredFieldErrors(selectedApplication.type, formData, currentDocumentCount);
    setValidationErrors(errors);
    if (errors.length > 0) {
      setMessage("Resolve validation errors before submitting.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/onboarding/applications/${selectedApplication.id}/submit`,
        {
          method: "POST"
        }
      );

      const data = (await response.json()) as {
        error?: string;
        details?: string[];
      };

      if (!response.ok) {
        const details = Array.isArray(data.details) ? data.details.join(" ") : "";
        throw new Error(details || data.error || "Unable to submit onboarding application.");
      }

      await loadApplications();
      setMessage("Application submitted for review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit onboarding application.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function uploadDocument(file: File) {
    if (!selectedApplication) {
      setMessage("Create or select a draft before uploading documents.");
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const bucketName =
        selectedApplication.type === "business" ? "business-documents" : "identity-documents";
      const safeName = file.name.replaceAll(/\s+/g, "-").toLowerCase();
      const storagePath = `${crypto.randomUUID?.() ?? Date.now()}-${safeName}`;
      const objectPath = `${selectedApplication.id}/${storagePath}`;

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Unable to resolve signed-in user for upload.");
      }

      const storageObjectPath = `${user.id}/${objectPath}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storageObjectPath, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const metadataResponse = await fetch("/api/onboarding/documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          onboardingApplicationId: selectedApplication.id,
          type: documentType,
          fileName: file.name,
          fileSizeBytes: file.size,
          mimeType: file.type,
          storagePath: storageObjectPath
        })
      });

      const metadata = (await metadataResponse.json()) as { error?: string };
      if (!metadataResponse.ok) {
        throw new Error(metadata.error ?? "Unable to save document metadata.");
      }

      await loadApplications();
      setMessage("Document uploaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to upload document.");
    } finally {
      setIsUploading(false);
    }
  }

  function updateField(key: string, value: string | boolean) {
    setFormData((previous) => ({ ...previous, [key]: value }));
    setValidationErrors((previous) => previous.filter((item) => item !== key));
  }

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={(value) => setTab(value as OnboardingType)}>
        <TabsList>
          <TabsTrigger value="consumer">Consumer Onboarding</TabsTrigger>
          <TabsTrigger value="business">Business Onboarding</TabsTrigger>
        </TabsList>

        <TabsContent value="consumer" className="space-y-6 pt-4">
          <OnboardingPanel
            onboardingType="consumer"
            applications={tabApplications}
            activeSteps={activeSteps}
            selectedApplication={selectedApplication}
            formData={formData}
            isBootstrapping={isBootstrapping}
            isSaving={isSaving}
            isSubmitting={isSubmitting}
            isUploading={isUploading}
            message={message}
            validationErrors={validationErrors}
            documentType={documentType}
            onCreateDraft={createDraft}
            onSelectDraft={(application) => {
              setSelectedId(application.id);
              setFormData((application.form_data ?? {}) as Record<string, unknown>);
              setValidationErrors([]);
              setMessage(null);
            }}
            onSave={saveDraft}
            onSubmit={submitApplication}
            onChangeField={updateField}
            onChangeDocumentType={setDocumentType}
            onUploadDocument={uploadDocument}
          />
        </TabsContent>

        <TabsContent value="business" className="space-y-6 pt-4">
          <OnboardingPanel
            onboardingType="business"
            applications={tabApplications}
            activeSteps={activeSteps}
            selectedApplication={selectedApplication}
            formData={formData}
            isBootstrapping={isBootstrapping}
            isSaving={isSaving}
            isSubmitting={isSubmitting}
            isUploading={isUploading}
            message={message}
            validationErrors={validationErrors}
            documentType={documentType}
            onCreateDraft={createDraft}
            onSelectDraft={(application) => {
              setSelectedId(application.id);
              setFormData((application.form_data ?? {}) as Record<string, unknown>);
              setValidationErrors([]);
              setMessage(null);
            }}
            onSave={saveDraft}
            onSubmit={submitApplication}
            onChangeField={updateField}
            onChangeDocumentType={setDocumentType}
            onUploadDocument={uploadDocument}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type OnboardingPanelProps = {
  onboardingType: OnboardingType;
  applications: OnboardingApplication[];
  activeSteps: string[];
  selectedApplication: OnboardingApplication | null;
  formData: Record<string, unknown>;
  isBootstrapping: boolean;
  isSaving: boolean;
  isSubmitting: boolean;
  isUploading: boolean;
  message: string | null;
  validationErrors: string[];
  documentType: string;
  onCreateDraft: (type: OnboardingType) => Promise<void>;
  onSelectDraft: (application: OnboardingApplication) => void;
  onSave: () => Promise<void>;
  onSubmit: () => Promise<void>;
  onChangeField: (key: string, value: string | boolean) => void;
  onChangeDocumentType: (type: string) => void;
  onUploadDocument: (file: File) => Promise<void>;
};

function OnboardingPanel({
  onboardingType,
  applications,
  activeSteps,
  selectedApplication,
  formData,
  isBootstrapping,
  isSaving,
  isSubmitting,
  isUploading,
  message,
  validationErrors,
  documentType,
  onCreateDraft,
  onSelectDraft,
  onSave,
  onSubmit,
  onChangeField,
  onChangeDocumentType,
  onUploadDocument
}: OnboardingPanelProps) {
  const primaryFields =
    onboardingType === "consumer"
      ? [
          { key: "firstName", label: "First name", type: "text" },
          { key: "lastName", label: "Last name", type: "text" },
          { key: "email", label: "Email", type: "email" },
          { key: "phone", label: "Phone", type: "tel" },
          { key: "dateOfBirth", label: "Date of birth", type: "date" },
          { key: "addressLine1", label: "Address", type: "text" },
          { key: "city", label: "City", type: "text" },
          { key: "state", label: "State", type: "text" },
          { key: "postalCode", label: "Postal code", type: "text" },
          { key: "country", label: "Country", type: "text" },
          { key: "identityNumberLast4", label: "ID number (last 4)", type: "text" }
        ]
      : [
          { key: "legalBusinessName", label: "Legal business name", type: "text" },
          { key: "dbaName", label: "DBA name", type: "text" },
          { key: "businessEmail", label: "Business email", type: "email" },
          { key: "businessPhone", label: "Business phone", type: "tel" },
          { key: "taxId", label: "Tax ID / EIN", type: "text" },
          { key: "incorporationState", label: "State of incorporation", type: "text" },
          { key: "website", label: "Website", type: "url" },
          { key: "owners", label: "Beneficial owners (comma separated)", type: "text" }
        ];

  return (
    <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
      <Card className="border border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>{onboardingType === "consumer" ? "Consumer Drafts" : "Business Drafts"}</CardTitle>
          <CardDescription>
            Resume any saved draft and continue from the current phase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => void onCreateDraft(onboardingType)}
            className="w-full"
          >
            Start New Draft
          </Button>
          {isBootstrapping ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading drafts...
            </div>
          ) : applications.length === 0 ? (
            <p className="text-sm text-slate-500">No drafts yet.</p>
          ) : (
            <div className="space-y-2">
              {applications.map((application) => (
                <button
                  key={application.id}
                  type="button"
                  onClick={() => onSelectDraft(application)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                    selectedApplication?.id === application.id
                      ? "border-blue-400 bg-blue-50 text-blue-900"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <p className="font-medium">{statusLabel(application.status)}</p>
                  <p className="text-xs text-slate-500">Updated {formatDate(application.updated_at)}</p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Wizard Progress</CardTitle>
            <CardDescription>
              {activeSteps.join(" -> ")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedApplication ? (
              <p className="text-sm text-slate-500">Select a draft to begin editing.</p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {primaryFields.map((field) => (
                    <label key={field.key} className="space-y-1 text-sm">
                      <span className="text-slate-600">{field.label}</span>
                      <input
                        type={field.type}
                        value={
                          field.key === "owners"
                            ? Array.isArray(formData.owners)
                              ? (formData.owners as string[]).join(", ")
                              : String(formData.owners ?? "")
                            : String(formData[field.key] ?? "")
                        }
                        onChange={(event) => {
                          if (field.key === "owners") {
                            onChangeField(
                              "owners",
                              event.target.value
                            );
                          } else {
                            onChangeField(field.key, event.target.value);
                          }
                        }}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  ))}
                </div>

                {onboardingType === "consumer" ? (
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.consentAccepted)}
                      onChange={(event) => onChangeField("consentAccepted", event.target.checked)}
                    />
                    I certify that all submitted information is accurate.
                  </label>
                ) : null}

                <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-medium">Document Upload</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={documentType}
                      onChange={(event) => onChangeDocumentType(event.target.value)}
                    >
                      {DOCUMENT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>

                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                      <FileUp className="h-4 w-4" />
                      Upload file
                      <input
                        type="file"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void onUploadDocument(file);
                          }
                          event.currentTarget.value = "";
                        }}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                  {selectedApplication.documents && selectedApplication.documents.length > 0 ? (
                    <ul className="space-y-1 text-sm text-slate-700">
                      {selectedApplication.documents.map((document) => (
                        <li key={document.id}>
                          {document.file_name} ({document.type}) - {statusLabel(document.status as OnboardingStatus)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">No documents uploaded yet.</p>
                  )}
                </div>

                {validationErrors.length > 0 ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                    Missing or invalid fields: {validationErrors.join(", ")}
                  </div>
                ) : null}

                {message ? (
                  <p className="text-sm text-slate-600">{message}</p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => void onSave()}
                    disabled={isSaving || isSubmitting}
                    variant="secondary"
                  >
                    {isSaving ? "Saving..." : "Save Draft"}
                  </Button>
                  <Button
                    onClick={() => void onSubmit()}
                    disabled={isSaving || isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Application"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {selectedApplication ? (
          <VerificationStatusCard
            applicationId={selectedApplication.id}
            applicationStatus={selectedApplication.status}
          />
        ) : null}

        <Card className="border border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Status Timeline</CardTitle>
            <CardDescription>Track onboarding lifecycle from draft to approval.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            {!selectedApplication ? (
              <p className="text-slate-500">No draft selected.</p>
            ) : (
              <>
                <p>Draft created: {formatDate(selectedApplication.created_at)}</p>
                <p>Last updated: {formatDate(selectedApplication.updated_at)}</p>
                <p>Submitted: {formatDate(selectedApplication.submitted_at)}</p>
                <p className="font-medium">Current status: {statusLabel(selectedApplication.status)}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}






