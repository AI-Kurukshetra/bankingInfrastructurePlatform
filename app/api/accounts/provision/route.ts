import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { provisionAccountFromApprovedApplication } from "@/lib/accounts/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ProvisionPayload = {
  onboardingApplicationId?: string;
};

function fallbackIdempotencyKey(applicationId: string) {
  return `acct:${applicationId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 9)}`;
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: ProvisionPayload;
  try {
    body = (await request.json()) as ProvisionPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const onboardingApplicationId = body.onboardingApplicationId?.trim();
  if (!onboardingApplicationId) {
    return NextResponse.json(
      { error: "onboardingApplicationId is required." },
      { status: 400 }
    );
  }

  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const { data: application, error: appError } = await supabaseAdmin
      .from("onboarding_applications")
      .select("id, applicant_user_id")
      .eq("id", onboardingApplicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: appError?.message ?? "Application not found." }, { status: 404 });
    }

    const isOwner = application.applicant_user_id === auth.profile.id;
    const isStaff = ["admin", "analyst"].includes(auth.profile.role);

    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const rawIdempotencyKey = request.headers.get("x-idempotency-key")?.trim();
    const idempotencyKey =
      rawIdempotencyKey && rawIdempotencyKey.length > 5
        ? rawIdempotencyKey
        : fallbackIdempotencyKey(onboardingApplicationId);

    const result = await provisionAccountFromApprovedApplication({
      onboardingApplicationId,
      actorUserId: auth.profile.id,
      idempotencyKey
    });

    return NextResponse.json({
      account: result.account,
      replayed: result.replayed,
      idempotencyKey
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to provision account from application."
      },
      { status: 500 }
    );
  }
}

