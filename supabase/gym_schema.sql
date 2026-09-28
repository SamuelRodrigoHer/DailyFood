-- Datos privados de entrenamiento para MiModo.
-- Ejecuta este script desde el SQL Editor de Supabase para activar la nube.

CREATE TABLE IF NOT EXISTS public.gym_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  notes TEXT,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(exercises) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, id)
);

CREATE TABLE IF NOT EXISTS public.gym_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id UUID,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  performed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  notes TEXT,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(exercises) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gym_sessions_routine_owner_fkey
    FOREIGN KEY (user_id, routine_id)
    REFERENCES public.gym_routines (user_id, id)
    ON DELETE SET NULL (routine_id)
);

CREATE TABLE IF NOT EXISTS public.gym_exercise_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  muscle_group TEXT,
  equipment TEXT,
  default_sets INTEGER NOT NULL DEFAULT 3 CHECK (default_sets > 0),
  default_reps INTEGER NOT NULL DEFAULT 10 CHECK (default_reps > 0),
  default_weight_kg NUMERIC CHECK (default_weight_kg IS NULL OR default_weight_kg >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, id)
);

CREATE INDEX IF NOT EXISTS gym_routines_user_updated_idx
  ON public.gym_routines (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS gym_sessions_user_date_idx
  ON public.gym_sessions (user_id, performed_on DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS gym_exercise_library_user_updated_idx
  ON public.gym_exercise_library (user_id, updated_at DESC);

ALTER TABLE public.gym_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_exercise_library ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gym_routines, public.gym_sessions, public.gym_exercise_library TO authenticated;

DROP POLICY IF EXISTS "Users manage their own gym routines" ON public.gym_routines;
CREATE POLICY "Users manage their own gym routines" ON public.gym_routines
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage their own gym sessions" ON public.gym_sessions;
CREATE POLICY "Users manage their own gym sessions" ON public.gym_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage their own gym exercise library" ON public.gym_exercise_library;
CREATE POLICY "Users manage their own gym exercise library" ON public.gym_exercise_library
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.gym_routines REPLICA IDENTITY FULL;
ALTER TABLE public.gym_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.gym_exercise_library REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'gym_routines'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.gym_routines;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'gym_sessions'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.gym_sessions;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'gym_exercise_library'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.gym_exercise_library;
    END IF;
  END IF;
END $$;
