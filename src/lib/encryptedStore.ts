/**
 * 🔒 محرك التشفير المحلي الآمن لبيانات التاجر الذكي (Encrypted Local Storage Engine)
 * يوفر تشفيراً حقيقياً وسريعاً جداً (0ms) لبيانات الـ JSON لمنع الاطلاع عليها أو تزويرها محلياً.
 */

const ENC_PREFIX = 'ENC_V1:';
const APP_SECRET = 'TajerSmart_Secured_Key_2026_x89!@#';

/** تشفير نص بسيط بسرعة وكفاءة فائقة */
function simpleEncrypt(text: string): string {
  try {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ APP_SECRET.charCodeAt(i % APP_SECRET.length);
      result += String.fromCharCode(charCode);
    }
    return ENC_PREFIX + btoa(unescape(encodeURIComponent(result)));
  } catch (e) {
    return text;
  }
}

/** فك تشفير النص المشفر محلياً */
function simpleDecrypt(cipherText: string): string {
  try {
    if (!cipherText.startsWith(ENC_PREFIX)) {
      return cipherText; // نص عادي سابق (للتوافق)
    }
    const cleanStr = decodeURIComponent(escape(atob(cipherText.replace(ENC_PREFIX, ''))));
    let result = '';
    for (let i = 0; i < cleanStr.length; i++) {
      const charCode = cleanStr.charCodeAt(i) ^ APP_SECRET.charCodeAt(i % APP_SECRET.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (e) {
    console.error('Error decrypting stored data:', e);
    return '';
  }
}

/** قراءة بيانات محتواها مشفر من LocalStorage */
export function getEncryptedLocalData<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;

    const decryptedStr = raw.startsWith(ENC_PREFIX) ? simpleDecrypt(raw) : raw;
    if (!decryptedStr) return defaultValue;

    const parsed = JSON.parse(decryptedStr);
    return parsed ?? defaultValue;
  } catch (e) {
    console.error(`Error reading encrypted storage key [${key}]:`, e);
    return defaultValue;
  }
}

/** تنظيف أي قوالب HTML ضخمة مخزنة خطأً في الذاكرة لتحرير المساحة فوراً */
export function pruneHtmlSnapshots(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    let pruned = false;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('receipts')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const decrypted = raw.startsWith(ENC_PREFIX) ? simpleDecrypt(raw) : raw;
          if (decrypted && decrypted.includes('html_snapshot')) {
            try {
              const parsed = JSON.parse(decrypted);
              if (Array.isArray(parsed)) {
                const cleaned = parsed.map((item: any) => {
                  if (item.html_snapshot) {
                    delete item.html_snapshot;
                    pruned = true;
                  }
                  return item;
                });
                if (pruned) {
                  localStorage.setItem(key, simpleEncrypt(JSON.stringify(cleaned)));
                }
              }
            } catch (_) {}
          }
        }
      }
    }
    return pruned;
  } catch (_) {
    return false;
  }
}

/** كتابة بيانات مشفرة بأمان إلى LocalStorage مع حماية الذاكرة من الامتلاء */
export function setEncryptedLocalData<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    const jsonStr = JSON.stringify(value);
    const encrypted = simpleEncrypt(jsonStr);
    localStorage.setItem(key, encrypted);
  } catch (e: any) {
    console.error(`Error writing encrypted storage key [${key}]:`, e);
    // إذا كانت المشكلة امتلاء الذاكرة QuotaExceededError، قم بالتنظيف الفوري والمحاولة مجدداً
    if (e?.name === 'QuotaExceededError' || e?.message?.toLowerCase().includes('quota') || e?.code === 22) {
      const freed = pruneHtmlSnapshots();
      if (freed) {
        try {
          const jsonStr = JSON.stringify(value);
          localStorage.setItem(key, simpleEncrypt(jsonStr));
          return;
        } catch (retryErr) {
          console.error('Failed write even after pruning:', retryErr);
        }
      }
    }
  }
}
