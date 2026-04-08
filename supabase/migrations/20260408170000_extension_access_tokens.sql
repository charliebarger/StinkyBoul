create table if not exists public.extension_access_tokens (
  token text primary key,
  claimed_at timestamptz,
  claimed_by_browser_id text unique,
  created_at timestamptz not null default now()
);

alter table public.extension_access_tokens enable row level security;

revoke all on public.extension_access_tokens from anon, authenticated;

create or replace function public.activate_extension_token(
  input_token text,
  input_browser_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_token text := upper(trim(input_token));
  existing_record public.extension_access_tokens%rowtype;
begin
  select *
  into existing_record
  from public.extension_access_tokens
  where token = normalized_token
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid access token. Please try again.'
    );
  end if;

  if existing_record.claimed_by_browser_id is null then
    update public.extension_access_tokens
    set
      claimed_at = now(),
      claimed_by_browser_id = input_browser_id
    where token = normalized_token;

    return jsonb_build_object('success', true);
  end if;

  if existing_record.claimed_by_browser_id = input_browser_id then
    return jsonb_build_object('success', true);
  end if;

  return jsonb_build_object(
    'success', false,
    'error', 'Access token already activated. Please contact admin for assistance'
  );
end;
$$;

create or replace function public.verify_extension_token(
  input_token text,
  input_browser_id text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.extension_access_tokens
    where token = upper(trim(input_token))
      and claimed_by_browser_id = input_browser_id
  );
$$;

grant execute on function public.activate_extension_token(text, text) to anon;
grant execute on function public.verify_extension_token(text, text) to anon;

insert into public.extension_access_tokens (token)
values
  ('CHARLIE'),
  ('TUCKER'),
  ('CHRIS'),
  ('CALEB')
on conflict (token) do nothing;
