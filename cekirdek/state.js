// Durum: tüpler dizisi. Her tüp bir renk yığını (dipten üste) ve bir kapasite.
//
// TASARIM.md §6: tek soyutlama "durum + hamle yüklemi". Bu dosya durumun
// kendisi ve — projenin en kritik satırı — KANONİKLEŞTİRME.

/**
 * @typedef {Object} Durum
 * @property {number[][]} tup   dipten üste renk kodları
 * @property {number[]}   kap   tüp başına kapasite
 * @property {string[]}   rol   'her' | 'cikis' | 'giris'  (Tek yön varyantı)
 * @property {number[]}   kilit tüp mühürlü mü (Kilit varyantı; oyun sırasında oluşur)
 * @property {number}     renk  toplam renk adedi
 */

export function durumKur(tup, kap, rol, kilit) {
  const n = tup.length
  return {
    tup: tup.map((t) => t.slice()),
    kap: kap ? kap.slice() : new Array(n).fill(4),
    rol: rol ? rol.slice() : new Array(n).fill('her'),
    kilit: kilit ? kilit.slice() : new Array(n).fill(0),
    renk: yeniRenkSayisi(tup),
  }
}

function yeniRenkSayisi(tup) {
  const s = new Set()
  for (const t of tup) for (const c of t) s.add(c)
  return s.size
}

export function kopyala(d) {
  return {
    tup: d.tup.map((t) => t.slice()),
    kap: d.kap,
    rol: d.rol,
    kilit: d.kilit.slice(),
    renk: d.renk,
  }
}

export const ust = (t) => t[t.length - 1]
export const bos = (t) => t.length === 0
export const dolu = (d, i) => d.tup[i].length >= d.kap[i]

/** Üstteki aynı renkten kaç top var (hamle bu bütün diziyi taşır — §6). */
export function seriBoyu(t) {
  if (t.length === 0) return 0
  const c = t[t.length - 1]
  let n = 1
  while (n < t.length && t[t.length - 1 - n] === c) n++
  return n
}

/** Tüp bitmiş mi: boş ya da tek renk ve TAM dolu. */
export function tupBitti(d, i) {
  const t = d.tup[i]
  if (t.length === 0) return true
  if (t.length !== d.kap[i]) return false
  return t.every((c) => c === t[0])
}

/** Hedef: her tüp boş ya da tek renk ve tam dolu. */
export function hedefte(d) {
  for (let i = 0; i < d.tup.length; i++) if (!tupBitti(d, i)) return false
  return true
}

// ---------------------------------------------------------------------------
// KANONİKLEŞTİRME — TASARIM.md §6.1
//
// İki tüpün yerini değiştirmek AYNI durumdur; ama yalnızca tüpler birbirinin
// yerine geçebiliyorsa. Kapasitesi ya da rolü farklı olan tüpler geçemez,
// Bitişik varyantında ise konum kuralın parçası olduğu için hiçbiri geçemez.
//
// Bu yapılmazsa durum uzayı k! katı büyür ve çözücü kullanılamaz.
// ---------------------------------------------------------------------------

/** Tüpleri yer değiştirebilirliklerine göre sınıflara ayırır. */
export function sinifla(d) {
  const sinif = new Map()
  for (let i = 0; i < d.tup.length; i++) {
    const k = `${d.kap[i]}:${d.rol[i]}`
    if (!sinif.has(k)) sinif.set(k, [])
    sinif.get(k).push(i)
  }
  return [...sinif.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
}

export function anahtar(d, varyant) {
  // Mühür tüpün içeriğinin parçası: mühürlü [0,0] ile serbest [0,0] aynı durum değil.
  const tupStr = d.tup.map((t, i) => (d.kilit[i] ? '#' : '') + t.join(','))
  if (varyant && varyant.yerDegistirmez) return tupStr.join('|')
  const parca = []
  for (const [k, idx] of sinifla(d)) {
    const grup = idx.map((i) => tupStr[i]).sort()
    parca.push(k + '>' + grup.join('|'))
  }
  return parca.join('#')
}
