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
  const { user, logout, isSupabaseConnected, isRealtimeActive, shoppingItems } = useApp();

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

  const libraryNavItems = [
    { href: '/', label: 'Aplicaciones', icon: Home },
    { href: '/biblioteca', label: 'Biblioteca', icon: BookOpen },
    ...(user ? [{ href: '/hogar', label: 'Mi hogar', icon: Home }] : []),
  ];

  const navItems: { href: string; label: string; icon: LucideIcon; badge?: number | null }[] =
    pathname === '/gimnasio'
      ? [
          { href: '/', label: 'Aplicaciones', icon: Home },
          { href: '/gimnasio', label: 'Gimnasio', icon: Activity },
        ]
      : pathname === '/biblioteca' ? libraryNavItems : mealNavItems;

  if (pathname === '/') return null;

  return (
    <>
      {/* 1. CABECERA SUPERIOR (Desktop y Tablet) */}
      <header className="sticky top-0 z-40 w-full border-b border-[#3b2d24] bg-[#100c0a]/90 text-[#f1e8e0] backdrop-blur-md transition-all">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          
          {/* Logo y Nombre */}
          <Link href="/" className="flex items-center gap-2.5 transition-transform hover:scale-[1.02]">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#80573d] text-white shadow-md shadow-[#80573d]/20">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-[#f1e8e0]">
                Mi<span className="text-[#a8c7d4]">Modo</span>
              </span>
              <p className="hidden text-[11px] font-medium text-[#81746a] sm:block">
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
                      ? 'bg-[#b78d6d] text-[#171a19] shadow-sm'
                      : 'text-[#b5a59a] hover:bg-white/5 hover:text-[#f1e8e0]'
                  )}
                >
                  <Icon className={cn('h-4 w-4', isActive ? 'text-[#171a19]' : 'text-[#81746a]')} />
                  <span>{item.label}</span>
                  {item.badge !== null && (
                    <span
                      className={cn(
                        'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold',
                        isActive
                          ? 'bg-[#80573d] text-white'
                          : 'bg-[#172431] text-[#a8c7d4]'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Área de Usuario / Estado de Sincronización */}
          <div className="flex items-center gap-3">
            {/* Indicador Nube / WebSockets en vivo */}
            <div
              title={
                isRealtimeActive
                  ? 'Sincronización instantánea activa con WebSockets'
                  : isSupabaseConnected
                  ? 'Conectado a la nube (Supabase)'
                  : 'Almacenamiento local'
              }
              className={cn(
                'hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors',
                isRealtimeActive
                  ? 'bg-[#172431] text-[#a8c7d4] border-[#344c61]'
                  : isSupabaseConnected
                  ? 'bg-[#172124] text-[#a8c7d4] border-[#30454a]'
                  : 'bg-[#2a1e17] text-[#d8b192] border-[#544633]'
              )}
            >
              {isRealtimeActive ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#a8c7d4] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#a8c7d4]"></span>
                  </span>
                  <span>En directo (WebSockets)</span>
                </>
              ) : isSupabaseConnected ? (
                <>
                  <Cloud className="h-3 w-3" />
                  <span>Nube 24/7</span>
                </>
              ) : (
                <>
                  <HardDrive className="h-3 w-3" />
                  <span>Modo Local</span>
                </>
              )}
            </div>

            {user ? (
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-2">
                  <div
                    title={user.email}
                    className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#172431] text-xs font-bold uppercase text-[#a8c7d4] shadow-xs"
                  >
                    {user.email.charAt(0)}
                  </div>
                  <div className="hidden flex-col sm:flex">
                    <span className="max-w-[130px] truncate text-xs font-semibold text-[#ded3c9]">
                      {user.email.split('@')[0]}
                    </span>
                    <span className="text-[10px] text-[#81746a]">
                      {isSupabaseConnected ? 'Conectado' : 'Sesión demo'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => logout()}
                  title="Cerrar sesión"
                  className="flex h-8 w-8 items-center justify-center rounded-2xl border border-[#3b2d24] text-[#81746a] transition-colors hover:border-[#583936] hover:bg-[#301e1c] hover:text-[#e8a69e]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-2xl bg-[#b78d6d] px-3.5 py-1.5 text-xs font-bold text-[#171a19] shadow-sm transition-all hover:bg-[#c8a487]"
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
        <nav className="flex w-full max-w-sm items-center justify-around rounded-3xl border border-[#3b2d24] bg-[#17110e]/95 px-3 py-2 shadow-xl shadow-black/30 backdrop-blur-lg">
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
                    ? 'text-[#b78d6d] font-semibold'
                    : 'text-[#81746a] hover:text-[#f1e8e0]'
                )}
              >
                <div className="relative">
                  <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                  {item.badge !== null && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#597b96] px-1 text-[10px] font-bold text-white shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="mt-1 text-[11px]">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 h-1 w-5 rounded-full bg-[#b78d6d]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
