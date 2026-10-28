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
    art: 'from-[#182326] via-[#182326] to-[#141a18]',
    iconColor: 'bg-[#3a5963]',
    glow: 'bg-[#192226]',
  },
  {
    number: '02',
    title: 'Gimnasio',
    description: 'Rutinas, sesiones y seguimiento de tus entrenamientos.',
    status: 'Disponible',
    href: '/gimnasio',
    icon: Activity,
    art: 'from-[#251c1b] via-[#251c1b] to-[#141a18]',
    iconColor: 'bg-[#513438]',
    glow: 'bg-[#282319]',
  },
  {
    number: '03',
    title: 'Biblioteca',
    description: 'Organiza lo que lees, guarda tus próximas lecturas y sigue tu progreso.',
    status: 'Disponible',
    href: '/biblioteca',
    icon: BookOpen,
    art: 'from-[#211f27] via-[#211f27] to-[#141a18]',
    iconColor: 'bg-[#4a435c]',
    glow: 'bg-[#211f28]',
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
        <div className="absolute left-5 top-5 text-[10px] font-bold tracking-[0.2em] text-[#929d97]/80">
          CANAL {channel.number}
        </div>
        <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.6rem] bg-[#141a18]/85 shadow-[0_12px_35px_rgba(45,65,95,0.12)] ring-1 ring-[#3c4641]/90 transition-transform duration-300 group-hover:scale-110">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${channel.iconColor} text-white shadow-md`}>
            <Icon className="h-6 w-6" strokeWidth={1.9} />
          </div>
        </div>
        <div className="absolute bottom-5 right-5 grid grid-cols-3 gap-1 opacity-45" aria-hidden="true">
          <span className="h-2 w-2 rounded-[3px] bg-[#141a18]" />
          <span className="h-2 w-2 rounded-[3px] bg-[#141a18]" />
          <span className="h-2 w-2 rounded-[3px] bg-[#141a18]" />
          <span className="h-2 w-2 rounded-[3px] bg-[#141a18]" />
          <span className="h-2 w-2 rounded-[3px] bg-[#141a18]" />
          <span className="h-2 w-2 rounded-[3px] bg-[#141a18]" />
        </div>
      </div>

      <div className="flex min-h-32 items-start justify-between gap-4 p-5">
        <div>
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${channel.href ? 'text-[#a8c7d4]' : 'text-[#7d8983]'}`}
          >
            {channel.href ? (
              <span className="h-1.5 w-1.5 rounded-full bg-[#304b39]" />
            ) : (
              <Clock3 className="h-3 w-3" />
            )}
            {channel.status}
          </span>
          <h2 className="mt-2 text-lg font-bold tracking-tight text-[#d7ded9]">{channel.title}</h2>
          <p className="mt-1.5 max-w-xs text-sm leading-5 text-[#929d97]">{channel.description}</p>
        </div>
        {channel.href && (
          <span className="mt-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#192226] text-[#a8c7d4] transition group-hover:bg-[#3a5963] group-hover:text-white">
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
        className="group overflow-hidden rounded-[1.8rem] border border-[#2b3430]/80 bg-[#141a18] shadow-[0_12px_40px_rgba(49,74,100,0.07)] transition duration-300 hover:-translate-y-1 hover:border-[#344951] hover:shadow-[0_20px_48px_rgba(49,110,150,0.14)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4c6c75]/60"
      >
        {card}
      </Link>
    );
  }

  return (
    <article className="group overflow-hidden rounded-[1.8rem] border border-[#2b3430]/70 bg-[#141a18]/75 shadow-[0_12px_40px_rgba(49,74,100,0.04)]">
      {card}
    </article>
  );
}

export default function LauncherPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#0b0e0f] text-[#eceeea]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_top,_rgba(154,133,98,0.13)_0%,_rgba(11,14,15,0)_70%)]" />
      <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-6 sm:px-8 sm:pt-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 grid-cols-2 gap-1.5 rounded-[1.1rem] bg-[#141a18] p-2.5 shadow-sm ring-1 ring-[#665b4b]/70">
              <span className="rounded-[4px] bg-[#3a5963]" />
              <span className="rounded-[4px] bg-[#64522f]" />
              <span className="rounded-[4px] bg-[#513438]" />
              <span className="rounded-[4px] bg-[#4a435c]" />
            </div>
            <div>
              <p className="text-xl font-extrabold tracking-tight text-[#edf0ed]">MiModo</p>
              <p className="text-xs font-medium text-[#7d8983]">Todo a tu modo</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-[#303936]/90 bg-[#141a18]/75 px-4 py-2 text-xs font-semibold text-[#929d97] shadow-sm sm:flex">
            <Sparkles className="h-3.5 w-3.5 text-[#a8c7d4]" />
            TU ESPACIO PERSONAL
          </div>
        </header>

        <section className="mx-auto mt-14 max-w-3xl text-center sm:mt-20">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#344951] bg-[#141a18]/80 px-3.5 py-1.5 text-xs font-bold text-[#a8c7d4] shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            BIENVENIDO A MIMODO
          </div>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[#edf0ed] sm:text-5xl">
            ¿Qué te apetece hacer?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#929d97] sm:text-lg">
            Elige un canal para entrar: comidas, gimnasio o biblioteca. Cada espacio, a tu modo.
          </p>
        </section>

        <section className="mx-auto mt-11 max-w-5xl sm:mt-14" aria-labelledby="channels-title">
          <div className="mb-5 flex items-end justify-between px-1">
            <div>
              <h2 id="channels-title" className="text-sm font-bold text-[#d7ded9]">Tus canales</h2>
              <p className="mt-1 text-xs text-[#7d8983]">Selecciona una aplicación para abrirla</p>
            </div>
            <span className="rounded-full bg-[#141a18]/80 px-3 py-1 text-[11px] font-semibold text-[#7d8983] ring-1 ring-[#665b4b]/70">
              {channels.filter((channel) => channel.href).length} disponibles
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {channels.map((channel) => (
              <ChannelCard key={channel.number} channel={channel} />
            ))}
          </div>
        </section>

        <footer className="mx-auto mt-12 flex max-w-5xl items-center justify-between border-t border-[#2b3430]/70 px-1 pt-5 text-xs text-[#7d8983]">
          <span>Un espacio para todas tus cosas.</span>
          <span className="hidden items-center gap-1.5 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#304b39]" />
            {channels.length} canales
          </span>
        </footer>
      </div>
    </div>
  );
}
