// Beş varyant. TASARIM.md §5: her biri hamle yasallığına ya da tahta
// biçimine inen küçük bir yüklem; motora dokunulmuyor.

/**
 * @typedef {Object} Varyant
 * @property {string}   id
 * @property {string}   ad
 * @property {(d,k,h)=>boolean} [izin]        ek hamle kısıtı
 * @property {boolean}  [yerDegistirmez]      tüplerin konumu kuralın parçası
 * @property {boolean}  [kapKarisik]          üretici farklı kapasite dağıtsın
 * @property {boolean}  [rolVer]              üretici giriş/çıkış rolü dağıtsın
 */

export const KLASIK = {
  id: 'klasik',
  ad: 'Klasik',
}

// Tüplerin boyu eşit değil. Kural aynı — değişen tahtanın kendisi.
// Kuralı anlatmaya gerek yok: görünüyor.
export const KAPASITE = {
  id: 'kapasite',
  ad: 'Kapasite',
  kapKarisik: true,
}

// Oyun sırasında DOLAN tüp mühürlenir: içinden top alınamaz. Renk karışıkken
// doldurursan o toplar ölür. Kampanyanın "beyin değiştirme" anı burada.
//
// Mühür başlangıçta dolu olan tüplere uygulanmaz (moves.js) — uygulansaydı
// tahta ilk hamleden önce ölürdü.
export const KILIT = {
  id: 'kilit',
  ad: 'Kilit',
  muhurler: true,
}

// Bazı tüpler yalnızca verir (çıkış), bazıları yalnızca alır (giriş).
// Rol kontrolü moves.js'te; burada yalnızca üreticiye rol dağıt deniyor.
export const TEK_YON = {
  id: 'tekyon',
  ad: 'Tek yön',
  rolVer: true,
}

// Top yalnızca MENZİL içindeki tüpe taşınabilir (en fazla 2 tüp ötesi).
//
// ⚠️ 1. HAFTA: TASARIM.md §5'te bu varyant "Bitişik" (yalnızca komşu tüp) diye
// yazılmış ve kesme adayı işaretlenmişti. Ölçüm kesme gerektiğini doğruladı:
// yalnızca-komşu kuralıyla 800 adayın hiçbiri çözülebilir çıkmadı (3 renk, 4
// boş tüpte bile). Menzil 2'ye çıkarılınca ilk aday tuttu. Kural gevşetildi,
// varyant kesilmedi — beş varyant duruyor.
//
// Konum kuralın parçası olduğu için kanonikleştirme kapalı; durum uzayı
// diğer varyantların ~5 katı, yine de sınırın çok altında.
export const MENZIL = {
  id: 'menzil',
  ad: 'Menzil',
  yerDegistirmez: true,
  izin: (d, k, h) => Math.abs(k - h) <= 2,
}

export const VARYANTLAR = [KLASIK, KAPASITE, KILIT, TEK_YON, MENZIL]
export const varyantBul = (id) => VARYANTLAR.find((v) => v.id === id)

/** İki varyantı birleştirir (§5: birleşim setleri bedava içerik). */
export function birlestir(a, b) {
  return {
    id: `${a.id}+${b.id}`,
    ad: `${a.ad} + ${b.ad}`,
    yerDegistirmez: !!(a.yerDegistirmez || b.yerDegistirmez),
    muhurler: !!(a.muhurler || b.muhurler),
    kapKarisik: !!(a.kapKarisik || b.kapKarisik),
    rolVer: !!(a.rolVer || b.rolVer),
    izin: (d, k, h) => (!a.izin || a.izin(d, k, h)) && (!b.izin || b.izin(d, k, h)),
  }
}
