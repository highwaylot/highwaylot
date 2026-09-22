-- HIGHWAYLOT -- Add a vin column to listings
--
-- Run this in the Supabase SQL editor before the VIN-decode feature on
-- /post goes live on your production site (it's currently on the preview
-- branch only). Without this column, submitting a listing with a VIN
-- filled in will fail on insert.

alter table public.listings
  add column if not exists vin text;
