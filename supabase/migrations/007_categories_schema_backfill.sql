-- ============================================================
-- CATAT.IN - Migration 007: Categories schema backfill
-- Melengkapi kolom categories untuk project yang sudah lebih
-- dulu memiliki tabel categories sebelum migration 006.
-- ============================================================

alter table public.categories
  add column if not exists icon varchar(10),
  add column if not exists is_default boolean not null default false;
