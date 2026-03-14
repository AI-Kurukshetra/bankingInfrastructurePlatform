import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const CONSUMER_BUCKET = "identity-documents";
const BUSINESS_BUCKET = "business-documents";

type DocumentPayload = {
  onboardingApplicationId?: unknown;
  type?: unknown;
  fileName?: unknown;
  fileSizeBytes?: unknown;
  mimeType?: unknown;
  storagePath?: unknown;
};

export async function POST(request: Request) {
  let body: DocumentPayload;

  try {
    body = (await request.json()) as DocumentPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const onboardingApplicationId =
    typeof body.onboardingApplicationId === "string"
      ? body.onboardingApplicationId.trim()
      : "";

  const type = typeof body.type === "string" ? body.type.trim() : "";
  const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
  const storagePath = typeof body.storagePath === "string" ? body.storagePath.trim() : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType.trim() : null;
  const fileSizeBytes =
    typeof body.fileSizeBytes === "number" && Number.isFinite(body.fileSizeBytes)
      ? body.fileSizeBytes
      : null;

  if (!onboardingApplicationId || !type || !fileName || !storagePath) {
    return NextResponse.json(
      { error: "onboardingApplicationId, type, fileName, and storagePath are required." },
      { status: 400 }
    );
  }

  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: application, error: appError } = await supabase
      .from("onboarding_applications")
      .select("id, type")
      .eq("id", onboardingApplicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const storageBucket =
      application.type === "business" ? BUSINESS_BUCKET : CONSUMER_BUCKET;

    const requiredPrefix = `${user.id}/${onboardingApplicationId}/`;
    if (!storagePath.startsWith(requiredPrefix)) {
      return NextResponse.json(
        { error: "Invalid storage path prefix for current user/application." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("documents")
      .insert({
        onboarding_application_id: onboardingApplicationId,
        uploaded_by: user.id,
        type,
        storage_bucket: storageBucket,
        storage_path: storagePath,
        file_name: fileName,
        file_size_bytes: fileSizeBytes,
        mime_type: mimeType
      })
      .select(
        "id, onboarding_application_id, type, status, storage_bucket, storage_path, file_name, created_at"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ document: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to save document metadata."
      },
      { status: 500 }
    );
  }
}
