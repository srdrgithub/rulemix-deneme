// Uygulama akışı: giriş → oyun, harita ve ayarlar ikincil. Yönlendirme yok, dört ekran var.
//
// Giriş ekranı tek bir "Bölüm N" düğmesi. Harita duruyor ama açılışta değil:
// rakip incelemesinde (29 Eyl) toplam bölüm sayısını baştan göstermenin
// çekici olmadığı, düz bir sayaçla devam etmenin daha iyi hissettirdiği görüldü.

import { DILLER, dilSec, cihazDili, m, sayi, varyantAdi, varyantMetni } from './dil.js'
import { AYAR, D, canTazele, canaKadar, dilYaz, sifirla, yildizi, toplamYildiz, olay, sayaclar, gunlukSonuc } from './kayit.js'
import { GRUPLAR, BOLUMLER, grupAcikMi, bolumAcikMi, bitenSayisi, esik, siradaki, bolumBul, canliMi, numara } from './harita.js'
import { oyunEkrani, canBittiEkrani, sureYaz, kur } from './oyun.js'
import * as ses from './ses.js'
import * as reklam from './reklam.js'
import * as satis from './satis.js'
import * as telemetri from './telemetri.js'
import { gunNo, gununBolumu, gunlukMu, seri } from './gunluk.js'

// Sayfanın kaynağı sunucu/gizlilik.html; iki mağazanın listesine de bu adres yazılır
const GIZLILIK_URL = 'https://fidordia.com/rulemix/gizlilik.html'

const E = (id) => document.getElementById(id)
const ekran = E('ekran')
let neredeyiz = 'giris'

// ---- örtü (tek diyalog) ----
let ortIs = null
function ortAc(html, isFn, sayacli, tur = '') {
  E('kart').innerHTML = html
  E('kart').dataset.tur = tur
  E('orti').hidden = false
  ortIs = isFn
  E('kart').querySelectorAll('[data-is]').forEach((d) => {
    d.onclick = () => ortIs && ortIs(d.dataset.is, d)
  })
  E('kart').querySelector('.d')?.focus()
  if (sayacli) sayacBasla()
}
function ortKapat() { E('orti').hidden = true; sayacDur() }

let sayacId = null
function sayacBasla() {
  sayacDur()
  sayacId = setInterval(() => {
    canTazele()
    const el = E('kart').querySelector('[data-sayac]')
    if (D.can > 0) { sayacDur(); ortKapat(); ustGuncelle(); if (neredeyiz === 'harita') haritaCiz(); if (neredeyiz === 'giris') girisCiz(); return }
    if (el) el.textContent = sureYaz(canaKadar())
  }, 1000)
}
function sayacDur() { clearInterval(sayacId); sayacId = null }

// ---- üst çubuk ----
function ustGuncelle() {
  canTazele()
  const g = neredeyiz === 'giris' ? E('girisCan') : neredeyiz === 'oyun' ? E('oyunCan') : E('canGosterge')
  if (!g) return
  g.hidden = false
  g.dataset.tam = D.can >= AYAR.TAVAN ? '1' : '0'
  if (D.tam) { g.textContent = '♥ ∞'; return } // Tam Sürüm: sınırsız can
  // Kalp: ilk sürümdeki yuvarlak noktalar denemede can olarak OKUNMADI (2 Eki)
  const kalp = '♥'.repeat(D.can) + '♡'.repeat(AYAR.TAVAN - D.can)
  g.innerHTML = D.can >= AYAR.TAVAN ? kalp : `${kalp}<span class="sure">${sureYaz(canaKadar())}</span>`
}
setInterval(() => { if (!E('orti').hidden) return; ustGuncelle() }, 15000)

function ustGoster(goster) {
  E('ust').hidden = !goster
  document.body.dataset.ekran = neredeyiz
}

// ---- giriş ----
function girisCiz() {
  neredeyiz = 'giris'
  ustGoster(false)
  canTazele()
  const s = siradaki()
  const hepsi = Object.keys(D.bitti).length === BOLUMLER.length
  ekran.innerHTML = `
    <div class="girisUst">
      <button class="yuvarlak" data-git="ayar" aria-label="${m('ayarlar')}">⚙</button>
      <div class="canGosterge" id="girisCan"></div>
      <button class="yuvarlak" data-git="harita" aria-label="${m('bolumler')}">▦</button>
    </div>
    <div class="logo" aria-hidden="true">
      <div class="logoTup"><i style="--c:var(--r1)"></i><i style="--c:var(--r4)"></i><i style="--c:var(--r2)"></i></div>
      <div class="logoTup"><i style="--c:var(--r3)"></i><i style="--c:var(--r3)"></i><i style="--c:var(--r3)"></i></div>
      <div class="logoTup"><i style="--c:var(--r5)"></i><i style="--c:var(--r6)"></i></div>
    </div>
    <h1 class="logoAd"><img src="gorsel/yazi.png" alt="${m('ad')}"></h1>
    <div class="girisAlt">
      <button class="hap yesil buyuk" id="oynaDugme">${hepsi ? m('bolumler') : `${m('bolum')} ${sayi(numara(s))}`}</button>
      ${gunlukAcik() ? `<button class="gunlukDugme" id="gunlukDugme" data-bitti="${gunlukSonuc(gunNo()) ? 1 : 0}">
        <b>${m('gunluk')}</b><span>${gunlukSonuc(gunNo()) ? '★'.repeat(gunlukSonuc(gunNo()).y) : ''}${seri() ? ` 🔥 ${sayi(seri())}` : ''}</span></button>` : ''}
    </div>`
  if (E('gunlukDugme')) E('gunlukDugme').onclick = gunlukGit
  ekran.querySelector('[data-git="ayar"]').onclick = ayarlarCiz
  ekran.querySelector('[data-git="harita"]').onclick = haritaCiz
  E('oynaDugme').onclick = () => (hepsi ? haritaCiz() : bolumeGit(s.id))
  ustGuncelle()
}

// ---- harita ----
function haritaCiz() {
  neredeyiz = 'harita'
  ustGoster(true)
  E('baslik').textContent = m('harita')
  E('geri').hidden = false
  ekran.innerHTML = GRUPLAR.map((g, gi) => {
    const acik = grupAcikMi(gi)
    const bitti = bitenSayisi(g)
    const dugumler = g.bolumler.map((b) => {
      const y = yildizi(b.id)
      const ac = bolumAcikMi(b)
      return `<button class="dugum" data-id="${b.id}" ${ac ? '' : 'disabled'}
        data-bitti="${y ? 1 : 0}" data-yildiz="${y}" data-cansiz="${b.canli ? 0 : 1}"
        aria-label="${varyantAdi(g.varyant)} ${m('bolum')} ${sayi(b.sira)}${y ? ', ' + m('yildizToplam', { n: sayi(y) }) : ''}">
        ${sayi(numara(b))}${y ? `<small>${'★'.repeat(y)}</small>` : ''}</button>`
    }).join('')
    const onceki = GRUPLAR[gi - 1]
    return `<section class="grup" data-kilitli="${acik ? 0 : 1}">
      <div class="grupUst"><h2 class="grupAd">${varyantAdi(g.varyant)}</h2>
        <span class="grupSay">${m('ilerleme', { bitti: sayi(bitti), toplam: sayi(g.bolumler.length) })}</span></div>
      <p class="grupMetin">${varyantMetni(g.varyant)}</p>
      ${acik ? '' : `<p class="kilitNot">${m('grupKilitli', { ad: varyantAdi(g.varyant), n: sayi(esik(onceki)) })}</p>`}
      <div class="izgara">${dugumler}</div></section>`
  }).join('')
  ekran.querySelectorAll('.dugum[data-id]').forEach((d) => {
    d.onclick = () => bolumeGit(Number(d.dataset.id))
  })
  ustGuncelle()
}

// ---- günlük bulmaca ----
// İlk açılış tek düğme kalsın (29 Eyl kararı): günlük bulmaca, oyuncu Klasik'in
// üç öğretici bölümünü bitirince görünür. Can harcamaz, kapıdan geçmez.
const gunlukAcik = () => Object.keys(D.bitti).length >= 3
function gunlukGit() {
  const b = gununBolumu()
  neredeyiz = 'oyun'
  ustGoster(false)
  olay('gunluk_basladi', { gun: b.gun, v: b.varyant })
  oyunEkrani(b, ekran, { cik: girisCiz, git: bolumeGit, ayar: ayarlarCiz, ortAc, ortKapat, ustGuncelle })
}

// ---- bölüme giriş: CAN KAPISI burada ----
function bolumeGit(id) {
  if (gunlukMu(id)) return gunlukGit()
  const b = bolumBul(id)
  if (!b || !bolumAcikMi(b)) return
  canTazele()
  if (canliMi(b) && D.can <= 0) {
    if (neredeyiz === 'oyun') girisCiz()
    return canBittiEkrani(m('canKapi', { ad: varyantAdi(b.varyant), sira: sayi(numara(b)) }), id)
  }
  neredeyiz = 'oyun'
  ustGoster(false)
  oyunEkrani(b, ekran, { cik: girisCiz, git: bolumeGit, ayar: ayarlarCiz, ortAc, ortKapat, ustGuncelle })
  // Yeni bir kuralın ilk bölümü: haritadaki grup açıklamasının yerini bu kart tutuyor
  if (b.sira === 1 && !yildizi(b.id) && b.varyant !== GRUPLAR[0].varyant) {
    ortAc(`<div class="kartBas">${m('yeniKural')}</div>
      <h2>${varyantAdi(b.varyant)}</h2><p class="kuralBuyuk">${varyantMetni(b.varyant)}</p>
      <div class="dugmeler"><button class="hap yesil" data-is="tamam">${m('basla')}</button></div>`, ortKapat)
  }
}

// ---- ayarlar ----
function ayarlarCiz() {
  neredeyiz = 'ayarlar'
  ustGoster(true)
  E('geri').hidden = false
  E('baslik').textContent = m('ayarlar')
  E('geri').hidden = false
  const s = sayaclar()
  ekran.innerHTML = `
    <p class="bolumBas">${m('ses')}</p>
    <div class="satirListe">
      <button data-ses="1" aria-pressed="${ses.acikMi()}"><span>${m('ses')}</span><b class="anahtar">${ses.acikMi() ? m('acik') : m('kapali')}</b></button>
    </div>
    <p class="bolumBas">${m('dilSec')}</p>
    <div class="satirListe">${DILLER.map((d) => `
      <button data-dil="${d.kod}" ${d.kod === (D.dil || cihazDili()) ? 'aria-current="true"' : ''}>
        <span>${d.ad}</span></button>`).join('')}</div>
    <p class="bolumBas">${m('tamSurum')}</p>
    <div class="satirListe">${D.tam
      ? `<button disabled aria-pressed="true"><span>${m('tamSurumEtkin')}</span><b class="anahtar">✓</b></button>`
      : `<button data-satinal="1"><span>${m('tamSurumAl')}<small class="satirAlt">${m('tamSurumMetin')}</small></span><b class="anahtar" id="ayarFiyat"></b></button>
      <button data-geriyukle="1">${m('geriYukle')}</button>`}
    </div>
    <p class="bolumBas">${m('hakkinda')}</p>
    <div class="satirListe">
      <button data-gizlilik="1"><span>${m('gizlilik')}</span><b class="anahtar">↗</b></button>
      ${reklam.rizaAyariVar() ? `<button data-riza="1">${m('reklamTercih')}</button>` : ''}
      <button data-sifirla="1">${m('sifirla')}</button>
    </div>
    <p class="altNot">${m('yildizToplam', { n: sayi(toplamYildiz()) })} · ${sayi(Object.keys(D.bitti).length)}/${sayi(BOLUMLER.length)}
    <br>${Object.entries(s).map(([k, v]) => `${k}: ${sayi(v)}`).join(' · ') || '—'}</p>`
  ekran.querySelectorAll('[data-dil]').forEach((d) => {
    d.onclick = () => {
      dilYaz(d.dataset.dil)
      dilSec(d.dataset.dil)
      olay('dil_degisti', { dil: d.dataset.dil })
      ayarlarCiz()
    }
  })
  ekran.querySelector('[data-ses]').onclick = () => { ses.degistir(); ses.sec(); ayarlarCiz() }
  const bildir = (metin) => ortAc(`<p>${metin}</p>
    <div class="dugmeler"><button class="d" data-is="tamam">${m('tamam')}</button></div>`, ortKapat)
  const satisBitti = (sonuc) => {
    if (neredeyiz !== 'ayarlar') return
    if (sonuc === 'alindi') { ayarlarCiz(); bildir(`<b>${m('tamSurumEtkin')}</b><br>${m('tamSurumMetin')}`) }
    else if (sonuc === 'yok') bildir(m('geriYukYok'))
    else if (sonuc === 'hata') bildir(m('satisHata'))
  }
  const al = ekran.querySelector('[data-satinal]')
  if (al) {
    al.onclick = () => satis.satinAl().then(satisBitti)
    ekran.querySelector('[data-geriyukle]').onclick = () => satis.geriYukle().then(satisBitti)
    satis.fiyat().then((f) => { const el = E('ayarFiyat'); if (f && el) el.textContent = f })
  }
  // Sayfa sistemin tarayıcısında açılır; uygulamanın içinde gezinilmez
  ekran.querySelector('[data-gizlilik]').onclick = () => window.open(GIZLILIK_URL, '_blank', 'noopener')
  const riza = ekran.querySelector('[data-riza]')
  if (riza) riza.onclick = () => reklam.rizaAyari()
  ekran.querySelector('[data-sifirla]').onclick = () => {
    ortAc(`<h2>${m('sifirla')}</h2><p>${m('sifirlaSor')}</p>
      <div class="dugmeler"><button class="d" data-is="evet">${m('tamam')}</button>
      <button class="d" data-is="hayir">${m('iptal')}</button></div>`, (is) => {
      ortKapat()
      if (is === 'evet') { const dl = D.dil; sifirla(); dilYaz(dl); girisCiz() }
    })
  }
}

// ---- başlangıç ----
E('geri').onclick = girisCiz
E('ayarDugme').onclick = () => (neredeyiz === 'ayarlar' ? girisCiz() : ayarlarCiz())
E('orti').onclick = (e) => { if (e.target === E('orti')) ortKapat() }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !E('orti').hidden) ortKapat() })

// Ses bağlamı ancak bir dokunuşla açılabiliyor (iOS/Chrome kuralı)
document.addEventListener('pointerdown', ses.kilidiAc, { once: true })

kur({ ortAc, ortKapat, ustGuncelle, cik: girisCiz, git: bolumeGit })
dilSec(D.dil || cihazDili())
document.title = m('ad')
olay('acilis', { dil: D.dil || cihazDili() })
girisCiz()

// Para hattı ve telemetri açılışı bekletmez: oyun çizildikten sonra kurulur.
// Mağazadaki sahiplik yerel kayıttan farklıysa (iade, yeni cihaz) ekran tazelenir.
const tamdi = !!D.tam
satis.esitle().then(() => {
  if (!!D.tam !== tamdi && neredeyiz === 'giris') girisCiz()
  reklam.hazirla()
})
telemetri.baslat()
