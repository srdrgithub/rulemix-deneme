// Satın alma — tek ürün: Tam Sürüm (reklamsız + sınırsız can). TASARIM.md §8.
//
// Uygulamada mağazanın kendi satın alma akışı (`NativePurchases` eklentisi),
// tarayıcıda sahte sağlayıcı: aynı üç sonuç, para yok.
//
//   satinAl()   → 'alindi' | 'vazgecti' | 'hata'
//   geriYukle() → 'alindi' | 'yok' | 'hata'      (Apple bu düğmeyi şart koşuyor)
//   fiyat()     → mağazanın yerel fiyat metni ya da null
//
// Sahiplik `kayit.js`'te `D.tam` olarak saklanır ama asıl kaynak mağazadır:
// uygulama her açılışta `esitle()` ile mağazaya sorar. Böylece iade edilen
// satın alma düşer, yeni cihaza geçen oyuncu da düğmeye basmadan geri alır.

import { D, tamYaz, olay } from './kayit.js'
import { yerli, platform, cagir } from './kopru.js'

// Kimlik düzeni Rulefold'daki gibi: <uygulama kimliği>.tamsurum
export const URUN = 'com.fidordia.rulemix.tamsurum'
const TUR = { productType: 'inapp' }

// Android'de bekleyen (nakit, onay bekleyen) ödeme sahiplik sayılmaz.
const gecerli = (t) => t && t.productIdentifier === URUN && (platform() !== 'android' || t.purchaseState === '1')

async function sahipMi() {
  const { purchases } = await cagir('NativePurchases', 'getPurchases', { ...TUR, onlyCurrentEntitlements: true })
  return (purchases || []).some(gecerli)
}

export async function fiyat() {
  if (!yerli()) return null
  try {
    const { product } = await cagir('NativePurchases', 'getProduct', { productIdentifier: URUN, ...TUR })
    return product?.priceString || null
  } catch (e) {
    return null
  }
}

export async function satinAl() {
  let sonuc
  if (!yerli()) sonuc = 'alindi' // sahte sağlayıcı: onayı arayüzdeki düğmenin kendisi sayılır
  else {
    try {
      const t = await cagir('NativePurchases', 'purchaseProduct', { productIdentifier: URUN, ...TUR, quantity: 1 })
      sonuc = gecerli(t) ? 'alindi' : 'vazgecti'
    } catch (e) {
      // İptal de hata olarak geliyor; ikisini ayırmanın güvenilir yolu sahipliğe bakmak
      sonuc = (await sahipMi().catch(() => false)) ? 'alindi' : /cancel/i.test(String(e?.message || e)) ? 'vazgecti' : 'hata'
    }
  }
  if (sonuc === 'alindi') tamYaz(true)
  olay('satin_alma', { sonuc })
  return sonuc
}

export async function geriYukle() {
  let sonuc
  if (!yerli()) sonuc = D.tam ? 'alindi' : 'yok'
  else {
    try {
      await cagir('NativePurchases', 'restorePurchases', {})
      sonuc = (await sahipMi()) ? 'alindi' : 'yok'
    } catch (e) {
      sonuc = 'hata'
    }
  }
  if (sonuc === 'alindi') tamYaz(true)
  olay('geri_yukleme', { sonuc })
  return sonuc
}

/** Açılışta sessizce: mağazadaki sahiplik neyse yerel kayıt o olur. Mağazaya ulaşılamazsa dokunmaz. */
export async function esitle() {
  if (!yerli()) return
  try {
    const sahip = await sahipMi()
    if (sahip !== !!D.tam) tamYaz(sahip)
  } catch (e) {}
}
