// Sesler — Web Audio. Kayıtlar Eşleştir'den (ElevenLabs ile üretilip kulakla
// seçildi; sentez orada "metalik" bulunmuştu). Kayıt henüz inmediyse ya da
// inemediyse kısa bir marimba sentezi çalar: hiçbir durumda sessiz kalmaz.
//
// Tarayıcılar dokunuş olmadan ses açtırmıyor: bağlam ilk dokunuşta kurulur.
// iOS'ta Web Audio sessiz anahtarına uyar — istenen davranış bu.

import { D, sesYaz } from './kayit.js'

const ADLAR = ['tap', 'step', 'match', 'star', 'win', 'wrong', 'swoosh']
let ctx = null
let cikis = null
const tampon = {}

function kur() {
  if (ctx) return ctx
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!AC) return null
  ctx = new AC()
  // Limiter: üst üste binen sesler (hızlı hamle + tüp doldu) cızırdamasın
  const lim = ctx.createDynamicsCompressor()
  lim.threshold.value = -6
  lim.ratio.value = 8
  lim.attack.value = 0.003
  lim.release.value = 0.18
  cikis = ctx.createGain()
  cikis.gain.value = 0.8
  cikis.connect(lim)
  lim.connect(ctx.destination)
  for (const ad of ADLAR) {
    fetch(`ses/${ad}.mp3`)
      .then((r) => r.arrayBuffer())
      .then((ab) => ctx.decodeAudioData(ab))
      .then((b) => { tampon[ad] = b })
      .catch(() => {}) // sentez kalır
  }
  return ctx
}

export function kilidiAc() {
  const c = kur()
  if (c && c.state === 'suspended') c.resume()
}

export const acikMi = () => D.ses !== false
export function degistir() { sesYaz(!acikMi()) }

/** Kayıt çaldıysa true. `yarim`: perde kaydırma (yarım ton), `ses`: seviye. */
function ornek(ad, yarim = 0, ses = 1, gecikme = 0) {
  const b = tampon[ad]
  if (!b) return false
  const src = ctx.createBufferSource()
  src.buffer = b
  src.playbackRate.value = 2 ** (yarim / 12)
  const g = ctx.createGain()
  g.gain.value = ses
  src.connect(g)
  g.connect(cikis)
  src.start(ctx.currentTime + gecikme)
  return true
}

/** Yedek: kısa, tok marimba notası. n = C5'ten yarım ton. */
function nota(n, gecikme = 0, sure = 0.25, ses = 0.3) {
  const t0 = ctx.currentTime + gecikme
  const f = 523.25 * 2 ** (n / 12)
  for (const [kat, genlik] of [[1, 1], [4, 0.25], [9.2, 0.05]]) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = f * kat
    const s = sure / (1 + (kat - 1) * 0.55)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(genlik * ses, t0 + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + s)
    o.connect(g)
    g.connect(cikis)
    o.start(t0)
    o.stop(t0 + s + 0.05)
  }
}

function cal(fn) {
  if (!acikMi()) return
  const c = kur()
  if (!c) return
  if (c.state === 'suspended') c.resume()
  fn()
}

// ---- oyunun sesleri ----

/** Top kalktı. */
export const sec = () => cal(() => ornek('tap', 0, 0.7) || nota(7, 0, 0.12, 0.2))

/** Top yere indi. Tüp doldukça perde yükselir: tahta "dolmaya" başlar. */
export const birak = (doluluk = 0) => cal(() => {
  const y = Math.round(doluluk * 7)
  ornek('step', y, 0.8, 0.26) || nota(y, 0.26, 0.18, 0.25)
})

/** Bir tüp tek renkle doldu. */
export const tupDoldu = () => cal(() => ornek('match', 0, 0.9, 0.3) || [0, 4, 7].forEach((n, k) => nota(n + 12, 0.3 + k * 0.06)))

/** Yasal olmayan hamle — yumuşak, cezalandırmayan. */
export const olmaz = () => cal(() => ornek('wrong', 0, 0.35) || nota(-5, 0, 0.15, 0.15))

/** Tahta kilitlendi. */
export const kayip = () => cal(() => ornek('wrong', -3, 0.8) || [0, -3, -7].forEach((n, k) => nota(n, k * 0.12, 0.3)))

/** Bölüm bitti: kutlama, sonra yıldızlar ekranda belirdikçe birer "çın". */
export const zafer = (yildiz) => cal(() => {
  ornek('win', 0, 0.9) || [0, 4, 7, 12].forEach((n, k) => nota(n, k * 0.1, 0.4))
  // Zafer ekranı 450 ms sonra açılıyor, yıldız k: 150 + k·180 ms gecikmeyle
  for (let k = 0; k < yildiz; k++) {
    const t = 0.45 + 0.15 + k * 0.18 + 0.2
    ornek('star', k * 2, 0.7, t) || nota(12 + k * 4, t, 0.3)
  }
})

/** Ekran geçişi. */
export const suzul = () => cal(() => ornek('swoosh', 0, 0.45))
