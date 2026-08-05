'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Users,
  CreditCard,
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
];

export default function BottomNav({ debtCount = 0 }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" role="navigation" aria-label="التنقل الرئيسي">
      <div className="max-w-md mx-auto flex items-center justify-around">
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
                  size={isActive ? 22 : 20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {/* Badge الديون */}
                {item.hasBadge && debtCount > 0 && (
                  <span className="nav-badge" aria-label={`${debtCount} ديون مستحقة`}>
                    {debtCount > 9 ? '9+' : debtCount}
                  </span>
                )}
              </div>
              <span style={{
                color: isActive
                  ? item.tab === 'home'      ? 'hsl(158 64% 38%)'
                  : item.tab === 'inventory' ? 'hsl(262 83% 52%)'
                  : item.tab === 'contacts'  ? 'hsl(221 83% 52%)'
                  :                            'hsl(351 83% 52%)'
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
