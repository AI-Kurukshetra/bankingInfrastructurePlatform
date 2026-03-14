export type AccountStatus = "active" | "frozen" | "closed";

export type AccountProvisioningStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type SyncteraCreateAccountInput = {
  onboardingApplicationId: string;
  ownerUserId: string;
  organizationId: string | null;
  accountName: string;
  currency: string;
};

export type SyncteraCreateAccountResult = {
  provider: string;
  syncteraAccountId: string;
  accountNumber: string;
  status: AccountStatus;
  availableBalance: number;
  rawResponse: Record<string, unknown>;
};

export type SyncteraAccountDetailsResult = {
  provider: string;
  syncteraAccountId: string;
  status: AccountStatus;
  availableBalance: number;
  currency: string;
  rawResponse: Record<string, unknown>;
};

export type SyncteraStatusUpdateResult = {
  provider: string;
  syncteraAccountId: string;
  previousStatus: AccountStatus;
  nextStatus: AccountStatus;
  rawResponse: Record<string, unknown>;
};

export interface SyncteraAccountsAdapter {
  createAccount(input: SyncteraCreateAccountInput): Promise<SyncteraCreateAccountResult>;
  getAccountDetails(syncteraAccountId: string): Promise<SyncteraAccountDetailsResult>;
  updateAccountStatus(
    syncteraAccountId: string,
    currentStatus: AccountStatus,
    nextStatus: AccountStatus
  ): Promise<SyncteraStatusUpdateResult>;
}

