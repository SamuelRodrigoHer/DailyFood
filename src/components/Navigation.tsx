'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  CalendarDays,
  ShoppingCart,
  ChefHat,
  LayoutDashboard,
  User,
  LogOut,
  Cloud,
  HardDrive,
  Home,
  Activity,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navigation() {
  const pathname = usePathname();
  const { user, logout, isSupabaseConnected, isRealtimeActive, syncError, shoppingItems } = useApp();

  // Elementos pendientes por comprar
  const pendingCount = shoppingItems.filter((i) => !i.is_bought).length;

  const mealNavItems = [
    { href: '/hoy', label: 'Hoy', icon: LayoutDashboard },
    { href: '/calendario', label: 'Menú Semanal', icon: CalendarDays },
    {
      href: '/lista',
      label: 'Lista de Compra',
      icon: ShoppingCart,
      badge: pendingCount > 0 ? pendingCount : null
    },
    { href: '/recetas', label: 'Mis Platos', icon: ChefHat },
    ...(user ? [{ href: '/hogar', label: 'Mi hogar', icon: Home }] : []),
  ];

  const navItems: { href: string; label: string; icon: LucideIcon; badge?: number | null }[] =
    pathname === '/gimnasio'
      ? [
          { href: '/', label: 'Aplicaciones', icon: Home },
          { href: '/gimnasio', label: 'Gimnasio', icon: Activity },
        ]
      : pathname === '/biblioteca'
      ? [
          { href: '/', label: 'Aplicaciones', icon: Home },
          { href: '/biblioteca', label: 'Biblioteca', icon: BookOpen },
        ]
      : mealNavItems;

  if (pathname === '/') return null;

  return (
    <>
      {/* 1. CABECERA SUPERIOR (Desktop y Tablet) */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-100 bg-white/80 backdrop-blur-md transition-all">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">

          {/* Logo y Nombre */}
          <Link href="/" className="flex items-center gap-2.5 transition-transform hover:scale-[1.02]">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-md shadow-sky-500/20">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-neutral-900">
                Mi<span className="text-sky-600">Modo</span>
              </span>
              <p className="hidden text-[11px] font-medium text-neutral-400 sm:block">
                Tu espacio personal
              </p>
            </div>
          </Link>

          {/* Enlaces de Navegación (Desktop) */}
          <nav className="hidden items-center gap-1.5 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-neutral-900 text-white shadow-sm'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  )}
                >
                  <Icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-neutral-500')} />
                  <span>{item.label}</span>
                  {item.badge !== null && (
                    <span
                      className={cn(
                        'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold',
                        isActive
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-100 text-emerald-700'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Estado de Conexión + Perfil de Usuario */}
          <div className="flex items-center gap-3">

            {/* Indicador de Estado Realtime / Conectividad */}
            <div
              className={cn(
                'hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold sm:flex',
                syncError
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : isRealtimeActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : isSupabaseConnected
                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                  : 'bg-neutral-100 text-neutral-600'
              )}
              title={
                syncError
                  ? `Error de sincronización: ${syncError}`
                  : isRealtimeActive
                  ? 'Sincronización en tiempo real activa (WebSockets)'
                  : isSupabaseConnected
                  ? 'Conectado a Supabase'
                  : 'Modo Offline / Local'
              }
            >
              {isSupabaseConnected ? (
                <Cloud className="h-3.5 w-3.5" />
              ) : (
                <HardDrive className="h-3.5 w-3.5" />
              )}
              <span className="text-[11px]">
                {syncError ? 'Error al guardar' : isRealtimeActive ? 'En vivo' : isSupabaseConnected ? 'Conectado' : 'Local'}
              </span>
            </div>

            {/* Perfil o Botón de Login */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-2xl border border-neutral-200/80 bg-neutral-50/80 py-1.5 pl-3 pr-2 shadow-xs">
                  <div className="flex h-6 w-6 items-center justify-center rounded-xl bg-neutral-900 text-xs font-bold text-white">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="max-w-[100px] truncate text-xs font-semibold text-neutral-800 sm:max-w-[140px]">
                      {user.name || user.email.split('@')[0]}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {isSupabaseConnected ? 'Conectado' : 'Sesión demo'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => logout()}
                  title="Cerrar sesión"
                  className="flex h-8 w-8 items-center justify-center rounded-2xl border border-neutral-200 text-neutral-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-2xl bg-neutral-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 transition-all"
              >
                <User className="h-3.5 w-3.5" />
                <span>Acceder</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 2. BARRA FLOTANTE INFERIOR (Móvil) */}
      <div className="fixed bottom-3 left-0 right-0 z-50 flex justify-center px-4 md:hidden">
        <nav className="flex w-full max-w-sm items-center justify-around rounded-3xl border border-neutral-200/80 bg-white/95 px-3 py-2 shadow-xl shadow-neutral-900/10 backdrop-blur-lg">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-2xl py-1 px-3 transition-all duration-200',
                  isActive
                    ? 'text-emerald-600 font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900'
                )}
              >
                <div className="relative">
                  <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                  {item.badge !== null && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="mt-1 text-[11px]">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 h-1 w-5 rounded-full bg-emerald-500" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
