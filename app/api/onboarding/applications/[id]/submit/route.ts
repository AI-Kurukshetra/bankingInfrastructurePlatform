import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isOnboardingType, validateOnSubmit } from "@/lib/onboarding/model";

type Params = {
  params: {
    id: string;
  };
};

export async function POST(_: Request, { params }: Params) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: existing, error: existingError } = await supabase
      .from("onboarding_applications")
      .select("id, type, status, form_data, documents(id)")
      .eq("id", params.id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (!["draft", "more_info_needed"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Only draft applications can be submitted." },
        { status: 409 }
      );
    }

    if (!isOnboardingType(existing.type)) {
      return NextResponse.json(
        { error: "Invalid onboarding application type." },
        { status: 400 }
      );
    }

    const errors = validateOnSubmit(
      existing.type,
      (existing.form_data ?? {}) as Record<string, unknown>,
      Array.isArray(existing.documents) ? existing.documents.length : 0
    );

    if (errors.length > 0) {
      return NextResponse.json({ error: "Validation failed.", details: errors }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("onboarding_applications")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString()
      })
      .eq("id", params.id)
      .select("id, status, submitted_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ application: data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to submit onboarding application."
      },
      { status: 500 }
    );
  }
}
