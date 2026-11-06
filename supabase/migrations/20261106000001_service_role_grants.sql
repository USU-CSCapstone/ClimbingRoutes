-- The team PC's secret key acts as service_role. It skips row-level security, but Postgres still needs
-- table privileges, and with "Automatically expose new tables" off the project grants none by default.
grant select, insert, update, delete on public.profiles, public.captures, public.wall_models, public.route_lines
  to service_role;
