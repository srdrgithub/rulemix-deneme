// Telemetri GÖNDERİMİ. Toplama `kayit.js`'te; burası yalnızca yola çıkarır.
//
// `AYAR.TELEMETRI_URL` boş olduğu sürece hiçbir şey gönderilmez — varsayılan
// bu. Uç nokta ve gizlilik metni hazır olunca tek satır doldurulur.
//
// Giden paket: rastgele kurulum kimliği, dil, platform, Tam Sürüm bayrağı ve
// henüz gönderilmemiş olaylar. Kişiyi tanıtan hiçbir alan yok; reklam kimliği
// okunmuyor. Gönderim başarısız olursa olaylar tamponda kalır ve sonraki
// açılışta yeniden denenir (halka tampon taşarsa en eskiler düşer).

import { AYAR, D, gonderilmemis, gonderildi, kurulumKimligi } from './kayit.js'
import { platform } from './kopru.js'

export const SURUM = 1

/** Gönderilecek paketi kurar; gönderilecek olay yoksa null. Saf — test edilir. */
export function paket() {
  const olaylar = gonderilmemis()
  if (!olaylar.length) return null
  return { surum: SURUM, kimlik: kurulumKimligi(), dil: D.dil, platform: platform(), tam: !!D.tam, olaylar }
}

export async function gonder() {
  if (!AYAR.TELEMETRI_URL || typeof fetch === 'undefined') return false
  const p = paket()
  if (!p) return false
  try {
    const c = await fetch(AYAR.TELEMETRI_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(p),
      keepalive: true, // uygulama arka plana geçerken de yola çıksın
    })
    if (!c.ok) return false
    gonderildi(p.olaylar[p.olaylar.length - 1].n)
    return true
  } catch (e) {
    return false
  }
}

/** Açılışta ve uygulama arka plana geçerken gönderir. */
export function baslat() {
  if (!AYAR.TELEMETRI_URL || typeof document === 'undefined') return
  gonder()
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') gonder() })
}
