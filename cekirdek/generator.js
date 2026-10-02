// Üretici — TASARIM.md §6.3.
//
// ⚠️ 1. HAFTA BULGUSU: "çözülmüş tahtadan geriye karıştır" YÖNTEMİ ÇALIŞMIYOR.
// Hamle kuralımız üstteki aynı renk dizisinin TAMAMINI taşıyor (moves.js).
// Çözülmüş tahtada her tüp tek renk olduğu için her hamle bütün yığını taşır,
// yani yalnızca tüplerin yerini değiştirir — renkler hiç karışmaz. Piyasadaki
// klonların tamamı bu yöntemi kullanır; onlar tek top taşıdığı için işe yarar.
//
// Kullanılan yöntem: topları DOĞRUDAN rastgele dağıt, sonra hedef varyantın
// kurallarıyla çözücüye ver. Çözülebilirlik VARSAYILMIYOR, her aday için
// KANITLANIYOR; kanıtlanamayan atılıyor. Bu, Rulefold'daki "üret → çöz →
// olmazsa geri al" döngüsünün aynısı.

import { durumKur } from './state.js'
import { analiz, zorluk, eksenler } from './solver.js'

/** Tohumlu RNG — aynı tohum aynı bölümü verir (test edilir). */
export function rng(tohum) {
  let a = tohum >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const sec = (r, dizi) => dizi[Math.floor(r() * dizi.length)]

/** Topları doğrudan rastgele dağıt: renk tüpleri kapasitesine kadar dolar. */
function rastgeleDagit(renkKap, bosKap, r) {
  const toplar = []
  renkKap.forEach((adet, renk) => {
    for (let i = 0; i < adet; i++) toplar.push(renk)
  })
  for (let i = toplar.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[toplar[i], toplar[j]] = [toplar[j], toplar[i]]
  }
  const tup = []
  const kap = []
  let p = 0
  for (const k of renkKap) {
    tup.push(toplar.slice(p, p + k))
    kap.push(k)
    p += k
  }
  for (const k of bosKap) {
    tup.push([])
    kap.push(k)
  }
  return durumKur(tup, kap)
}

function rolDagit(d, r) {
  const n = d.tup.length
  const rol = new Array(n).fill('her')
  const bos = []
  const dolu = []
  for (let i = 0; i < n; i++) (d.tup[i].length ? dolu : bos).push(i)
  if (dolu.length) rol[sec(r, dolu)] = 'cikis' // yalnızca verir
  if (bos.length) rol[sec(r, bos)] = 'giris' // yalnızca alır
  return durumKur(d.tup, d.kap, rol)
}

/**
 * Bir bölüm üretir.
 * @param {Object} varyant
 * @param {Object} o
 * @param {number} o.renk        renk adedi
 * @param {number} o.kapasite    tüp kapasitesi (kapKarisik değilse)
 * @param {number} o.bosTup      boş tüp adedi
 * @param {number} o.hedefZorluk 1..4 (null = ne çıkarsa)
 * @param {number} o.tohum
 * @param {number} o.deneme      kaç aday denensin
 * @returns {Object|null} bölüm
 */
export function uret(varyant, o) {
  const {
    renk,
    kapasite = 4,
    bosTup = 2,
    hedefZorluk = null,
    tohum = 1,
    deneme = 400,
    sinir,
  } = o
  const r = rng(tohum)
  const kapSecenek = varyant.kapKarisik ? [3, 4, 5] : [kapasite]

  for (let d = 0; d < deneme; d++) {
    const renkKap = Array.from({ length: renk }, () => sec(r, kapSecenek))
    const bosKap = Array.from({ length: bosTup }, () => sec(r, kapSecenek))
    let aday = rastgeleDagit(renkKap, bosKap, r)
    if (varyant.rolVer) aday = rolDagit(aday, r)

    const a = analiz(aday, varyant, { sinir })
    if (a.asildi || !a.cozulur) continue
    if (a.enKisa < 4) continue // fazla kolay: bölüm değil
    const z = zorluk(a)
    if (hedefZorluk !== null && z !== hedefZorluk) continue

    return bolumYap(aday, varyant, a, z, tohum, d)
  }
  return null
}

function bolumYap(durum, varyant, a, z, tohum, deneme) {
  return {
    varyant: varyant.id,
    tup: durum.tup.map((t) => t.slice()),
    kap: durum.kap.slice(),
    rol: durum.rol.slice(),
    renk: durum.renk,
    zorluk: z,
    eksen: eksenler(a),
    enKisa: a.enKisa,
    // Hamle bütçesi ELLE YAZILMIYOR, en kısa çözümden türetiliyor (§4).
    // Kat sayı 2. haftada kalibre edilecek; şimdilik 1.6 + 3.
    butce: Math.ceil(a.enKisa * 1.6) + 3,
    olcum: {
      durumSayisi: a.durumSayisi,
      tuzakOrani: +a.tuzakOrani.toFixed(4),
      ilkTuzak: a.ilkTuzak,
      dalBudagi: +a.dalBudagi.toFixed(2),
      cikmaz: a.cikmaz,
    },
    tohum,
    deneme,
  }
}

/**
 * Boş alanı azalt — Rulefold'daki "sayıları teker teker gizle"nin karşılığı.
 * Bir boş tüpü çıkar; hâlâ çözülüyor ve zorluk düşmüyorsa çıkarılmış kalsın.
 */
export function daralt(bolum, varyant, opts = {}) {
  let iyi = bolum
  for (;;) {
    const bosIdx = iyi.tup.findIndex((t) => t.length === 0)
    if (bosIdx === -1) break
    const tup = iyi.tup.filter((_, i) => i !== bosIdx)
    const kap = iyi.kap.filter((_, i) => i !== bosIdx)
    const rol = iyi.rol.filter((_, i) => i !== bosIdx)
    const a = analiz(durumKur(tup, kap, rol), varyant, opts)
    if (a.asildi || !a.cozulur) break
    const z = zorluk(a)
    if (z < iyi.zorluk) break
    iyi = bolumYap(durumKur(tup, kap, rol), varyant, a, z, iyi.tohum, iyi.deneme)
  }
  return iyi
}

/** Bölümü çözücüye geri verip doğrular — bankaya yazmadan önceki son kapı. */
export function dogrula(bolum, varyant, opts = {}) {
  const a = analiz(durumKur(bolum.tup, bolum.kap, bolum.rol), varyant, opts)
  if (a.asildi) return { tamam: false, sebep: 'durum sınırı aşıldı' }
  if (!a.cozulur) return { tamam: false, sebep: 'çözülemiyor' }
  if (a.enKisa !== bolum.enKisa) return { tamam: false, sebep: 'en kısa çözüm uyuşmuyor' }
  if (zorluk(a) !== bolum.zorluk) return { tamam: false, sebep: 'zorluk uyuşmuyor' }
  if (bolum.butce < a.enKisa) return { tamam: false, sebep: 'bütçe en kısa çözümden küçük' }
  return { tamam: true, analiz: a }
}
