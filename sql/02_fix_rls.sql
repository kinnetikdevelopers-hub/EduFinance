-- ═══════════════════════════════════════════════════════════
-- EduFinance — Fix RLS (Row Level Security)
-- Run this if you accidentally enabled RLS or can't write data
-- ═══════════════════════════════════════════════════════════

-- Disable RLS on all EduFinance tables
alter table ef_settings          disable row level security;
alter table ef_grades            disable row level security;
alter table ef_streams           disable row level security;
alter table ef_students          disable row level security;
alter table ef_terms             disable row level security;
alter table ef_grade_fees        disable row level security;
alter table ef_student_fees      disable row level security;
alter table ef_payments          disable row level security;
alter table ef_expense_categories disable row level security;
alter table ef_expenses          disable row level security;
alter table ef_extra_charges     disable row level security;
alter table ef_users             disable row level security;

-- Drop ALL policies on EduFinance tables
do $$ declare r record;
begin
  for r in (
    select schemaname, tablename, policyname
    from pg_policies
    where tablename like 'ef_%'
  ) loop
    execute format('drop policy if exists %I on %I.%I',
      r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

select 'RLS disabled and all policies dropped' as status;
