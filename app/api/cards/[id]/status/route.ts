import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { updateCardStatus } from "@/lib/cards/service";

type Params = {
  params: {
    id: string;
  };
};

type StatusPayload = {
  action?: "activate" | "freeze" | "unfreeze" | "terminate";
};

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: StatusPayload;
  try {
    body = (await request.json()) as StatusPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.action || !["activate", "freeze", "unfreeze", "terminate"].includes(body.action)) {
    return NextResponse.json({ error: "A valid action is required." }, { status: 400 });
  }

  try {
    const card = await updateCardStatus({
      cardId: params.id,
      action: body.action,
      actorUserId: auth.profile.id,
      actorRole: auth.profile.role
    });

    return NextResponse.json({ card });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update card status." },
      { status: 500 }
    );
  }
}
