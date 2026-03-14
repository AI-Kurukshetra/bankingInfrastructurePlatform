import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/rbac";
import { syncAccountFromProvider } from "@/lib/accounts/service";

type Params = {
  params: {
    id: string;
  };
};

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireRole(["admin", "analyst"]);
  if (!auth.ok) return auth.response;

  try {
    const account = await syncAccountFromProvider({
      accountId: params.id,
      actorUserId: auth.profile.id
    });

    return NextResponse.json({ account });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to sync account from provider."
      },
      { status: 500 }
    );
  }
}

