-- HIGHWAYLOT — Round 2: abuse protection (rate limiting + storage caps)
--
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query).
-- It's idempotent (safe to re-run) and additive: it does NOT touch or
-- replace your existing RLS policies on listings/quiz_responses/valuations.
-- Those can stay exactly as permissive as they are today — these triggers
-- fire before RLS is even checked on the same insert, so a request that
-- exceeds the limit is rejected regardless of what the insert policy allows.
--
-- What this adds:
--   1. A generic rate_limit_hits table + check_rate_limit() function, keyed
--      off the requester's IP (from the x-forwarded-for header PostgREST
--      exposes on every request) since there's no login to key off of.
--   2. BEFORE INSERT triggers on listings, quiz_responses, and valuations
--      that call it and raise an exception if the caller is over the limit.
--   3. Tighter file-size/type limits on the listing-photos storage bucket,
--      plus a matching upload-rate trigger.
--
-- Adjust the limits below (max count / window in seconds) to taste.

-- ---------- 1. rate limit table + function ----------

create table if not exists public.rate_limit_hits (
  bucket       text not null,
  key          text not null,
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (bucket, key, window_start)
);

-- RLS on with no policies: only the SECURITY DEFINER function below can
-- read/write this table. anon and authenticated get nothing directly.
alter table public.rate_limit_hits enable row level security;

-- Best-effort caller identity with no auth system: the client IP PostgREST
-- forwards in x-forwarded-for. Falls back to 'unknown' (which just means
-- everyone with no forwarded IP shares one bucket) rather than failing.
create or replace function public.rate_limit_key()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1), ''),
    current_setting('request.headers', true)::json ->> 'x-real-ip',
    'unknown'
  );
$$;

-- Fixed-window counter: increments the count for the current window and
-- returns whether this call is still within p_max. Simpler and cheaper than
-- a sliding window; a burst right at a window boundary can let slightly
-- more than p_max through, which is an acceptable tradeoff here.
create or replace function public.check_rate_limit(p_bucket text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key    text := public.rate_limit_key();
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count  int;
begin
  insert into public.rate_limit_hits (bucket, key, window_start, count)
  values (p_bucket, v_key, v_window, 1)
  on conflict (bucket, key, window_start)
  do update set count = rate_limit_hits.count + 1
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

-- ---------- 2. triggers on the write tables ----------

create or replace function public.enforce_listings_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.check_rate_limit('listings_insert', 5, 3600) then
    raise exception 'Too many listings posted recently from this connection — please try again in a bit.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_listings_rate_limit on public.listings;
create trigger trg_listings_rate_limit
  before insert on public.listings
  for each row execute function public.enforce_listings_rate_limit();

create or replace function public.enforce_quiz_responses_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.check_rate_limit('quiz_responses_insert', 20, 3600) then
    raise exception 'Too many quiz submissions recently from this connection — please try again in a bit.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_quiz_responses_rate_limit on public.quiz_responses;
create trigger trg_quiz_responses_rate_limit
  before insert on public.quiz_responses
  for each row execute function public.enforce_quiz_responses_rate_limit();

create or replace function public.enforce_valuations_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.check_rate_limit('valuations_insert', 20, 3600) then
    raise exception 'Too many valuation requests recently from this connection — please try again in a bit.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_valuations_rate_limit on public.valuations;
create trigger trg_valuations_rate_limit
  before insert on public.valuations
  for each row execute function public.enforce_valuations_rate_limit();

-- Optional: periodically clean up old windows so rate_limit_hits doesn't
-- grow forever. Safe to run manually now and then, or wire to pg_cron if
-- your Supabase plan has it enabled.
-- delete from public.rate_limit_hits where window_start < now() - interval '1 day';

-- ---------- 3. storage bucket cap tightening ----------

-- Caps each uploaded photo at 5MB and restricts to actual image types —
-- today the bucket likely has no limit, so a single "listing photo" upload
-- could be an arbitrarily large file of any type.
update storage.buckets
set file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'listing-photos';

-- Matching upload-rate limit: PostAd allows up to 8 photos per listing, and
-- the listings trigger above already caps at 5 listings/hour, so 40
-- uploads/hour covers legitimate use with room to spare while still
-- blocking someone hammering the upload endpoint directly.
create or replace function public.enforce_listing_photos_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.bucket_id = 'listing-photos' and not public.check_rate_limit('listing_photos_upload', 40, 3600) then
    raise exception 'Too many photo uploads recently from this connection — please try again in a bit.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_listing_photos_rate_limit on storage.objects;
create trigger trg_listing_photos_rate_limit
  before insert on storage.objects
  for each row execute function public.enforce_listing_photos_rate_limit();
