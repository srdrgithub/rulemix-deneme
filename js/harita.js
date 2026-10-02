// Kampanya haritası: 8 grup (5 varyant + 3 birleşim seti), 140 bölüm.
//
// Açılma kuralı — TASARIM.md §7 "düz liste değil, varyant varyant açılan yol":
//   · Bir bölüm, grubun ilkiyse ya da önceki bölüm bitmişse açıktır
//   · Bir grup, ilk gruptan sonrakiyse ve ÖNCEKİ grupta yeterince bölüm
//     bitmişse açılır (eşik = grubun yarısı, en çok 12)

import { BOLUMLER } from '../veri/levels.js'
import { yildizi } from './kayit.js'

export const GRUPLAR = []
for (const b of BOLUMLER) {
  let g = GRUPLAR.find((x) => x.varyant === b.varyant)
  if (!g) { g = { varyant: b.varyant, ad: b.varyantAd, bolumler: [] }; GRUPLAR.push(g) }
  g.bolumler.push(b)
}
for (const g of GRUPLAR) g.bolumler.sort((a, b) => a.sira - b.sira)

export const esik = (g) => Math.min(12, Math.ceil(g.bolumler.length / 2))
export const bitenSayisi = (g) => g.bolumler.filter((b) => yildizi(b.id) > 0).length

// DENEME KAPISI: adresin sonuna `?hepsi` yazılınca bütün bölümler açılır.
// Yalnızca tarayıcıdaki deneme sürümünde işe yarar; uygulamada adres çubuğu yok.
const HEPSI_ACIK = typeof location !== 'undefined' && new URLSearchParams(location.search).has('hepsi')

export function grupAcikMi(i) {
  if (i === 0 || HEPSI_ACIK) return true
  const onceki = GRUPLAR[i - 1]
  return bitenSayisi(onceki) >= esik(onceki)
}

export function bolumAcikMi(b) {
  const gi = GRUPLAR.findIndex((g) => g.varyant === b.varyant)
  if (!grupAcikMi(gi)) return false
  if (b.sira === 1 || HEPSI_ACIK) return true
  const onceki = GRUPLAR[gi].bolumler.find((x) => x.sira === b.sira - 1)
  return !onceki || yildizi(onceki.id) > 0
}

/** Oyuncunun kaldığı yer: açık olan ilk bitmemiş bölüm. */
export function siradaki() {
  for (let i = 0; i < GRUPLAR.length; i++) {
    if (!grupAcikMi(i)) break
    for (const b of GRUPLAR[i].bolumler) if (!yildizi(b.id) && bolumAcikMi(b)) return b
  }
  return BOLUMLER.find((b) => bolumAcikMi(b)) || BOLUMLER[0]
}

/** Can harcanmadan oynanabilen bölümler — canı bitenin sığınağı (§15/§16). */
export const canliMi = (b) => b.canli && !yildizi(b.id)
export const siginak = () => BOLUMLER.filter((b) => !canliMi(b) && bolumAcikMi(b))
export const bolumBul = (id) => BOLUMLER.find((b) => b.id === id)
export { BOLUMLER }

// Düz sıra: oyuncu grupları değil tek bir "Bölüm N" sayacı görür (rakip
// incelemesi, 29 Eyl: toplam bölüm sayısını baştan göstermek çekici değil).
const DUZ = GRUPLAR.flatMap((g) => g.bolumler)
export const numara = (b) => DUZ.indexOf(b) + 1

/** Kazanınca gidilecek yer: düz sıradaki bir sonraki açık bölüm, yoksa kalınan yer. */
export function sonrakiBolum(b) {
  const s = DUZ[DUZ.indexOf(b) + 1]
  return s && bolumAcikMi(s) ? s : siradaki()
}
