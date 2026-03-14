-- Phase 2 onboarding updates: allow applicant draft edits and
-- provision secure storage buckets for onboarding document uploads.

-- Replace restrictive onboarding update policy with role-specific policies.
drop policy if exists onboarding_update on public.onboarding_applications;

drop policy if exists onboarding_update_staff on public.onboarding_applications;
create policy onboarding_update_staff on public.onboarding_applications
  for update
  using (public.current_user_role() in ('admin', 'analyst'))
  with check (public.current_user_role() in ('admin', 'analyst'));

drop policy if exists onboarding_update_applicant on public.onboarding_applications;
create policy onboarding_update_applicant on public.onboarding_applications
  for update
  using (applicant_user_id = auth.uid())
  with check (
    applicant_user_id = auth.uid()
    and status in ('draft', 'submitted', 'more_info_needed')
    and reviewed_by is null
    and reviewed_at is null
  );

-- Provision private buckets for onboarding uploads.
insert into storage.buckets (id, name, public)
values
  ('identity-documents', 'identity-documents', false),
  ('business-documents', 'business-documents', false)
on conflict (id) do nothing;

-- Drop old policies if they exist to keep migration rerunnable.
drop policy if exists "onboarding_docs_insert" on storage.objects;
drop policy if exists "onboarding_docs_select" on storage.objects;
drop policy if exists "onboarding_docs_update" on storage.objects;
drop policy if exists "onboarding_docs_delete" on storage.objects;

-- Authenticated users can upload only under their own prefix:
-- /<user_id>/<application_id>/<filename>
create policy "onboarding_docs_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('identity-documents', 'business-documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read/update/delete only files under their prefix.
-- Staff roles can view all onboarding files.
create policy "onboarding_docs_select" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('identity-documents', 'business-documents')
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_user_role() in ('admin', 'analyst')
    )
  );

create policy "onboarding_docs_update" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('identity-documents', 'business-documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('identity-documents', 'business-documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "onboarding_docs_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('identity-documents', 'business-documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
