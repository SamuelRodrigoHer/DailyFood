'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { 
  Sparkles, 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  User as UserIcon,
  Loader2
} from 'lucide-react';

// Mapeo amigable de errores comunes en español
function translateAuthError(error: string): string {
  if (/invalid login credentials/i.test(error)) {
    return 'El correo o la contraseña son incorrectos. Compruébalos e inténtalo de nuevo.';
  }
  if (/user already registered/i.test(error)) {
    return 'Ya existe una cuenta con este correo electrónico. Inicia sesión en su lugar.';
  }
  if (/password should be at least/i.test(error)) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (/email rate limit exceeded/i.test(error)) {
    return 'Demasiados intentos. Espera unos segundos e inténtalo de nuevo.';
  }
  if (/invalid email/i.test(error)) {
    return 'Por favor, introduce un correo electrónico válido.';
  }
  return error;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, signUp, isSupabaseConnected } = useApp();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor completa todos los campos');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isRegister) {
        const res = await signUp(email.trim(), password);
        if (res.error) {
          setErrorMsg(translateAuthError(res.error));
        } else {
          setSuccessMsg(res.message || '¡Cuenta creada! Entrando a tu espacio...');
          setTimeout(() => {
            router.push('/');
          }, 1000);
        }
      } else {
        const res = await login(email.trim(), password);
        if (res.error) {
          setErrorMsg(translateAuthError(res.error));
        } else {
          router.push('/');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocurrió un error al procesar tu solicitud';
      setErrorMsg(translateAuthError(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        
        {/* Tarjeta de Login */}
        <div className="rounded-3xl border border-[#2b3430]/80 bg-[#141a18] p-8 shadow-sm transition-all">
          
          {/* Logo y Encabezado */}
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#304b39] text-white shadow-md shadow-emerald-500/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#edf0ed]">
              {isRegister ? 'Crear tu cuenta' : 'Iniciar Sesión'}
            </h1>
            <p className="mt-1.5 text-xs text-[#929d97]">
              {isRegister
                ? 'Conéctate para compartir la compra y menú en tiempo real con tu casa'
                : 'Accede a tus comidas y lista de la compra compartida'}
            </p>
          </div>

          {/* Mensajes de feedback */}
          {errorMsg && (
            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-[#291e1d] p-3.5 text-xs font-semibold text-[#e0aaa3] border border-[#503638] animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-[#19231d] p-3.5 text-xs font-semibold text-[#a8c5ae] border border-[#354a3b] animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            
            {/* Nombre (solo en registro) */}
            {isRegister && (
              <div>
                <label className="text-xs font-bold text-[#c2cbc5]">Tu nombre o apodo (opcional)</label>
                <div className="relative mt-1">
                  <UserIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d8983]" />
                  <input
                    type="text"
                    placeholder="Ej. Samuel, María..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-2xl border border-[#2b3430] bg-[#1a211e] py-2.5 pl-10 pr-4 text-xs font-medium text-[#edf0ed] placeholder:text-[#7d8983] focus:border-[#354a3b] focus:bg-[#141a18] focus:outline-none focus:ring-2 focus:ring-[#54745a]/20"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-[#c2cbc5]">Correo electrónico</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d8983]" />
                <input
                  type="email"
                  required
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-[#2b3430] bg-[#1a211e] py-2.5 pl-10 pr-4 text-xs font-medium text-[#edf0ed] placeholder:text-[#7d8983] focus:border-[#354a3b] focus:bg-[#141a18] focus:outline-none focus:ring-2 focus:ring-[#54745a]/20"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#c2cbc5]">Contraseña</label>
                <span className="text-[11px] text-[#7d8983]">Mín. 6 caracteres</span>
              </div>
              <div className="relative mt-1">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d8983]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-[#2b3430] bg-[#1a211e] py-2.5 pl-10 pr-10 text-xs font-medium text-[#edf0ed] placeholder:text-[#7d8983] focus:border-[#354a3b] focus:bg-[#141a18] focus:outline-none focus:ring-2 focus:ring-[#54745a]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7d8983] hover:text-[#aab4ae] focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#222b28] py-3 text-xs font-bold text-white shadow-sm hover:bg-[#303a36] disabled:opacity-50 transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <span>{isRegister ? 'Crear Cuenta y Conectar' : 'Iniciar Sesión'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle entre Login y Registro */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-xs font-semibold text-[#a8c5ae] hover:text-[#a8c5ae] transition"
            >
              {isRegister
                ? '¿Ya tienes una cuenta? Inicia sesión aquí'
                : '¿No tienes cuenta todavía? Regístrate gratis en 1 clic'}
            </button>
          </div>

          {/* Indicador de estado */}
          <div className="mt-6 border-t border-[#2b3430] pt-4 text-center">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-[#7d8983]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#a8c5ae]" />
              <span>
                {isSupabaseConnected
                  ? 'Base de datos y contraseñas cifradas en Supabase'
                  : 'Modo local activo'}
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
