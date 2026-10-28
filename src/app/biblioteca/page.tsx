'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Plus,
  Search,
  Star,
  Trash2,
  Pencil,
  CheckCircle2,
  Sparkles,
  X,
  ChevronRight,
  BookMarked,
  Check,
  ArrowLeft,
  Clock,
  Flame,
  Bookmark,
  Camera,
  Library,
  LayoutGrid,
  BookCopy,
  Info,
  ArrowUpRight,
  Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '@/context/AppContext';
import { Book, BookStatus } from '@/lib/types';
import { INITIAL_BOOKS, BOOK_GENRES, BOOK_COVER_PALETTES } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { cn, toLocalDateString } from '@/lib/utils';
import { BookCoverScanner } from '@/components/BookCoverScanner';

type TabType = 'all' | 'reading' | 'wishlist' | 'finished';
type ViewMode = 'shelf' | 'grid';

export default function BibliotecaPage() {
  const { user, isSupabaseConnected } = useApp();
  const supabase = createClient();

  const [books, setBooks] = useState<Book[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('shelf');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  // Modal de Añadir / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  // Modal para ver detalles completos al sacar un libro de la estantería
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<Book | null>(null);

  // Modal para escanear/echar foto al libro
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState(BOOK_GENRES[0]);
  const [status, setStatus] = useState<BookStatus>('reading');
  const [rating, setRating] = useState<number>(5);
  const [pagesTotal, setPagesTotal] = useState<string>('');
  const [pagesRead, setPagesRead] = useState<string>('');
  const [coverColor, setCoverColor] = useState(BOOK_COVER_PALETTES[0].gradient);
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  // 1. Cargar libros (Supabase o localStorage)
  useEffect(() => {
    let isMounted = true;

    async function loadBooks() {
      if (supabase && user) {
        try {
          const { data, error } = await supabase
            .from('books')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error) {
            if (isMounted) setBooks((data || []) as Book[]);
            return;
          }
          if (isMounted) setPersistenceError(`No se pudo cargar la biblioteca: ${error.message}`);
          return;
        } catch (error) {
          if (isMounted) setPersistenceError(error instanceof Error ? error.message : 'No se pudo cargar la biblioteca.');
          return;
        }
      }

      // LocalStorage
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('app_books');
        if (stored) {
          try {
            if (isMounted) setBooks(JSON.parse(stored));
          } catch {
            if (isMounted) setBooks(INITIAL_BOOKS);
          }
        } else {
          if (isMounted) {
            setBooks(INITIAL_BOOKS);
            localStorage.setItem('app_books', JSON.stringify(INITIAL_BOOKS));
          }
        }
      }
    }

    void loadBooks();
    return () => { isMounted = false; };
  }, [supabase, user]);

  // Guardar cambios en persistencia
  const saveBooks = async (newBooks: Book[]) => {
    setBooks(newBooks);
    setPersistenceError(null);
    if (typeof window !== 'undefined' && !(supabase && user)) {
      localStorage.setItem('app_books', JSON.stringify(newBooks));
    }
  };

  const reportPersistence = (error: { message: string } | null) => {
    setPersistenceError(error ? `No se pudo sincronizar la biblioteca: ${error.message}` : null);
  };

  // Abrir modal para añadir
  const handleOpenAdd = (defaultStatus?: BookStatus) => {
    setEditingBook(null);
    setTitle('');
    setAuthor('');
    setGenre(BOOK_GENRES[0]);
    setStatus(defaultStatus || (activeTab === 'all' ? 'reading' : (activeTab as BookStatus)));
    setRating(5);
    setPagesTotal('');
    setPagesRead('');
    setCoverColor(BOOK_COVER_PALETTES[Math.floor(Math.random() * BOOK_COVER_PALETTES.length)].gradient);
    setCoverUrl(undefined);
    setNotes('');
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEdit = (book: Book) => {
    setEditingBook(book);
    setTitle(book.title);
    setAuthor(book.author);
    setGenre((book.genre as any) || BOOK_GENRES[0]);
    setStatus(book.status);
    setRating(book.rating || 5);
    setPagesTotal(book.pages_total ? String(book.pages_total) : '');
    setPagesRead(book.pages_read ? String(book.pages_read) : '');
    setCoverColor(book.cover_color || BOOK_COVER_PALETTES[0].gradient);
    setCoverUrl(book.cover_url);
    setNotes(book.notes || '');
    setIsModalOpen(true);
  };

  // Guardar libro (crear o actualizar)
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;

    const total = pagesTotal ? parseInt(pagesTotal, 10) : undefined;
    const read = pagesRead ? parseInt(pagesRead, 10) : 0;

    if (editingBook) {
      // Actualizar existente
      const updated: Book = {
        ...editingBook,
        title: title.trim(),
        author: author.trim(),
        genre,
        status,
        rating: status === 'finished' ? rating : editingBook.rating,
        pages_total: total,
        pages_read: status === 'finished' && total ? total : read,
        cover_color: coverColor,
        cover_url: coverUrl,
        notes: notes.trim() || undefined,
        finished_at: status === 'finished' && !editingBook.finished_at ? toLocalDateString() : editingBook.finished_at,
      };

      const updatedList = books.map((b) => (b.id === editingBook.id ? updated : b));
      if (supabase && user) {
        const { error } = await supabase.from('books').upsert(updated);
        if (error) { reportPersistence(error); return; }
      }
      await saveBooks(updatedList);
      if (selectedBookForDetails?.id === updated.id) setSelectedBookForDetails(updated);
    } else {
      // Crear nuevo
      const newBook: Book = {
        id: crypto.randomUUID(),
        user_id: user?.id,
        household_id: user?.household_id,
        title: title.trim(),
        author: author.trim(),
        genre,
        status,
        rating: status === 'finished' ? rating : undefined,
        pages_total: total,
        pages_read: status === 'finished' && total ? total : read,
        cover_color: coverColor,
        cover_url: coverUrl,
        notes: notes.trim() || undefined,
        started_at: status === 'reading' ? toLocalDateString() : undefined,
        finished_at: status === 'finished' ? toLocalDateString() : undefined,
        created_at: new Date().toISOString(),
      };

      const updatedList = [newBook, ...books];
      if (supabase && user) {
        const { error } = await supabase.from('books').insert(newBook);
        if (error) { reportPersistence(error); return; }
      }
      await saveBooks(updatedList);
    }

    setIsModalOpen(false);
  };

  // Eliminar libro
  const handleDeleteBook = async (id: string) => {
    const updatedList = books.filter((b) => b.id !== id);
    if (supabase && user) {
      const { error } = await supabase.from('books').delete().eq('id', id);
      if (error) { reportPersistence(error); return; }
    }
    await saveBooks(updatedList);
    if (selectedBookForDetails?.id === id) setSelectedBookForDetails(null);
  };

  // Avanzar páginas rápido (+10 o +25)
  const handleAddPages = async (book: Book, amount: number) => {
    const currentRead = book.pages_read || 0;
    const total = book.pages_total || 0;
    const nextRead = total > 0 ? Math.min(total, currentRead + amount) : currentRead + amount;

    const isNowFinished = total > 0 && nextRead >= total;

    const updated: Book = {
      ...book,
      pages_read: nextRead,
      status: isNowFinished ? 'finished' : book.status,
      finished_at: isNowFinished ? toLocalDateString() : book.finished_at,
    };

    if (isNowFinished) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#6366f1', '#ec4899', '#f59e0b'],
      });
    }

    const updatedList = books.map((b) => (b.id === book.id ? updated : b));
    if (supabase && user) {
      const { error } = await supabase.from('books').upsert(updated);
      if (error) { reportPersistence(error); return; }
    }
    await saveBooks(updatedList);
    if (selectedBookForDetails?.id === updated.id) setSelectedBookForDetails(updated);
  };

  // Cambiar estado rápido
  const handleUpdateStatus = async (book: Book, nextStatus: BookStatus) => {
    const isFinishing = nextStatus === 'finished';
    const updated: Book = {
      ...book,
      status: nextStatus,
      started_at: nextStatus === 'reading' && !book.started_at ? toLocalDateString() : book.started_at,
      finished_at: isFinishing ? toLocalDateString() : book.finished_at,
      pages_read: isFinishing && book.pages_total ? book.pages_total : book.pages_read,
    };

    if (isFinishing) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b'],
      });
    }

    const updatedList = books.map((b) => (b.id === book.id ? updated : b));
    if (supabase && user) {
      const { error } = await supabase.from('books').upsert(updated);
      if (error) { reportPersistence(error); return; }
    }
    await saveBooks(updatedList);
    if (selectedBookForDetails?.id === updated.id) setSelectedBookForDetails(updated);
  };

  // Contadores
  const counts = useMemo(() => {
    return {
      all: books.length,
      reading: books.filter((b) => b.status === 'reading').length,
      wishlist: books.filter((b) => b.status === 'wishlist').length,
      finished: books.filter((b) => b.status === 'finished').length,
    };
  }, [books]);

  // Libros filtrados
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const matchesTab = activeTab === 'all' || book.status === activeTab;
      const matchesSearch =
        !searchQuery.trim() ||
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGenre = selectedGenre === 'all' || book.genre === selectedGenre;
      return matchesTab && matchesSearch && matchesGenre;
    });
  }, [books, activeTab, searchQuery, selectedGenre]);

  // Agrupar libros en estantes/baldas (6 por balda para que queden holgados y elegantes)
  const shelves = useMemo(() => {
    const chunkSize = 7;
    const result: Book[][] = [];
    for (let i = 0; i < filteredBooks.length; i += chunkSize) {
      result.push(filteredBooks.slice(i, i + chunkSize));
    }
    return result;
  }, [filteredBooks]);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      {persistenceError && (
        <div role="alert" className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {persistenceError}
        </div>
      )}

      {/* 1. CABECERA */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-md shadow-violet-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
                Biblioteca
              </h1>
              <p className="text-xs text-neutral-500">
                Tu estantería personal con lomos de libros, lecturas y lista de deseos
              </p>
            </div>
          </div>
        </div>

        {/* Botones Cabecera: Cambiar Vista y Añadir libro */}
        <div className="flex items-center gap-2">
          {/* Conmutador de Vista (Estantería de lomos vs Cuadrícula de portadas) */}
          <div className="flex items-center rounded-2xl border border-neutral-200 bg-white p-1 shadow-2xs">
            <button
              onClick={() => setViewMode('shelf')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition',
                viewMode === 'shelf'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              )}
              title="Vista de estantería con lomos"
            >
              <Library className="h-3.5 w-3.5" />
              <span>Estantería</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition',
                viewMode === 'grid'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              )}
              title="Vista en cuadrícula con portadas"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Portadas</span>
            </button>
          </div>

          <button
            onClick={() => handleOpenAdd()}
            className="flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-violet-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Añadir libro</span>
          </button>
        </div>
      </div>

      {/* 2. PESTAÑAS PRINCIPALES (Con opción "Todos" para la estantería completa) */}
      <div className="mb-6 flex gap-2 border-b border-neutral-200/80 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition whitespace-nowrap',
            activeTab === 'all'
              ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
          )}
        >
          <Library className="h-4 w-4" />
          <span>Todos los libros ({counts.all})</span>
        </button>

        <button
          onClick={() => setActiveTab('reading')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition whitespace-nowrap',
            activeTab === 'reading'
              ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
          )}
        >
          <Flame className="h-4 w-4" />
          <span>Leyendo ({counts.reading})</span>
        </button>

        <button
          onClick={() => setActiveTab('wishlist')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition whitespace-nowrap',
            activeTab === 'wishlist'
              ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
          )}
        >
          <Bookmark className="h-4 w-4" />
          <span>Por leer ({counts.wishlist})</span>
        </button>

        <button
          onClick={() => setActiveTab('finished')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition whitespace-nowrap',
            activeTab === 'finished'
              ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Terminados ({counts.finished})</span>
        </button>
      </div>

      {/* 3. FILTROS Y BÚSQUEDA */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por título o autor en la estantería..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-neutral-200/80 bg-white py-2 pl-9 pr-4 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 shadow-xs focus:border-violet-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          className="rounded-2xl border border-neutral-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-xs focus:border-violet-500 focus:outline-none"
        >
          <option value="all">Todos los géneros</option>
          {BOOK_GENRES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {/* 4. CONTENIDO PRINCIPAL: VISTA DE ESTANTERÍA vs VISTA DE CUADRÍCULA */}
      {filteredBooks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-200 bg-white/60 p-12 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
          <p className="text-sm font-bold text-neutral-700">No hay libros en esta sección</p>
          <p className="mt-1 text-xs text-neutral-400">
            {searchQuery
              ? 'Prueba a cambiar los términos de búsqueda o el género'
              : 'Añade tu primer libro a la estantería'}
          </p>
          <button
            onClick={() => handleOpenAdd()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-violet-700 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Añadir ahora
          </button>
        </div>
      ) : viewMode === 'shelf' ? (

        /* ========================================================
           VISTA ESTANTERÍA CON LOMOS DE LIBRO Y BALDAS DE MADERA
           ======================================================== */
        <div className="rounded-3xl border border-amber-950/20 bg-[#241a15] p-5 sm:p-8 shadow-2xl overflow-hidden relative">

          {/* Fondo ambiente de biblioteca con iluminación cenital */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,237,213,0.12)_0%,_transparent_70%)]" />

          {/* Cartelito de biblioteca */}
          <div className="relative mb-8 flex items-center justify-between border-b border-amber-800/40 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-amber-200/90 font-serif">
                Estantería principal · {filteredBooks.length} libro{filteredBooks.length !== 1 ? 's' : ''}
              </span>
            </div>
            <span className="text-[11px] text-amber-300/60 hidden sm:inline">
              Toca un libro para extraerlo y ver detalles
            </span>
          </div>

          {/* Baldas de madera con libros apoyados de lado */}
          <div className="space-y-12">
            {shelves.map((shelfBooks, shelfIdx) => (
              <div key={shelfIdx} className="relative">

                {/* Libros de lado sobre la balda */}
                <div className="flex items-end justify-start gap-1.5 sm:gap-2.5 px-3 sm:px-6 min-h-[220px] overflow-x-auto pb-0.5 pt-6 scrollbar-none">
                  {shelfBooks.map((book) => {
                    // Grosor orgánico según número de páginas
                    const spineWidth = book.pages_total
                      ? Math.max(38, Math.min(68, Math.round(book.pages_total / 9)))
                      : 46;

                    // Altura orgánica realista (entre 185px y 215px)
                    const titleHash = book.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                    const spineHeight = 188 + (titleHash % 28);

                    return (
                      <div
                        key={book.id}
                        onClick={() => setSelectedBookForDetails(book)}
                        className="group relative cursor-pointer select-none transition-all duration-300 hover:-translate-y-6 hover:z-30 shrink-0"
                        title={`${book.title} - ${book.author}`}
                      >
                        {/* Marcapáginas de tela asomando si está leyendo */}
                        {book.status === 'reading' && (
                          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-2 h-4.5 bg-rose-500 rounded-t-xs shadow-md z-10 transition-transform group-hover:scale-110" />
                        )}

                        {/* Estrella si está terminado */}
                        {book.status === 'finished' && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center justify-center h-4 w-4 rounded-full bg-amber-400 text-amber-950 shadow-sm z-10">
                            <Star className="h-2.5 w-2.5 fill-amber-950" />
                          </div>
                        )}

                        {/* Lomo del libro con relieve 3D */}
                        <div
                          style={{ width: `${spineWidth}px`, height: `${spineHeight}px` }}
                          className={cn(
                            'relative rounded-t-sm flex flex-col justify-between p-1.5 text-white shadow-xl transition-all duration-300 group-hover:shadow-[0_20px_35px_rgba(0,0,0,0.6)] overflow-hidden',
                            book.cover_color || 'from-amber-700 via-orange-800 to-amber-950 bg-gradient-to-b'
                          )}
                        >
                          {/* Sombreado de lomo curvado (volumen cilíndrico) */}
                          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-black/50 to-transparent" />
                          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-2 bg-gradient-to-l from-black/50 to-transparent" />
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-60" />

                          {/* Líneas doradas de encuadernación superior */}
                          <div className="w-full flex flex-col gap-0.5 opacity-70">
                            <div className="w-full h-0.5 bg-amber-200/50" />
                            <div className="w-full h-0.5 bg-amber-200/30" />
                          </div>

                          {/* Título en vertical */}
                          <div className="flex-1 flex items-center justify-center my-2 overflow-hidden">
                            <span className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-bold tracking-wide text-white/95 line-clamp-1 drop-shadow-md max-h-[135px]">
                              {book.title}
                            </span>
                          </div>

                          {/* Autor y pie de encuadernación */}
                          <div className="flex flex-col items-center gap-1">
                            <span className="[writing-mode:vertical-rl] rotate-180 text-[9px] font-medium text-amber-100/75 line-clamp-1 max-h-[45px]">
                              {book.author}
                            </span>

                            {/* Líneas doradas inferiores */}
                            <div className="w-full flex flex-col gap-0.5 opacity-70 mt-1">
                              <div className="w-full h-0.5 bg-amber-200/30" />
                              <div className="w-full h-0.5 bg-amber-200/50" />
                            </div>
                          </div>
                        </div>

                        {/* Sombra de apoyo en la base */}
                        <div className="absolute -bottom-1 inset-x-0 h-1 bg-black/60 blur-[1px]" />
                      </div>
                    );
                  })}
                </div>

                {/* Balda de madera maciza 3D */}
                <div className="relative z-10 w-full">
                  {/* Cara superior de la repisa */}
                  <div className="h-2 w-full bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 shadow-inner border-t border-amber-500/40" />

                  {/* Frontal de la balda de madera con moldura */}
                  <div className="h-5 w-full bg-gradient-to-r from-[#3e2417] via-[#543220] to-[#3e2417] shadow-[0_12px_24px_rgba(0,0,0,0.6)] border-b border-black flex items-center px-4">
                    <div className="w-full h-0.5 bg-amber-500/20" />
                  </div>

                  {/* Sombra proyectada en la pared debajo de la balda */}
                  <div className="h-4 w-full bg-gradient-to-b from-black/60 to-transparent" />
                </div>

              </div>
            ))}
          </div>

        </div>
      ) : (

        /* ========================================================
           VISTA CUADRÍCULA DE PORTADAS COMPLETAS
           ======================================================== */
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBooks.map((book) => {
            const progress = book.pages_total && book.pages_total > 0
              ? Math.min(100, Math.round(((book.pages_read || 0) / book.pages_total) * 100))
              : 0;

            return (
              <div
                key={book.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-xs transition duration-200 hover:border-violet-300 hover:shadow-md"
              >
                <div>
                  {/* Portada: Foto del libro real o Diseño con degradado */}
                  {book.cover_url ? (
                    <div className="relative mb-4 flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-neutral-100 to-neutral-50 p-2 border border-neutral-100">
                      <div className="relative h-44 w-32 overflow-hidden rounded-r-xl rounded-l-xs shadow-lg shadow-neutral-900/25 transition-transform duration-300 group-hover:scale-105 group-hover:-translate-y-1">
                        <img
                          src={book.cover_url}
                          alt={book.title}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-black/45 via-white/10 to-transparent pointer-events-none" />
                        <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-white/30 pointer-events-none" />
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />

                        {book.status === 'finished' && (
                          <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-amber-400/95 px-2 py-0.5 text-[10px] font-bold text-amber-950 shadow-sm backdrop-blur-xs">
                            <Star className="h-3 w-3 fill-amber-950 text-amber-950" />
                            <span>{book.rating || 5}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        'relative mb-4 flex h-36 w-full flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white shadow-inner',
                        book.cover_color || 'from-violet-600 to-indigo-800'
                      )}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/20" />
                      <div className="absolute left-2.5 top-0 bottom-0 w-1 bg-white/20" />

                      <div className="flex items-start justify-between pl-2">
                        <span className="rounded-full bg-black/30 px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase backdrop-blur-xs">
                          {book.genre || 'Lectura'}
                        </span>
                        {book.status === 'finished' && (
                          <div className="flex items-center gap-0.5 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold text-amber-950 backdrop-blur-xs">
                            <Star className="h-3 w-3 fill-amber-950 text-amber-950" />
                            <span>{book.rating || 5}</span>
                          </div>
                        )}
                      </div>

                      <div className="pl-2">
                        <h3 className="line-clamp-2 text-base font-bold leading-snug tracking-tight drop-shadow-xs">
                          {book.title}
                        </h3>
                        <p className="mt-0.5 line-clamp-1 text-xs opacity-85">
                          {book.author}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Título y Autor si tiene foto */}
                  {book.cover_url && (
                    <div className="mb-3">
                      <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold text-violet-700 uppercase">
                        {book.genre || 'Lectura'}
                      </span>
                      <h3 className="mt-1 line-clamp-1 text-base font-bold text-neutral-900">
                        {book.title}
                      </h3>
                      <p className="line-clamp-1 text-xs text-neutral-500">
                        {book.author}
                      </p>
                    </div>
                  )}

                  {/* Progreso de Lectura */}
                  {book.status === 'reading' && (
                    <div className="mb-4 rounded-2xl border border-neutral-100 bg-neutral-50 p-3">
                      <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                        <span className="text-neutral-600">Progreso</span>
                        <span className="text-violet-700">
                          {book.pages_read || 0} / {book.pages_total || '?'} págs ({progress}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200/70">
                        <div
                          className="h-full bg-violet-600 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-1">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleAddPages(book, 10)}
                            className="rounded-xl border border-neutral-200 bg-white px-2 py-1 text-[11px] font-bold text-neutral-700 hover:bg-neutral-100 transition"
                          >
                            +10 págs
                          </button>
                          <button
                            onClick={() => handleAddPages(book, 25)}
                            className="rounded-xl border border-neutral-200 bg-white px-2 py-1 text-[11px] font-bold text-neutral-700 hover:bg-neutral-100 transition"
                          >
                            +25 págs
                          </button>
                        </div>
                        <button
                          onClick={() => handleUpdateStatus(book, 'finished')}
                          className="flex items-center gap-1 rounded-xl bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-800 hover:bg-violet-200 transition"
                        >
                          <Check className="h-3 w-3 stroke-[3]" />
                          <span>¡Terminado!</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Notas o Citas */}
                  {book.notes && (
                    <p className="mb-4 text-xs italic leading-relaxed text-neutral-500 line-clamp-3">
                      «{book.notes}»
                    </p>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                  {book.status === 'wishlist' ? (
                    <button
                      onClick={() => handleUpdateStatus(book, 'reading')}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100 transition"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Empezar a leer</span>
                    </button>
                  ) : book.status === 'finished' ? (
                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Leído {book.finished_at ? `el ${book.finished_at}` : ''}
                    </span>
                  ) : (
                    <span className="text-[11px] text-neutral-400">
                      Iniciado {book.started_at ? `el ${book.started_at}` : ''}
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(book)}
                      className="rounded-xl p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
                      title="Editar libro"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteBook(book.id)}
                      className="rounded-xl p-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-500 transition"
                      title="Eliminar libro"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. MODAL DE DETALLES: LIBRO EXTRAÍDO DE LA ESTANTERÍA */}
      {selectedBookForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/75 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="flex w-full max-w-lg flex-col rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl">

            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-violet-700">
                Libro de tu estantería
              </span>
              <button
                onClick={() => setSelectedBookForDetails(null)}
                className="rounded-xl p-1 text-neutral-400 hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-5 items-center sm:items-start">

              {/* Portada 3D del libro */}
              <div className="relative h-52 w-36 shrink-0 overflow-hidden rounded-r-xl rounded-l-xs shadow-2xl">
                {selectedBookForDetails.cover_url ? (
                  <img
                    src={selectedBookForDetails.cover_url}
                    alt={selectedBookForDetails.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className={cn(
                    'h-full w-full flex flex-col justify-between p-3.5 text-white bg-gradient-to-br',
                    selectedBookForDetails.cover_color || 'from-violet-600 to-indigo-800'
                  )}>
                    <span className="text-[10px] font-bold uppercase opacity-80">
                      {selectedBookForDetails.genre}
                    </span>
                    <div>
                      <p className="text-sm font-bold line-clamp-2 leading-tight">
                        {selectedBookForDetails.title}
                      </p>
                      <p className="text-[11px] opacity-75 mt-0.5 line-clamp-1">
                        {selectedBookForDetails.author}
                      </p>
                    </div>
                  </div>
                )}
                {/* Relieve lomo */}
                <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-black/45 via-white/10 to-transparent pointer-events-none" />
                <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-white/30 pointer-events-none" />
              </div>

              {/* Información y progreso */}
              <div className="flex-1 space-y-3 w-full">
                <div>
                  <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold text-violet-700 uppercase">
                    {selectedBookForDetails.genre || 'Lectura'}
                  </span>
                  <h3 className="mt-1 text-lg font-bold text-neutral-900 leading-snug">
                    {selectedBookForDetails.title}
                  </h3>
                  <p className="text-xs text-neutral-500 font-medium">
                    {selectedBookForDetails.author}
                  </p>
                </div>

                {/* Rating si terminado */}
                {selectedBookForDetails.status === 'finished' && selectedBookForDetails.rating && (
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'h-4 w-4',
                          i < (selectedBookForDetails.rating || 5)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-neutral-200'
                        )}
                      />
                    ))}
                    <span className="text-xs font-bold text-neutral-600 ml-1">
                      {selectedBookForDetails.rating}/5 estrellas
                    </span>
                  </div>
                )}

                {/* Progreso */}
                {selectedBookForDetails.status === 'reading' && (
                  <div className="rounded-2xl bg-neutral-50 p-3 border border-neutral-100">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-neutral-600">Páginas leídas</span>
                      <span className="text-violet-700">
                        {selectedBookForDetails.pages_read || 0} / {selectedBookForDetails.pages_total || '?'}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden mb-2.5">
                      <div
                        className="h-full bg-violet-600 transition-all duration-300"
                        style={{
                          width: `${
                            selectedBookForDetails.pages_total
                              ? Math.min(100, Math.round(((selectedBookForDetails.pages_read || 0) / selectedBookForDetails.pages_total) * 100))
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleAddPages(selectedBookForDetails, 10)}
                        className="rounded-xl border border-neutral-200 bg-white px-2.5 py-1 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
                      >
                        +10 págs
                      </button>
                      <button
                        onClick={() => handleAddPages(selectedBookForDetails, 25)}
                        className="rounded-xl border border-neutral-200 bg-white px-2.5 py-1 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
                      >
                        +25 págs
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedBookForDetails, 'finished')}
                        className="ml-auto rounded-xl bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800 hover:bg-violet-200"
                      >
                        Terminado ✓
                      </button>
                    </div>
                  </div>
                )}

                {/* Notas / Citas */}
                {selectedBookForDetails.notes && (
                  <p className="text-xs italic text-neutral-600 bg-amber-50/60 p-2.5 rounded-2xl border border-amber-100">
                    «{selectedBookForDetails.notes}»
                  </p>
                )}

                {/* Acciones del libro */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                  <button
                    onClick={() => {
                      const b = selectedBookForDetails;
                      setSelectedBookForDetails(null);
                      handleOpenEdit(b);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Editar libro</span>
                  </button>

                  <button
                    onClick={() => {
                      handleDeleteBook(selectedBookForDetails.id);
                      setSelectedBookForDetails(null);
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL CREAR / EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h2 className="text-base font-bold text-neutral-900">
                {editingBook ? 'Editar libro' : 'Añadir nuevo libro'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1 text-neutral-400 hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="mt-4 space-y-3.5">

              {/* Sección de Portada / Foto */}
              <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-violet-600" />
                    <span>Foto de la portada</span>
                  </label>
                  {coverUrl && (
                    <button
                      type="button"
                      onClick={() => setCoverUrl(undefined)}
                      className="text-[11px] font-semibold text-rose-600 hover:underline"
                    >
                      Quitar foto
                    </button>
                  )}
                </div>

                {coverUrl ? (
                  <div className="flex items-center gap-3">
                    <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xs">
                      <img src={coverUrl} alt="Portada" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-neutral-800">Foto personalizada</p>
                      <p className="text-[11px] text-neutral-400">Recortada y optimizada para la estantería</p>
                      <button
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        className="mt-1.5 flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-2.5 py-1 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition shadow-2xs"
                      >
                        <Camera className="h-3.5 w-3.5 text-violet-600" />
                        <span>Ajustar o cambiar foto</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50/60 py-3 text-xs font-bold text-violet-700 hover:bg-violet-100/70 transition"
                    >
                      <Camera className="h-4 w-4" />
                      <span>Echar foto al libro con la cámara</span>
                    </button>

                    <div className="mt-2.5 border-t border-neutral-200/60 pt-2">
                      <p className="text-[10px] font-bold text-neutral-400 mb-1.5">O elige un color si prefieres portada tipográfica:</p>
                      <div className="flex gap-2">
                        {BOOK_COVER_PALETTES.map((palette) => (
                          <button
                            key={palette.id}
                            type="button"
                            onClick={() => setCoverColor(palette.gradient)}
                            className={cn(
                              'h-6 w-6 rounded-full bg-gradient-to-br shadow-xs transition-transform',
                              palette.gradient,
                              coverColor === palette.gradient
                                ? 'ring-2 ring-violet-500 ring-offset-2 scale-110'
                                : 'hover:scale-105 opacity-80'
                            )}
                            title={palette.label}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700">Título del libro *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. El Principito, Hábitos Atómicos..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:border-violet-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700">Autor *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Antoine de Saint-Exupéry"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:border-violet-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700">Estado</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as BookStatus)}
                    className="mt-1 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-800 focus:border-violet-500 focus:outline-none"
                  >
                    <option value="reading">Leyendo</option>
                    <option value="wishlist">Por leer</option>
                    <option value="finished">Terminado</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700">Género</label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-800 focus:border-violet-500 focus:outline-none"
                  >
                    {BOOK_GENRES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Páginas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700">Páginas leídas</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={pagesRead}
                    onChange={(e) => setPagesRead(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs font-medium text-neutral-900 focus:border-violet-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-700">Total páginas</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ej. 350"
                    value={pagesTotal}
                    onChange={(e) => setPagesTotal(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs font-medium text-neutral-900 focus:border-violet-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Puntuación (si terminado) */}
              {status === 'finished' && (
                <div>
                  <label className="text-xs font-bold text-neutral-700">Puntuación</label>
                  <div className="mt-1 flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 hover:scale-110 transition"
                      >
                        <Star
                          className={cn(
                            'h-5 w-5',
                            star <= rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-neutral-300'
                          )}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-bold text-amber-600">{rating} de 5</span>
                  </div>
                </div>
              )}

              {/* Notas */}
              <div>
                <label className="text-xs font-bold text-neutral-700">Notas o Cita favorita (opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Una frase que te marcó, ideas clave o tu opinión..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:border-violet-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-violet-700 transition"
                >
                  {editingBook ? 'Guardar cambios' : 'Añadir libro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL ESCANEAR/FOTO DE PORTADA CON ELIMINACIÓN DE FONDO */}
      <BookCoverScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onApply={(newCoverUrl) => setCoverUrl(newCoverUrl)}
        currentCover={coverUrl}
      />

    </div>
  );
}
