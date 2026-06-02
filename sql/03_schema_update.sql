-- ═══════════════════════════════════════════════════════════
-- EduFinance — Schema Update (existing database)
-- Run this if you already have the old schema and need
-- to add new columns for History and Extra Charges features
-- ═══════════════════════════════════════════════════════════

-- Add history columns to students table
alter table ef_students add column if not exists history_reason text;
alter table ef_students add column if not exists history_notes  text;
alter table ef_students add column if not exists history_date   date;

-- Add extra charges table (lab fees, trips, etc.)
create table if not exists ef_extra_charges (
  id uuid default gen_random_uuid() primary key,
  term_id uuid references ef_terms(id) on delete cascade,
  name text not null,
  amount numeric not null default 0,
  grade_ids jsonb default '[]',
  created_at timestamptz default now()
);
alter table ef_extra_charges disable row level security;

select 'Schema updated successfully' as status;
