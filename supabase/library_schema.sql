-- Tabla de libros para la Biblioteca de MiModo
CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'wishlist' CHECK (status IN ('reading', 'wishlist', 'finished')),
  genre TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  cover_url TEXT,
  cover_color TEXT,
  pages_total INTEGER,
  pages_read INTEGER DEFAULT 0,
  notes TEXT,
  started_at DATE,
  finished_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad: los usuarios ven y gestionan sus libros o los de su hogar
DROP POLICY IF EXISTS "Users can manage their own books" ON public.books;
CREATE POLICY "Users can manage their own books" ON public.books
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND household_id = public.my_household_id())
  )
  WITH CHECK (
    (user_id = auth.uid() AND household_id IS NULL) OR
    (household_id IS NOT NULL AND household_id = public.my_household_id())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.books TO authenticated;
