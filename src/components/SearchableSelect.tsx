'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, Plus, User, Package, X } from 'lucide-react';

export interface SelectOption {
  id: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  onAddNew?: () => void;
  addNewText?: string;
  icon?: 'user' | 'package';
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'اختر من القائمة...',
  searchPlaceholder = 'ابحث بالاسم أو الرقم...',
  required = false,
  onAddNew,
  addNewText,
  icon,
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // الخيار المختار حالياً
  const selectedOption = useMemo(() => {
    return options.find(o => o.id === value) || null;
  }, [options, value]);

  // تصفية الخيارات حسب كتابة المستخدم
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter(o =>
      o.label.toLowerCase().includes(q) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // التركيز التلقائي على حقل البحث عند فتح القائمة
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
  };

  return (
    <div className={`relative w-full ${isOpen ? 'z-50' : ''}`} ref={containerRef}>
      {/* 🔘 زر القائمة المنسدلة الرئيسي */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full form-input flex items-center justify-between gap-2 py-2.5 px-3 text-right bg-white transition-all border ${
          isOpen
            ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
            : 'border-slate-300 hover:border-slate-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {icon === 'user' && <User className="w-4 h-4 text-emerald-600 shrink-0" />}
          {icon === 'package' && <Package className="w-4 h-4 text-emerald-600 shrink-0" />}
          
          {selectedOption ? (
            <div className="truncate text-right">
              <span className="font-black text-xs text-slate-800">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-[11px] text-slate-500 mr-2 font-bold">{selectedOption.sublabel}</span>
              )}
            </div>
          ) : (
            <span className="text-xs font-bold text-slate-400">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedOption?.badge && (
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
              {selectedOption.badge}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
        </div>
      </button>

      {/* 🔽 قائمة الخيارات المنسدلة مع حقل البحث المباشر */}
      {isOpen && (
        <div className="absolute z-[100] top-full right-0 left-0 mt-1 bg-white border-2 border-slate-300 rounded-2xl shadow-2xl overflow-hidden space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* حقل البحث داخل القائمة */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/90 sticky top-0 z-10 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* قائمة الخيارات */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => {
                const isSelected = option.id === value;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option.id)}
                    className={`w-full text-right p-2.5 rounded-xl transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-950 font-black'
                        : 'hover:bg-slate-100/80 text-slate-700 font-bold'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black truncate">{option.label}</div>
                      {option.sublabel && (
                        <div className="text-[10px] text-slate-500 font-semibold truncate mt-0.5">{option.sublabel}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {option.badge && (
                        <span className="text-[10px] font-extrabold text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded-md">
                          {option.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-500 font-bold">
                {searchQuery ? `لا توجد نتائج مطابقة لـ "${searchQuery}"` : 'لا توجد عناصر مسجلة بعد'}
              </div>
            )}
          </div>

          {/* زر إضافة عنصر جديد إن وجد */}
          {onAddNew && (
            <div className="p-2 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onAddNew();
                }}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm touch-active"
              >
                <Plus className="w-3.5 h-3.5" />
                {addNewText || 'إضافة عنصر جديد ➕'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
