'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Recipe, MealType, ShoppingCategory } from '@/lib/types';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  ChefHat, 
  ShoppingCart, 
  Search, 
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RecetasPage() {
  const { recipes, addRecipe, updateRecipe, deleteRecipe, addIngredientsToShopping } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('todos');

  // Modal para Crear / Editar Receta
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State dentro del Modal
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<MealType>('almuerzo');
  const [formNotes, setFormNotes] = useState('');
  const [formIngredients, setFormIngredients] = useState<{ name: string; quantity: string; category?: ShoppingCategory }[]>([]);

  // Input temporal de nuevo ingrediente
  const [newIngName, setNewIngName] = useState('');
  const [newIngQty, setNewIngQty] = useState('');

  // Notificación de ingredientes añadidos a la compra
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingRecipe(null);
    setFormName('');
    setFormCategory('almuerzo');
    setFormNotes('');
    setFormIngredients([]);
    setIsModalOpen(true);
  };

  const openEditModal = (rec: Recipe) => {
    setEditingRecipe(rec);
    setFormName(rec.name);
    setFormCategory(rec.category);
    setFormNotes(rec.notes || '');
    setFormIngredients(rec.ingredients.map((i) => ({ name: i.name, quantity: i.quantity || '', category: i.category })));
    setIsModalOpen(true);
  };

  const handleAddIngredientToForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngName.trim()) return;
    setFormIngredients((prev) => [
      ...prev,
      { name: newIngName.trim(), quantity: newIngQty.trim() }
    ]);
    setNewIngName('');
    setNewIngQty('');
  };

  const handleRemoveIngredientFromForm = (index: number) => {
    setFormIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveRecipe = async () => {
    if (!formName.trim()) return;

    if (editingRecipe) {
      await updateRecipe({
        ...editingRecipe,
        name: formName.trim(),
        category: formCategory,
        notes: formNotes.trim() || undefined,
        ingredients: formIngredients,
      });
    } else {
      await addRecipe({
        name: formName.trim(),
        category: formCategory,
        notes: formNotes.trim() || undefined,
        ingredients: formIngredients,
      });
    }

    setIsModalOpen(false);
  };

  const handleSendToShopping = async (recipe: Recipe) => {
    if (!recipe.ingredients.length) return;
    const count = await addIngredientsToShopping(recipe.ingredients);
    setAddedNotice(`¡${count} ingredientes de "${recipe.name}" añadidos a la cesta!`);
    setTimeout(() => setAddedNotice(null), 2500);
  };

  // Filtrado de recetas
  const filteredRecipes = recipes.filter((rec) => {
    const matchesSearch = rec.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.ingredients.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = filterCategory === 'todos' || rec.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-8">
      
      {/* 1. CABECERA */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            Tus Platos Habituales
          </h1>
          <p className="text-sm text-neutral-500">
            Guarda tus comidas frecuentes con sus ingredientes para planificar la semana en segundos
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 self-start rounded-2xl bg-neutral-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Plato</span>
        </button>
      </div>

      {/* Notificación flotante de compra */}
      {addedNotice && (
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-bold text-white shadow-md shadow-emerald-500/20 animate-in fade-in">
          <span>{addedNotice}</span>
          <button onClick={() => setAddedNotice(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 2. BUSCADOR Y FILTROS */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por nombre de plato o ingrediente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-neutral-200/80 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-neutral-900 placeholder:text-neutral-400 shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'almuerzo', label: 'Almuerzos' },
            { id: 'cena', label: 'Cenas' },
            { id: 'desayuno', label: 'Desayunos' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={cn(
                'shrink-0 rounded-2xl px-3.5 py-2 text-xs font-semibold transition',
                filterCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'border border-neutral-200/80 bg-white text-neutral-600 hover:bg-neutral-100'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. PARRILLA DE RECETAS */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredRecipes.map((rec) => (
          <div
            key={rec.id}
            className="flex flex-col justify-between rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-xs transition hover:border-neutral-300 hover:shadow-sm"
          >
            <div>
              {/* Categoría y opciones */}
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                  {rec.category}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(rec)}
                    className="rounded-xl p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
                    title="Editar receta"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteRecipe(rec.id)}
                    className="rounded-xl p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500 transition"
                    title="Eliminar receta"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Título y notas */}
              <h3 className="mt-3 text-base font-bold text-neutral-900">{rec.name}</h3>
              {rec.notes && (
                <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{rec.notes}</p>
              )}

              {/* Lista de ingredientes */}
              <div className="mt-4 border-t border-neutral-100 pt-3">
                <span className="text-[11px] font-bold text-neutral-400">
                  Ingredientes ({rec.ingredients.length}):
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {rec.ingredients.slice(0, 5).map((ing, idx) => (
                    <span
                      key={idx}
                      className="rounded-xl bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-700 border border-neutral-100"
                    >
                      {ing.name} {ing.quantity && <span className="text-neutral-400">({ing.quantity})</span>}
                    </span>
                  ))}
                  {rec.ingredients.length > 5 && (
                    <span className="rounded-xl bg-neutral-50 px-2 py-1 text-[11px] text-neutral-400">
                      +{rec.ingredients.length - 5} más
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Acción rápida: Añadir ingredientes a la lista de compra */}
            <div className="mt-5 border-t border-neutral-100 pt-3">
              <button
                onClick={() => handleSendToShopping(rec)}
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-emerald-50 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>Añadir ingredientes a la compra</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredRecipes.length === 0 && (
        <div className="rounded-3xl border border-dashed border-neutral-200 bg-white p-12 text-center">
          <ChefHat className="mx-auto h-8 w-8 text-neutral-300 mb-2" />
          <p className="text-sm font-semibold text-neutral-600">No se encontraron platos</p>
          <p className="text-xs text-neutral-400 mt-1">
            Crea uno nuevo con el botón superior para empezar tu biblioteca
          </p>
        </div>
      )}

      {/* 4. MODAL CREAR / EDITAR RECETA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-base font-bold text-neutral-900">
                {editingRecipe ? 'Editar Plato' : 'Nuevo Plato Habitual'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1 text-neutral-400 hover:bg-neutral-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-bold text-neutral-700">Nombre del plato:</label>
                <input
                  type="text"
                  placeholder="Ej. Pollo al curry con arroz basmati"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-neutral-200 px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700">Tipo de comida:</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as MealType)}
                    className="mt-1 w-full rounded-2xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-800 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="almuerzo">Almuerzo / Comida</option>
                    <option value="cena">Cena</option>
                    <option value="desayuno">Desayuno</option>
                    <option value="merienda">Merienda / Snack</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700">Notas / Consejos:</label>
                  <input
                    type="text"
                    placeholder="Ej. 15 min de cocción"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-neutral-200 px-3.5 py-2 text-xs text-neutral-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Ingredientes */}
              <div className="border-t border-neutral-100 pt-3">
                <label className="text-xs font-bold text-neutral-700">Ingredientes necesarios:</label>
                
                <form onSubmit={handleAddIngredientToForm} className="mt-2 flex gap-2">
                  <input
                    type="text"
                    placeholder="Ingrediente (ej. Arroz basmati)"
                    value={newIngName}
                    onChange={(e) => setNewIngName(e.target.value)}
                    className="flex-1 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-900 focus:border-emerald-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Cant. (250g)"
                    value={newIngQty}
                    onChange={(e) => setNewIngQty(e.target.value)}
                    className="w-24 rounded-2xl border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-xs text-neutral-900 focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-2xl bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-neutral-800"
                  >
                    +
                  </button>
                </form>

                <div className="mt-3 space-y-1.5">
                  {formIngredients.map((ing, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-1.5 text-xs border border-neutral-100"
                    >
                      <span className="font-semibold text-neutral-800">
                        {ing.name} {ing.quantity && <span className="text-neutral-400 font-normal">({ing.quantity})</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredientFromForm(index)}
                        className="text-neutral-400 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="mt-6 flex justify-end gap-2 border-t border-neutral-100 pt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-2xl px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRecipe}
                disabled={!formName.trim()}
                className="rounded-2xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40"
              >
                Guardar Plato
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
