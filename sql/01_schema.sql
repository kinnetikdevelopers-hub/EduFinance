-- ═══════════════════════════════════════════════════════════
-- EduFinance — Full Database Schema
-- Run this ONCE on a fresh Supabase project
-- ═══════════════════════════════════════════════════════════

-- Settings
create table if not exists ef_settings (
  id uuid default gen_random_uuid() primary key,
  school_name text not null default 'My School',
  paybill text default '',
  account_prefix text default 'STU',
  family_discount numeric default 10,
  logo_url text default '',
  created_at timestamptz default now()
);

-- Grades
create table if not exists ef_grades (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  sort_order integer default 1,
  created_at timestamptz default now()
);

-- Streams (belong to grades)
create table if not exists ef_streams (
  id uuid default gen_random_uuid() primary key,
  grade_id uuid references ef_grades(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- Students
create table if not exists ef_students (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  admission_no text,
  grade_id uuid references ef_grades(id) on delete set null,
  stream_id uuid references ef_streams(id) on delete set null,
  parent_name text,
  parent_phone text,
  alt_phone text,
  scholarship text default 'none',     -- none | partial | full
  status text default 'active',         -- active | inactive
  history_reason text,                   -- transferred | left | graduated
  history_notes text,
  history_date date,
  created_at timestamptz default now()
);

-- Academic terms
create table if not exists ef_terms (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  start_date date,
  end_date date,
  is_active boolean default false,
  created_at timestamptz default now()
);

-- Grade fees (base amount per grade per term)
create table if not exists ef_grade_fees (
  id uuid default gen_random_uuid() primary key,
  term_id uuid references ef_terms(id) on delete cascade,
  grade_id uuid references ef_grades(id) on delete cascade,
  amount numeric not null default 0,
  created_at timestamptz default now(),
  unique(term_id, grade_id)
);

-- Student fee invoices (auto-generated per student per term)
create table if not exists ef_student_fees (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references ef_students(id) on delete cascade,
  term_id uuid references ef_terms(id) on delete cascade,
  expected numeric not null default 0,
  paid numeric not null default 0,
  status text default 'due',            -- due | partial | paid
  created_at timestamptz default now(),
  unique(student_id, term_id)
);

-- Payments (individual transactions)
create table if not exists ef_payments (
  id uuid default gen_random_uuid() primary key,
  fee_id uuid references ef_student_fees(id) on delete cascade,
  amount numeric not null,
  method text default 'mpesa',           -- mpesa | cash | bank | cheque
  mpesa_code text,
  note text,
  paid_at timestamptz default now()
);

-- Expense categories
create table if not exists ef_expense_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamptz default now()
);

-- Expenses
create table if not exists ef_expenses (
  id uuid default gen_random_uuid() primary key,
  term_id uuid references ef_terms(id) on delete cascade,
  description text not null,
  category text not null,
  amount numeric not null default 0,
  expense_date date,
  supplier text,
  created_at timestamptz default now()
);

-- Extra charges (trips, lab fees etc — per term)
create table if not exists ef_extra_charges (
  id uuid default gen_random_uuid() primary key,
  term_id uuid references ef_terms(id) on delete cascade,
  name text not null,
  amount numeric not null default 0,
  grade_ids jsonb default '[]',
  created_at timestamptz default now()
);

-- System users (stores role metadata; auth is via Supabase Auth)
create table if not exists ef_users (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  role text default 'bursar',            -- admin | bursar | viewer
  created_at timestamptz default now()
);

-- ── Disable RLS on all tables ───────────────────────────
alter table ef_settings disable row level security;
alter table ef_grades disable row level security;
alter table ef_streams disable row level security;
alter table ef_students disable row level security;
alter table ef_terms disable row level security;
alter table ef_grade_fees disable row level security;
alter table ef_student_fees disable row level security;
alter table ef_payments disable row level security;
alter table ef_expense_categories disable row level security;
alter table ef_expenses disable row level security;
alter table ef_extra_charges disable row level security;
alter table ef_users disable row level security;

-- ── Seed default expense categories ─────────────────────
insert into ef_expense_categories (name) values
  ('Utilities'), ('Salaries'), ('Maintenance'), ('Stationery'),
  ('Transport'), ('Security'), ('Meals'), ('Events')
on conflict (name) do nothing;

-- Done!
select 'EduFinance schema installed successfully' as status;
