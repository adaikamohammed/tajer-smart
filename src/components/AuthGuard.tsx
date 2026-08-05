'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getLocalData } from '@/lib/store';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (pathname === '/login') {
      setChecked(true);
      return;
    }

    const isLoggedIn = getLocalData('tajer_smart_logged_in', false);
    if (!isLoggedIn) {
      router.push('/login');
    } else {
      setChecked(true);
    }
  }, [pathname, router]);

  if (!checked && pathname !== '/login') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-bold text-xs text-slate-500">جاري التحقق من أمان حساب التاجر...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
