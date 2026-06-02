-- ═══════════════════════════════════════════════════════════
-- EduFinance — Sample Seed Data (optional)
-- Run this to populate a demo environment
-- ═══════════════════════════════════════════════════════════

-- Sample school settings
insert into ef_settings (school_name, paybill, account_prefix, family_discount)
values ('Greenfield Academy', '522522', 'GFA', 10)
on conflict do nothing;

-- Sample grades
insert into ef_grades (name, sort_order) values
  ('Grade 1',  1), ('Grade 2',  2), ('Grade 3',  3),
  ('Grade 4',  4), ('Grade 5',  5), ('Grade 6',  6),
  ('Grade 7',  7), ('Grade 8',  8), ('Grade 9',  9)
on conflict do nothing;

-- Sample expense categories
insert into ef_expense_categories (name) values
  ('Utilities'), ('Salaries'), ('Maintenance'), ('Stationery'),
  ('Transport'), ('Security'), ('Meals'), ('Events')
on conflict (name) do nothing;

-- Sample academic term
insert into ef_terms (name, start_date, end_date, is_active)
values ('Term 1 2025', '2025-01-20', '2025-04-04', true)
on conflict do nothing;

select 'Seed data inserted' as status;
