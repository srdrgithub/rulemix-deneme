// Hamle: (kaynak, hedef). Taşınan miktar SEÇİLMİYOR — üstteki aynı renk
// dizisinin tamamı taşınır, hedefin yeri kadarı kadar.
//
// KARAR (TASARIM.md §6): tek top değil, seri taşınır ve miktar zorunludur.
// Böylece hamle uzayı O(n²) kalıyor, durum uzayı küçülüyor ve arayüz
// piyasadaki her sort oyunuyla aynı çalışıyor (dokun-dokun).

import { ust, seriBoyu, kopyala } from './state.js'

/** Hamle yasal mı? Varyantın kendi yüklemi en sonda. */
export function yasal(d, k, h, varyant) {
  if (k === h) return false
  const kt = d.tup[k]
  const ht = d.tup[h]
  if (kt.length === 0) return false
  if (ht.length >= d.kap[h]) return false
  if (ht.length > 0 && ust(ht) !== ust(kt)) return false
  if (d.kilit[k]) return false // mühürlü tüpten top alınmaz
  if (d.rol[k] === 'giris') return false // yalnızca alır
  if (d.rol[h] === 'cikis') return false // yalnızca verir
  return varyant.izin ? varyant.izin(d, k, h) : true
}

/** Bu hamlede kaç top taşınır. */
export function miktar(d, k, h) {
  return Math.min(seriBoyu(d.tup[k]), d.kap[h] - d.tup[h].length)
}

export function yasalHamleler(d, varyant) {
  const out = []
  const n = d.tup.length
  for (let k = 0; k < n; k++) {
    if (d.tup[k].length === 0) continue
    for (let h = 0; h < n; h++) if (yasal(d, k, h, varyant)) out.push([k, h])
  }
  return out
}

export function oyna(d, k, h, varyant) {
  const y = kopyala(d)
  const m = miktar(d, k, h)
  const c = ust(y.tup[k])
  for (let i = 0; i < m; i++) y.tup[k].pop()
  for (let i = 0; i < m; i++) y.tup[h].push(c)
  // Kilit varyantı: DOLAN tüp mühürlenir. Başlangıçta dolu olanlar mühürlü
  // DEĞİL — mühür oyun sırasında oluşur, yoksa hiçbir hamle kalmazdı.
  if (varyant && varyant.muhurler && y.tup[h].length >= y.kap[h]) y.kilit[h] = 1
  return y
}

// NOT: "tek renkli tüpün tamamını boş tüpe taşımak" gibi anlamsız hamleler için
// ayrı bir budama YAZILMADI — kanonikleştirme (state.js) bunları zaten kendine
// dönen kenar hâline getiriyor ve çözücü onları atıyor. İkinci bir budama
// eklemek, sağlamlığı bozma riski karşılığında hiçbir şey kazandırmazdı.
