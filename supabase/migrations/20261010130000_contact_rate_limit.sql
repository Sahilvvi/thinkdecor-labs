-- Rate limit and sanity checks for contact_submissions (contact form + newsletter signups).
--
-- The site inserts into this table straight from the browser (anonymous insert policy), so the
-- limit has to live in the database: a script can skip the form and call the API directly.
-- Safe to re-run.
--
--   * per email      : 3 submissions / hour
--   * per IP         : 5 submissions / hour
--   * whole site     : 150 submissions / 10 minutes (stops a flood from many IPs/emails)
--   * field sizes and a basic email shape
--   * notified_at    : set when the owner has been emailed, so notify-lead can only send
--                      one email for a real, stored lead (see supabase/functions/notify-lead)

begin;

alter table public.contact_submissions add column if not exists ip text;
alter table public.contact_submissions add column if not exists notified_at timestamptz;

create index if not exists contact_submissions_email_created_idx
  on public.contact_submissions (lower(email), created_at desc);
create index if not exists contact_submissions_ip_created_idx
  on public.contact_submissions (ip, created_at desc);

create or replace function public.contact_submissions_guard()
returns trigger
language plpgsql
security definer                 -- must be able to count rows that anon cannot read (RLS)
set search_path = public
as $$
declare
  headers jsonb;
  client_ip text;
  n integer;
begin
  -- Field sizes: stops huge payloads and junk.
  if length(coalesce(new.name, '')) > 200
     or length(coalesce(new.email, '')) > 254
     or length(coalesce(new.phone, '')) > 60
     or length(coalesce(new.company, '')) > 200
     or length(coalesce(new.company_size, '')) > 60
     or length(coalesce(new.industry, '')) > 120
     or length(coalesce(new.region, '')) > 120
     or length(coalesce(new.reason, '')) > 120
     or length(coalesce(new.message, '')) > 5000 then
    raise exception 'too_long' using errcode = 'P0001';
  end if;

  if new.email is null or new.email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;

  -- Client IP as the API gateway saw it. cf-connecting-ip is set by the CDN and can't be
  -- forged by the visitor; x-forwarded-for is only a fallback.
  begin
    headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    headers := null;
  end;
  client_ip := coalesce(
    nullif(headers ->> 'cf-connecting-ip', ''),
    nullif(headers ->> 'x-real-ip', ''),
    nullif(split_part(coalesce(headers ->> 'x-forwarded-for', ''), ',', 1), '')
  );
  new.ip := left(client_ip, 64);

  select count(*) into n from public.contact_submissions
   where lower(email) = lower(new.email) and created_at > now() - interval '1 hour';
  if n >= 3 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  if new.ip is not null then
    select count(*) into n from public.contact_submissions
     where ip = new.ip and created_at > now() - interval '1 hour';
    if n >= 5 then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
  end if;

  select count(*) into n from public.contact_submissions
   where created_at > now() - interval '10 minutes';
  if n >= 150 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists contact_submissions_guard on public.contact_submissions;
create trigger contact_submissions_guard
  before insert on public.contact_submissions
  for each row execute function public.contact_submissions_guard();

commit;
