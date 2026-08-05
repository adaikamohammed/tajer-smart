import './globals.css';
import type { Metadata, Viewport } from 'next';
import BottomNav from '@/components/BottomNav';
import AppHeader from '@/components/AppHeader';
import { ToastProvider } from '@/components/Toast';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#145e3a',
};

export const metadata: Metadata = {
  title: 'التاجر الذكي — التاجر المتنقل',
  description: 'تطبيق هاتف ذكي بسيط ومترابط لإدارة المخزن والديون والموردين والزبائن للتاجر شكيمة فوزي',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'التاجر الذكي',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body style={{ paddingBottom: '80px' }}>

        {/* ─── Premium Interactive Header ─── */}
        <AppHeader />

        {/* ─── Page Content ─── */}
        <main className="max-w-md mx-auto px-3.5 py-4">
          <div className="page-container">
            {children}
          </div>
        </main>

        {/* ─── Toast Notifications ─── */}
        <ToastProvider />

        {/* ─── Bottom Nav ─── */}
        <BottomNav />
      </body>
    </html>
  );
}
