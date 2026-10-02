// Kayıt ve TELEMETRİ.
//
// TASARIM.md §6.4: "telemetri 1. günden içeride". Can/süre/tavan sayıları
// tasarımla değil ölçümle bulunacak; ölçüm altyapısı sonradan eklenemez,
// çünkü eklendiği güne kadar geçen oyuncular kaybedilir.
//
// Olaylar yerel bir halka tamponda birikiyor. Gönderim `telemetri.js`'te ve
// `AYAR.TELEMETRI_URL` boş olduğu sürece KAPALI: cihazdan hiçbir veri çıkmıyor.

export const AYAR = {
  TAVAN: 3, // 5'ti; telefonda denemede fazla bulundu (§20)
  YENILEME: 15 * 60 * 1000, // ms — §4, telemetriyle kalibre edilecek
  GERI_AL: 3,
  OLAY_TAVANI: 400,
  ARA_REKLAM_ARALIGI: 3, // §8 kırmızı çizgi: interstitial en erken 3 bölümde bir
  TELEMETRI_URL: '', // boş = gönderim kapalı; uç nokta ve gizlilik metni hazır olunca doldurulur
}

// Anahtar, marka adı seçilmeden önceki çalışma adını taşıyor; değiştirmek kayıtları siler
const ANAHTAR = 'besKural.v1'
const bos = () => ({
  dil: null, can: AYAR.TAVAN, damga: Date.now(), bitti: {}, olay: [], sayac: {},
  tam: false, // Tam Sürüm: reklamsız + sınırsız can (§8)
  araSay: 0, // son interstitial'dan beri biten bölüm
  gunluk: {}, // günlük bulmaca: gün no → { y: yıldız, h: hamle }
  kimlik: null, gonderilen: 0, olaySira: 0, // telemetri
})

function oku() {
  try {
    const ham = localStorage.getItem(ANAHTAR)
    if (!ham) return bos()
    const d = Object.assign(bos(), JSON.parse(ham))
    d.can = Math.max(0, Math.min(AYAR.TAVAN, d.can)) // tavan düşürüldüyse eski kayıt taşmasın
    return d
  } catch (e) {
    return bos() // gizli sekme, kapalı depo: oyun yine çalışsın
  }
}
function yaz() {
  try { localStorage.setItem(ANAHTAR, JSON.stringify(D)) } catch (e) {}
}

export let D = oku()

/** İlerlemeyi siler. Satın alma ilerleme değil: Tam Sürüm sıfırlamadan sağ çıkar. */
export function sifirla() {
  const tam = D.tam
  D = bos()
  D.tam = tam
  yaz()
}

// ---- Tam Sürüm ----
export function tamYaz(acik) {
  D.tam = !!acik
  if (D.tam) { D.can = AYAR.TAVAN; D.damga = Date.now() }
  yaz()
}

// ---- can ----
export function canTazele() {
  if (D.can >= AYAR.TAVAN) { D.damga = Date.now(); return }
  const kazanc = Math.floor((Date.now() - D.damga) / AYAR.YENILEME)
  if (kazanc > 0) {
    D.can = Math.min(AYAR.TAVAN, D.can + kazanc)
    D.damga += kazanc * AYAR.YENILEME
    yaz()
  }
}
export const canaKadar = () =>
  D.can >= AYAR.TAVAN ? 0 : Math.max(0, AYAR.YENILEME - (Date.now() - D.damga))

export function canHarca() {
  canTazele()
  if (D.tam) return true // sınırsız can
  if (D.can <= 0) return false
  if (D.can === AYAR.TAVAN) D.damga = Date.now() // dolu tavandan ilk düşüş sayacı başlatır
  D.can--
  yaz()
  return true
}
export function canEkle(n = 1) {
  canTazele()
  D.can = Math.min(AYAR.TAVAN, D.can + n)
  yaz()
}

// ---- ilerleme ----
export const yildizi = (id) => D.bitti[id] || 0
export function bolumBitti(id, yildiz) {
  D.bitti[id] = Math.max(D.bitti[id] || 0, yildiz)
  yaz()
}

// ---- günlük bulmaca ----
export const gunlukSonuc = (no) => D.gunluk?.[no] || null
/** Günün en iyi sonucu kalır: önce yıldız, eşitse az hamle. */
export function gunlukBitti(no, yildiz, hamle) {
  const eski = gunlukSonuc(no)
  if (!eski || yildiz > eski.y || (yildiz === eski.y && hamle < eski.h)) {
    D.gunluk = { ...D.gunluk, [no]: { y: yildiz, h: hamle } }
    yaz()
  }
}
export const toplamYildiz = () => Object.values(D.bitti).reduce((a, b) => a + b, 0)

// ---- dil ----
export function dilYaz(kod) { D.dil = kod; yaz() }

// ---- ses ----
export function sesYaz(acik) { D.ses = acik; yaz() }

// ---- bölüm arası reklam (interstitial) ----
// §8 kırmızı çizgileri burada, saf mantık olarak: Tam Sürüm'de yok, oyuncunun
// bitirdiği ilk bölümde yok, en erken ARA_REKLAM_ARALIGI bölümde bir.
export function araReklamZamani() {
  if (D.tam) return false
  D.araSay = (D.araSay || 0) + 1
  const ilkBolum = Object.keys(D.bitti).length <= 1
  const zamani = !ilkBolum && D.araSay >= AYAR.ARA_REKLAM_ARALIGI
  if (zamani) D.araSay = 0
  yaz()
  return zamani
}

// ---- telemetri ----
export function olay(tur, veri) {
  D.olaySira = (D.olaySira || 0) + 1
  D.olay.push({ n: D.olaySira, t: Date.now(), tur, ...veri })
  if (D.olay.length > AYAR.OLAY_TAVANI) D.olay.splice(0, D.olay.length - AYAR.OLAY_TAVANI)
  D.sayac[tur] = (D.sayac[tur] || 0) + 1
  yaz()
}
export const olaylariAl = () => D.olay.slice()
/** Henüz gönderilmemiş olaylar (sıra numarası `gonderilen`den büyük olanlar). */
export const gonderilmemis = () => D.olay.filter((o) => (o.n || 0) > (D.gonderilen || 0))
export function gonderildi(n) { D.gonderilen = Math.max(D.gonderilen || 0, n); yaz() }
/** Kişiyle ilişkisi olmayan rastgele kurulum kimliği; ilk gönderimde üretilir. */
export function kurulumKimligi() {
  if (!D.kimlik) {
    D.kimlik = globalThis.crypto?.randomUUID?.() ?? `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
    yaz()
  }
  return D.kimlik
}
export const sayaclar = () => ({ ...D.sayac })
