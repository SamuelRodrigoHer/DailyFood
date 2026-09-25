-- Espacios domésticos: cada cuenta pertenece a un hogar y solo sus miembros
-- pueden leer o modificar sus recetas, menú y lista de la compra.

CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Mi hogar',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.household_members (
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.household_invites (
  code UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'almuerzo',
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  title TEXT NOT NULL,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Otros',
  quantity TEXT,
  is_bought BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Upgrade the earlier schema in place, preserving existing rows where the
-- original user_id identifies their owner. Rows without an owner remain
-- inaccessible until an administrator assigns them to a household.
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE CASCADE;
ALTER TABLE public.meal_plans ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE CASCADE;
ALTER TABLE public.shopping_items ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.create_household_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_household_id UUID;
BEGIN
  INSERT INTO public.households (name) VALUES ('Mi hogar') RETURNING id INTO new_household_id;
  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (new_household_id, NEW.id, 'owner')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_household_after_signup ON auth.users;
CREATE TRIGGER create_household_after_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_household_for_new_user();

-- Existing accounts receive a private household. Existing owned rows are
-- backfilled into that household; unowned legacy rows are never made public.
DO $$
DECLARE
  existing_user RECORD;
  new_household_id UUID;
BEGIN
  FOR existing_user IN
    SELECT u.id FROM auth.users u
    WHERE NOT EXISTS (SELECT 1 FROM public.household_members hm WHERE hm.user_id = u.id)
  LOOP
    INSERT INTO public.households (name) VALUES ('Mi hogar') RETURNING id INTO new_household_id;
    INSERT INTO public.household_members (household_id, user_id, role)
    VALUES (new_household_id, existing_user.id, 'owner')
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END;
$$;

UPDATE public.recipes r SET household_id = hm.household_id
FROM public.household_members hm WHERE r.household_id IS NULL AND r.user_id = hm.user_id;
UPDATE public.meal_plans m SET household_id = hm.household_id
FROM public.household_members hm WHERE m.household_id IS NULL AND m.user_id = hm.user_id;
UPDATE public.shopping_items s SET household_id = hm.household_id
FROM public.household_members hm WHERE s.household_id IS NULL AND s.user_id = hm.user_id;

-- A meal may reference only a recipe from the same household. Clear legacy
-- cross-household links before adding the composite foreign key.
UPDATE public.meal_plans m SET recipe_id = NULL
FROM public.recipes r
WHERE m.recipe_id = r.id AND m.household_id IS DISTINCT FROM r.household_id;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'recipes_household_id_id_key'
      AND conrelid = 'public.recipes'::regclass
  ) THEN
    ALTER TABLE public.recipes
      ADD CONSTRAINT recipes_household_id_id_key UNIQUE (household_id, id);
  END IF;
END $$;

ALTER TABLE public.meal_plans DROP CONSTRAINT IF EXISTS meal_plans_recipe_id_fkey;
ALTER TABLE public.meal_plans DROP CONSTRAINT IF EXISTS meal_plans_recipe_same_household_fkey;
ALTER TABLE public.meal_plans
  ADD CONSTRAINT meal_plans_recipe_same_household_fkey
  FOREIGN KEY (household_id, recipe_id)
  REFERENCES public.recipes (household_id, id)
  ON DELETE SET NULL (recipe_id);

CREATE OR REPLACE FUNCTION public.my_household_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT hm.household_id FROM public.household_members hm WHERE hm.user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.create_household_invite()
RETURNS TABLE (invite_code UUID, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_household UUID;
  new_code UUID;
  expiration TIMESTAMPTZ;
BEGIN
  SELECT hm.household_id INTO current_household
  FROM public.household_members hm WHERE hm.user_id = auth.uid();
  IF current_household IS NULL THEN RAISE EXCEPTION 'No perteneces a un hogar'; END IF;

  INSERT INTO public.household_invites (household_id, created_by)
  VALUES (current_household, auth.uid())
  RETURNING code, household_invites.expires_at INTO new_code, expiration;
  RETURN QUERY SELECT new_code, expiration;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_household(invite_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_household UUID;
  current_household UUID;
  invite_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesión'; END IF;
  BEGIN invite_id := invite_code::UUID;
  EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'El código de invitación no es válido'; END;

  SELECT hi.household_id INTO target_household
  FROM public.household_invites hi
  WHERE hi.code = invite_id AND hi.expires_at > now();
  IF target_household IS NULL THEN RAISE EXCEPTION 'El código ha caducado o no existe'; END IF;

  SELECT hm.household_id INTO current_household
  FROM public.household_members hm WHERE hm.user_id = auth.uid();
  IF current_household = target_household THEN RETURN target_household; END IF;

  IF current_household IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.recipes WHERE household_id = current_household)
    OR EXISTS (SELECT 1 FROM public.meal_plans WHERE household_id = current_household)
    OR EXISTS (SELECT 1 FROM public.shopping_items WHERE household_id = current_household)
  ) THEN
    RAISE EXCEPTION 'Este usuario ya tiene datos en su hogar. Para conservarlos, usa otra cuenta para unirte.';
  END IF;

  DELETE FROM public.household_members WHERE user_id = auth.uid();
  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (target_household, auth.uid(), 'member');
  DELETE FROM public.households h
  WHERE h.id = current_household
    AND NOT EXISTS (SELECT 1 FROM public.household_members hm WHERE hm.household_id = h.id);
  RETURN target_household;
END;
$$;

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.households, public.household_members, public.household_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes, public.meal_plans, public.shopping_items TO authenticated;

DROP POLICY IF EXISTS "Household members can view their household" ON public.households;
CREATE POLICY "Household members can view their household" ON public.households
  FOR SELECT TO authenticated USING (id = public.my_household_id());

DROP POLICY IF EXISTS "Users can view their membership" ON public.household_members;
CREATE POLICY "Users can view their membership" ON public.household_members
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Members can view their household invites" ON public.household_invites;
CREATE POLICY "Members can view their household invites" ON public.household_invites
  FOR SELECT TO authenticated USING (household_id = public.my_household_id());

DROP POLICY IF EXISTS "Household members can manage recipes" ON public.recipes;
DROP POLICY IF EXISTS "Shared access for authenticated users on recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can view own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can insert own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can update own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Users can delete own recipes" ON public.recipes;
CREATE POLICY "Household members can manage recipes" ON public.recipes
  FOR ALL TO authenticated
  USING (household_id = public.my_household_id())
  WITH CHECK (household_id = public.my_household_id());

DROP POLICY IF EXISTS "Household members can manage meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Shared access for authenticated users on meal_plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can view own meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can insert own meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can update own meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Users can delete own meal plans" ON public.meal_plans;
CREATE POLICY "Household members can manage meal plans" ON public.meal_plans
  FOR ALL TO authenticated
  USING (household_id = public.my_household_id())
  WITH CHECK (household_id = public.my_household_id());

DROP POLICY IF EXISTS "Household members can manage shopping items" ON public.shopping_items;
DROP POLICY IF EXISTS "Shared access for authenticated users on shopping_items" ON public.shopping_items;
DROP POLICY IF EXISTS "Users can view own shopping items" ON public.shopping_items;
DROP POLICY IF EXISTS "Users can insert own shopping items" ON public.shopping_items;
DROP POLICY IF EXISTS "Users can update own shopping items" ON public.shopping_items;
DROP POLICY IF EXISTS "Users can delete own shopping items" ON public.shopping_items;
CREATE POLICY "Household members can manage shopping items" ON public.shopping_items
  FOR ALL TO authenticated
  USING (household_id = public.my_household_id())
  WITH CHECK (household_id = public.my_household_id());

REVOKE EXECUTE ON FUNCTION public.my_household_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_household_invite() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_household(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_household_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_household_invite() TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_household(TEXT) TO authenticated;

ALTER TABLE public.shopping_items REPLICA IDENTITY FULL;
ALTER TABLE public.meal_plans REPLICA IDENTITY FULL;
ALTER TABLE public.recipes REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_items, public.meal_plans, public.recipes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
