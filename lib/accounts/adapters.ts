import type {
  AccountStatus,
  SyncteraAccountsAdapter,
  SyncteraAccountDetailsResult,
  SyncteraCreateAccountInput,
  SyncteraCreateAccountResult,
  SyncteraStatusUpdateResult
} from "@/lib/accounts/types";

function randomAccountNumber() {
  const suffix = Math.floor(100000000 + Math.random() * 900000000);
  return `2${suffix}`;
}

export class SyncteraMockAccountsAdapter implements SyncteraAccountsAdapter {
  async createAccount(input: SyncteraCreateAccountInput): Promise<SyncteraCreateAccountResult> {
    const syncteraAccountId = `syn_acct_${input.onboardingApplicationId.slice(0, 10)}`;

    return {
      provider: "synctera_mock",
      syncteraAccountId,
      accountNumber: randomAccountNumber(),
      status: "active",
      availableBalance: 0,
      rawResponse: {
        adapter: "synctera_mock",
        action: "create_account",
        createdAt: new Date().toISOString(),
        onboardingApplicationId: input.onboardingApplicationId,
        ownerUserId: input.ownerUserId,
        organizationId: input.organizationId,
        accountName: input.accountName,
        currency: input.currency,
        syncteraAccountId
      }
    };
  }

  async getAccountDetails(syncteraAccountId: string): Promise<SyncteraAccountDetailsResult> {
    return {
      provider: "synctera_mock",
      syncteraAccountId,
      status: "active",
      availableBalance: 0,
      currency: "USD",
      rawResponse: {
        adapter: "synctera_mock",
        action: "get_account",
        fetchedAt: new Date().toISOString(),
        syncteraAccountId
      }
    };
  }

  async updateAccountStatus(
    syncteraAccountId: string,
    currentStatus: AccountStatus,
    nextStatus: AccountStatus
  ): Promise<SyncteraStatusUpdateResult> {
    return {
      provider: "synctera_mock",
      syncteraAccountId,
      previousStatus: currentStatus,
      nextStatus,
      rawResponse: {
        adapter: "synctera_mock",
        action: "update_status",
        updatedAt: new Date().toISOString(),
        syncteraAccountId,
        previousStatus: currentStatus,
        nextStatus
      }
    };
  }
}

