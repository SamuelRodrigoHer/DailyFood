'use client';

import { useState, type FormEvent } from 'react';
import { Copy, Home, KeyRound, Loader2, Users } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function HouseholdPage() {
  const { user, isSupabaseConnected, createHouseholdInvite, joinHousehold } = useApp();
  const [inviteCode, setInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleInvite = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    const result = await createHouseholdInvite();
    if (result.error) setError(result.error);
    else setInviteCode(result.code || '');
    setBusy(false);
  };

  const handleJoin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const result = await joinHousehold(joinCode);
    if (result.error) setError(result.error);
    else {
      setJoinCode('');
      setInviteCode('');
      setMessage('Te has unido al hogar. El menú y la compra ya están sincronizados.');
    }
    setBusy(false);
  };

  const copyCode = async () => {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setMessage('Código copiado. Caduca en 7 días.');
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-7 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <Home className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Mi hogar</h1>
          <p className="text-sm text-neutral-500">Comparte el menú y la compra con las personas de tu casa.</p>
        </div>
      </div>

      {!user && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Inicia sesión para invitar a otras personas o unirte a un hogar.
        </div>
      )}

      {user && !isSupabaseConnected && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          La gestión de hogares necesita Supabase. En modo demo los datos solo se guardan en este navegador.
        </div>
      )}

      {user && isSupabaseConnected && (
        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-neutral-900">
              <Users className="h-5 w-5 text-emerald-600" />
              <h2 className="font-bold">Invitar a alguien</h2>
            </div>
            <p className="mb-5 text-sm leading-6 text-neutral-500">
              Genera un código temporal y compártelo con quien quieras añadir. Solo las cuentas que lo canjeen tendrán acceso a los datos de este hogar.
            </p>
            <button
              type="button"
              onClick={handleInvite}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Generar código (válido 7 días)
            </button>
            {inviteCode && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-neutral-50 p-3">
                <code className="min-w-0 flex-1 break-all text-sm text-neutral-800">{inviteCode}</code>
                <button type="button" onClick={copyCode} title="Copiar código" className="rounded-xl p-2 text-emerald-700 hover:bg-emerald-100">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-neutral-900">
              <Home className="h-5 w-5 text-emerald-600" />
              <h2 className="font-bold">Unirme a un hogar</h2>
            </div>
            <p className="mb-5 text-sm leading-6 text-neutral-500">
              Pega aquí el código que te compartieron. Si ya tienes datos en tu hogar actual, crea otra cuenta para mantenerlos separados.
            </p>
            <form onSubmit={handleJoin} className="space-y-3">
              <label className="sr-only" htmlFor="household-code">Código de invitación</label>
              <input
                id="household-code"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                placeholder="Código de invitación"
                required
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <button type="submit" disabled={busy || !joinCode.trim()} className="w-full rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:opacity-50">
                {busy ? 'Procesando…' : 'Unirme al hogar'}
              </button>
            </form>
          </section>
        </div>
      )}

      {(message || error) && (
        <p role={error ? 'alert' : 'status'} className={`mt-5 rounded-2xl p-4 text-sm ${error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}>
          {error || message}
        </p>
      )}
    </div>
  );
}
