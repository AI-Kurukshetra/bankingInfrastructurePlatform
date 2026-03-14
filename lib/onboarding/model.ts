export const ONBOARDING_TYPES = ["consumer", "business"] as const;
export const ONBOARDING_STATUSES = [
  "draft",
  "submitted",
  "in_review",
  "approved",
  "rejected",
  "more_info_needed"
] as const;

export type OnboardingType = (typeof ONBOARDING_TYPES)[number];
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

export type ConsumerFormData = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  consentAccepted?: boolean;
  identityNumberLast4?: string;
  identityDocumentType?: string;
};

export type BusinessOwner = {
  name: string;
  title?: string;
  ownershipPercent: number;
};

export type BusinessFormData = {
  legalBusinessName?: string;
  dbaName?: string;
  businessEmail?: string;
  businessPhone?: string;
  taxId?: string;
  incorporationState?: string;
  website?: string;
  owners?: BusinessOwner[];
};

export function isOnboardingType(value: unknown): value is OnboardingType {
  return typeof value === "string" && ONBOARDING_TYPES.includes(value as OnboardingType);
}

export function isOnboardingStatus(value: unknown): value is OnboardingStatus {
  return typeof value === "string" && ONBOARDING_STATUSES.includes(value as OnboardingStatus);
}

export function sanitizeFormData(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  return input as Record<string, unknown>;
}

export function validateOnSubmit(
  type: OnboardingType,
  formData: Record<string, unknown>,
  documentCount: number
) {
  const errors: string[] = [];

  if (type === "consumer") {
    const requiredFields = [
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

    for (const field of requiredFields) {
      if (typeof formData[field] !== "string" || !String(formData[field]).trim()) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    if (formData.consentAccepted !== true) {
      errors.push("Consent must be accepted before submission.");
    }
  }

  if (type === "business") {
    const requiredFields = ["legalBusinessName", "businessEmail", "businessPhone", "taxId"];

    for (const field of requiredFields) {
      if (typeof formData[field] !== "string" || !String(formData[field]).trim()) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    const owners = formData.owners;
    if (!Array.isArray(owners) || owners.length === 0) {
      errors.push("At least one beneficial owner is required.");
    }
  }

  if (documentCount < 1) {
    errors.push("At least one supporting document must be uploaded.");
  }

  return errors;
}
