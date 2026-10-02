// Günlük bulmaca — TASARIM.md §9, 5. hafta: seri (streak) ve sonucu ele
// vermeyen paylaşılabilir özet.
//
// Gün, oyuncunun KENDİ takvim günü: bulmaca yerel gece yarısında değişir.
// Aynı takvim gününde herkes aynı tahtayı oynar (banka önden üretilmiş,
// `tools/gunluk.js`), yani sonuçlar karşılaştırılabilir.
//
// Günlük bulmaca can harcamaz ve kampanya ilerlemesine sayılmaz: tek işi
// oyuncuya her gün geri gelmek için bir sebep vermek.

import { GUNLUK } from '../veri/gunluk.js'
import { D, gunlukSonuc } from './kayit.js'

const BASLANGIC = Date.UTC(2026, 9, 1) // 1 numaralı gün: 1 Ekim 2026
const GUN_MS = 86400000

/** Takvim gününün numarası (yerel tarih). 1 Ekim 2026 = 1. */
export function gunNo(t = new Date()) {
  return Math.floor((Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) - BASLANGIC) / GUN_MS) + 1
}

export const gunlukKimlik = (no) => `g${no}`
export const gunlukMu = (id) => typeof id === 'string' && id[0] === 'g'

/** Günün bölümü, oyun ekranının beklediği biçimde. */
export function gununBolumu(no = gunNo()) {
  const n = GUNLUK.length
  const b = GUNLUK[(((no - 1) % n) + n) % n]
  return { ...b, id: gunlukKimlik(no), gun: no, gunluk: true, canli: false, ogretici: false }
}

/** Art arda bitirilen gün sayısı. Bugün henüz oynanmadıysa seri dünden sayılır. */
export function seri(no = gunNo()) {
  let s = 0
  for (let g = gunlukSonuc(no) ? no : no - 1; gunlukSonuc(g); g--) s++
  return s
}

/** Paylaşım metni: gün, yıldız, hamle ve seri — tahtanın kendisi yok. */
export function paylasMetni({ ad, etiket, hamleAdi, no, yildiz, hamle, enKisa, seriSayisi }) {
  return `${ad} · ${etiket} #${no}\n${'★'.repeat(yildiz)}${'☆'.repeat(3 - yildiz)} · ${hamleAdi} ${hamle}/${enKisa}\n🔥 ${seriSayisi}`
}
