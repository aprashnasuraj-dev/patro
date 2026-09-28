-- Prevent future public-schema objects owned by postgres from being exposed to client roles by default.
-- service_role defaults are retained for server-side operations.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Note: supabase_admin-owned default ACLs must be changed through the project-level
-- "Automatically expose new tables and functions" setting; this migration role
-- is not permitted to alter supabase_admin's default privileges.
