// ─── نظام إدارة صلاحيات وحالة حسابات التجار (Account Access Control & Suspension) ───

export const FROZEN_ACCOUNTS = new Set<string>([
  'admin213@gmail.com', // تم التجميد لعدم سداد المستحقات المالية
]);

export interface SuspensionInfo {
  title: string;
  badge: string;
  reason: string;
  message: string;
  supportPhone: string;
  supportWhatsApp: string;
}

export const DEFAULT_SUSPENSION_INFO: SuspensionInfo = {
  title: 'تم تجميد هذا الحساب رسمياً',
  badge: 'حساب مجمّد ⛔',
  reason: 'توقف الحساب لعدم سداد المستحقات والاشتراك المالي.',
  message: 'عذراً، تم تعليق صلاحيات هذا الحساب وحظر الوصول إلى البيانات والمزامنة وفقاً لسياسة الاستخدام. يُرجى التواصل الفوري مع إدارة المنصة لتسوية المستحقات واستعادة الحساب.',
  supportPhone: '0673282819',
  supportWhatsApp: '213673282819',
};

/**
 * التحقق مما إذا كان البريد الإلكتروني ينتمي لحساب مجمد
 */
export function isAccountFrozen(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return FROZEN_ACCOUNTS.has(clean);
}
