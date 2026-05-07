create extension if not exists pgcrypto;

do $$
begin
  create type public.user_role as enum ('student', 'lender');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.verification_status as enum ('pending', 'verified', 'rejected', 'failed');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  wallet_address text primary key,
  role public.user_role not null,
  email text,
  university text,
  verification_status public.verification_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_wallet_address_not_blank check (length(trim(wallet_address)) > 0),
  constraint profiles_email_format check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create table if not exists public.student_verifications (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null references public.profiles(wallet_address) on delete cascade,
  student_email text not null,
  university_domain text not null,
  ktm_file_path text not null,
  ktm_file_name text not null,
  credential_hash text not null,
  ocr_text_preview text,
  confidence numeric(4, 3),
  status public.verification_status not null default 'pending',
  rejection_reason text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_verifications_email_format check (student_email ~* '^[^@\s]+@[^@\s]+\.ac\.id$'),
  constraint student_verifications_confidence_range check (confidence is null or confidence between 0 and 1)
);

create index if not exists student_verifications_wallet_latest_idx
  on public.student_verifications(wallet_address, created_at desc);

create unique index if not exists student_verifications_credential_hash_idx
  on public.student_verifications(credential_hash);

create index if not exists student_verifications_status_idx
  on public.student_verifications(status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_student_verifications_updated_at on public.student_verifications;
create trigger set_student_verifications_updated_at
before update on public.student_verifications
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.student_verifications enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.student_verifications to service_role;

drop policy if exists "Service role can manage profiles" on public.profiles;
create policy "Service role can manage profiles"
on public.profiles
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage student verifications" on public.student_verifications;
create policy "Service role can manage student verifications"
on public.student_verifications
for all
to service_role
using (true)
with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-ktm',
  'student-ktm',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Service role can manage student KTM files" on storage.objects;
create policy "Service role can manage student KTM files"
on storage.objects
for all
to service_role
using (bucket_id = 'student-ktm')
with check (bucket_id = 'student-ktm');
