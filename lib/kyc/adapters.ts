import type {
  KycKybAdapter,
  ProviderVerificationInput,
  ProviderVerificationResult,
  ScreeningResult
} from "@/lib/kyc/types";

function screeningForField(fieldValue: string) {
  const lowered = fieldValue.toLowerCase();
  if (lowered.includes("sanction") || lowered.includes("watch") || lowered.includes("blocked")) {
    return { status: "hit", matchScore: 0.91, details: "Potential sanctions/watchlist match." } as const;
  }

  if (lowered.includes("pep") || lowered.includes("politically")) {
    return { status: "hit", matchScore: 0.84, details: "Potential politically exposed person indicator." } as const;
  }

  return { status: "clear", matchScore: 0.08, details: "No strong match signal." } as const;
}

function runScreenings(formData: Record<string, unknown>): ScreeningResult[] {
  const sample = Object.values(formData)
    .filter((value) => typeof value === "string")
    .slice(0, 4)
    .join(" ");

  const screening = screeningForField(sample);

  return [
    { provider: "ofac", ...screening },
    { provider: "pep", ...screening },
    { provider: "watchlist", ...screening }
  ];
}

export class SyncteraMockAdapter implements KycKybAdapter {
  async verify(input: ProviderVerificationInput): Promise<ProviderVerificationResult> {
    const textBlob = JSON.stringify(input.formData).toLowerCase();
    const screenings = runScreenings(input.formData);
    const hasHit = screenings.some((item) => item.status === "hit");

    let status: ProviderVerificationResult["status"] = "approved";
    let decisionReason = "Verification checks completed with no blocking signals.";

    if (textBlob.includes("review") || hasHit) {
      status = "manual_review";
      decisionReason = "Potential compliance signal detected, manual analyst review required.";
    }

    if (textBlob.includes("reject") || textBlob.includes("fraud")) {
      status = "rejected";
      decisionReason = "Risk markers exceeded onboarding threshold.";
    }

    return {
      provider: "synctera_mock",
      status,
      decisionReason,
      providerPersonId:
        input.onboardingType === "consumer"
          ? `syn_person_${input.applicationId.slice(0, 8)}`
          : undefined,
      providerBusinessId:
        input.onboardingType === "business"
          ? `syn_business_${input.applicationId.slice(0, 8)}`
          : undefined,
      sanctionsChecks: screenings,
      evidenceReferences: input.documents.map(
        (document) => `${document.storage_bucket}/${document.storage_path}`
      ),
      rawResponse: {
        adapter: "synctera_mock",
        applicationId: input.applicationId,
        attemptNumber: input.attemptNumber,
        evaluatedAt: new Date().toISOString(),
        status,
        decisionReason,
        documentCount: input.documents.length,
        screenings
      }
    };
  }
}
