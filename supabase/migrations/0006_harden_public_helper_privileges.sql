-- Keep public catalogue RLS callable by anonymous visitors without allowing
-- arbitrary role enumeration through the SECURITY DEFINER helper.
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    (auth.role() = 'service_role' OR check_user_id IS NOT DISTINCT FROM auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.user_roles AS ur
      JOIN public.profiles AS p ON p.id = ur.user_id
      WHERE ur.user_id = check_user_id
        AND ur.role = 'admin'
        AND p.status = 'active'
    );
$function$;

REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon, authenticated, service_role;

-- These are trigger-only functions, not public RPC endpoints.
REVOKE ALL ON FUNCTION public.guard_profile_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
