// Komutan paneli ve muharebe görüntüleyicisi (şartname v1.6, PR-07 ve PR-15).
// Görüntüleyici yalnız motorun P9'da kesinleştirdiği kayıtları (muharebeG) oynatır: kayıp, organizasyon ve sonuç
// burada HESAPLANMAZ. Pencereyi açmak, kapatmak ya da hızlandırmak dünya durumunu değiştirmez (V16-T36).
import { signal } from '@preact/signals';
import { useEffect, useRef, useState } from 'preact/hooks';
import { istemci, panelSurum, seciliBirlik, fmt, kisalt, ozet, cekmece } from './durum.ts';
import { onizle } from './eylem.ts';
import { bolgeyeGit } from './App.tsx';

function useGorunum(gorunum: string) {
  const [v, setV] = useState<any>(null);
  const s = panelSurum.value;
  useEffect(() => { void istemci.istek('query', { gorunum }).then((x) => setV(x.veri)); }, [gorunum, s]);
  return v;
}

// ---------- Komutanlar ----------
const ESIK = [0, 500_000, 600_000, 700_000, 800_000, 900_000];
export function KomutanBolumu() {
  const v = useGorunum('komutan');
  const [acik, setAcik] = useState<number>(-1);
  if (!v) return null;
  const sec = [...seciliBirlik.value];
  return (
    <section>
      <div class="bolum-bas"><h3>Komutanlar · {v.liste.length}/{v.kadro}</h3>
        {v.komutansiz > 0 && <button class="kucuk-dugme" onClick={() => onizle({ tur: 'komutanOto' })}>Dağıt ({v.komutansiz} komutansız)</button>}</div>
      <p class="soluk kucuk">Komutan birliklerine taarruzda ve savunmada en çok +%20, ikmal veriminde +%10 kazandırır; kapasitesini aşarsa etkisi seyrelir. Deneyim muharebeyle artar.</p>
      {sec.length > 0 && <p class="kucuk"><strong>{sec.length} birlik seçili</strong> — atamak için komutanın yanındaki <em>Ata</em> düğmesine dokunun. <button class="kucuk-dugme" onClick={() => onizle({ tur: 'komutanAta', komutan: -1, birlikler: sec })}>Komutandan ayır</button></p>}
      <ul class="komutan-liste">
        {v.liste.map((k: any) => (
          <li key={k.id} class={k.yuk > k.kapasite ? 'asim' : ''}>
            <div class="km-bas">
              <button class="bag km-ad" aria-expanded={acik === k.id} onClick={() => setAcik(acik === k.id ? -1 : k.id)}><strong>{k.ad}</strong></button>
              <span class="km-rozet" title={k.tarihi ? 'Tarihî kişi' : 'Kurgu kişi (oyun tarafından üretildi)'}>{k.tarihi ? 'tarihî' : 'kurgu'}</span>
              <span class="soluk kucuk">{k.yas} yaş</span>
              {sec.length > 0 && <button class="kucuk-dugme ana" onClick={() => onizle({ tur: 'komutanAta', komutan: k.id, birlikler: sec })}>Ata</button>}
            </div>
            <div class="km-nitelik kucuk">
              <span title="Taarruz">⚔ {k.saldiri}</span><span title="Savunma">🛡 {k.savunma}</span><span title="Lojistik">⛟ {k.lojistik}</span>
              <span title="Deneyim">deneyim %{k.deneyim}</span>
              <span class={k.yuk > k.kapasite ? 'kotu-yazi' : ''} title="Komuta ettiği birlik / kapasite">birlik {k.yuk}/{k.kapasite}</span>
              <span class="soluk">{v.emirler[k.emir]}{k.ikmalEsik > 0 ? ` · ikmal ≥ %${Math.round(k.ikmalEsik / 10_000)}` : ''}{k.orgEsik > 0 ? ` · org ≥ %${Math.round(k.orgEsik / 10_000)}` : ''}</span>
            </div>
            {k.bolgeler.length > 0 && <div class="kucuk soluk">{k.bolgeler.map((b: any) => <button class="bag" key={b.r} onClick={() => { bolgeyeGit(b.r); cekmece.value = { tur: 'bolge', r: b.r }; }}>{b.ad} ({b.n})</button>)}</div>}
            {acik === k.id && (
              <div class="km-emir">
                <div class="satir-ayar"><span>Daimî emir</span>
                  <span class="dugmeler">{v.emirler.map((ad: string, i: number) => <button key={i} class={k.emir === i ? 'acik' : ''} aria-pressed={k.emir === i} onClick={() => onizle({ tur: 'komutanEmir', komutan: k.id, emir: i, ikmalEsik: k.ikmalEsik, orgEsik: k.orgEsik })}>{ad}</button>)}</span></div>
                <div class="satir-ayar"><label for={`ik${k.id}`}>İkmal şu oranın altındaysa taarruz etme</label>
                  <select id={`ik${k.id}`} value={k.ikmalEsik} onChange={(e) => onizle({ tur: 'komutanEmir', komutan: k.id, emir: k.emir, ikmalEsik: Number((e.target as HTMLSelectElement).value), orgEsik: k.orgEsik })}>
                    {ESIK.map((x) => <option key={x} value={x}>{x === 0 ? 'Koşul yok' : `%${x / 10_000}`}</option>)}</select></div>
                <div class="satir-ayar"><label for={`og${k.id}`}>Organizasyon şu oranın altındaysa taarruz etme</label>
                  <select id={`og${k.id}`} value={k.orgEsik} onChange={(e) => onizle({ tur: 'komutanEmir', komutan: k.id, emir: k.emir, ikmalEsik: k.ikmalEsik, orgEsik: Number((e.target as HTMLSelectElement).value) })}>
                    {ESIK.map((x) => <option key={x} value={x}>{x === 0 ? 'Koşul yok' : `%${x / 10_000}`}</option>)}</select></div>
                <div class="satir-ayar"><span class="soluk kucuk">Kurmay eğitimi {k.egitim}/{v.egitim.azami}: nitelikler +{v.egitim.artis} · {v.egitim.pg} siyasi güç, {fmt(v.egitim.altin)} altın</span>
                  <button disabled={k.egitim >= v.egitim.azami} onClick={() => onizle({ tur: 'komutanEgit', komutan: k.id })}>Eğit</button></div>
                <p class="soluk kucuk">Hizmet sonu: {k.ayrilis}. Koşul tutmazsa komutan taarruzu durdurur ve gerekçesini Kronik'e yazar.</p>
              </div>
            )}
          </li>
        ))}
      </ul>
      {!v.liste.length && <p class="soluk">Görevde komutan yok; harp akademisi her ay bir komutan yetiştirir.</p>}
      {v.ayrilan.length > 0 && <p class="soluk kucuk">Hizmetten ayrılanlar: {v.ayrilan.join(', ')}</p>}
    </section>
  );
}

// ---------- Muharebeler ----------
const izlenen = signal<any>(null);
const SONUC = ['sürüyor', 'bölge alındı', 'saldırı püskürtüldü'];
export function MuharebeBolumu() {
  const v = useGorunum('muharebe');
  if (!v) return null;
  return (
    <section>
      <h3>Muharebeler · {v.length}</h3>
      {!v.length && <p class="soluk">Henüz muharebe kaydı yok. Kayıtlar motorun günlük muharebe sonuçlarından oluşur.</p>}
      <ul class="liste">
        {v.map((m: any, i: number) => (
          <li key={i}>
            <span><strong>{m.bolgeAd}</strong> <span class="soluk kucuk">{m.saldiranAd} → {m.savunanAd} · {m.bas}{m.gunSayi > 1 ? ` – ${m.son}` : ''} · {m.gunSayi} gün</span><br />
              <span class={`kucuk ${m.suruyor ? '' : (m.sonuc === 1) === (m.biz === 0) ? 'iyi-yazi' : m.biz < 0 ? 'soluk' : 'kotu-yazi'}`}>{m.suruyor ? 'sürüyor' : SONUC[m.sonuc]} · kayıp {kisalt(m.kayipSaldiran)} / {kisalt(m.kayipSavunan)}</span></span>
            <button class="kucuk-dugme" onClick={() => { izlenen.value = m; }}>İzle</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface KayitBirlik { id: number; ad: string; taraf: number; komutan: string; guc: number; savunma: number; orgOnce: number; orgSonra: number; orgMax: number; kisiOnce: number; kisiSonra: number }
const azHareket = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Bir günün kaydını tuvale çizer. t ∈ [0,1]: 0 gün başı, 1 kesinleşmiş gün sonu (çubuklar arada doğrusal geçer). */
function ciz(cv: HTMLCanvasElement, m: any, gunIdx: number, t: number): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const c = cv.getContext('2d')!;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = getComputedStyle(document.documentElement);
  const R = (ad: string, yedek: string) => css.getPropertyValue(ad).trim() || yedek;
  const zemin = R('--murekkep', '#111922'), cizgi = R('--cizgi', '#2f4050'), yazi = R('--yazi', '#ede7da'), yazi2 = R('--yazi-2', '#a7b2bb'), iyi = R('--iyi', '#7fa864'), kotu = R('--kotu', '#d4553f'), pirinc = R('--pirinc', '#d6ad52');
  c.fillStyle = zemin; c.fillRect(0, 0, W, H);
  const g = m.gunler[gunIdx];
  // oyuncunun tarafı altta; gözlemcide saldıran altta
  const altTaraf = m.biz === 1 ? 1 : 0;
  const alt: KayitBirlik[] = g.birlikler.filter((b: KayitBirlik) => b.taraf === altTaraf), ust: KayitBirlik[] = g.birlikler.filter((b: KayitBirlik) => b.taraf !== altTaraf);
  const renk = (taraf: number) => (taraf === 0 ? m.saldiranRenk : m.savunanRenk);
  const kutu = (l: KayitBirlik[], y0: number, y1: number) => {
    const n = Math.min(l.length, 6), sutun = n <= 3 ? n : Math.ceil(n / 2), satir = n <= 3 ? 1 : 2;
    const gw = (W - 16) / Math.max(1, sutun), gh = (y1 - y0) / satir;
    return l.slice(0, 6).map((b, i) => ({ b, x: 8 + (i % sutun) * gw + 3, y: y0 + Math.floor(i / sutun) * gh + 3, w: gw - 6, h: gh - 6 }));
  };
  const orta = H / 2;
  const kUst = kutu(ust, 26, orta - 22), kAlt = kutu(alt, orta + 22, H - 8);
  // orta şerit: bölge ve gün
  c.fillStyle = yazi2; c.font = '12px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(`${m.bolgeAd} · ${g.tarih} · ${gunIdx + 1}/${m.gunler.length}. gün`, W / 2, orta);
  c.textAlign = 'left'; c.fillStyle = yazi2;
  c.fillText(altTaraf === 0 ? `${m.savunanAd} (savunan)` : `${m.saldiranAd} (saldıran)`, 10, 14);
  // ateş hatları: önce saldıran, sonra savunan (yalnız görsel; hasar kayıttan gelir)
  const atis = (kimden: typeof kAlt, kime: typeof kAlt, a: number) => {
    if (a <= 0 || a >= 1 || !kimden.length || !kime.length) return;
    c.strokeStyle = pirinc; c.globalAlpha = 0.85 * Math.sin(a * Math.PI); c.lineWidth = 1.5;
    kimden.forEach((k, i) => {
      const h = kime[i % kime.length]!;
      const x0 = k.x + k.w / 2, y0 = k.y + k.h / 2, x1 = h.x + h.w / 2, y1 = h.y + h.h / 2;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a); c.stroke();
    });
    c.globalAlpha = 1;
  };
  const saldiranKutular = altTaraf === 0 ? kAlt : kUst, savunanKutular = altTaraf === 0 ? kUst : kAlt;
  atis(saldiranKutular, savunanKutular, Math.min(1, t / 0.45));
  atis(savunanKutular, saldiranKutular, t <= 0.45 ? 0 : Math.min(1, (t - 0.45) / 0.45));
  for (const { b, x, y, w, h } of [...kUst, ...kAlt]) {
    c.fillStyle = '#1f2d3a'; c.strokeStyle = cizgi; c.lineWidth = 1;
    c.beginPath(); c.roundRect(x, y, w, h, 6); c.fill(); c.stroke();
    c.fillStyle = renk(b.taraf); c.fillRect(x, y + 4, 4, h - 8);
    c.fillStyle = yazi; c.font = '600 12px system-ui, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'top';
    const ad = b.ad.length > 20 ? `${b.ad.slice(0, 19)}…` : b.ad;
    c.fillText(ad, x + 9, y + 5, w - 14);
    if (b.komutan && h > 62) { c.fillStyle = yazi2; c.font = '11px system-ui, sans-serif'; c.fillText(b.komutan, x + 9, y + 20, w - 14); }
    // organizasyon ve personel çubukları: gün başı → gün sonu
    const org = b.orgOnce + (b.orgSonra - b.orgOnce) * t, kisi = b.kisiOnce + (b.kisiSonra - b.kisiOnce) * t;
    const cubuk = (yy: number, oran: number, r: string, etiket: string) => {
      c.fillStyle = zemin; c.fillRect(x + 9, yy, w - 18, 6);
      c.fillStyle = r; c.fillRect(x + 9, yy, Math.max(0, (w - 18) * Math.min(1, oran)), 6);
      c.fillStyle = yazi2; c.font = '10px system-ui, sans-serif'; c.textBaseline = 'bottom'; c.fillText(etiket, x + 9, yy - 1, w - 18); c.textBaseline = 'top';
    };
    const oOran = org / Math.max(1, b.orgMax);
    cubuk(y + h - 26, oOran, oOran > 0.6 ? iyi : oOran > 0.3 ? pirinc : kotu, `org %${Math.round(oOran * 100)}`);
    cubuk(y + h - 9, kisi / Math.max(1, b.kisiOnce + (b.kisiOnce - b.kisiSonra) * 4), yazi2, `${fmt(Math.round(kisi))} kişi`);
    const kayip = b.kisiOnce - b.kisiSonra;
    if (t > 0.5 && kayip > 0) { c.fillStyle = kotu; c.font = '600 11px system-ui, sans-serif'; c.textAlign = 'right'; c.fillText(`−${fmt(kayip)}`, x + w - 6, y + 5); c.textAlign = 'left'; }
  }
  if (ust.length > 6 || alt.length > 6) { c.fillStyle = yazi2; c.font = '11px system-ui, sans-serif'; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(`+${Math.max(0, ust.length - 6) + Math.max(0, alt.length - 6)} birlik daha`, W - 10, 14); }
}

export function MuharebeIzleyici() {
  const m = izlenen.value;
  const cv = useRef<HTMLCanvasElement>(null);
  const [gun, setGun] = useState(0);
  const [oynat, setOynat] = useState(false);
  const t = useRef(1);
  useEffect(() => { setGun(0); setOynat(!azHareket()); t.current = azHareket() ? 1 : 0; }, [m]);
  useEffect(() => {
    if (!m || !cv.current) return;
    let kare = 0, son = performance.now(), canli = true;
    const adim = (simdi: number) => {
      if (!canli) return;
      if (oynat) {
        t.current = Math.min(1, t.current + (simdi - son) / 1400);
        if (t.current >= 1 && gun < m.gunler.length - 1) { t.current = 0; setGun(gun + 1); }
        else if (t.current >= 1) setOynat(false);
      } else t.current = 1;
      son = simdi;
      ciz(cv.current!, m, Math.min(gun, m.gunler.length - 1), t.current);
      if (oynat) kare = requestAnimationFrame(adim);
    };
    kare = requestAnimationFrame(adim);
    return () => { canli = false; cancelAnimationFrame(kare); };
  }, [m, gun, oynat]);
  useEffect(() => {
    const kapat = (e: KeyboardEvent) => { if (e.key === 'Escape') izlenen.value = null; };
    addEventListener('keydown', kapat);
    return () => removeEventListener('keydown', kapat);
  }, []);
  if (!m) return null;
  const g = m.gunler[Math.min(gun, m.gunler.length - 1)];
  const top = (taraf: number, alan: 'guc' | 'savunma') => g.birlikler.filter((b: KayitBirlik) => b.taraf === taraf).reduce((s: number, b: KayitBirlik) => s + b[alan], 0);
  const komutanlar = (taraf: number) => [...new Set(g.birlikler.filter((b: KayitBirlik) => b.taraf === taraf && b.komutan).map((b: KayitBirlik) => b.komutan))].join(', ');
  const sonGun = gun >= m.gunler.length - 1;
  const git = (i: number) => { setOynat(false); t.current = 1; setGun(Math.max(0, Math.min(m.gunler.length - 1, i))); };
  return (
    <div class="perde" role="dialog" aria-modal="true" aria-label={`${m.bolgeAd} muharebesi`}>
      <article class="muharebe">
        <header><h2>{m.bolgeAd} muharebesi</h2><button class="kucuk-dugme" aria-label="Kapat" onClick={() => { izlenen.value = null; }}>Kapat</button></header>
        <canvas ref={cv} class="muharebe-tuval" aria-label={`${m.saldiranAd} ${m.savunanAd} muharebesi, ${g.tarih}`} />
        <div class="muharebe-denetim">
          <button onClick={() => git(gun - 1)} disabled={gun === 0} aria-label="Önceki gün">◀</button>
          <button class="ana" onClick={() => { if (sonGun && t.current >= 1) { setGun(0); } t.current = 0; setOynat(!oynat); }}>{oynat ? 'Duraklat' : sonGun ? 'Baştan oynat' : 'Oynat'}</button>
          <button onClick={() => git(gun + 1)} disabled={sonGun} aria-label="Sonraki gün">▶</button>
          <span class="soluk kucuk">{g.tarih}</span>
        </div>
        <dl class="muharebe-neden">
          <dt>Sonuç</dt><dd><strong>{m.suruyor && sonGun ? 'Muharebe sürüyor' : sonGun ? SONUC[m.sonuc] : SONUC[g.sonuc]}</strong> · toplam kayıp {fmt(m.kayipSaldiran)} (saldıran) / {fmt(m.kayipSavunan)} (savunan)</dd>
          <dt>Güç (bu gün)</dt><dd>saldırı {kisalt(top(0, 'guc'))} ↔ savunma {kisalt(top(1, 'savunma'))}</dd>
          <dt>Arazi ve tahkimat</dt><dd>savunma ×{(g.savCarpan / 1_000_000).toFixed(2).replace('.', ',')}{g.baski > 0 ? ` · topçu tahkimatın %${Math.round(g.baski / 10_000)}'ini bastırdı` : ''}</dd>
          {g.yon >= 2 && <><dt>Kuşatma</dt><dd>{g.yon} bölgeden saldırı (+%10–20)</dd></>}
          {g.hava !== 0 && <><dt>Hava</dt><dd>{g.hava > 0 ? 'saldıran' : 'savunan'} üstün (%{Math.round(Math.abs(g.hava) / 10_000)})</dd></>}
          {(komutanlar(0) || komutanlar(1)) && <><dt>Komutanlar</dt><dd>{komutanlar(0) || '—'} ↔ {komutanlar(1) || '—'}</dd></>}
        </dl>
        <p class="soluk kucuk">Bu ekran motorun kesinleşmiş günlük sonuçlarını oynatır; burada yeni kayıp hesaplanmaz. {ozet.value?.mod === 2 ? '' : 'Birliklere emir vermek için haritayı ya da Ordu panelini kullanın.'}</p>
      </article>
    </div>
  );
}
