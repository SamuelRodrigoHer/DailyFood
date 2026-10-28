import { createBrowserClient } from '@supabase/ssr';

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, '');
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(/^["']|["']$/g, '');

  if (!rawUrl || !rawKey) {
    return null;
  }

  // Normalizar URL en caso de que incluya /rest/v1 o barras al final
  const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

  // Reusar la misma instancia en el navegador para evitar recrear clientes y listeners en cada render
  if (typeof window !== 'undefined') {
    if (!clientInstance) {
      clientInstance = createBrowserClient(cleanUrl, rawKey);
    }
    return clientInstance;
  }

  return createBrowserClient(cleanUrl, rawKey);
}
