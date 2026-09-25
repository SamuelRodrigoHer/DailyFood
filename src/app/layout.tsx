import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { Navigation } from '@/components/Navigation';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Sabor & Cesta - Menú Semanal y Lista de la Compra',
  description: 'Planifica tus comidas de la semana y genera tu lista de la compra al instante con una interfaz limpia y elegante.',
  manifest: '/manifest.json',
  icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${jakarta.variable} font-sans antialiased`}>
      <body className="min-h-screen bg-[#FAFAFA] text-neutral-900 selection:bg-emerald-100 selection:text-emerald-900">
        <AppProvider>
          <div className="flex min-h-screen flex-col">
            <Navigation />
            {/* Contenedor principal con espacio en móvil para no tapar con la barra flotante */}
            <main className="flex-1 pb-24 md:pb-12">
              {children}
            </main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
