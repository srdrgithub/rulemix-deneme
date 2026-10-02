// Reklam — tek kapı. Uygulamada AdMob, tarayıcıda sahte sağlayıcı.
//
// TASARIM.md §8 ve §11: can bir ödeme duvarı değil, reklam envanteri; tarayıcıda
// sahte sağlayıcı olmazsa geliştirme durur. Oyun kodu yalnızca iki şey bilir:
//
//   odullu(yer) → 'odul' | 'vazgecti' | 'yok'    oyuncunun İSTEDİĞİ reklam
//   arasi()     → bölüm bitişinde, sıklığı kayit.js'teki kırmızı çizgiler belirler
//
// ⚠️ AdMob'un `showRewardVideoAd` sözü yalnızca ödül kazanılınca çözülüyor;
// oyuncu reklamı erken kapatırsa HİÇ çözülmüyor (eklenti 8.1.0, Android
// kaynağından doğrulandı). Bu yüzden sonuç söze değil olaylara bağlı:
// `Rewarded` görüldüyse ödül var, `Dismissed` gelince iş biter.

import { m } from './dil.js'
import { D, olay, araReklamZamani } from './kayit.js'
import { yerli, platform, cagir, dinle } from './kopru.js'

// Google'ın herkese açık DENEME birimleri. Gerçek kimlikler AdMob hesabı
// açılınca `GERCEK`e yazılır ve `DENEME` false yapılır; ikisi birlikte değişir.
const DENEME = true
const DENEME_BIRIM = {
  android: { odullu: 'ca-app-pub-3940256099942544/5224354917', arasi: 'ca-app-pub-3940256099942544/1033173712' },
  ios: { odullu: 'ca-app-pub-3940256099942544/1712485313', arasi: 'ca-app-pub-3940256099942544/4411468910' },
}
const GERCEK = {
  android: { odullu: '', arasi: '' },
  ios: { odullu: '', arasi: '' },
}
const birim = (tur) => (DENEME ? DENEME_BIRIM : GERCEK)[platform()]?.[tur] || ''

// ---------------------------------------------------------------- AdMob
const hazir = { odullu: false, arasi: false }
let kuruldu = null
let bekleyen = null // gösterilmekte olan reklamın { bitir, odul } kaydı

async function yukle(tur) {
  if (hazir[tur] || !birim(tur)) return hazir[tur]
  try {
    await cagir('AdMob', tur === 'odullu' ? 'prepareRewardVideoAd' : 'prepareInterstitial', { adId: birim(tur), isTesting: DENEME })
    hazir[tur] = true
  } catch (e) {
    hazir[tur] = false // dolum yok ya da ağ yok: oyuncuya "reklam yok" denir
  }
  return hazir[tur]
}

function admobKur() {
  if (kuruldu) return kuruldu
  kuruldu = (async () => {
    await cagir('AdMob', 'initialize', { initializeForTesting: DENEME })
    // Rıza (AB/UK için UMP) ve iOS izleme izni. İkisi de reddedilebilir;
    // reddedilirse kişiselleştirilmemiş reklam gösterilir, oyun aynen çalışır.
    try {
      const riza = await cagir('AdMob', 'requestConsentInfo', {})
      if (riza.isConsentFormAvailable && riza.status === 'REQUIRED') await cagir('AdMob', 'showConsentForm', {})
      if (platform() === 'ios') await cagir('AdMob', 'requestTrackingAuthorization', {})
    } catch (e) {}
    const bitir = () => { const b = bekleyen; bekleyen = null; b?.bitir(b.odul) }
    dinle('AdMob', 'onRewardedVideoAdReward', () => { if (bekleyen) bekleyen.odul = true })
    dinle('AdMob', 'onRewardedVideoAdDismissed', bitir)
    dinle('AdMob', 'onRewardedVideoAdFailedToShow', bitir)
    dinle('AdMob', 'interstitialAdDismissed', bitir)
    dinle('AdMob', 'interstitialAdFailedToShow', bitir)
    yukle('odullu')
    yukle('arasi')
  })().catch(() => { kuruldu = null })
  return kuruldu
}

async function admobGoster(tur) {
  await admobKur()
  if (!(await yukle(tur))) return 'yok'
  hazir[tur] = false
  const sonuc = await new Promise((coz) => {
    bekleyen = { odul: false, bitir: coz }
    cagir('AdMob', tur === 'odullu' ? 'showRewardVideoAd' : 'showInterstitial', {}).catch(() => {
      if (bekleyen) { bekleyen = null; coz(false) }
    })
  })
  yukle(tur) // bir sonraki için önden yükle
  return sonuc ? 'odul' : 'vazgecti'
}

// ---------------------------------------------------------------- sahte
// Tarayıcıda gerçek reklamın YERİNİ tutar: aynı akış, aynı üç sonuç.
const SAHTE_SURE = 3
function sahteGoster(tur) {
  if (typeof document === 'undefined') return Promise.resolve('odul')
  return new Promise((coz) => {
    const el = document.createElement('div')
    el.className = 'sahteReklam'
    el.innerHTML = `<button class="sahteKapat" aria-label="${m('iptal')}">✕</button>
      <p class="sahteBas">${m('reklamDeneme')}</p><p class="sahteSayac"></p>`
    document.body.appendChild(el)
    let kalan = tur === 'odullu' ? SAHTE_SURE : 1
    const bitir = (sonuc) => { clearInterval(id); el.remove(); coz(sonuc) }
    const yaz = () => { el.querySelector('.sahteSayac').textContent = String(kalan) }
    const id = setInterval(() => { if (--kalan <= 0) bitir('odul'); else yaz() }, 1000)
    el.querySelector('.sahteKapat').onclick = () => bitir('vazgecti')
    yaz()
  })
}

// ---------------------------------------------------------------- dış yüz
/** Açılışta bir kez: SDK'yı kurar ve ilk reklamları önden yükler. Tam Sürüm'de hiç kurulmaz. */
export function hazirla() {
  if (yerli() && !D.tam) admobKur()
}

/**
 * Reklam rızasını sonradan değiştirme (AB/UK/İsviçre): Google'ın gizlilik
 * seçenekleri formu. Gizlilik politikası bu satırı vaat ediyor
 * (sunucu/gizlilik.html). Tarayıcıda ve Tam Sürüm'de reklam SDK'sı yok, satır da yok.
 */
export const rizaAyariVar = () => yerli() && !D.tam
export async function rizaAyari() {
  try {
    await admobKur()
    await cagir('AdMob', 'showPrivacyOptionsForm', {})
  } catch (e) {} // form bu bölgede gerekmiyorsa eklenti reddediyor; yapılacak bir şey yok
}

/**
 * Ödüllü reklam. `yer` telemetri etiketi: 'can' | 'geri_al'.
 * Tam Sürüm sahibi reklam izlemez; ödülü doğrudan alır (§8: parasını verip
 * daha kötü bir oyun almış olmasın).
 */
export async function odullu(yer) {
  if (D.tam) return 'odul'
  const sonuc = await (yerli() ? admobGoster('odullu') : sahteGoster('odullu'))
  olay('reklam_odullu', { yer, sonuc })
  return sonuc
}

/** Bölüm bitişi reklamı. Zamanı değilse hiçbir şey yapmaz. */
export async function arasi() {
  if (!araReklamZamani()) return
  const sonuc = await (yerli() ? admobGoster('arasi') : sahteGoster('arasi'))
  olay('reklam_arasi', { sonuc })
}
