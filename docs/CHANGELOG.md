# Changelog

## v2.0.0 — May 2025

### New features
- **History tab** — Students moved to history when archived; full fee history per student
- **Sub-tab navigation** — Students and Payments & Tracking now have collapsible sub-tabs with dropdown arrows
- **Term cards** — Terms now appear as clickable cards instead of rows
- **Inner page drill-down** — Click a term to open a full inner page (fees, payments, expenses, tracking)
- **Auto active term** — Fee Tracking, Expenses and Reports auto-open the active term
- **Extra charges** — Lab fees, trip fees etc. can be added per term with grade targeting
- **Year filter** — Fee Setup has a year dropdown to filter terms by year
- **Edit grades** — Grades and streams can now be edited after creation
- **Edit expenses** — Expenses can now be edited (not just deleted)
- **Edit terms** — Terms can be edited after creation
- **Undo delete** — Deleting items shows an Undo toast for 5 seconds
- **Archive vs delete** — Student delete now offers: move to History or delete permanently
- **Add user from frontend** — Users can be created directly from Settings without going to Supabase backend
- **Notification bell** — Bell icon with red dot when red flags exist; clicking scrolls to flags
- **Profile initials** — Top-right shows initials of the logged-in user
- **Receipt redesign** — Cleaner receipt layout with school logo
- **Print-safe reports** — Reports print correctly without sidebar or topbar

### Fixes
- Login fields are now blank (no pre-filled email or password)
- Password show/hide icon added to login, settings (both password fields) and add user
- All animated icons replaced with static SVGs
- Forms no longer close unexpectedly
- Navigation no longer reloads data on every click
- RLS issues resolved with dedicated fix script

## v1.0.0 — Initial release
- Basic student management
- Fee setup and payment recording
- Expense tracking
- Dashboard with charts
