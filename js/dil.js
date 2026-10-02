// Dil ve YÖN. Sekiz dilin yedisi soldan sağa, Arapça sağdan sola.
//
// TASARIM.md §2: RTL bir çeviri işi değil arayüz işi ve sonradan eklenmesi
// en pahalı iştir. Bu yüzden ilk günden içeride: `dir` kök öğeye yazılıyor,
// CSS de mantıksal özellik kullanıyor (margin-inline, inset-inline…), böylece
// aynalama kendiliğinden oluyor.

import { tr } from './dil/tr.js'
import { en } from './dil/en.js'
import { de } from './dil/de.js'
import { fr } from './dil/fr.js'
import { pt } from './dil/pt.js'
import { it } from './dil/it.js'
import { ja } from './dil/ja.js'
import { ar } from './dil/ar.js'

export const DILLER = [
  { kod: 'tr', ad: 'Türkçe', yon: 'ltr', s: tr },
  { kod: 'en', ad: 'English', yon: 'ltr', s: en },
  { kod: 'de', ad: 'Deutsch', yon: 'ltr', s: de },
  { kod: 'fr', ad: 'Français', yon: 'ltr', s: fr },
  { kod: 'pt', ad: 'Português', yon: 'ltr', s: pt },
  { kod: 'it', ad: 'Italiano', yon: 'ltr', s: it },
  { kod: 'ja', ad: '日本語', yon: 'ltr', s: ja },
  { kod: 'ar', ad: 'العربية', yon: 'rtl', s: ar },
]

let aktif = DILLER[0]

export function dilBul(kod) {
  return DILLER.find((d) => d.kod === kod)
}

/** Cihazın dilinden en yakın desteklenen dili seçer. */
export function cihazDili() {
  if (typeof navigator === 'undefined') return 'en'
  for (const istek of navigator.languages || [navigator.language || 'en']) {
    const kok = String(istek).toLowerCase().split('-')[0]
    const d = dilBul(kok)
    if (d) return d.kod
  }
  return 'en'
}

export function dilSec(kod) {
  aktif = dilBul(kod) || DILLER[1]
  // DOM şart değil: dil seçimi saf veri işi. Testler ve paketleme betikleri
  // bu modülü tarayıcısız yüklüyor; `document`e koşulsuz dokunmak onları
  // kırıyordu ve aynı kırılganlık ileride sunucu tarafı bir kullanımda da
  // çıkardı.
  if (typeof document !== 'undefined' && document.documentElement) {
    const k = document.documentElement
    k.lang = aktif.kod
    k.dir = aktif.yon // ← RTL burada
  }
  return aktif
}

export const dil = () => aktif

/** Çeviri. Eksik anahtar İngilizceye, o da yoksa anahtarın kendisine düşer. */
export function m(anahtar, degerler) {
  let s = aktif.s[anahtar] ?? en[anahtar] ?? anahtar
  if (degerler) for (const [k, v] of Object.entries(degerler)) s = s.replaceAll(`{${k}}`, v)
  return s
}

/** Sayıyı aktif dilin biçiminde yazar (Arapça rakamları dâhil). */
export const sayi = (n) => new Intl.NumberFormat(aktif.kod).format(n)

/** Varyant kimliğinden çevrilmiş ad: 'kilit' → Kilit, 'kilit+menzil' → Kilit + Menzil */
export const varyantAdi = (id) => id.split('+').map((x) => m(x)).join(' + ')
/** Varyantın kural metni; birleşimde iki cümle art arda. */
export const varyantMetni = (id) => id.split('+').map((x) => m(x + 'Metin')).join(' ')
