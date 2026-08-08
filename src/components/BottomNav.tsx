'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Users,
  CreditCard,
  PieChart,
  Receipt,
  Code2
} from 'lucide-react';

interface BottomNavProps {
  debtCount?: number;
}

const TABS = [
  {
    href:     '/',
    tab:      'home',
    label:    'الرئيسية',
    icon:     LayoutDashboard,
  },
  {
    href:     '/inventory',
    tab:      'inventory',
    label:    'المخزن',
    icon:     Package,
  },
  {
    href:     '/contacts',
    tab:      'contacts',
    label:    'الأشخاص',
    icon:     Users,
  },
  {
    href:     '/debts',
    tab:      'debts',
    label:    'الديون',
    icon:     CreditCard,
    hasBadge: true,
  },
  {
    href:     '/receipts',
    tab:      'receipts',
    label:    'أوصال',
    icon:     Receipt,
  },
  {
    href:     '/stats',
    tab:      'stats',
    label:    'إحصائيات',
    icon:     PieChart,
  },
  {
    href:     '/developer',
    tab:      'developer',
    label:    'المطور',
    icon:     Code2,
  },
];

export default function BottomNav({ debtCount = 0 }: BottomNavProps) {
  const pathname = usePathname();

  if (pathname === '/login') return null;

  return (
    <nav className="bottom-nav" role="navigation" aria-label="التنقل الرئيسي">
      <div className="max-w-md mx-auto flex items-center justify-around gap-0.5">
        {TABS.map((item) => {
          const Icon     = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              data-tab={item.tab}
              className={`nav-item ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
            >
              <div className="nav-item-icon">
                <Icon
                  className="transition-all duration-200"
                  size={isActive ? 19 : 17}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {item.hasBadge && debtCount > 0 && (
                  <span className="nav-badge" aria-label={`${debtCount} ديون مستحقة`}>
                    {debtCount > 9 ? '9+' : debtCount}
                  </span>
                )}
              </div>
              <span style={{
                fontSize: '0.55rem',
                color: isActive
                  ? item.tab === 'home'      ? 'hsl(158 64% 38%)'
                  : item.tab === 'inventory' ? 'hsl(262 83% 52%)'
                  : item.tab === 'contacts'  ? 'hsl(221 83% 52%)'
                  : item.tab === 'debts'     ? 'hsl(351 83% 52%)'
                  : item.tab === 'receipts'  ? 'hsl(38 92% 45%)'
                  : item.tab === 'stats'     ? 'hsl(38 92% 50%)'
                  :                            'hsl(239 84% 67%)'
                  : undefined
              }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
