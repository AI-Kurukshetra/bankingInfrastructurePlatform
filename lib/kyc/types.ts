export type VerificationStatus =
  | "pending"
  | "processing"
  | "approved"
  | "rejected"
  | "manual_review"
  | "failed";

export type ScreeningResult = {
  provider: "ofac" | "pep" | "watchlist";
  status: "clear" | "hit";
  matchScore: number;
  details: string;
};

export type ProviderVerificationInput = {
  applicationId: string;
  onboardingType: "consumer" | "business";
  formData: Record<string, unknown>;
  documents: Array<{
    id: string;
    type: string;
    file_name: string;
    storage_bucket: string;
    storage_path: string;
  }>;
  attemptNumber: number;
};

export type ProviderVerificationResult = {
  provider: string;
  status: VerificationStatus;
  decisionReason: string;
  providerPersonId?: string;
  providerBusinessId?: string;
  sanctionsChecks: ScreeningResult[];
  evidenceReferences: string[];
  rawResponse: Record<string, unknown>;
};

export interface KycKybAdapter {
  verify(input: ProviderVerificationInput): Promise<ProviderVerificationResult>;
}
