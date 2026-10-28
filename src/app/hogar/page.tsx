'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Copy, Home, KeyRound, Loader2, RefreshCw, Trash2, Users } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { HouseholdInvite } from '@/lib/types';

function formatExpiration(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function HouseholdPage() {
  const { user, isSupabaseConnected, createHouseholdInvite, getHouseholdInvites, revokeHouseholdInvite, joinHousehold } = useApp();
  const [inviteCode, setInviteCode] = useState('');
  const [inviteExpiresAt, setInviteExpiresAt] = useState('');
  const [invites, setInvites] = useState<HouseholdInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const householdId = user?.household_id;

  const refreshInvites = useCallback(async () => {
    setLoadingInvites(true);
    const result = await getHouseholdInvites();
    if (result.error) setError(result.error);
    else setInvites(result.invites || []);
    setLoadingInvites(false);
  }, [getHouseholdInvites]);

  useEffect(() => {
    if (householdId && isSupabaseConnected) void refreshInvites();
    else setInvites([]);
  }, [householdId, isSupabaseConnected, refreshInvites]);

  const handleInvite = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    const result = await createHouseholdInvite();
    if (result.error) setError(result.error);
    else {
      setInviteCode(result.code || '');
      setInviteExpiresAt(result.expiresAt || '');
      await refreshInvites();
    }
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
      setInviteExpiresAt('');
      setMessage('Te has unido al hogar. El menú y la compra ya están sincronizados.');
    }
    setBusy(false);
  };

  const copyCode = async () => {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setMessage(`Código copiado. Es reutilizable hasta ${inviteExpiresAt ? formatExpiration(inviteExpiresAt) : 'su caducidad'}.`);
  };

  const handleRevoke = async (invite: HouseholdInvite) => {
    if (!window.confirm(`¿Revocar la invitación que caduca el ${formatExpiration(invite.expires_at)}? El código dejará de funcionar.`)) return;
    setBusy(true);
    setError('');
    setMessage('');
    const result = await revokeHouseholdInvite(invite.code);
    if (result.error) setError(result.error);
    else {
      setInvites((current) => current.filter((item) => item.code !== invite.code));
      if (inviteCode === invite.code) {
        setInviteCode('');
        setInviteExpiresAt('');
      }
      setMessage('Invitación revocada. El código ya no se puede canjear.');
    }
    setBusy(false);
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
              Genera un código temporal y compártelo con quien quieras añadir. Se puede reutilizar para invitar a varias personas hasta que caduque o lo revoques.
            </p>
            <button
              type="button"
              onClick={handleInvite}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Generar código (válido 7 días, reutilizable)
            </button>
            {inviteCode && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-neutral-50 p-3">
                <code className="min-w-0 flex-1 break-all text-sm text-neutral-800">{inviteCode}</code>
                <button type="button" onClick={copyCode} title="Copiar código" className="rounded-xl p-2 text-emerald-700 hover:bg-emerald-100">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            )}
            {inviteCode && inviteExpiresAt && (
              <p className="mt-2 text-xs text-neutral-500">Caduca el {formatExpiration(inviteExpiresAt)}. Puedes revocarlo en cualquier momento.</p>
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

      {user && isSupabaseConnected && (
        <section className="mt-5 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm" aria-labelledby="household-invites-title">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 id="household-invites-title" className="font-bold text-neutral-900">Invitaciones del hogar</h2>
              <p className="mt-1 text-sm text-neutral-500">Los códigos se pueden usar varias veces hasta caducar.</p>
            </div>
            <button type="button" onClick={() => void refreshInvites()} disabled={loadingInvites || busy} aria-label="Actualizar invitaciones" className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100 disabled:opacity-50">
              {loadingInvites ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
          </div>
          {loadingInvites && invites.length === 0 ? (
            <p className="py-4 text-sm text-neutral-500">Cargando invitaciones…</p>
          ) : invites.length === 0 ? (
            <p className="rounded-2xl bg-neutral-50 px-4 py-5 text-sm text-neutral-500">No hay invitaciones registradas.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {invites.map((invite) => {
                const isExpired = new Date(invite.expires_at).getTime() <= Date.now();
                return (
                  <li key={invite.code} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <code className="break-all text-sm font-semibold text-neutral-800">{invite.code}</code>
                      <p className="mt-1 text-xs text-neutral-500">{isExpired ? 'Caducó' : 'Activa'} · Caducidad: {formatExpiration(invite.expires_at)}</p>
                    </div>
                    {isExpired ? (
                      <span className="text-xs font-semibold text-neutral-400">Caducada</span>
                    ) : (
                      <button type="button" onClick={() => void handleRevoke(invite)} disabled={busy} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 sm:self-auto">
                        <Trash2 className="h-4 w-4" /> Revocar
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {(message || error) && (
        <p role={error ? 'alert' : 'status'} className={`mt-5 rounded-2xl p-4 text-sm ${error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}>
          {error || message}
        </p>
      )}
    </div>
  );
}
