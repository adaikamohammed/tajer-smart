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

  const tabColors: Record<string, { bg: string; text: string; icon: string }> = {
    home:      { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-800', icon: 'text-emerald-600' },
    inventory: { bg: 'bg-purple-50 text-purple-700 border-purple-200',   text: 'text-purple-800',  icon: 'text-purple-600' },
    contacts:  { bg: 'bg-blue-50 text-blue-700 border-blue-200',       text: 'text-blue-800',    icon: 'text-blue-600' },
    debts:     { bg: 'bg-rose-50 text-rose-700 border-rose-200',       text: 'text-rose-800',    icon: 'text-rose-600' },
    receipts:  { bg: 'bg-amber-50 text-amber-800 border-amber-200',    text: 'text-amber-900',   icon: 'text-amber-700' },
    stats:     { bg: 'bg-teal-50 text-teal-700 border-teal-200',       text: 'text-teal-800',    icon: 'text-teal-600' },
    developer: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'text-indigo-800',  icon: 'text-indigo-600' },
  };

  return (
    <nav className="bottom-nav" role="navigation" aria-label="التنقل الرئيسي">
      <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto flex items-center justify-between gap-1 sm:gap-2">
        {TABS.map((item) => {
          const Icon     = item.icon;
          const isActive = pathname === item.href;
          const colors   = tabColors[item.tab] || tabColors.home;

          return (
            <Link
              key={item.href}
              href={item.href}
              data-tab={item.tab}
              className={`nav-item transition-all duration-200 ${
                isActive
                  ? `${colors.bg} font-black shadow-sm border scale-105`
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
            >
              <div className="nav-item-icon relative">
                <Icon
                  className={`transition-all duration-200 ${isActive ? colors.icon : 'text-slate-400'}`}
                  size={isActive ? 20 : 18}
                  strokeWidth={isActive ? 2.5 : 1.9}
                />
                {item.hasBadge && debtCount > 0 && (
                  <span className="nav-badge" aria-label={`${debtCount} ديون مستحقة`}>
                    {debtCount > 9 ? '9+' : debtCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] sm:text-xs font-bold leading-none ${isActive ? colors.text : 'text-slate-500'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
