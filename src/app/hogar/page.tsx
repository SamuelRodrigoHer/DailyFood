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
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#172431] text-[#a8c7d4]">
          <Home className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#f1e8e0]">Mi hogar</h1>
          <p className="text-sm text-[#a09288]">Comparte el menú y la compra con las personas de tu casa.</p>
        </div>
      </div>

      {!user && (
        <div className="rounded-3xl border border-[#543c2c] bg-[#302218] p-5 text-sm text-[#d8b192]">
          Inicia sesión para invitar a otras personas o unirte a un hogar.
        </div>
      )}

      {user && !isSupabaseConnected && (
        <div className="rounded-3xl border border-[#543c2c] bg-[#302218] p-5 text-sm text-[#d8b192]">
          La gestión de hogares necesita Supabase. En modo demo los datos solo se guardan en este navegador.
        </div>
      )}

      {user && isSupabaseConnected && (
        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-3xl border border-[#3b2d24] bg-[#191310] p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-[#f1e8e0]">
              <Users className="h-5 w-5 text-[#a8c7d4]" />
              <h2 className="font-bold">Invitar a alguien</h2>
            </div>
            <p className="mb-5 text-sm leading-6 text-[#a09288]">
              Genera un código temporal y compártelo con quien quieras añadir. Solo las cuentas que lo canjeen tendrán acceso a los datos de este hogar.
            </p>
            <button
              type="button"
              onClick={handleInvite}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#80573d] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#80573d] disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Generar código (válido 7 días)
            </button>
            {inviteCode && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#211812] p-3">
                <code className="min-w-0 flex-1 break-all text-sm text-[#ded3c9]">{inviteCode}</code>
                <button type="button" onClick={copyCode} title="Copiar código" className="rounded-xl p-2 text-[#a8c7d4] hover:bg-[#172431]">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-[#3b2d24] bg-[#191310] p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-[#f1e8e0]">
              <Home className="h-5 w-5 text-[#a8c7d4]" />
              <h2 className="font-bold">Unirme a un hogar</h2>
            </div>
            <p className="mb-5 text-sm leading-6 text-[#a09288]">
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
                className="w-full rounded-2xl border border-[#3b2d24] bg-[#211812] px-4 py-3 text-sm outline-none transition focus:border-[#344c61] focus:ring-2 focus:ring-[#597b96]/20"
              />
              <button type="submit" disabled={busy || !joinCode.trim()} className="w-full rounded-2xl bg-[#80573d] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#93694b] disabled:opacity-50">
                {busy ? 'Procesando…' : 'Unirme al hogar'}
              </button>
            </form>
          </section>
        </div>
      )}

      {(message || error) && (
        <p role={error ? 'alert' : 'status'} className={`mt-5 rounded-2xl p-4 text-sm ${error ? 'bg-[#291e1d] text-[#e0aaa3]' : 'bg-[#172431] text-[#a8c7d4]'}`}>
          {error || message}
        </p>
      )}
    </div>
  );
}
