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
  title: 'MiModo | Tu espacio personal',
  description: 'Un espacio personal para abrir tus aplicaciones de comidas, actividad y lectura.',
  manifest: '/manifest.json',
  icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#0b0e0f',
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
      <body className="min-h-screen bg-[#0b0e0f] text-[#eceeea] selection:bg-[#405141] selection:text-[#f0f1ed]">
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
