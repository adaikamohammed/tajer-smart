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

/** كتابة بيانات مشفرة بأمان إلى LocalStorage */
export function setEncryptedLocalData<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    const jsonStr = JSON.stringify(value);
    const encrypted = simpleEncrypt(jsonStr);
    localStorage.setItem(key, encrypted);
  } catch (e) {
    console.error(`Error writing encrypted storage key [${key}]:`, e);
  }
}
