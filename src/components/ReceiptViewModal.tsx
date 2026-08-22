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

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 pb-16 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-sm w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-3 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-emerald-400" />
            <h3 className="font-black text-sm">معاينة الوصل الحراري</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        {/* Thermal Receipt Preview Body */}
        <div className="flex-1 overflow-y-auto p-3 bg-slate-100 flex justify-center">
          <iframe
            srcDoc={htmlContent}
            className="w-full h-[450px] rounded-xl shadow-inner border border-slate-300 bg-white"
            title="معاينة الوصل"
          />
        </div>

        {/* Single Main Black Action Button */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0">
          <button
            onClick={handlePrint}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 touch-active shadow-md"
          >
            <Printer size={18} />
            🖨️ طباعة الوصل
          </button>
        </div>

      </div>
    </div>
  );
}
