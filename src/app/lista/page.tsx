'use client';

import React, { useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ShoppingCategory } from '@/lib/types';
import { SHOPPING_CATEGORIES } from '@/lib/constants';
import {
  Plus,
  Check,
  Trash2,
  ShoppingBag,
  Store,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Pencil,
  ShoppingCart,
} from 'lucide-react';
import { cn, guessShoppingCategory } from '@/lib/utils';
import confetti from 'canvas-confetti';

// ---------- Sub-componente: Ítem de compra ----------
function ShoppingItemRow({
  item,
  isSuperMode,
  onToggle,
  onDelete,
  onEdit,
}: {
  item: { id: string; name: string; quantity?: string; is_bought: boolean; category: ShoppingCategory };
  isSuperMode: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      className={cn(
        'group relative flex cursor-pointer items-center gap-3 rounded-2xl border transition-all duration-200',
        isSuperMode ? 'px-4 py-4' : 'px-3.5 py-3',
        item.is_bought
          ? 'border-neutral-100 bg-neutral-50/60'
          : 'border-neutral-200/70 bg-white hover:border-emerald-300 hover:shadow-sm shadow-xs'
      )}
    >
      {/* Checkbox */}
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-200',
          isSuperMode ? 'h-8 w-8' : 'h-5 w-5',
          item.is_bought
            ? 'border-emerald-500 bg-emerald-500'
            : 'border-neutral-300 group-hover:border-emerald-400'
        )}
      >
        {item.is_bought && (
          <Check
            className={cn(
              'text-white',
              isSuperMode ? 'h-5 w-5 stroke-[3]' : 'h-3 w-3 stroke-[3]'
            )}
          />
        )}
      </div>

      {/* Texto */}
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'block font-semibold leading-tight',
            isSuperMode ? 'text-base' : 'text-sm',
            item.is_bought ? 'text-neutral-400 line-through' : 'text-neutral-800'
          )}
        >
          {item.name}
        </span>
        {item.quantity && (
          <span
            className={cn(
              'block mt-0.5',
              isSuperMode ? 'text-sm' : 'text-xs',
              item.is_bought ? 'text-neutral-300' : 'text-neutral-400'
            )}
          >
            {item.quantity}
          </span>
        )}
      </div>

      {/* Acciones — visibles al hover en escritorio, siempre en móvil */}
      <div
        className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onEdit}
          className="rounded-xl p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
          title="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-xl p-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-500 transition"
          title="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------- Sub-componente: Grupo de categoría ----------
function CategoryGroup({
  categoryName,
  items,
  isSuperMode,
  onToggle,
  onDelete,
  onEdit,
}: {
  categoryName: ShoppingCategory;
  items: ReturnType<typeof useApp>['shoppingItems'];
  isSuperMode: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item: (typeof items)[0]) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const catInfo = SHOPPING_CATEGORIES.find((c) => c.name === categoryName);
  const pendingCount = items.filter((i) => !i.is_bought).length;
  const allDone = pendingCount === 0;

  return (
    <div className="mb-4">
      {/* Cabecera de categoría */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          'mb-2 flex w-full items-center justify-between rounded-2xl px-3 py-2 transition',
          allDone ? 'opacity-50' : '',
          catInfo ? `${catInfo.bg} ${catInfo.border} border` : 'bg-neutral-50 border border-neutral-200'
        )}
      >
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-bold', catInfo?.color ?? 'text-neutral-700')}>
            {categoryName}
          </span>
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
              allDone
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-white/70 text-neutral-600'
            )}
          >
            {allDone ? '✓ Todo comprado' : `${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''}`}
          </span>
        </div>
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
        )}
      </button>

      {/* Items */}
      {!collapsed && (
        <div className="space-y-1.5 pl-1">
          {items.map((item) => (
            <ShoppingItemRow
              key={item.id}
              item={item}
              isSuperMode={isSuperMode}
              onToggle={() => onToggle(item.id)}
              onDelete={() => onDelete(item.id)}
              onEdit={() => onEdit(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Componente principal ----------
function ListaContent() {
  const searchParams = useSearchParams();
  const { shoppingItems, addShoppingItem, toggleShoppingItem, deleteShoppingItem, clearBoughtItems } =
    useApp();

  // ------ Estado del formulario ------
  const [nameInput, setNameInput] = useState('');
  const [quantityInput, setQuantityInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ShoppingCategory | ''>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // ------ Búsqueda ------
  const [searchQuery, setSearchQuery] = useState('');

  // ------ Modo Súper ------
  const [superModeOverride, setSuperModeOverride] = useState<boolean | null>(null);
  const isSuperMode = superModeOverride ?? searchParams.get('modo') === 'super';

  // ------ Agrupación por categorías ------
  const [groupByCategory, setGroupByCategory] = useState(true);

  // ------ Filtro activo ------
  const [activeFilter, setActiveFilter] = useState<'todas' | 'pendientes' | 'comprados'>('pendientes');

  // ------ Modal de edición ------
  const [editingItem, setEditingItem] = useState<typeof shoppingItems[0] | null>(null);
  const [editName, setEditName] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editCat, setEditCat] = useState<ShoppingCategory | ''>('');

  // ------ Modal confirmación vaciar ------
  const [confirmClear, setConfirmClear] = useState(false);

  // ------ Cálculos ------
  const totalCount = shoppingItems.length;
  const boughtCount = shoppingItems.filter((i) => i.is_bought).length;
  const pendingCount = totalCount - boughtCount;
  const percent = totalCount === 0 ? 0 : Math.round((boughtCount / totalCount) * 100);

  // Filtrado + búsqueda
  const visibleItems = shoppingItems.filter((item) => {
    const matchesFilter =
      activeFilter === 'todas' ||
      (activeFilter === 'pendientes' && !item.is_bought) ||
      (activeFilter === 'comprados' && item.is_bought);
    const matchesSearch =
      !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Agrupar por categoría
  const grouped: Record<string, typeof shoppingItems> = {};
  visibleItems.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  // Ordenar categorías (pendientes primero)
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const aPending = grouped[a].some((i) => !i.is_bought);
    const bPending = grouped[b].some((i) => !i.is_bought);
    if (aPending && !bPending) return -1;
    if (!aPending && bPending) return 1;
    return a.localeCompare(b);
  });

  // ------ Handlers ------
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    addShoppingItem(
      nameInput.trim(),
      selectedCategory ? (selectedCategory as ShoppingCategory) : undefined,
      quantityInput.trim() || undefined
    );
    setNameInput('');
    setQuantityInput('');
    setSelectedCategory('');
    inputRef.current?.focus();
  };

  const handleToggle = (id: string) => {
    const item = shoppingItems.find((i) => i.id === id);
    if (!item) return;
    toggleShoppingItem(id);

    // Confetti al completar el último pendiente
    const pending = shoppingItems.filter((i) => !i.is_bought);
    if (!item.is_bought && pending.length === 1 && pending[0].id === id) {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#6ee7b7', '#f59e0b', '#fbbf24'],
      });
    }
  };

  const handleOpenEdit = (item: typeof shoppingItems[0]) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditQty(item.quantity || '');
    setEditCat(item.category);
  };

  const handleSaveEdit = () => {
    if (!editingItem || !editName.trim()) return;
    // Eliminar y re-crear con los datos editados (workaround simple sin función updateShoppingItem)
    deleteShoppingItem(editingItem.id);
    addShoppingItem(
      editName.trim(),
      (editCat || guessShoppingCategory(editName)) as ShoppingCategory,
      editQty.trim() || undefined
    );
    setEditingItem(null);
  };

  const handleUncheckAll = () => {
    shoppingItems
      .filter((i) => i.is_bought)
      .forEach((i) => toggleShoppingItem(i.id));
  };

  // ============================================================
  // MODO SÚPER: interfaz completamente diferente
  // ============================================================
  if (isSuperMode) {
    const superItems = shoppingItems.filter((i) => !i.is_bought);
    const superDone = shoppingItems.filter((i) => i.is_bought);

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#FAFAFA]">
        {/* Cabecera Modo Súper */}
        <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-emerald-600" />
              <h1 className="text-base font-bold text-neutral-900">Modo En el Súper</h1>
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">
              {superItems.length} pendiente{superItems.length !== 1 ? 's' : ''} · {superDone.length} en la cesta
            </p>
          </div>
          <button
            onClick={() => setSuperModeOverride(false)}
            className="flex items-center gap-1.5 rounded-2xl border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
          >
            <X className="h-3.5 w-3.5" /> Salir
          </button>
        </div>

        {/* Barra de progreso fija */}
        <div className="h-1.5 w-full bg-neutral-100">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{
              width: `${totalCount === 0 ? 0 : Math.round((superDone.length / totalCount) * 100)}%`,
            }}
          />
        </div>

        {/* Lista grande para el súper */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {superItems.length === 0 && (
            <div className="mt-16 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600">
                <ShoppingCart className="h-8 w-8" />
              </div>
              <p className="text-lg font-bold text-neutral-800">¡Cesta completada!</p>
              <p className="mt-1 text-sm text-neutral-500">Has comprado todo lo que necesitabas 🎉</p>
              <button
                onClick={() => setSuperModeOverride(false)}
                className="mt-6 rounded-2xl bg-neutral-900 px-6 py-3 text-sm font-bold text-white"
              >
                Volver a la lista
              </button>
            </div>
          )}

          <div className="space-y-2.5">
            {superItems.map((item) => {
              const catInfo = SHOPPING_CATEGORIES.find((c) => c.name === item.category);
              return (
                <div
                  key={item.id}
                  onClick={() => handleToggle(item.id)}
                  className="flex cursor-pointer items-center gap-4 rounded-3xl border border-neutral-200/80 bg-white px-5 py-4 shadow-xs active:scale-[0.98] transition-transform"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border-2 border-neutral-300">
                    {/* vacío, al tocar se rellena */}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-neutral-900">{item.name}</p>
                    {item.quantity && (
                      <p className="text-sm text-neutral-400">{item.quantity}</p>
                    )}
                  </div>
                  {catInfo && (
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold border',
                        catInfo.bg,
                        catInfo.color,
                        catInfo.border
                      )}
                    >
                      {catInfo.name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Comprados (en modo súper, al final, más pequeños) */}
          {superDone.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 px-1 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                En la cesta ({superDone.length})
              </p>
              <div className="space-y-1.5">
                {superDone.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggle(item.id)}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-neutral-100 bg-neutral-50/60 px-4 py-3 opacity-60"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
                      <Check className="h-4 w-4 stroke-[3] text-white" />
                    </div>
                    <span className="text-sm font-medium text-neutral-400 line-through">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // VISTA NORMAL
  // ============================================================
  return (
    <div className="mx-auto max-w-4xl px-4 pb-10 pt-6 sm:px-6 sm:pt-8">

      {/* 1. CABECERA */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              Lista de la Compra
            </h1>
            {pendingCount > 0 && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                {pendingCount} pendientes
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Organizada automáticamente por pasillos del supermercado
          </p>
        </div>

        {/* Botón Modo Súper */}
        <button
          onClick={() => setSuperModeOverride(true)}
          className="flex shrink-0 items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-emerald-500/30 hover:bg-emerald-700 transition"
        >
          <Store className="h-4 w-4" />
          <span>Ir al Súper 🛒</span>
        </button>
      </div>

      {/* 2. BARRA DE PROGRESO */}
      <div className="mb-5 overflow-hidden rounded-3xl border border-neutral-200/80 bg-white p-4 shadow-xs">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-neutral-700">
            Progreso de la compra
          </span>
          <span className={cn('text-xs font-bold', percent === 100 ? 'text-emerald-600' : 'text-neutral-500')}>
            {boughtCount}/{totalCount} · {percent}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              percent === 100 ? 'bg-emerald-500' : 'bg-emerald-500'
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
        {percent === 100 && totalCount > 0 && (
          <p className="mt-2 text-center text-xs font-semibold text-emerald-600">
            🎉 ¡Compra completada! Puedes limpiar la lista ahora.
          </p>
        )}
      </div>

      {/* 3. FORMULARIO AÑADIR */}
      <form
        onSubmit={handleAddItem}
        className="mb-5 rounded-3xl border border-neutral-200/80 bg-white p-4 shadow-xs"
      >
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Plus className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="¿Qué necesitas? (ej. Aguacates, Leche, Detergente...)"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <input
            type="text"
            placeholder="Cantidad"
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
            className="w-full sm:w-28 rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as ShoppingCategory)}
            className="rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs font-semibold text-neutral-700 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Auto-categoría</option>
            {SHOPPING_CATEGORIES.map((cat) => (
              <option key={cat.name} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!nameInput.trim()}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-neutral-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 disabled:opacity-40 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Añadir</span>
          </button>
        </div>
      </form>

      {/* 4. BARRA DE HERRAMIENTAS: Búsqueda + Filtros + Opciones */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar en la lista..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-neutral-200/80 bg-white py-2 pl-9 pr-4 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 shadow-xs focus:border-emerald-500 focus:outline-none"
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

        {/* Filtros */}
        <div className="flex items-center gap-1.5">
          {(['todas', 'pendientes', 'comprados'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                'rounded-2xl px-3 py-1.5 text-xs font-semibold capitalize transition',
                activeFilter === f
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'border border-neutral-200/80 bg-white text-neutral-600 hover:bg-neutral-100'
              )}
            >
              {f === 'todas' ? 'Todas' : f === 'pendientes' ? 'Pendientes' : 'Comprados'}
            </button>
          ))}
        </div>

        {/* Toggle agrupar */}
        <button
          onClick={() => setGroupByCategory(!groupByCategory)}
          className={cn(
            'flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-semibold border transition',
            groupByCategory
              ? 'bg-neutral-900 text-white border-neutral-900'
              : 'bg-white border-neutral-200/80 text-neutral-600 hover:bg-neutral-100'
          )}
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          <span>{groupByCategory ? 'Por pasillos' : 'Lista simple'}</span>
        </button>
      </div>

      {/* 5. LISTA DE ARTÍCULOS */}
      {visibleItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-200 bg-white/50 p-12 text-center">
          <ShoppingBag className="mx-auto mb-2 h-8 w-8 text-neutral-300" />
          <p className="text-sm font-semibold text-neutral-600">
            {searchQuery ? 'No hay resultados para esa búsqueda' : 'No hay artículos en esta vista'}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            {searchQuery
              ? 'Prueba con otro término'
              : 'Añade productos arriba o transfiérelos desde el planificador semanal'}
          </p>
        </div>
      ) : groupByCategory ? (
        // Vista agrupada por pasillos
        <div>
          {sortedCategories.map((cat) => (
            <CategoryGroup
              key={cat}
              categoryName={cat as ShoppingCategory}
              items={grouped[cat]}
              isSuperMode={false}
              onToggle={handleToggle}
              onDelete={deleteShoppingItem}
              onEdit={handleOpenEdit}
            />
          ))}
        </div>
      ) : (
        // Vista lista simple
        <div className="space-y-2">
          {visibleItems.map((item) => (
            <ShoppingItemRow
              key={item.id}
              item={item}
              isSuperMode={false}
              onToggle={() => handleToggle(item.id)}
              onDelete={() => deleteShoppingItem(item.id)}
              onEdit={() => handleOpenEdit(item)}
            />
          ))}
        </div>
      )}

      {/* 6. ACCIONES DE GESTIÓN */}
      {(boughtCount > 0 || shoppingItems.length > 0) && (
        <div className="mt-8 flex flex-wrap justify-end gap-2">
          {boughtCount > 0 && (
            <button
              onClick={handleUncheckAll}
              className="flex items-center gap-1.5 rounded-2xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Desmarcar todos</span>
            </button>
          )}
          {boughtCount > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Eliminar comprados ({boughtCount})</span>
            </button>
          )}
        </div>
      )}

      {/* 7. MODAL EDICIÓN */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-neutral-900">Editar artículo</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="rounded-xl p-1 text-neutral-400 hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-700">Nombre</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-neutral-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-700">Cantidad</label>
                <input
                  type="text"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  placeholder="Ej. 1 kg, 2 botes..."
                  className="mt-1 w-full rounded-2xl border border-neutral-200 px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-700">Categoría</label>
                <select
                  value={editCat}
                  onChange={(e) => setEditCat(e.target.value as ShoppingCategory)}
                  className="mt-1 w-full rounded-2xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 focus:border-emerald-500 focus:outline-none"
                >
                  {SHOPPING_CATEGORIES.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditingItem(null)}
                className="rounded-2xl px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editName.trim()}
                className="rounded-2xl bg-neutral-900 px-5 py-2 text-xs font-bold text-white hover:bg-neutral-800 disabled:opacity-40"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL CONFIRMACIÓN LIMPIAR */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900">
              ¿Eliminar los {boughtCount} artículos comprados?
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <button
                onClick={() => setConfirmClear(false)}
                className="rounded-2xl px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  clearBoughtItems();
                  setConfirmClear(false);
                }}
                className="rounded-2xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ListaPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl p-12 text-center text-xs text-neutral-400">
          Cargando tu lista de la compra...
        </div>
      }
    >
      <ListaContent />
    </Suspense>
  );
}
