import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { Navigation } from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'MiModo | Tu espacio personal',
  description: 'Un espacio personal para abrir tus aplicaciones de comidas, actividad y lectura.',
  manifest: '/manifest.json',
  icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#38bdf8',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="font-sans antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
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
