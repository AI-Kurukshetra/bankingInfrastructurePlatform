import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SyncteraMockAdapter } from "@/lib/kyc/adapters";
import type {
  ProviderVerificationInput,
  ProviderVerificationResult,
  VerificationStatus
} from "@/lib/kyc/types";

type ApplicationRecord = {
  id: string;
  applicant_user_id: string;
  type: "consumer" | "business";
  status: string;
  form_data: Record<string, unknown>;
  documents: Array<{
    id: string;
    type: string;
    file_name: string;
    storage_bucket: string;
    storage_path: string;
  }>;
};

const adapter = new SyncteraMockAdapter();

function mapAppStatus(status: VerificationStatus) {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "manual_review") return "in_review";
  if (status === "failed") return "more_info_needed";
  return "in_review";
}

export async function getApplicationForVerification(applicationId: string) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("onboarding_applications")
    .select(
      "id, applicant_user_id, type, status, form_data, documents(id, type, file_name, storage_bucket, storage_path)"
    )
    .eq("id", applicationId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Onboarding application not found.");
  }

  return data as unknown as ApplicationRecord;
}

export async function getLatestVerificationCheck(applicationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("verification_checks")
    .select("*")
    .eq("onboarding_application_id", applicationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function startVerificationCheck(params: {
  applicationId: string;
  actorUserId: string;
  idempotencyKey: string;
}) {
  const { applicationId, actorUserId, idempotencyKey } = params;
  const supabase = createSupabaseAdminClient();

  const application = await getApplicationForVerification(applicationId);

  const { data: existingAttempt } = await supabase
    .from("verification_checks")
    .select("*")
    .eq("onboarding_application_id", applicationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingAttempt) {
    return { check: existingAttempt, replayed: true };
  }

  const { count } = await supabase
    .from("verification_checks")
    .select("id", { count: "exact", head: true })
    .eq("onboarding_application_id", applicationId);

  const attemptNumber = (count ?? 0) + 1;

  const input: ProviderVerificationInput = {
    applicationId,
    onboardingType: application.type,
    formData: application.form_data ?? {},
    documents: application.documents ?? [],
    attemptNumber
  };

  const requestPayload: Record<string, unknown> = {
    applicationId,
    attemptNumber,
    onboardingType: application.type,
    documentCount: input.documents.length
  };

  const { data: pendingCheck, error: pendingError } = await supabase
    .from("verification_checks")
    .insert({
      onboarding_application_id: applicationId,
      idempotency_key: idempotencyKey,
      provider: "synctera_mock",
      attempt_number: attemptNumber,
      status: "processing",
      requested_by: actorUserId,
      provider_request: requestPayload
    })
    .select("*")
    .single();

  if (pendingError || !pendingCheck) {
    throw new Error(pendingError?.message ?? "Unable to create verification attempt.");
  }

  let providerResult: ProviderVerificationResult;

  try {
    providerResult = await adapter.verify(input);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Verification provider failed.";

    await supabase
      .from("verification_checks")
      .update({
        status: "failed",
        error_message: errorMessage
      })
      .eq("id", pendingCheck.id);

    await supabase
      .from("onboarding_applications")
      .update({
        status: "more_info_needed",
        review_notes: "Verification provider failed. Please retry submission."
      })
      .eq("id", applicationId);

    throw new Error(errorMessage);
  }

  const verificationStatus = providerResult.status;
  const mappedOnboardingStatus = mapAppStatus(verificationStatus);

  const { data: updatedCheck, error: updatedError } = await supabase
    .from("verification_checks")
    .update({
      provider: providerResult.provider,
      status: verificationStatus,
      decision_reason: providerResult.decisionReason,
      sanctions_checks: providerResult.sanctionsChecks,
      evidence_references: providerResult.evidenceReferences,
      provider_response: providerResult.rawResponse
    })
    .eq("id", pendingCheck.id)
    .select("*")
    .single();

  if (updatedError || !updatedCheck) {
    throw new Error(updatedError?.message ?? "Unable to persist verification result.");
  }

  const nextReviewNotes =
    verificationStatus === "manual_review"
      ? providerResult.decisionReason
      : verificationStatus === "rejected"
        ? providerResult.decisionReason
        : null;

  await supabase
    .from("onboarding_applications")
    .update({
      status: mappedOnboardingStatus,
      synctera_person_id: providerResult.providerPersonId ?? null,
      synctera_business_id: providerResult.providerBusinessId ?? null,
      synctera_kyc_result: providerResult.rawResponse,
      review_notes: nextReviewNotes
    })
    .eq("id", applicationId);

  return { check: updatedCheck, replayed: false };
}

export async function resubmitForVerification(params: {
  applicationId: string;
  actorUserId: string;
  idempotencyKey: string;
}) {
  const supabase = createSupabaseAdminClient();
  const application = await getApplicationForVerification(params.applicationId);

  if (!["rejected", "more_info_needed", "in_review", "submitted"].includes(application.status)) {
    throw new Error("Application is not eligible for verification resubmission.");
  }

  await supabase
    .from("onboarding_applications")
    .update({
      status: "submitted",
      reviewed_by: null,
      reviewed_at: null,
      review_notes: null
    })
    .eq("id", params.applicationId);

  return startVerificationCheck(params);
}

export async function getReviewQueue() {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("onboarding_applications")
    .select(
      "id, type, status, applicant_user_id, submitted_at, updated_at, review_notes, verification_checks(id, status, decision_reason, created_at, attempt_number)"
    )
    .in("status", ["in_review", "rejected", "more_info_needed"])
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function reviewVerificationDecision(params: {
  applicationId: string;
  actorUserId: string;
  decision: "approved" | "rejected" | "more_info_needed";
  notes?: string | null;
}) {
  const supabase = createSupabaseAdminClient();

  const { data: latestCheck, error: checkError } = await supabase
    .from("verification_checks")
    .select("id, status")
    .eq("onboarding_application_id", params.applicationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (checkError || !latestCheck) {
    throw new Error(checkError?.message ?? "No verification attempt found for application.");
  }

  const nextCheckStatus: VerificationStatus =
    params.decision === "approved"
      ? "approved"
      : params.decision === "rejected"
        ? "rejected"
        : "manual_review";

  await supabase
    .from("verification_checks")
    .update({
      status: nextCheckStatus,
      reviewed_by: params.actorUserId,
      review_notes: params.notes ?? null,
      decision_reason: params.notes ?? null
    })
    .eq("id", latestCheck.id);

  const { data: updated, error: appError } = await supabase
    .from("onboarding_applications")
    .update({
      status: params.decision,
      reviewed_by: params.actorUserId,
      reviewed_at: new Date().toISOString(),
      review_notes: params.notes ?? null
    })
    .eq("id", params.applicationId)
    .select("id, status, reviewed_by, reviewed_at, review_notes")
    .single();

  if (appError || !updated) {
    throw new Error(appError?.message ?? "Unable to update onboarding review state.");
  }

  return updated;
}
