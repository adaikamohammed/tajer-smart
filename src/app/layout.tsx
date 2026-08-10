import './globals.css';
import type { Metadata, Viewport } from 'next';
import BottomNav from '@/components/BottomNav';
import AppHeader from '@/components/AppHeader';
import AuthGuard from '@/components/AuthGuard';
import { ToastProvider } from '@/components/Toast';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#145e3a',
};

export const metadata: Metadata = {
  title: 'التاجر المتنقل — فوزي شكيمة',
  description: 'تطبيق هاتف ذكي بسيط ومترابط لإدارة المخزن والديون والموردين والزبائن للتاجر المتنقل فوزي شكيمة',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'التاجر المتنقل',
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(r) { console.log('PWA SW registered'); },
                    function(e) { console.log('PWA SW failed', e); }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body style={{ paddingBottom: '80px' }}>

        {/* ─── Premium Interactive Header ─── */}
        <AppHeader />

        {/* ─── Page Content with Auth Guard ─── */}
        <main className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto px-3.5 sm:px-6 py-4 md:py-6">
          <AuthGuard>
            <div className="page-container">
              {children}
            </div>
          </AuthGuard>
        </main>

        {/* ─── Toast Notifications ─── */}
        <ToastProvider />

        {/* ─── Bottom Nav ─── */}
        <BottomNav />
      </body>
    </html>
  );
}
