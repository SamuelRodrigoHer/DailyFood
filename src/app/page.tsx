import Link from 'next/link';
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Clock3,
  Sparkles,
  Utensils,
  type LucideIcon,
} from 'lucide-react';

type Channel = {
  number: string;
  title: string;
  description: string;
  status: string;
  href?: string;
  icon: LucideIcon;
  art: string;
  iconColor: string;
  glow: string;
};

const channels: Channel[] = [
  {
    number: '01',
    title: 'Comidas',
    description: 'Menú semanal, recetas y lista de la compra, en un mismo lugar.',
    status: 'Disponible',
    href: '/hoy',
    icon: Utensils,
    art: 'from-cyan-100 via-sky-50 to-white',
    iconColor: 'bg-sky-500',
    glow: 'bg-sky-200',
  },
  {
    number: '02',
    title: 'Gimnasio',
    description: 'Rutinas, sesiones y seguimiento de tus entrenamientos.',
    status: 'Disponible',
    href: '/gimnasio',
    icon: Activity,
    art: 'from-rose-100 via-orange-50 to-white',
    iconColor: 'bg-rose-400',
    glow: 'bg-orange-200',
  },
  {
    number: '03',
    title: 'Biblioteca',
    description: 'Organiza lo que lees, guarda tus próximas lecturas y sigue tu progreso.',
    status: 'Disponible',
    href: '/biblioteca',
    icon: BookOpen,
    art: 'from-violet-100 via-indigo-50 to-white',
    iconColor: 'bg-violet-500',
    glow: 'bg-indigo-200',
  },
];

function ChannelCard({ channel }: { channel: Channel }) {
  const Icon = channel.icon;
  const card = (
    <>
      <div
        className={`relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br ${channel.art}`}
      >
        <div className={`absolute -right-7 -top-12 h-40 w-40 rounded-full ${channel.glow} opacity-60 blur-2xl`} />
        <div className={`absolute -bottom-14 -left-10 h-36 w-36 rounded-full ${channel.glow} opacity-50 blur-2xl`} />
        <div className="absolute left-5 top-5 text-[10px] font-bold tracking-[0.2em] text-neutral-500/80">
          CANAL {channel.number}
        </div>
        <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.6rem] bg-white/85 shadow-[0_12px_35px_rgba(45,65,95,0.12)] ring-1 ring-white/90 transition-transform duration-300 group-hover:scale-110">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${channel.iconColor} text-white shadow-md`}>
            <Icon className="h-6 w-6" strokeWidth={1.9} />
          </div>
        </div>
        <div className="absolute bottom-5 right-5 grid grid-cols-3 gap-1 opacity-45" aria-hidden="true">
          <span className="h-2 w-2 rounded-[3px] bg-white" />
          <span className="h-2 w-2 rounded-[3px] bg-white" />
          <span className="h-2 w-2 rounded-[3px] bg-white" />
          <span className="h-2 w-2 rounded-[3px] bg-white" />
          <span className="h-2 w-2 rounded-[3px] bg-white" />
          <span className="h-2 w-2 rounded-[3px] bg-white" />
        </div>
      </div>

      <div className="flex min-h-32 items-start justify-between gap-4 p-5">
        <div>
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${channel.href ? 'text-sky-700' : 'text-neutral-400'}`}
          >
            {channel.href ? (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            ) : (
              <Clock3 className="h-3 w-3" />
            )}
            {channel.status}
          </span>
          <h2 className="mt-2 text-lg font-bold tracking-tight text-slate-800">{channel.title}</h2>
          <p className="mt-1.5 max-w-xs text-sm leading-5 text-slate-500">{channel.description}</p>
        </div>
        {channel.href && (
          <span className="mt-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700 transition group-hover:bg-sky-500 group-hover:text-white">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </>
  );

  if (channel.href) {
    return (
      <Link
        href={channel.href}
        className="group overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(49,74,100,0.07)] transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_20px_48px_rgba(49,110,150,0.14)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/60"
      >
        {card}
      </Link>
    );
  }

  return (
    <article className="group overflow-hidden rounded-[1.8rem] border border-slate-200/70 bg-white/75 shadow-[0_12px_40px_rgba(49,74,100,0.04)]">
      {card}
    </article>
  );
}

export default function LauncherPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f6fafc] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_top,_#e2f6fc_0%,_#f6fafc_62%,_transparent_100%)]" />
      <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-6 sm:px-8 sm:pt-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 grid-cols-2 gap-1.5 rounded-[1.1rem] bg-white p-2.5 shadow-sm ring-1 ring-slate-200/70">
              <span className="rounded-[4px] bg-sky-500" />
              <span className="rounded-[4px] bg-amber-400" />
              <span className="rounded-[4px] bg-rose-400" />
              <span className="rounded-[4px] bg-violet-500" />
            </div>
            <div>
              <p className="text-xl font-extrabold tracking-tight text-slate-900">MiModo</p>
              <p className="text-xs font-medium text-slate-400">Todo a tu modo</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/90 bg-white/75 px-4 py-2 text-xs font-semibold text-slate-500 shadow-sm sm:flex">
            <Sparkles className="h-3.5 w-3.5 text-sky-500" />
            TU ESPACIO PERSONAL
          </div>
        </header>

        <section className="mx-auto mt-14 max-w-3xl text-center sm:mt-20">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-3.5 py-1.5 text-xs font-bold text-sky-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            BIENVENIDO A MIMODO
          </div>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            ¿Qué te apetece hacer?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-500 sm:text-lg">
            Elige un canal para entrar: comidas, gimnasio o biblioteca. Cada espacio, a tu modo.
          </p>
        </section>

        <section className="mx-auto mt-11 max-w-5xl sm:mt-14" aria-labelledby="channels-title">
          <div className="mb-5 flex items-end justify-between px-1">
            <div>
              <h2 id="channels-title" className="text-sm font-bold text-slate-800">Tus canales</h2>
              <p className="mt-1 text-xs text-slate-400">Selecciona una aplicación para abrirla</p>
            </div>
            <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-400 ring-1 ring-slate-200/70">
              {channels.filter((channel) => channel.href).length} disponibles
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {channels.map((channel) => (
              <ChannelCard key={channel.number} channel={channel} />
            ))}
          </div>
        </section>

        <footer className="mx-auto mt-12 flex max-w-5xl items-center justify-between border-t border-slate-200/70 px-1 pt-5 text-xs text-slate-400">
          <span>Un espacio para todas tus cosas.</span>
          <span className="hidden items-center gap-1.5 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {channels.length} canales
          </span>
        </footer>
      </div>
    </div>
  );
}
