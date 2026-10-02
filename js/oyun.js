// Oyun ekranı: tahta, dokunma, geri al, can, çalışma zamanı çözücü kontrolü.

import { m, sayi, varyantAdi, varyantMetni } from './dil.js'
import { AYAR, D, canTazele, canaKadar, canHarca, canEkle, yildizi, bolumBitti, gunlukBitti, gunlukSonuc, olay } from './kayit.js'
import { durumKur, hedefte, seriBoyu, tupBitti, yasal, yasalHamleler, oyna, cozulurMu, varyantAl, KONTROL_SINIRI } from './motor.js'
import { canliMi, siginak, numara, sonrakiBolum } from './harita.js'
import * as ses from './ses.js'
import * as reklam from './reklam.js'
import * as satis from './satis.js'
import { titre, paylas } from './kopru.js'
import { seri, paylasMetni } from './gunluk.js'

const SIMGE = '◆▲■●★✚⬢◗'
const E = (id) => document.getElementById(id)
export const sureYaz = (ms) => {
  const s = Math.ceil(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

let B, V, durum, gecmis, hamle, geriKalan, secili, olu, baslangic, cikisFn, gitFn, ilkCizim
let reklamda = false
let oluSebep = null

/** Hamle sınırı yalnızca can yakan bölümde var (§20); öğretici, tuzaksız, bitirilmiş ve günlük bölümde yok. */
const sinir = () => (canliMi(B) ? B.hamleSinir : null)
let ekranKur = {}

/** Örtü ve üst çubuk işlevlerini bir kez bağlar. `canBittiEkrani` oyuna hiç
 *  girilmeden de çağrılabildiği için (haritadaki can kapısı) bu şart. */
export function kur(api) { ekranKur = api; cikisFn = api.cik; gitFn = api.git }

export function oyunEkrani(bolum, kok, { cik, git, ayar, ortAc, ortKapat, ustGuncelle }) {
  B = bolum
  V = varyantAl(B.varyant)
  cikisFn = cik
  gitFn = git
  durum = durumKur(B.tup, B.kap, B.rol)
  gecmis = []
  hamle = 0
  geriKalan = AYAR.GERI_AL
  secili = null
  olu = false
  oluSebep = null
  baslangic = Date.now()
  ilkCizim = true
  olay('bolum_basladi', { id: B.id, v: B.varyant, canli: canliMi(B), can: D.can })

  kok.innerHTML = `
    <div class="oyunUst">
      <button class="yuvarlak" id="bEv" aria-label="${m('geri')}">⌂</button>
      <div class="seviyeHap"><small>${B.gunluk ? m('gunluk') : m('bolum')}</small><b>${B.gunluk ? '#' + sayi(B.gun) : sayi(numara(B))}</b></div>
      <button class="yuvarlak" id="bBastan" aria-label="${m('bastan')}">↻</button>
    </div>
    <div class="oyunBilgi">
      <span class="canGosterge" id="oyunCan"></span>
      <span class="hamleSay" id="vHamle"></span>
    </div>
    <div class="tahtaSar"><div class="tahta" id="tahta"></div></div>
    <p class="kuralIpucu"><b>${varyantAdi(B.varyant)}</b> <span id="kuralMetin"></span></p>
    <div class="durumSerit" id="durumSerit"></div>
    <div class="altDugmeler">
      <button class="yuvarlak buyuk" id="bGeri" aria-label="${m('geriAl')}">↶<span class="sayRozet" id="vGeri"></span></button>
      <button class="yuvarlak buyuk" id="bAyar" aria-label="${m('ayarlar')}">⚙</button>
    </div>`

  E('kuralMetin').textContent = kuralMetni()
  E('bEv').onclick = () => cikisFn?.()
  E('bAyar').onclick = () => ayar?.()
  E('bBastan').onclick = () => gitFn(B.id)
  // Geri alma hakkı bitince aynı düğme reklamla doldurur — ayrı bir düğme yok
  E('bGeri').onclick = async () => {
    if (geriKalan > 0) return geriAl()
    if (reklamda) return
    const bolum = B
    reklamda = true
    const sonuc = await reklam.odullu('geri_al')
    reklamda = false
    if (B !== bolum || !E('bGeri')) return // reklam sürerken ekran değişti
    if (sonuc === 'odul') { geriKalan += AYAR.GERI_AL; ciz() }
    else if (sonuc === 'yok') ekranKur.ortAc(`<p>${m('reklamYok')}</p>
      <div class="dugmeler"><button class="d" data-is="kapat">${m('tamam')}</button></div>`, iste)
  }
  if (ortAc) ekranKur = { ortAc, ortKapat, ustGuncelle }
  ciz()
}

const kuralMetni = () => varyantMetni(B.varyant)

const yildizAdedi = () => (hamle <= B.yildiz3 ? 3 : hamle <= B.yildiz2 ? 2 : 1)

function ciz() {
  const t = E('tahta')
  if (!t) return
  t.innerHTML = ''
  t.dataset.giris = ilkCizim ? '1' : '0'
  // Beşten fazla tüp iki sıraya bölünür. Top boyu hem ekran enine hem
  // boyuna sığacak kadar: az tüplü tahtada büyük, kalabalıkta küçük.
  const n = durum.tup.length
  const sutun = n > 5 ? Math.ceil(n / 2) : n
  const satir = n > 5 ? 2 : 1
  const kat = Math.max(...durum.kap)
  const olcEn = (Math.min(innerWidth, 600) - 40) / sutun - 26
  const olcBoy = (innerHeight - 430 - (satir - 1) * 70) / satir / kat - 4
  t.style.setProperty('--sutun', sutun)
  t.style.setProperty('--olc', `${Math.round(Math.max(24, Math.min(48, olcEn, olcBoy)))}px`)
  ilkCizim = false
  durum.tup.forEach((yigin, i) => {
    const el = document.createElement('div')
    el.className = 'tup'
    el.tabIndex = 0
    el.style.minHeight = `calc(var(--olc) * ${durum.kap[i]} + ${durum.kap[i] * 3 + 8}px)`
    el.style.setProperty('--sira', i)
    if (secili === i) el.dataset.sec = '1'
    if (durum.kilit[i]) el.dataset.muhur = '1'
    if (tupBitti(durum, i) && yigin.length) el.dataset.tam = '1'
    if (secili !== null && secili !== i && !yasal(durum, secili, i, V)) el.dataset.disi = '1'
    el.setAttribute('aria-label', `${sayi(i + 1)}: ${sayi(yigin.length)}/${sayi(durum.kap[i])}`)
    if (durum.rol[i] !== 'her') {
      const a = document.createElement('span')
      a.className = 'isaret'
      a.textContent = durum.rol[i] === 'cikis' ? '↑' : '↓'
      el.appendChild(a)
    }
    if (durum.kilit[i]) {
      const l = document.createElement('span')
      l.className = 'isaret'
      l.textContent = '🔒'
      el.appendChild(l)
    }
    const kp = document.createElement('span')
    kp.className = 'kapYazi'
    kp.textContent = sayi(durum.kap[i])
    el.appendChild(kp)
    const seri = secili === i ? seriBoyu(yigin) : 0
    for (let s = 0; s < durum.kap[i]; s++) {
      const c = yigin[s]
      if (c === undefined) {
        const y = document.createElement('div')
        y.className = 'yuva'
        el.appendChild(y)
        continue
      }
      const b = document.createElement('div')
      b.className = 'top'
      b.style.setProperty('--c', `var(--r${(c % 8) + 1})`)
      b.textContent = SIMGE[c % 8]
      b.style.setProperty('--s', s)
      if (seri && s >= yigin.length - seri) {
        b.dataset.kalk = '1'
        b.style.setProperty('--y', durum.kap[i] - yigin.length)
      }
      el.appendChild(b)
    }
    el.onclick = () => dokun(i)
    el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dokun(i) } }
    t.appendChild(el)
  })

  const kalan = sinir() ? sinir() - hamle : null
  E('vHamle').textContent = kalan === null
    ? `${m('hamle')} ${sayi(hamle)} · ${m('enKisa')} ${sayi(B.enKisa)}`
    : `${m('kalanHamle', { n: sayi(kalan) })} · ${m('enKisa')} ${sayi(B.enKisa)}`
  E('vHamle').dataset.az = kalan !== null && kalan <= 3 ? '1' : '0'
  E('vHamle').dataset.sinirli = kalan === null ? '0' : '1'
  E('vGeri').textContent = geriKalan > 0 ? sayi(geriKalan) : '▶'
  E('vGeri').dataset.reklam = geriKalan > 0 ? '0' : '1'
  E('bGeri').disabled = geriKalan > 0 && gecmis.length === 0

  const ser = E('durumSerit')
  if (olu) { ser.dataset.tur = 'tuzak'; ser.innerHTML = `<b>${m('oldu')}</b> ${nedenMetni(oluSebep)}` }
  else if (B.gunluk) { ser.dataset.tur = 'iyi'; ser.innerHTML = `<b>${m('gunlukBolum')}</b>` }
  else if (yildizi(B.id)) { ser.dataset.tur = 'iyi'; ser.innerHTML = `<b>${m('bitirdinBolum')}</b>` }
  else if (B.ogretici) { ser.dataset.tur = 'iyi'; ser.innerHTML = `<b>${m('ogreticiBolum')}</b>` }
  else if (!B.tuzakli) { ser.dataset.tur = 'iyi'; ser.innerHTML = `<b>${m('cansizBolum')}</b>` }
  else { ser.dataset.tur = 'tuzak'; ser.innerHTML = m('kaybedilebilir') }
  ekranKur.ustGuncelle?.()
}

function dokun(i) {
  if (olu) return
  if (secili === null) {
    if (durum.tup[i].length && !durum.kilit[i] && durum.rol[i] !== 'giris') { secili = i; ses.sec(); ciz() }
    return
  }
  if (secili === i) { secili = null; ciz(); return }
  if (!yasal(durum, secili, i, V)) {
    secili = durum.tup[i].length && !durum.kilit[i] ? i : null
    if (secili === null) ses.olmaz()
    else ses.sec()
    ciz()
    return
  }
  gecmis.push({ tup: durum.tup.map((t) => t.slice()), kilit: durum.kilit.slice() })
  const kaynak = secili
  const once = [...E('tahta').children[kaynak].querySelectorAll('.top')].map((b) => b.getBoundingClientRect())
  const onceBoy = durum.tup[kaynak].length
  durum = oyna(durum, secili, i, V)
  hamle++
  secili = null
  titre()
  ciz()
  ucur(once.slice(durum.tup[kaynak].length, onceBoy), i)
  ses.birak(durum.tup[i].length / durum.kap[i])
  if (tupBitti(durum, i) && durum.tup[i].length) ses.tupDoldu()
  if (hedefte(durum)) return bitir()
  if (!yasalHamleler(durum, V).length) return oldur('cikmaz')
  // Çalışma zamanı çözücü kontrolü — §15. Sınırı aşarsa hiçbir şey iddia edilmez.
  if (B.tuzakli && cozulurMu(durum, V, { sinir: KONTROL_SINIRI }) === false) return oldur('tuzak')
  if (sinir() && hamle >= sinir()) return oldur('hamle')
}

/** Taşınan topları eski yerlerinden yeni yerlerine bir yay çizerek uçurur. */
function ucur(eskiler, hedef) {
  if (!eskiler.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const toplar = [...E('tahta').children[hedef].querySelectorAll('.top')].slice(-eskiler.length)
  toplar.forEach((b, k) => {
    const y = b.getBoundingClientRect()
    const dx = eskiler[k].left - y.left
    const dy = eskiler[k].top - y.top
    const tepe = Math.min(dy, 0) - 40
    b.animate([
      { transform: `translate(${dx}px, ${dy}px)` },
      { transform: `translate(${dx / 2}px, ${tepe}px)`, offset: 0.45 },
      { transform: 'translate(0, 0)' },
    ], { duration: 300 + k * 40, easing: 'cubic-bezier(.45,.05,.35,1)' })
  })
  const tup = E('tahta').children[hedef]
  if (tup.dataset.tam === '1') tup.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 320, delay: 280 })
}

function geriAl() {
  if (!gecmis.length || !geriKalan) return
  const g = gecmis.pop()
  durum.tup = g.tup
  durum.kilit = g.kilit
  hamle--
  geriKalan--
  secili = null
  olu = false
  ciz()
}

const nedenMetni = (sebep) => (sebep === 'cikmaz' ? m('olduCikmaz') : sebep === 'hamle' ? m('olduHamle') : m('olduTuzak'))

function oldur(sebep) {
  olu = true
  oluSebep = sebep
  ses.kayip()
  titre('hata')
  const neden = nedenMetni(sebep)
  // Hamle bitince geri almak kurtarmaz: tek hamle geri gelir. Yalnızca baştan.
  const kurtar = sebep === 'hamle' ? '' : `<button class="d" data-is="kurtar">${m('geriAlKurtar')}</button>`
  const canYakar = canliMi(B) && !D.tam
  olay('bolum_bitti', { id: B.id, sonuc: 'kayip', sebep, hamle, sure: Date.now() - baslangic, canYakar })
  if (!canYakar) {
    ciz()
    return ekranKur.ortAc(`<h2>${m('oldu')}</h2><p>${neden}</p>
      <div class="dugmeler">
        ${kurtar}
        <button class="d" data-is="tekrar">${m('bastan')}</button></div>`, iste)
  }
  canHarca()
  olay('can_gitti', { id: B.id, kalan: D.can })
  ciz()
  if (D.can <= 0) return canBittiEkrani(neden)
  ekranKur.ortAc(`<h2>${m('canGitti')}</h2><p>${neden}</p>
    <p>${m('canKalan', { n: sayi(D.can), tavan: sayi(AYAR.TAVAN) })}</p>
    <div class="dugmeler">
      ${kurtar}
      <button class="d" data-is="tekrar">${m('bastan')}</button></div>`, iste)
}

export function canBittiEkrani(neden, hedefId) {
  const sig = siginak()
  olay('can_kapisi', { id: hedefId ?? B?.id, siginak: sig.length })
  ekranKur.ortAc(`<h2>${m('canBitti')}</h2>
    ${neden ? `<p>${neden}</p>` : ''}
    <p>${m('canDolar', { sure: `<span class="sayac" data-sayac="1">${sureYaz(canaKadar())}</span>` })}</p>
    <div class="dugmeler">
      <button class="d reklam" data-is="reklamCan" data-hedef="${hedefId ?? ''}">${m('reklamCan')}</button>
      ${sig.length ? `<button class="d" data-is="siginak">${m('cansizOyna')}</button>` : ''}
      <button class="d" data-is="bekle">${m('bekle')}</button>
      <button class="d altin" data-is="tamSurum" data-hedef="${hedefId ?? ''}">${m('tamSurum')}<small id="tamFiyat"></small></button></div>
    <p class="altNot">${m('sigInak', { n: sayi(sig.length) })} · <strong>${m('tamSurum')}</strong> — ${m('tamSurumMetin')}</p>`, iste, true)
  satis.fiyat().then((f) => { const el = E('tamFiyat'); if (f && el) el.textContent = ` · ${f}` })
}

/** Can geldi (reklam ya da Tam Sürüm): oyuncu kaldığı yerden devam eder. */
function canGeldi(hedef) {
  ekranKur.ortKapat()
  ekranKur.ustGuncelle?.()
  if (hedef) gitFn(Number(hedef))
  else if (B && E('tahta') && oluSebep === 'hamle') gitFn(B.id) // hamle bitti: kaldığı yerden değil, baştan
  else if (B && E('tahta')) { olu = false; ciz(); if (gecmis.length) iste('kurtar') }
  else cikisFn?.()
}

function iste(is, dugme) {
  if (is === 'kurtar') {
    ekranKur.ortKapat()
    if (gecmis.length) { const g = gecmis.pop(); durum.tup = g.tup; durum.kilit = g.kilit; hamle-- }
    olu = false
    secili = null
    ciz()
  } else if (is === 'tekrar') { ekranKur.ortKapat(); gitFn(B.id) }
  else if (is === 'sonraki') {
    // Bölüm arası reklamın tek yeri: zafer kartından çıkarken (§8: bölüm BİTİŞİNDE)
    const hedef = Number(dugme.dataset.hedef)
    ekranKur.ortKapat()
    reklam.arasi().then(() => gitFn(hedef))
  }
  else if (is === 'kapat') ekranKur.ortKapat()
  else if (is === 'paylas') {
    const s = gunlukSonuc(B.gun)
    paylas(paylasMetni({ ad: m('ad'), etiket: m('gunluk'), hamleAdi: m('hamle'), no: B.gun, yildiz: s.y, hamle: s.h, enKisa: B.enKisa, seriSayisi: seri(B.gun) }))
      .then((sonuc) => { olay('gunluk_paylas', { gun: B.gun, sonuc }); if (sonuc === 'kopyalandi' && dugme.isConnected) dugme.textContent = m('kopyalandi') })
  }
  else if (is === 'harita') { ekranKur.ortKapat(); cikisFn?.() }
  else if (is === 'bekle') { ekranKur.ortKapat(); cikisFn?.() }
  else if (is === 'siginak') { ekranKur.ortKapat(); gitFn(siginak()[0].id) }
  else if (is === 'reklamCan') {
    if (reklamda) return
    reklamda = true
    reklam.odullu('can').then((sonuc) => {
      reklamda = false
      if (sonuc === 'odul') { canEkle(1); return canGeldi(dugme.dataset.hedef) }
      if (sonuc === 'yok' && dugme.isConnected) {
        dugme.textContent = m('reklamYok')
        dugme.disabled = true
        setTimeout(() => { dugme.textContent = m('reklamCan'); dugme.disabled = false }, 4000)
      }
    })
  }
  else if (is === 'tamSurum') {
    satis.satinAl().then((sonuc) => {
      if (sonuc === 'alindi') canGeldi(dugme.dataset.hedef)
      else if (sonuc === 'hata' && dugme.isConnected) dugme.textContent = m('satisHata')
    })
  }
}

function bitir() {
  const y = yildizAdedi()
  if (B.gunluk) return gunlukBitir(y)
  const yeni = !yildizi(B.id)
  bolumBitti(B.id, y)
  ses.zafer(y)
  titre('basari')
  olay('bolum_bitti', { id: B.id, sonuc: 'kazanc', hamle, yildiz: y, enKisa: B.enKisa, sure: Date.now() - baslangic })
  const fazla = hamle - B.enKisa
  const sonraki = sonrakiBolum(B)
  const mesaj = fazla === 0 ? m('kusursuz')
    : y === 3 ? `${m('ucYildizTuttu')} ${m('hamleFazla', { n: sayi(fazla) })}`
    : `${m('hamleFazla', { n: sayi(fazla) })} ${m('ucYildizIcin', { n: sayi(B.yildiz3) })}`
  zaferKarti(y, `${m('cozuldu')} · ${sayi(hamle)} ${m('hamle').toLowerCase()}<br>${mesaj}`,
    `<button class="hap turuncu buyuk" data-is="sonraki" data-hedef="${sonraki.id}">${m('sonraki')}</button>
      ${y < 3 ? `<button class="metinDugme" data-is="tekrar">${m('tekrar')}</button>` : ''}`)
  return yeni
}

function zaferKarti(y, metin, dugmeler) {
  const renk = ['--r1', '--r2', '--r3', '--r4', '--r5', '--r6', '--r7', '--r8']
  const konfeti = Array.from({ length: 36 }, (_, k) =>
    `<i style="--x:${(k * 37) % 100}%;--g:${(k * 53) % 90}ms;--d:${1400 + ((k * 71) % 900)}ms;--r:${(k * 47) % 360}deg;background:var(${renk[k % 8]})"></i>`).join('')
  // Son topun yerine oturduğu görülsün, sonra kutlama
  setTimeout(() => ekranKur.ortAc(`<div class="konfeti" aria-hidden="true">${konfeti}</div>
    <div class="zaferYildiz">${[0, 1, 2].map((k) => `<span data-dolu="${k < y ? 1 : 0}" style="--k:${k}">★</span>`).join('')}</div>
    <h2 class="zaferBaslik">${m('zafer')}</h2>
    <p>${metin}</p>
    <div class="dugmeler">${dugmeler}</div>`, iste, false, 'zafer'), 450)
}

/** Günlük bulmaca bitti: kampanyaya sayılmaz, seri uzar, sonuç paylaşılabilir. */
function gunlukBitir(y) {
  gunlukBitti(B.gun, y, hamle)
  ses.zafer(y)
  titre('basari')
  olay('gunluk_bitti', { gun: B.gun, hamle, yildiz: y, enKisa: B.enKisa, seri: seri(B.gun), sure: Date.now() - baslangic })
  zaferKarti(y, `${m('gunluk')} #${sayi(B.gun)} · ${sayi(hamle)} ${m('hamle').toLowerCase()}<br>${m('gunlukSeri', { n: sayi(seri(B.gun)) })}`,
    `<button class="hap turuncu buyuk" data-is="paylas">${m('paylas')}</button>
      <button class="metinDugme" data-is="harita">${m('tamam')}</button>`)
}
