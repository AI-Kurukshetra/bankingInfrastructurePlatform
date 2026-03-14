import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sanitizeFormData } from "@/lib/onboarding/model";

type Params = {
  params: {
    id: string;
  };
};

type UpdateApplicationPayload = {
  formData?: unknown;
};

export async function GET(_: Request, { params }: Params) {
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
        "id, type, status, form_data, created_at, updated_at, submitted_at, review_notes, documents(id, type, status, file_name, mime_type, file_size_bytes, created_at)"
      )
      .eq("id", params.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ application: data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch onboarding application."
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  let body: UpdateApplicationPayload;

  try {
    body = (await request.json()) as UpdateApplicationPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const formDataPatch = sanitizeFormData(body.formData);

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
      .select("id, status, form_data")
      .eq("id", params.id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (!["draft", "more_info_needed", "submitted"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Application cannot be edited in the current state." },
        { status: 409 }
      );
    }

    const mergedFormData = {
      ...(existing.form_data ?? {}),
      ...formDataPatch
    };

    const { data, error } = await supabase
      .from("onboarding_applications")
      .update({ form_data: mergedFormData, status: "draft" })
      .eq("id", params.id)
      .select("id, type, status, form_data, updated_at")
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
            : "Unable to save onboarding draft."
      },
      { status: 500 }
    );
  }
}
