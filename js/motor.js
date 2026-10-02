// Arayüzün motoru. Çekirdek KOPYALANMIYOR — doğrudan src/core'dan alınıyor.
// Tek gerçek var: testler neyi doğruluyorsa oyun onu oynuyor.
//
// Paketlemede (Capacitor) `src/core` ve `src/data` da www/ içine aynı göreli
// yolla kopyalanır; bkz. deploy betiği.

export { durumKur, hedefte, seriBoyu, tupBitti } from '../cekirdek/state.js'
export { yasal, yasalHamleler, oyna, miktar } from '../cekirdek/moves.js'
export { cozulurMu } from '../cekirdek/solver.js'
import { VARYANTLAR, varyantBul, birlestir } from '../cekirdek/variants.js'
export { VARYANTLAR }

const onbellek = new Map()
/** Bölüm kaydındaki varyant kimliğini (birleşimler dâhil) çözer. */
export function varyantAl(id) {
  if (onbellek.has(id)) return onbellek.get(id)
  let v = varyantBul(id)
  if (!v) {
    const [a, b] = id.split('+').map(varyantBul)
    v = birlestir(a, b)
  }
  onbellek.set(id, v)
  return v
}

/** Tarayıcıda çalışma zamanı kontrolü için durum tavanı — §15. */
export const KONTROL_SINIRI = 45000
