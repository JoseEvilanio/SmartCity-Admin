-- ============================================================
-- SmartCity – Corrige RLS de service_orders para operadores
-- ============================================================

-- Permite que operadores e gestores leiam ordens de serviço
DROP POLICY IF EXISTS "Allow select service_orders" ON public.service_orders;
CREATE POLICY "Allow select service_orders" ON public.service_orders FOR SELECT
  USING (
    public.get_auth_role() = 'super_admin' OR
    tenant_id = public.get_auth_tenant() OR
    public.get_auth_role() IN ('operador', 'gestor') OR
    auth.uid() IS NULL
  );

-- Permite que operadores e gestores atualizem ordens de serviço
DROP POLICY IF EXISTS "Allow manage service_orders" ON public.service_orders;
CREATE POLICY "Allow manage service_orders" ON public.service_orders FOR ALL TO authenticated
  USING (
    public.get_auth_role() = 'super_admin' OR
    (public.get_auth_role() IN ('operador', 'gestor')) OR
    (public.get_auth_role() IN ('operador', 'gestor') AND tenant_id = public.get_auth_tenant())
  )
  WITH CHECK (
    public.get_auth_role() = 'super_admin' OR
    (public.get_auth_role() IN ('operador', 'gestor')) OR
    (public.get_auth_role() IN ('operador', 'gestor') AND tenant_id = public.get_auth_tenant())
  );
