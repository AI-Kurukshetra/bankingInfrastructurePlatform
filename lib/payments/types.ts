export type TransferRail = "ach" | "internal";

export type TransferStatus =
  | "pending"
  | "processing"
  | "settled"
  | "returned"
  | "failed";

export type SyncteraCreateAchTransferInput = {
  sourceAccountId: string;
  amount: number;
  currency: string;
  memo: string | null;
  counterpartyName: string;
  routingNumber: string;
  accountMask: string;
};

export type SyncteraCreateInternalTransferInput = {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  currency: string;
  memo: string | null;
};

export type SyncteraCreateTransferResult = {
  provider: string;
  providerTransferId: string;
  status: TransferStatus;
  rawResponse: Record<string, unknown>;
};

export interface SyncteraPaymentsAdapter {
  createAchTransfer(
    input: SyncteraCreateAchTransferInput
  ): Promise<SyncteraCreateTransferResult>;
  createInternalTransfer(
    input: SyncteraCreateInternalTransferInput
  ): Promise<SyncteraCreateTransferResult>;
}
