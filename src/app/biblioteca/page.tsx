'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Book, BookStatus } from '@/lib/types';
import {
  AlertCircle,
  BookOpen,
  Check,
  Clock3,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Users,
  LockKeyhole,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type BookFilter = 'all' | BookStatus;

const statusLabels: Record<BookStatus, string> = {
  want_to_read: 'Por leer',
  reading: 'Leyendo',
  read: 'Leídos',
};

const statusStyles: Record<BookStatus, string> = {
  want_to_read: 'bg-violet-50 text-violet-700 ring-violet-200',
  reading: 'bg-sky-50 text-sky-700 ring-sky-200',
  read: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

const normalizeText = (value: string) => value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

export default function BibliotecaPage() {
  const { books, bookError, reloadBooks, addBook, updateBook, deleteBook, isLoading, isSupabaseConnected, user } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<BookFilter>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formStatus, setFormStatus] = useState<BookStatus>('want_to_read');
  const [formVisibility, setFormVisibility] = useState<'private' | 'household'>('private');
  const [formRating, setFormRating] = useState(0);
  const [formPages, setFormPages] = useState('');
  const [formCurrentPage, setFormCurrentPage] = useState('');
  const [formCoverUrl, setFormCoverUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busyBookId, setBusyBookId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    savingRef.current = isSaving;
  }, [isSaving]);

  useEffect(() => {
    if (!isModalOpen) return;
    const triggerElement = triggerRef.current;
    titleRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !savingRef.current) {
        setIsModalOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !modalRef.current) return;
      const elements = Array.from(modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      triggerElement?.focus();
    };
  }, [isModalOpen]);

  const counts = useMemo(() => ({
    all: books.length,
    want_to_read: books.filter((book) => book.status === 'want_to_read').length,
    reading: books.filter((book) => book.status === 'reading').length,
    read: books.filter((book) => book.status === 'read').length,
  }), [books]);

  const filteredBooks = useMemo(() => {
    const query = normalizeText(search);
    return books.filter((book) => {
      const matchesStatus = filter === 'all' || book.status === filter;
      const matchesSearch = !query || [book.title, book.author, book.notes || ''].some((value) => normalizeText(value).includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [books, filter, search]);

  const openCreate = () => {
    setEditingBook(null);
    setFormTitle('');
    setFormAuthor('');
    setFormStatus('want_to_read');
    setFormVisibility('private');
    setFormRating(0);
    setFormPages('');
    setFormCurrentPage('');
    setFormCoverUrl('');
    setFormNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEdit = (book: Book) => {
    setEditingBook(book);
    setFormTitle(book.title);
    setFormAuthor(book.author);
    setFormStatus(book.status);
    setFormVisibility(book.household_id ? 'household' : 'private');
    setFormRating(book.rating || 0);
    setFormPages(book.page_count ? String(book.page_count) : '');
    setFormCurrentPage(book.current_page ? String(book.current_page) : '');
    setFormCoverUrl(book.cover_url || '');
    setFormNotes(book.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const title = formTitle.trim();
    const author = formAuthor.trim();
    const pageCount = formPages ? Number(formPages) : undefined;
    let currentPage = formCurrentPage ? Number(formCurrentPage) : 0;
    if (!title || !author) {
      setFormError('Escribe el título y el autor para guardar el libro.');
      return;
    }
    if (pageCount !== undefined && (!Number.isInteger(pageCount) || pageCount < 1)) {
      setFormError('El total de páginas debe ser un número entero mayor que cero.');
      return;
    }
    if (!Number.isInteger(currentPage) || currentPage < 0 || (pageCount !== undefined && currentPage > pageCount)) {
      setFormError('La página actual debe estar entre cero y el total de páginas.');
      return;
    }
    if (formStatus === 'read' && pageCount) currentPage = pageCount;
    if (formCoverUrl.trim()) {
      try {
        const url = new URL(formCoverUrl.trim());
        if (url.protocol !== 'https:') throw new Error('Se requiere HTTPS');
      } catch {
        setFormError('La portada debe ser una dirección web HTTPS válida.');
        return;
      }
    }

    const payload = {
      title,
      author,
      status: formStatus,
      user_id: user?.id,
      household_id: formVisibility === 'household' ? user?.household_id || null : null,
      rating: formRating || undefined,
      page_count: pageCount,
      current_page: currentPage,
      cover_url: formCoverUrl.trim() || undefined,
      notes: formNotes.trim() || undefined,
    };

    setIsSaving(true);
    setFormError(null);
    try {
      if (editingBook) await updateBook({ ...editingBook, ...payload });
      else await addBook(payload);
      setIsModalOpen(false);
      setNotice(editingBook ? 'Libro actualizado.' : 'Libro añadido a tu biblioteca.');
      window.setTimeout(() => setNotice(null), 3000);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el libro. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (book: Book) => {
    if (!window.confirm(`¿Eliminar «${book.title}» de tu biblioteca? Esta acción no se puede deshacer.`)) return;
    setBusyBookId(book.id);
    try {
      await deleteBook(book.id);
      setNotice('Libro eliminado.');
      window.setTimeout(() => setNotice(null), 3000);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo eliminar el libro.');
    } finally {
      setBusyBookId(null);
    }
  };

  const handleQuickUpdate = async (book: Book, changes: Partial<Book>) => {
    setBusyBookId(book.id);
    try {
      await updateBook({ ...book, ...changes });
      setNotice('Progreso actualizado.');
      window.setTimeout(() => setNotice(null), 2500);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo actualizar el libro.');
    } finally {
      setBusyBookId(null);
    }
  };

  const statusTabs: { id: BookFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Todos', count: counts.all },
    { id: 'reading', label: 'Leyendo', count: counts.reading },
    { id: 'want_to_read', label: 'Por leer', count: counts.want_to_read },
    { id: 'read', label: 'Leídos', count: counts.read },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 pt-6 sm:px-6 sm:pt-9">
      <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-700">
            <BookOpen className="h-3.5 w-3.5" /> Canal de lectura
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">Mi biblioteca</h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-neutral-500">Guarda lo que quieres leer, sigue tu progreso y conserva las puntuaciones de tus libros.</p>
        </div>
        <button
          ref={triggerRef}
          type="button"
          onClick={openCreate}
          disabled={isLoading}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        >
          <Plus className="h-4 w-4" /> Añadir libro
        </button>
      </header>

      {bookError && (
        <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="flex-1">
            <p className="font-bold">La biblioteca necesita atención</p>
            <p className="mt-1 leading-6">{bookError}</p>
            <button type="button" disabled={isLoading} onClick={() => void reloadBooks()} className="mt-2 inline-flex items-center gap-1 font-bold underline underline-offset-2 disabled:opacity-50">
              {isLoading && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />} Volver a intentarlo
            </button>
          </div>
        </div>
      )}

      {formError && !isModalOpen && (
        <div role="alert" className="mb-4 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0" /> <span>{formError}</span>
          <button type="button" aria-label="Cerrar aviso" onClick={() => setFormError(null)} className="ml-auto rounded-lg p-1 hover:bg-red-100"><X className="h-4 w-4" /></button>
        </div>
      )}
      {notice && <p role="status" className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}

      <section aria-label="Resumen de lectura" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'En biblioteca', value: counts.all, style: 'from-violet-50 to-white text-violet-700' },
          { label: 'Leyendo', value: counts.reading, style: 'from-sky-50 to-white text-sky-700' },
          { label: 'Por leer', value: counts.want_to_read, style: 'from-amber-50 to-white text-amber-700' },
          { label: 'Terminados', value: counts.read, style: 'from-emerald-50 to-white text-emerald-700' },
        ].map((item) => (
          <div key={item.label} className={cn('rounded-2xl border border-neutral-200/70 bg-gradient-to-br p-4', item.style)}>
            <p className="text-2xl font-extrabold">{item.value}</p>
            <p className="mt-0.5 text-xs font-semibold text-neutral-500">{item.label}</p>
          </div>
        ))}
      </section>

      <section className="mb-5 space-y-3" aria-label="Buscar y filtrar libros">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            aria-label="Buscar por título, autor o notas"
            placeholder="Buscar por título, autor o notas…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-2xl border border-neutral-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar libros por estado">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              className={cn('inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition', filter === tab.id ? 'bg-neutral-900 text-white' : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50')}
            >
              {tab.label}<span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', filter === tab.id ? 'bg-white/15' : 'bg-neutral-100')}>{tab.count}</span>
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="flex min-h-64 items-center justify-center rounded-3xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-500"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Cargando libros…</div>
      ) : !bookError && filteredBooks.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Libros de la biblioteca">
          {filteredBooks.map((book) => {
            const progress = book.page_count ? Math.min(100, Math.round(((book.current_page || 0) / book.page_count) * 100)) : 0;
            return (
              <article key={book.id} className="group flex min-h-64 flex-col rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
                <div className="flex items-start gap-4">
                  <div className="flex h-24 w-[4.25rem] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-100 via-indigo-50 to-white text-violet-500 shadow-inner">
                    {book.cover_url ? (
                      // User supplied hosts are intentionally loaded directly instead of through the image optimizer.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={book.cover_url} alt={`Portada de ${book.title}`} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                    ) : <BookOpen className="h-7 w-7" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset', statusStyles[book.status])}>{statusLabels[book.status]}</span>
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-neutral-400">{book.household_id ? <Users className="h-3 w-3" /> : <LockKeyhole className="h-3 w-3" />}{book.household_id ? 'Compartido en el hogar' : 'Personal'}</span>
                    <h2 className="mt-2 line-clamp-2 text-base font-extrabold leading-5 text-neutral-900">{book.title}</h2>
                    <p className="mt-1 line-clamp-1 text-xs font-medium text-neutral-500">{book.author}</p>
                    {book.rating ? <div className="mt-2 flex items-center gap-0.5" aria-label={`Puntuación: ${book.rating} de 5 estrellas`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={cn('h-3.5 w-3.5', index < book.rating! ? 'fill-amber-400 text-amber-400' : 'text-neutral-200')} />)}</div> : null}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button type="button" onClick={() => openEdit(book)} aria-label={`Editar ${book.title}`} className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => void handleDelete(book)} disabled={busyBookId === book.id} aria-label={`Eliminar ${book.title}`} className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                {book.page_count ? (
                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-neutral-500"><span>{book.status === 'read' ? 'Lectura completada' : 'Progreso de lectura'}</span><span>{book.current_page || 0}/{book.page_count} pág. · {progress}%</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-100"><div className={cn('h-full rounded-full transition-all', book.status === 'read' ? 'bg-emerald-500' : 'bg-violet-500')} style={{ width: `${progress}%` }} /></div>
                  </div>
                ) : null}
                {book.notes && <p className="mt-3 line-clamp-3 text-xs leading-5 text-neutral-500">{book.notes}</p>}
                <div className="mt-auto flex gap-2 pt-4">
                  {book.status === 'want_to_read' && <button type="button" disabled={busyBookId === book.id} onClick={() => void handleQuickUpdate(book, { status: 'reading', current_page: book.current_page || 0 })} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-sky-50 px-3 text-xs font-bold text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"><BookOpen className="h-3.5 w-3.5" /> Empezar a leer</button>}
                  {book.status === 'reading' && <button type="button" onClick={() => openEdit(book)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-50 px-3 text-xs font-bold text-violet-700 transition hover:bg-violet-100"><Clock3 className="h-3.5 w-3.5" /> Actualizar progreso</button>}
                  {book.status === 'read' && <span className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-700"><Check className="h-3.5 w-3.5" /> Terminado</span>}
                </div>
              </article>
            );
          })}
        </section>
      ) : !bookError && (
        <div className="rounded-3xl border border-dashed border-neutral-300 bg-white px-5 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><BookOpen className="h-7 w-7" /></div>
          <h2 className="mt-4 text-lg font-extrabold text-neutral-900">{books.length ? 'No se encontraron libros' : 'Empieza tu biblioteca'}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">{books.length ? 'Prueba con otro título, autor o estado.' : 'Guarda tus próximas lecturas, apunta el progreso y puntúa tus libros terminados.'}</p>
          {books.length ? <button type="button" onClick={() => { setSearch(''); setFilter('all'); }} className="mt-4 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">Quitar búsqueda y filtros</button> : <button type="button" onClick={openCreate} disabled={isLoading} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"><Plus className="h-4 w-4" /> Añadir primer libro</button>}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/45 p-3 backdrop-blur-sm sm:p-5">
          <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="book-dialog-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-4">
              <div><p className="text-xs font-bold uppercase tracking-wider text-violet-600">Mi biblioteca</p><h2 id="book-dialog-title" className="mt-1 text-xl font-extrabold text-neutral-900">{editingBook ? 'Editar libro' : 'Añadir libro'}</h2></div>
              <button type="button" aria-label="Cerrar formulario" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="rounded-xl p-2 text-neutral-400 hover:bg-neutral-100 disabled:opacity-40"><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-neutral-700 sm:col-span-2">Título *<input ref={titleRef} required autoComplete="off" value={formTitle} onChange={(event) => setFormTitle(event.target.value)} placeholder="El nombre del libro" className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm font-normal outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label>
              <label className="text-xs font-bold text-neutral-700 sm:col-span-2">Autor *<input required autoComplete="off" value={formAuthor} onChange={(event) => setFormAuthor(event.target.value)} placeholder="Nombre del autor" className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm font-normal outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label>
              <label className="text-xs font-bold text-neutral-700">Estado<select value={formStatus} onChange={(event) => setFormStatus(event.target.value as BookStatus)} className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-violet-400">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              {user?.household_id ? <label className="text-xs font-bold text-neutral-700">Visibilidad<select value={formVisibility} onChange={(event) => setFormVisibility(event.target.value as 'private' | 'household')} className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-violet-400"><option value="private" disabled={Boolean(editingBook?.household_id && editingBook.user_id !== user.id)}>Solo yo</option><option value="household">Compartir con mi hogar</option></select>{editingBook?.household_id && editingBook.user_id !== user.id && <span className="mt-1 block text-[10px] font-medium text-neutral-400">Solo quien añadió el libro puede volverlo privado.</span>}</label> : <p className="rounded-xl bg-violet-50 p-3 text-xs leading-5 text-violet-800 sm:col-span-2">{isSupabaseConnected && user ? 'Este libro será privado y quedará asociado a tu cuenta.' : 'Modo local: este libro sólo se guardará en el navegador de este dispositivo.'}</p>}
              <div>
                <p className="text-xs font-bold text-neutral-700">Puntuación</p>
                <div className="mt-1 flex h-11 items-center gap-1" role="group" aria-label="Puntuación de una a cinco estrellas">
                  {Array.from({ length: 5 }, (_, index) => {
                    const value = index + 1;
                    return <button key={value} type="button" onClick={() => setFormRating(formRating === value ? 0 : value)} aria-label={formRating === value ? `Quitar puntuación ${value}` : `Puntuar con ${value} de 5`} aria-pressed={formRating === value} className="rounded-md p-1"><Star className={cn('h-5 w-5 transition', value <= formRating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300 hover:text-amber-300')} /></button>;
                  })}
                  <span className="ml-1 text-xs font-semibold text-neutral-500">{formRating ? `${formRating}/5` : 'Sin puntuar'}</span>
                </div>
              </div>
              <label className="text-xs font-bold text-neutral-700">Páginas totales<input type="number" min="1" step="1" inputMode="numeric" value={formPages} onChange={(event) => setFormPages(event.target.value)} placeholder="Opcional" className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-violet-400" /></label>
              <label className="text-xs font-bold text-neutral-700">Página actual<input type="number" min="0" max={formPages || undefined} step="1" inputMode="numeric" value={formCurrentPage} onChange={(event) => setFormCurrentPage(event.target.value)} placeholder="0" disabled={!formPages} className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-violet-400 disabled:bg-neutral-50 disabled:text-neutral-400" /></label>
              <label className="text-xs font-bold text-neutral-700 sm:col-span-2">URL de portada (HTTPS)<input type="url" value={formCoverUrl} onChange={(event) => setFormCoverUrl(event.target.value)} placeholder="https://…" className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-violet-400" /></label>
              <label className="text-xs font-bold text-neutral-700 sm:col-span-2">Notas<textarea rows={3} value={formNotes} onChange={(event) => setFormNotes(event.target.value)} placeholder="Ideas, citas o comentarios sobre el libro…" className="mt-1.5 w-full resize-y rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-violet-400" /></label>
            </div>

            {formError && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{formError}</p>}

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-neutral-100 pt-4 sm:flex-row sm:justify-end">
              <button type="button" disabled={isSaving} onClick={() => setIsModalOpen(false)} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 disabled:opacity-40">Cancelar</button>
              <button type="button" disabled={!formTitle.trim() || !formAuthor.trim() || isSaving || isLoading} onClick={() => void handleSave()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Guardando…</> : <><Plus className="h-4 w-4" /> Guardar libro</>}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
