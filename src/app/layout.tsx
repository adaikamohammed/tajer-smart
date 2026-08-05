import './globals.css';
import type { Metadata, Viewport } from 'next';
import BottomNav from '@/components/BottomNav';
import { ToastProvider } from '@/components/Toast';
import { Store, Settings } from 'lucide-react';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#145e3a',
};

export const metadata: Metadata = {
  title: 'التاجر الذكي',
  description: 'تطبيق ذكي لإدارة المخزن والديون والموردين والزبائن للتاجر المتنقل',
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
      </head>
      <body style={{ paddingBottom: '80px' }}>

        {/* ─── Premium Header ─── */}
        <header className="app-header" role="banner">
          <div className="max-w-md mx-auto flex items-center justify-between">

            {/* الشعار والاسم */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, hsl(0 0% 100% / 0.25), hsl(0 0% 100% / 0.1))',
                  border: '1px solid hsl(0 0% 100% / 0.2)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <Store size={20} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1
                  className="font-black text-base leading-tight tracking-tight"
                  style={{ color: 'white' }}
                >
                  التاجر الذكي
                </h1>
                <p style={{ color: 'hsl(0 0% 100% / 0.65)', fontSize: '0.68rem', fontWeight: 600, marginTop: 1 }}>
                  تطبيقك التجاري المتنقل ⚡
                </p>
              </div>
            </div>

            {/* بادج + الإعدادات */}
            <div className="flex items-center gap-2">
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                background: 'hsl(0 0% 100% / 0.15)',
                color: 'hsl(0 0% 100% / 0.9)',
                padding: '0.25rem 0.6rem',
                borderRadius: '999px',
                border: '1px solid hsl(0 0% 100% / 0.2)',
                letterSpacing: '0.01em',
              }}>
                🚛 متنقل
              </span>
            </div>
          </div>
        </header>

        {/* ─── Page Content ─── */}
        <main className="max-w-md mx-auto px-3.5 py-4">
          <div className="page-container">
            {children}
          </div>
        </main>

        {/* ─── Toast ─── */}
        <ToastProvider />

        {/* ─── Bottom Nav ─── */}
        <BottomNav />
      </body>
    </html>
  );
}
