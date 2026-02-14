-- Grant necessary permissions on user_roles to service_role and authenticated
GRANT SELECT ON public.user_roles TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO anon;

-- Also ensure product_credentials is accessible
GRANT SELECT ON public.product_credentials TO service_role;
