// Çözücü — TASARIM.md §6.1/§6.2. Projenin kazanıldığı ya da kaybedildiği yer.
//
// Yöntem: erişilebilir durum grafiğini bir kez kur, sonra hedeflerden GERİYE
// yürüyerek hangi durumların çözülebilir olduğunu işaretle. Tek geçişte hem
// "çözülür mü", hem en kısa çözüm, hem de tuzak ölçümleri çıkıyor.
//
// Neden ileri arama + geri işaretleme: "bu hamle kaybettirir mi?" sorusunun
// cevabı, sonuç durumundan hedefe yol olup olmadığıdır. Bunu her hamle için
// ayrı ayrı aramak üstel; grafiği bir kez kurup tersine yürümek doğrusal.

import { anahtar, hedefte } from './state.js'
import { yasalHamleler, oyna } from './moves.js'

export const VARSAYILAN_SINIR = 200000

/**
 * Erişilebilir durum grafiğini kurar ve ölçer.
 * @returns {{asildi:boolean, durumSayisi:number, cozulur?:boolean,
 *            enKisa?:number, yol?:Array<[number,number]>,
 *            tuzakOrani?:number, ilkTuzak?:number, dalBudagi?:number,
 *            cikmaz?:number, olumluHamle?:number, toplamHamle?:number}}
 */
export function analiz(d0, varyant, opts = {}) {
  const sinir = opts.sinir ?? VARSAYILAN_SINIR

  const indeks = new Map()
  const durum = []
  const derinlik = []
  const kenar = [] // kenar[i] = [[j, k, h], ...]
  const ata = [] // [önceki durum, k, h] — en kısa yolu geri çıkarmak için
  const hedefIdx = []

  const ekle = (s, d, a) => {
    const i = durum.length
    indeks.set(anahtar(s, varyant), i)
    durum.push(s)
    derinlik.push(d)
    kenar.push([])
    ata.push(a)
    return i
  }

  ekle(d0, 0, null)
  for (let i = 0; i < durum.length; i++) {
    const s = durum[i]
    if (hedefte(s)) {
      hedefIdx.push(i)
      continue // hedefe varıldıysa bölüm biter; ileri açılmaz
    }
    for (const [k, h] of yasalHamleler(s, varyant)) {
      const y = oyna(s, k, h, varyant)
      const ak = anahtar(y, varyant)
      let j = indeks.get(ak)
      if (j === undefined) {
        if (durum.length >= sinir) return { asildi: true, durumSayisi: durum.length }
        j = ekle(y, derinlik[i] + 1, [i, k, h])
      }
      if (j !== i) kenar[i].push([j, k, h])
    }
  }

  // ---- hedeflerden geriye: hangi durumlar çözülebilir ----
  const ters = durum.map(() => [])
  for (let i = 0; i < kenar.length; i++) for (const [j] of kenar[i]) ters[j].push(i)

  const cozulur = new Uint8Array(durum.length)
  const kuyruk = hedefIdx.slice()
  for (const i of kuyruk) cozulur[i] = 1
  for (let b = 0; b < kuyruk.length; b++) {
    for (const i of ters[kuyruk[b]]) {
      if (!cozulur[i]) {
        cozulur[i] = 1
        kuyruk.push(i)
      }
    }
  }

  const sonuc = {
    asildi: false,
    durumSayisi: durum.length,
    cozulur: !!cozulur[0],
    hedefSayisi: hedefIdx.length,
  }
  if (!sonuc.cozulur) return sonuc

  // ---- en kısa çözüm ----
  let enYakin = hedefIdx[0]
  for (const i of hedefIdx) if (derinlik[i] < derinlik[enYakin]) enYakin = i
  sonuc.enKisa = derinlik[enYakin]
  const yol = []
  for (let i = enYakin; ata[i]; ) {
    const [p, k, h] = ata[i]
    yol.push([k, h])
    i = p
  }
  sonuc.yol = yol.reverse()

  // ---- tuzak ölçümleri: yalnızca oyuncunun meşru olarak bulunabileceği
  //      (yani çözülebilir) durumlar üzerinden ----
  let toplam = 0
  let olumlu = 0
  let ilkTuzak = Infinity
  let cikmaz = 0
  let dalToplam = 0
  let dalSayi = 0
  for (let i = 0; i < durum.length; i++) {
    if (!cozulur[i]) continue
    if (hedefte(durum[i])) continue
    const ke = kenar[i]
    if (ke.length === 0) cikmaz++
    dalToplam += ke.length
    dalSayi++
    for (const [j] of ke) {
      toplam++
      if (!cozulur[j]) {
        olumlu++
        if (derinlik[i] < ilkTuzak) ilkTuzak = derinlik[i]
      }
    }
  }
  sonuc.toplamHamle = toplam
  sonuc.olumluHamle = olumlu
  sonuc.tuzakOrani = toplam ? olumlu / toplam : 0
  sonuc.ilkTuzak = ilkTuzak === Infinity ? null : ilkTuzak
  sonuc.dalBudagi = dalSayi ? dalToplam / dalSayi : 0
  sonuc.cikmaz = cikmaz
  return sonuc
}

/** Hızlı "çözülür mü" — grafiği kurmadan, ileri aramayla. */
export function cozulurMu(d0, varyant, opts = {}) {
  const sinir = opts.sinir ?? VARSAYILAN_SINIR
  const gorulen = new Set([anahtar(d0, varyant)])
  const kuyruk = [d0]
  for (let b = 0; b < kuyruk.length; b++) {
    const s = kuyruk[b]
    if (hedefte(s)) return true
    for (const [k, h] of yasalHamleler(s, varyant)) {
      const y = oyna(s, k, h, varyant)
      const ak = anahtar(y, varyant)
      if (gorulen.has(ak)) continue
      if (gorulen.size >= sinir) return null // bilinmiyor
      gorulen.add(ak)
      kuyruk.push(y)
    }
  }
  return false
}

/**
 * Zorluğun İKİ EKSENİ — 1. hafta bulgusu.
 *
 * TASARIM.md §6.2 tek bir 1-4 merdiveni öngörüyordu. Ölçüm bunun yanlış
 * olduğunu gösterdi: varyantlar zorluğu farklı yerden alıyor.
 *
 *   planlama = çözümü BULMAK ne kadar zor   (enKisa, dalBudagi)
 *   ongoru   = kaybetmemek ne kadar zor     (tuzakOrani, ilkTuzak)
 *
 * Klasik ve Kapasite planlama ağırlıklı (tuzak neredeyse yok), Kilit ve
 * Menzil öngörü ağırlıklı. Tek bir mutlak sayı ikisini aynı kefeye koyup
 * Kilit'in her bölümünü "4", Klasik'in hiçbirini "4" yapıyordu — yani
 * merdiven değil, varyant etiketi üretiyordu.
 *
 * Bu yüzden kampanya merdiveni bölüm bölüm değil, BANKA KURULURKEN varyant
 * İÇİNDE sıralanarak çıkarılacak (2. hafta). Buradaki `zorluk()` yalnızca
 * kaba bir ön eleme.
 */
export function eksenler(a) {
  if (!a || a.asildi || !a.cozulur) return null
  return {
    planlama: a.enKisa + a.dalBudagi,
    ongoru: a.tuzakOrani * 100 + (a.ilkTuzak === null ? 0 : Math.max(0, 10 - a.ilkTuzak)),
  }
}

/** Kaba ön eleme sınıfı. Kesin merdiven 2. haftada varyant içi sıralamayla. */
export function zorluk(a) {
  if (!a || a.asildi || !a.cozulur) return null
  if (a.olumluHamle === 0) return 1 // Serbest: kaybetmek imkânsız
  if (a.ilkTuzak >= 6 && a.tuzakOrani < 0.08) return 2
  if (a.tuzakOrani < 0.2) return 3
  return 4
}
