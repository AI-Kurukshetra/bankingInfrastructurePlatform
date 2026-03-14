import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { updateAccountStatus } from "@/lib/accounts/service";

type Params = {
  params: {
    id: string;
  };
};

type StatusPayload = {
  action?: "freeze" | "unfreeze" | "close";
};

export async function POST(request: Request, { params }: Params) {
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return auth.response;

  let body: StatusPayload;
  try {
    body = (await request.json()) as StatusPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.action || !["freeze", "unfreeze", "close"].includes(body.action)) {
    return NextResponse.json({ error: "A valid action is required." }, { status: 400 });
  }

  try {
    const account = await updateAccountStatus({
      accountId: params.id,
      action: body.action,
      actorUserId: auth.profile.id
    });

    return NextResponse.json({ account });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update account status."
      },
      { status: 500 }
    );
  }
}

