// Capacitor köprüsü — derleyicisiz.
//
// Eklentilerin JS paketleri (`@capacitor-community/admob` vb.) derleyici ister;
// bu projede derleme adımı yok (TASARIM.md §11). Yerli köprü ise `window.Capacitor`
// üzerinde iki düşük seviye çağrı veriyor ve eklenti paketlerinin yaptığı her
// şey bunlara iniyor: `nativePromise(eklenti, yöntem, seçenek)` ve
// `addListener(eklenti, olay, fn)`. Yalnızca bunlar kullanılıyor.
//
// Tarayıcıda `window.Capacitor` yok: `yerli()` false döner ve reklam/satış
// sahte sağlayıcıyla çalışır.

const cap = () => globalThis.Capacitor

export const yerli = () => !!cap()?.isNativePlatform?.()
export const platform = () => (yerli() ? cap().getPlatform() : 'web')
export const cagir = (eklenti, yontem, secenek = {}) => cap().nativePromise(eklenti, yontem, secenek)
export const dinle = (eklenti, olayAdi, fn) => cap().addListener(eklenti, olayAdi, fn)

/** Dokunsal geri bildirim. Uygulamada Haptics eklentisi, tarayıcıda titreşim API'si. */
export function titre(tur = 'hafif') {
  try {
    if (yerli()) {
      if (tur === 'basari') cagir('Haptics', 'notification', { type: 'SUCCESS' }).catch(() => {})
      else if (tur === 'hata') cagir('Haptics', 'notification', { type: 'ERROR' }).catch(() => {})
      else cagir('Haptics', 'impact', { style: 'LIGHT' }).catch(() => {})
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(tur === 'hata' ? [20, 40, 20] : tur === 'basari' ? 30 : 8)
    }
  } catch (e) {}
}

/**
 * Metin paylaşır: uygulamada sistemin paylaşım sayfası, tarayıcıda Web Share,
 * o da yoksa pano. Dönüş: 'paylasildi' | 'kopyalandi' | 'olmadi'.
 */
export async function paylas(metin) {
  try {
    if (yerli()) { await cagir('Share', 'share', { text: metin }); return 'paylasildi' }
    if (typeof navigator !== 'undefined' && navigator.share) { await navigator.share({ text: metin }); return 'paylasildi' }
    await navigator.clipboard.writeText(metin)
    return 'kopyalandi'
  } catch (e) {
    return 'olmadi' // oyuncu paylaşım sayfasını kapattı ya da izin yok
  }
}
