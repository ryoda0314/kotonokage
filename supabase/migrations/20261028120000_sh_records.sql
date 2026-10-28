-- ことのかげ: a learner's record (the State of src/lib/record.ts), one row per account. The accounts are ことのあめ's
-- (the same Supabase project, as for ことのは, ことのおと, ことのめ and ことのえだ); everything of this app's is prefixed sh_
-- (for shadowing, what it trains, so a new name for the app changes nothing here), and nothing of ことのあめ (pl_),
-- ことのおと and ことのね (kn_), ことのは (en_), ことのめ (hg_), ことのえだ (ke_) or the old app is touched. Read and written
-- from the browser as the learner (RLS: only their own row).
create table if not exists public.sh_records (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  -- The record keeps its newest rounds, events and replies; this keeps the table from being used as storage.
  constraint sh_records_size check (pg_column_size(state) < 1048576)
);

alter table public.sh_records enable row level security;

drop policy if exists "sh_records own" on public.sh_records;
create policy "sh_records own" on public.sh_records
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
