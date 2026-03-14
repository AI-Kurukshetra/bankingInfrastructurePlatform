export type CardStatus = "inactive" | "active" | "frozen" | "terminated";
export type CardFormFactor = "virtual" | "physical";

export type CardIssuanceStatus = "pending" | "processing" | "completed" | "failed";

export type CardControls = {
  spendingLimitCents?: number | null;
  allowedMccs?: string[];
  blockedMccs?: string[];
  ecommerceEnabled?: boolean;
  atmEnabled?: boolean;
};

export type SyncteraIssueCardInput = {
  accountId: string;
  accountNumberLast4: string;
  cardholderName: string;
  nickname: string | null;
  formFactor: CardFormFactor;
  controls: CardControls;
};

export type SyncteraIssueCardResult = {
  provider: string;
  providerCardId: string;
  last4: string;
  network: string;
  status: CardStatus;
  rawResponse: Record<string, unknown>;
};

export type SyncteraCardControlsUpdateResult = {
  provider: string;
  providerCardId: string;
  controls: CardControls;
  rawResponse: Record<string, unknown>;
};

export type SyncteraCardStatusUpdateResult = {
  provider: string;
  providerCardId: string;
  previousStatus: CardStatus;
  nextStatus: CardStatus;
  rawResponse: Record<string, unknown>;
};

export interface SyncteraCardsAdapter {
  issueCard(input: SyncteraIssueCardInput): Promise<SyncteraIssueCardResult>;
  updateCardStatus(
    providerCardId: string,
    currentStatus: CardStatus,
    nextStatus: CardStatus
  ): Promise<SyncteraCardStatusUpdateResult>;
  updateControls(
    providerCardId: string,
    controls: CardControls
  ): Promise<SyncteraCardControlsUpdateResult>;
}
