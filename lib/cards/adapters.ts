import { randomUUID } from "crypto";
import type {
  SyncteraCardsAdapter,
  SyncteraCardControlsUpdateResult,
  SyncteraCardStatusUpdateResult,
  SyncteraIssueCardInput,
  SyncteraIssueCardResult,
  CardControls,
  CardStatus
} from "@/lib/cards/types";

function generateLast4() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export class SyncteraMockCardsAdapter implements SyncteraCardsAdapter {
  async issueCard(input: SyncteraIssueCardInput): Promise<SyncteraIssueCardResult> {
    const providerCardId = `syn_card_${randomUUID().slice(0, 8)}`;
    const last4 = generateLast4();

    return {
      provider: "synctera_mock",
      providerCardId,
      last4,
      network: "visa",
      status: "inactive",
      rawResponse: {
        adapter: "synctera_mock",
        action: "issue_card",
        createdAt: new Date().toISOString(),
        providerCardId,
        accountId: input.accountId,
        formFactor: input.formFactor,
        controls: input.controls,
        cardholderName: input.cardholderName,
        nickname: input.nickname,
        accountNumberLast4: input.accountNumberLast4,
        network: "visa"
      }
    };
  }

  async updateCardStatus(
    providerCardId: string,
    currentStatus: CardStatus,
    nextStatus: CardStatus
  ): Promise<SyncteraCardStatusUpdateResult> {
    return {
      provider: "synctera_mock",
      providerCardId,
      previousStatus: currentStatus,
      nextStatus,
      rawResponse: {
        adapter: "synctera_mock",
        action: "update_card_status",
        updatedAt: new Date().toISOString(),
        providerCardId,
        previousStatus: currentStatus,
        nextStatus
      }
    };
  }

  async updateControls(
    providerCardId: string,
    controls: CardControls
  ): Promise<SyncteraCardControlsUpdateResult> {
    return {
      provider: "synctera_mock",
      providerCardId,
      controls,
      rawResponse: {
        adapter: "synctera_mock",
        action: "update_controls",
        updatedAt: new Date().toISOString(),
        providerCardId,
        controls
      }
    };
  }
}
