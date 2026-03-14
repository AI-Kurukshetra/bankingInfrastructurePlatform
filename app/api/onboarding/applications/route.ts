import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOnboardingType } from "@/lib/onboarding/model";

type CreateApplicationPayload = {
  type?: unknown;
  organizationId?: unknown;
};

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("onboarding_applications")
      .select(
        "id, type, status, form_data, created_at, updated_at, submitted_at, documents(id, type, status, file_name, created_at)"
      )
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ applications: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch onboarding applications."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let body: CreateApplicationPayload;

  try {
    body = (await request.json()) as CreateApplicationPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isOnboardingType(body.type)) {
    return NextResponse.json(
      { error: "A valid onboarding type is required." },
      { status: 400 }
    );
  }

  const organizationId =
    typeof body.organizationId === "string" && body.organizationId.trim()
      ? body.organizationId.trim()
      : null;

  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("onboarding_applications")
      .insert({
        applicant_user_id: user.id,
        organization_id: organizationId,
        type: body.type,
        status: "draft",
        form_data: {}
      })
      .select("id, type, status, form_data, created_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ application: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create onboarding draft."
      },
      { status: 500 }
    );
  }
}
