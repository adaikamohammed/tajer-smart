'use client';

import { useState } from 'react';
import { Receipt, buildThermalReceiptHTML, printThermalReceipt } from '@/lib/store';
import { X, Printer, Download, Share2, Check } from 'lucide-react';
import { toast } from '@/components/Toast';

interface ReceiptViewModalProps {
  receipt: Receipt | null;
  onClose: () => void;
}

export default function ReceiptViewModal({ receipt, onClose }: ReceiptViewModalProps) {
  if (!receipt) return null;

  const htmlContent = buildThermalReceiptHTML(receipt);

  const handlePrint = () => {
    printThermalReceipt(receipt);
  };

  const handleRawBT = (paperWidth: '80' | '58') => {
    try {
      const clonedDoc = document.createElement('html');
      clonedDoc.innerHTML = htmlContent;
      const noPrints = clonedDoc.querySelectorAll('.no-print');
      noPrints.forEach(el => el.remove());

      if (paperWidth === '58') {
        const body = clonedDoc.querySelector('body');
        if (body) {
          body.style.maxWidth = '58mm';
          body.style.fontSize = '12px';
        }
      }

      const b64 = btoa(unescape(encodeURIComponent(clonedDoc.outerHTML)));
      window.location.href = 'intent:base64,' + b64 + '#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;';
    } catch (e: any) {
      toast('خطأ في الاتصال بالطابعة: ' + e.message, 'warning');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-sm w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-3 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-emerald-400" />
            <h3 className="font-black text-sm">معاينة الوصل الحراري (80mm)</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        {/* Thermal Receipt Preview Body */}
        <div className="flex-1 overflow-y-auto p-3 bg-slate-100 flex justify-center">
          <iframe
            srcDoc={htmlContent}
            className="w-full h-[480px] rounded-xl shadow-inner border border-slate-300 bg-white"
            title="معاينة الوصل"
          />
        </div>

        {/* Action Buttons */}
        <div className="p-3 bg-white border-t border-slate-200 space-y-2 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleRawBT('80')}
              className="py-2.5 px-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 touch-active"
            >
              📱 طباعة RawBT 80mm
            </button>
            <button
              onClick={() => handleRawBT('58')}
              className="py-2.5 px-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 touch-active"
            >
              📱 طباعة RawBT 58mm
            </button>
          </div>
          <button
            onClick={handlePrint}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 touch-active"
          >
            <Printer size={16} />
            🖨️ طباعة متصفح (PC / هاتف)
          </button>
        </div>

      </div>
    </div>
  );
}
