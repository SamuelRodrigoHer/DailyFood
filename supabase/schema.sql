-- ================================================================
-- CONFIGURACIÓN COMPARTIDA Y TIEMPO REAL (WEBSOCKETS) EN SUPABASE
-- Permite que varias cuentas (pareja, familia, etc.) compartan
-- la misma lista y menús, y se actualice al instante por WebSockets.
-- ================================================================

-- 1. Tabla de Recetas / Platos habituales
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'almuerzo',
    ingredients JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla del Plan Semanal de Comidas
CREATE TABLE IF NOT EXISTS public.meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    meal_type TEXT NOT NULL,
    title TEXT NOT NULL,
    recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de la Lista de la Compra
CREATE TABLE IF NOT EXISTS public.shopping_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Otros',
    quantity TEXT,
    is_bought BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- REPLICA IDENTITY (Obligatorio para recibir cambios de borrado/actualización por WebSockets)
-- ================================================================
ALTER TABLE public.shopping_items REPLICA IDENTITY FULL;
ALTER TABLE public.meal_plans REPLICA IDENTITY FULL;
ALTER TABLE public.recipes REPLICA IDENTITY FULL;

-- ================================================================
-- POLÍTICAS COMPARTIDAS (ROW LEVEL SECURITY - RLS)
-- Cualquier usuario con cuenta registrada puede ver, añadir, marcar y editar
-- en la lista y calendario compartido de la casa.
-- ================================================================

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

-- Borrar políticas anteriores restrictivas si existían
DROP POLICY IF EXISTS "Users can view own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can insert own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can update own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can delete own recipes" ON public.recipes;

DROP POLICY IF EXISTS "Users can view own meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can insert own meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can update own meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can delete own meal plans" ON public.meal_plans;

DROP POLICY IF EXISTS "Users can view own shopping items" ON public.shopping_items;
DROP POLICY IF EXISTS "Users can insert own shopping items" ON public.shopping_items;
DROP POLICY IF EXISTS "Users can update own shopping items" ON public.shopping_items;
DROP POLICY IF EXISTS "Users can delete own shopping items" ON public.shopping_items;

DROP POLICY IF EXISTS "Shared access for authenticated users on recipes" ON public.recipes;
DROP POLICY IF EXISTS "Shared access for authenticated users on meal_plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Shared access for authenticated users on shopping_items" ON public.shopping_items;

-- Nuevas políticas compartidas para usuarios autenticados
CREATE POLICY "Shared access for authenticated users on recipes" 
  ON public.recipes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Shared access for authenticated users on meal_plans" 
  ON public.meal_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Shared access for authenticated users on shopping_items" 
  ON public.shopping_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ================================================================
-- ACTIVAR CANALES DE TIEMPO REAL (SUPABASE REALTIME WEBSOCKETS)
-- ================================================================
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.shopping_items, 
    public.meal_plans, 
    public.recipes;
COMMIT;
