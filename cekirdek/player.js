// Model oyuncu — bütçenin referansı.
//
// ⚠️ 1. HAFTA SONU BULGUSU (Barbaros'un prototip denemesi, 27 Eyl):
// Hamle bütçesi en kısa çözümden türetilmişti (× 1,6 + 3). Yani referans
// KUSURSUZ oyuncuydu. Gerçek oyuncu da kusursuza yakın oynayınca bütçe hiç
// bitmedi, dolayısıyla CAN SİSTEMİ HİÇ DEVREYE GİRMEDİ — 10 bölümde bir kez
// bile can gitmedi. Bütçe "adil" ama işlevsizdi.
//
// Düzeltme: bütçe artık en kısa çözümden değil, MODEL OYUNCUNUN hamle
// dağılımından türetiliyor. Bu, Kar Kaçışı'ndaki "süre hedefi botun temiz
// turundan gelir" fikrinin aynısı — orada bot mükemmel değil, TİPİKti.
//
// Model oyuncu ileriye bakmaz; yerel sezgilerle oynar (tamamlayabiliyorsa
// tamamla, aynı renge ekle, boş tüpü harcama). Gerçek oyuncu bununla kusursuz
// çözücü arasında bir yerdedir; bütçe o aralıktan seçiliyor.

import { ust, hedefte } from './state.js'
import { yasalHamleler, miktar, oyna } from './moves.js'
import { cozulurMu } from './solver.js'
import { rng } from './generator.js'

function puan(s, k, h, onceki) {
  const kt = s.tup[k]
  const ht = s.tup[h]
  const m = miktar(s, k, h)
  const c = ust(kt)
  let p = m * 8
  const sonra = ht.length + m
  if (sonra === s.kap[h] && (ht.length === 0 || ht.every((x) => x === c))) p += 120 // tüpü bitiriyor
  if (ht.length > 0) p += 45
  else p -= 25 // boş tüpü harcıyor
  if (kt.length === m) p += 35 // kaynağı tamamen boşaltıyor
  if (onceki && onceki[0] === h && onceki[1] === k) p -= 500 // az önceki hamleyi geri alma
  return p
}

/**
 * Tek koşu.
 *
 * `bakis` = oyuncunun ileri görüşü, durum bütçesi olarak. Seçeceği hamleyi o
 * bütçeyle kontrol eder; bütçe içinde kesin ölü çıkıyorsa sıradakine bakar.
 *
 * ⚠️ 2. HAFTA: İLERİ BAKIŞ DENENDİ VE HİÇBİR ŞEY DEĞİŞTİRMEDİ.
 * Ölçüm (80 koşu, bakış 300): Klasik %49→%49, %3→%3, %0→%0. Sebep basit ve
 * geriye dönüp bakınca açık: Klasik'te tuzak oranı ZATEN %0 — kaçınılacak ölü
 * durum yok. Botun başarısızlık sebebi tuzağa düşmek değil, 300 hamlede
 * YAKINSAYAMAMAK. Yani sorunu öngörüsüzlük değil beceriksizlik; ileri bakış
 * beceriksizliği düzeltmiyor, sadece bölüm başına 30-65 saniye ekliyor.
 *
 * Varsayılan 0 bırakıldı. Parametre duruyor çünkü tuzak oranı yüksek
 * varyantlarda (Kilit) ölçüsü anlamlı olabilir; ama yıldız eşiği buradan
 * TÜRETİLMİYOR (bkz. tools/bank.js).
 *
 * @returns {{basari:boolean, hamle:number, sebep?:string}}
 */
export function kos(d0, varyant, r, sinir, bakis = 0) {
  let s = d0
  let onceki = null
  for (let i = 0; i < sinir; i++) {
    if (hedefte(s)) return { basari: true, hamle: i }
    const hamleler = yasalHamleler(s, varyant)
    if (!hamleler.length) return { basari: false, hamle: i, sebep: 'cikmaz' }

    const puanlar = hamleler.map(([k, h]) => puan(s, k, h, onceki))
    const enIyi = Math.max(...puanlar)
    // En iyiye yakın olanlar arasından rastgele: oyuncu her zaman aynı
    // hamleyi seçmez, dağılım da bu belirsizlikten çıkıyor.
    let aday = hamleler.filter((_, j) => puanlar[j] >= enIyi - 30)
    // Karıştır, sonra ilk "ölü olmayan"ı seç.
    for (let j = aday.length - 1; j > 0; j--) {
      const t = Math.floor(r() * (j + 1))
      ;[aday[j], aday[t]] = [aday[t], aday[j]]
    }
    let secim = aday[0]
    let sonraki = oyna(s, secim[0], secim[1], varyant)
    if (bakis > 0) {
      for (const a of aday) {
        const y = oyna(s, a[0], a[1], varyant)
        if (cozulurMu(y, varyant, { sinir: bakis }) !== false) {
          secim = a
          sonraki = y
          break
        }
      }
    }
    onceki = secim
    s = sonraki
  }
  return { basari: false, hamle: sinir, sebep: 'sinir' }
}

/**
 * N koşu simüle eder ve dağılımı döndürür.
 * @returns {{basariOrani:number, p50:number, p70:number, p90:number, ort:number}}
 */
export function simule(d0, varyant, o = {}) {
  const kosu = o.kosu ?? 300
  const sinir = o.sinir ?? 300
  const bakis = o.bakis ?? 0
  const r = rng(o.tohum ?? 1234)
  const basarili = []
  let basari = 0
  for (let i = 0; i < kosu; i++) {
    const k = kos(d0, varyant, r, sinir, bakis)
    if (k.basari) {
      basari++
      basarili.push(k.hamle)
    }
  }
  basarili.sort((a, b) => a - b)
  const yuzde = (p) => (basarili.length ? basarili[Math.min(basarili.length - 1, Math.floor(basarili.length * p))] : null)
  return {
    basariOrani: basari / kosu,
    p50: yuzde(0.5),
    p70: yuzde(0.7),
    p90: yuzde(0.9),
    ort: basarili.length ? +(basarili.reduce((a, b) => a + b, 0) / basarili.length).toFixed(1) : null,
  }
}
