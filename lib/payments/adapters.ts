import { randomUUID } from "crypto";
import type {
  SyncteraCreateAchTransferInput,
  SyncteraCreateInternalTransferInput,
  SyncteraCreateTransferResult,
  SyncteraPaymentsAdapter
} from "@/lib/payments/types";

export class SyncteraMockPaymentsAdapter implements SyncteraPaymentsAdapter {
  async createAchTransfer(
    input: SyncteraCreateAchTransferInput
  ): Promise<SyncteraCreateTransferResult> {
    const providerTransferId = `syn_ach_${randomUUID().slice(0, 8)}`;

    return {
      provider: "synctera_mock",
      providerTransferId,
      status: "pending",
      rawResponse: {
        adapter: "synctera_mock",
        action: "create_ach_transfer",
        createdAt: new Date().toISOString(),
        providerTransferId,
        sourceAccountId: input.sourceAccountId,
        amount: input.amount,
        currency: input.currency,
        memo: input.memo,
        counterpartyName: input.counterpartyName,
        routingNumber: input.routingNumber,
        accountMask: input.accountMask
      }
    };
  }

  async createInternalTransfer(
    input: SyncteraCreateInternalTransferInput
  ): Promise<SyncteraCreateTransferResult> {
    const providerTransferId = `syn_int_${randomUUID().slice(0, 8)}`;

    return {
      provider: "synctera_mock",
      providerTransferId,
      status: "processing",
      rawResponse: {
        adapter: "synctera_mock",
        action: "create_internal_transfer",
        createdAt: new Date().toISOString(),
        providerTransferId,
        sourceAccountId: input.sourceAccountId,
        destinationAccountId: input.destinationAccountId,
        amount: input.amount,
        currency: input.currency,
        memo: input.memo
      }
    };
  }
}
