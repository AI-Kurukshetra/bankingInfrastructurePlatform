import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { updateCardControls } from "@/lib/cards/service";

type Params = {
  params: {
    id: string;
  };
};

type ControlsPayload = {
  spendingLimitCents?: number | null;
  allowedMccs?: string[];
  blockedMccs?: string[];
  ecommerceEnabled?: boolean;
  atmEnabled?: boolean;
};

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: ControlsPayload;
  try {
    body = (await request.json()) as ControlsPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const card = await updateCardControls({
      cardId: params.id,
      controls: {
        spendingLimitCents: body.spendingLimitCents,
        allowedMccs: body.allowedMccs,
        blockedMccs: body.blockedMccs,
        ecommerceEnabled: body.ecommerceEnabled,
        atmEnabled: body.atmEnabled
      },
      actorUserId: auth.profile.id,
      actorRole: auth.profile.role
    });

    return NextResponse.json({ card });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update card controls." },
      { status: 500 }
    );
  }
}
