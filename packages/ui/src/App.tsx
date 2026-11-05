import { useEffect, useRef, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { HaritaCizici, type HaritaModu } from '@ts/map';
import {
  pkg, geo, SIMGE, istemci, ekran, ozet, harita, cekmece, panel, panelAc, bolgeAc, haritaModu, seciliBolge, seciliBirlik, bolgeSecimi, ilerliyor, ilerleme, rapor,
  komutSonuc, nedenAcik, tostlar, komutMetni, tazele, kisalt, puan, yuzde, sonKomutlar, tost, paketKimlik, type Panel,
} from './durum.ts';
import { komutCalistir, onizle, gonder, ilerlet, durdur } from './eylem.ts';
import { Cekmece } from './Cekmece.tsx';
import { Baslangic } from './Baslangic.tsx';
import { Simge } from './Simge.tsx';
import { trEk } from '../../engine/src/tr.ts';

export function App() {
  return ekran.value === 'baslangic' ? <Baslangic /> : <Oyun />;
}

/** Hareket/taarruz önizlemesindeki hedef bölge (haritada kesikli çerçeve). */
export const hedefBolge = signal(-1);

// ---------------- Oyun ekranı ----------------
function Oyun() {
  const c = cekmece.value;
  return (
    <div class={`oyun ${c ? 'cekmeceli' : ''} ${bolgeSecimi.value ? 'secimde' : ''}`}>
      <HaritaKatmani key={paketKimlik.value ?? ''} />
      <UstBar />
      <SolRay />
      <HaritaAraclari />
      {c && <Cekmece />}
      <OrtaAlan />
      {bolgeSecimi.value && <SecimBandi />}
      {ilerleme.value && <Ilerleme />}
      <OlayModal />
      <Yikildi />
      {nedenAcik.value && <Neden />}
      <Tostlar />
    </div>
  );
}

let cizici: HaritaCizici | null = null;
export const haritaCizici = () => cizici;

/** Arayüz öğelerinin kapladığı kenar boşlukları (harita odaklama bunları hesaba katar). */
function boslukOlc(): { sol: number; ust: number; sag: number; alt: number } {
  const q = (s: string) => document.querySelector(s)?.getBoundingClientRect();
  const yatay = window.innerWidth >= window.innerHeight;
  const ust = q('.ustbar')?.bottom ?? 0;
  const ray = q('.solray');
  const cek = q('.cekmece');
  const komut = q('.komut');
  return {
    sol: yatay ? (ray?.right ?? 0) : 0,
    ust,
    sag: yatay && cek ? window.innerWidth - cek.left : 0,
    alt: yatay ? (komut ? window.innerHeight - komut.top : 0) : window.innerHeight - Math.min(cek?.top ?? Infinity, komut?.top ?? Infinity, ray?.top ?? Infinity),
  };
}

export function seciliYerler(): Set<number> {
  const s = seciliBirlik.value;
  return new Set((harita.value?.birimler ?? []).filter((b) => s.has(b.id)).map((b) => b.bolge));
}

function haritaDokun(r: number) {
  const bs = bolgeSecimi.value;
  if (bs) {
    if (bs.uygun(r)) { bolgeSecimi.value = null; bs.sec(r); } else tost('Bu bölge seçilemez.', 'hata');
    return;
  }
  const sec = seciliBirlik.value;
  if (sec.size > 0) {
    const yer = seciliYerler();
    if (!(yer.size === 1 && yer.has(r))) {
      // birlik seçiliyken bölgeye dokunmak hareket/taarruz kartı açar
      const kontrol = harita.value?.bolgeler[r]?.k ?? -1;
      const savas: number[] = ozet.value?.savasta ?? [];
      hedefBolge.value = r;
      void onizle({ tur: savas.includes(kontrol) ? 'saldir' : 'hareket', birlikler: [...sec], hedef: r });
      return;
    }
  }
  bolgeAc(r);
}

function yiginDokun(r: number) {
  if (bolgeSecimi.value) { haritaDokun(r); return; }
  const sec = seciliBirlik.value;
  if (sec.size > 0 && !seciliYerler().has(r)) { haritaDokun(r); return; }
  if (cekmece.value?.tur === 'bolge' && cekmece.value.r === r) {
    // ikinci dokunuş: bölgedeki bütün birliklerimizi seç / bırak
    const burada = (harita.value?.birimler ?? []).filter((b) => b.bolge === r).map((b) => b.id);
    const hepsi = burada.length > 0 && burada.every((id) => sec.has(id));
    seciliBirlik.value = hepsi ? new Set() : new Set(burada);
    return;
  }
  bolgeAc(r);
}

function HaritaKatmani() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const c = new HaritaCizici(cv, pkg, geo, SIMGE);
    cizici = c;
    const o = ozet.value;
    if (harita.value) c.veri = harita.value;
    c.oyuncu = o?.oyuncu ?? 0;
    c.boyutla();
    const odak = () => {
      const P = ozet.value?.oyuncu ?? 0;
      const bas = pkg.ulkeler[P]?.baskent ?? -1;
      const rs = (harita.value?.bolgeler ?? []).map((b, i) => ({ b, i })).filter(({ b }) => b.s === P || b.k === P).map(({ i }) => i);
      c.bosluk = boslukOlc();
      c.odakBolgeler(bas >= 0 ? [bas, ...rs.filter((r) => r !== bas)] : rs);
    };
    // ilk yerleşim: arayüz öğeleri ölçülebilir olunca
    requestAnimationFrame(() => requestAnimationFrame(odak));
    const ro = new ResizeObserver(() => { c.boyutla(); c.bosluk = boslukOlc(); });
    ro.observe(cv);
    c.onBolge = haritaDokun;
    c.onYigin = yiginDokun;
    c.onBos = () => {
      if (bolgeSecimi.value) return;
      if (seciliBirlik.value.size) { seciliBirlik.value = new Set(); return; }
      if (cekmece.value?.tur === 'bolge') cekmece.value = null;
      seciliBolge.value = -1;
    };
    odakIstek = odak;
    (window as unknown as { __harita: HaritaCizici }).__harita = c;
    return () => { ro.disconnect(); c.kapat(); if (cizici === c) cizici = null; };
  }, []);
  // veri değişimleri
  const h = harita.value, o = ozet.value;
  useEffect(() => {
    if (!cizici || !h) return;
    cizici.veri = h; cizici.oyuncu = o?.oyuncu ?? 0; cizici.mod = haritaModu.value;
    if (o?.donem) { cizici.sablonSimge = o.donem.sablonlar.map((s: any) => s.simge); cizici.yabanciSimge = o.donem.simge.piyade; }
    cizici.isaretle();
  }, [h, o, haritaModu.value]);
  const c = cekmece.value;
  useEffect(() => {
    if (!cizici) return;
    cizici.seciliBirlik = seciliBirlik.value;
    cizici.seciliBolge = c?.tur === 'bolge' ? c.r : seciliBolge.value;
    cizici.hedefIsaret = komutSonuc.value ? hedefBolge.value : -1;
    const bs = bolgeSecimi.value;
    cizici.uygunBolge = bs ? bs.uygun : null;
    cizici.isaretle();
  }, [seciliBirlik.value, c, seciliBolge.value, komutSonuc.value, hedefBolge.value, bolgeSecimi.value]);
  // çekmece açılıp kapanınca kullanılabilir alan değişir; seçili bölge görünür kalsın
  useEffect(() => {
    requestAnimationFrame(() => {
      if (!cizici) return;
      cizici.bosluk = boslukOlc();
      if (c?.tur === 'bolge') gorunurYap(c.r);
    });
  }, [c?.tur, c?.tur === 'bolge' ? c.r : -1]);
  useEffect(() => {
    if (!cizici || haritaModu.value !== 'iliski') return;
    void istemci.istek('query', { gorunum: 'diplomasi' }).then((d) => {
      const g: number[] = [];
      for (const u of d.veri.ulkeler) g[u.id] = u.gorusBize;
      cizici!.gorus = g; cizici!.isaretle();
    });
  }, [haritaModu.value, o?.gun]);
  return <canvas ref={ref} class="harita" aria-label="Harita: bölgeye dokunarak seçin; birlik pullarına dokunarak birliklere ulaşın" />;
}

let odakIstek: (() => void) | null = null;
function gorunurYap(r: number) {
  const c = cizici;
  if (!c) return;
  const [x, y] = pkg.bolgeler[r]!.merkez;
  const ex = c.ox + x * c.s, ey = c.oy + y * c.s;
  const B = c.bosluk;
  const W = window.innerWidth, H = window.innerHeight;
  if (ex < B.sol + 40 || ex > W - B.sag - 90 || ey < B.ust + 40 || ey > H - B.alt - 50) c.odakla(r, false);
}
export function bolgeyeGit(r: number) { cizici?.odakla(r, true); }

function Gosterge({ ad, deger, ton, neden, alt, simge }: { ad: string; deger: string; ton?: string; neden?: string; alt?: string; simge?: string }) {
  return (
    <button class={`gosterge ${ton ?? ''}`} onClick={() => neden && void istemci.istek('explain', neden).then((v) => { nedenAcik.value = v; })} title={neden ? 'Neden?' : undefined}>
      {simge && <Simge ad={simge} boy={18} class="g-simge" />}
      <span class="g-metin">
        <span class="g-ad">{ad}</span>
        <span class="g-deger">{deger}{alt && <span class="g-alt"> {alt}</span>}</span>
      </span>
    </button>
  );
}

function UstBar() {
  const o = ozet.value;
  if (!o) return null;
  const P = o.oyuncu;
  const ton = (v: number, iyi: number, kotu: number) => (v >= iyi ? 'iyi' : v <= kotu ? 'kotu' : '');
  const net = o.gelirDun - o.giderDun;
  return (
    <header class="ustbar">
      <button class="kimlik" onClick={() => panelAc('devlet')} title="Devlet paneli">
        <span class="muhur" style={{ background: o.ulke.renk }} />
        <span class="kimlik-metin">
          <strong>{o.ulke.kisa}</strong>
          <span class="tarih">{o.tarih}{o.mod === 1 ? ' · SANDBOX' : o.mod === 2 ? ' · GÖZLEMCİ' : ''}</span>
        </span>
      </button>
      <div class="gostergeler">
        <Gosterge simge="coins" ad="Hazine" deger={kisalt(o.hazine)} alt={`${net >= 0 ? '+' : ''}${kisalt(net)}/g`} ton={ton(o.hazineGun, 120, 30)} neden={`gelir:${P}`} />
        <Gosterge simge="scales" ad="Siyasi güç" deger={puan(o.pg)} neden={`pg:${P}`} />
        <Gosterge simge="dove" ad="Huzur" deger={puan(o.huzur)} ton={ton(o.huzur, 60_000, 35_000)} neden={`huzur:${P}`} />
        <Gosterge simge="wheat" ad="Gıda" deger={`${o.gidaGun > 998 ? '∞' : o.gidaGun} gün`} ton={ton(o.gidaGun, 60, 20)} neden={`gida:${P}`} />
        <Gosterge simge="three-friends" ad="İnsan gücü" deger={kisalt(o.insanY)} ton={ton(o.insanY, 40_000, 8000)} />
        <Gosterge simge="flag-objective" ad="Savaşa destek" deger={puan(o.destek)} alt={o.savasta.length ? `yorg. ${puan(o.yorgunluk)}` : undefined} neden={`destek:${P}`} />
      </div>
      <Zaman />
    </header>
  );
}

function Zaman() {
  if (ilerliyor.value) return <div class="zaman"><button class="zaman-dur" onClick={durdur}><Simge ad="pause-button" boy={18} /> Durdur</button></div>;
  return (
    <div class="zaman" role="group" aria-label="Zamanı ilerlet">
      <button onClick={() => ilerlet('gun', 1)} title="1 gün"><Simge ad="play-button" boy={16} /><span>1 gün</span></button>
      <button onClick={() => ilerlet('hafta', 1)} title="1 hafta"><Simge ad="fast-forward-button" boy={16} /><span>1 hafta</span></button>
      <button onClick={() => ilerlet('ay', 1)} title="1 ay"><Simge ad="fast-forward-button" boy={16} /><span>1 ay</span></button>
      <button class="ana" onClick={() => ilerlet('olay', 1)} title="Sonraki önemli olaya kadar (en çok üç ay)"><Simge ad="next-button" boy={16} /><span>Olay</span></button>
    </div>
  );
}

export const PANELLER: [Panel, string, string][] = [
  ['devlet', 'Devlet', 'crown'], ['ordu', 'Ordu', 'crossed-swords'], ['ekonomi', 'Ekonomi', 'anvil'], ['diplomasi', 'Diplomasi', 'dove'],
  ['arastirma', 'Araştırma', 'telescope'], ['istatistik', 'İstatistik', 'histogram'], ['kronik', 'Kronik', 'scroll-unfurled'], ['kayit', 'Kayıt', 'save'],
];

function SolRay() {
  const o = ozet.value;
  return (
    <nav class="solray" aria-label="Paneller">
      {PANELLER.map(([k, ad, s]) => (
        <button key={k} class={panel.value === k ? 'acik' : ''} onClick={() => panelAc(k)} aria-pressed={panel.value === k}>
          <Simge ad={s} boy={22} />
          <span>{ad}</span>
          {k === 'diplomasi' && o?.teklifler?.length ? <b class="rozet">{o.teklifler.length}</b> : null}
        </button>
      ))}
    </nav>
  );
}

const MODLAR: [HaritaModu, string][] = [['siyasi', 'Siyasi'], ['kontrol', 'Kontrol'], ['gida', 'Gıda'], ['nufus', 'Nüfus'], ['iliski', 'İlişki'], ['altyapi', 'Altyapı']];
function HaritaAraclari() {
  const [acik, setAcik] = useState(false);
  const ad = MODLAR.find(([k]) => k === haritaModu.value)?.[1];
  return (
    <div class="harita-arac">
      <div class="mod-kutu">
        <button class={`arac-dugme genis ${acik ? 'acik' : ''}`} onClick={() => setAcik(!acik)} aria-expanded={acik} title="Harita modu"><Simge ad="globe" boy={18} /><span>{ad}</span></button>
        {acik && (
          <div class="mod-liste" role="radiogroup" aria-label="Harita modu">
            {MODLAR.map(([k, a]) => <button key={k} role="radio" aria-checked={haritaModu.value === k} class={haritaModu.value === k ? 'acik' : ''} onClick={() => { haritaModu.value = k; setAcik(false); }}>{a}</button>)}
          </div>
        )}
      </div>
      <button class="arac-dugme" onClick={() => odakIstek?.()} title="Ülkeme dön" aria-label="Ülkeme dön"><Simge ad="castle" boy={18} /></button>
      <button class="arac-dugme" onClick={() => { const c = cizici; if (c) c.zoom(1.5, window.innerWidth / 2, window.innerHeight / 2); }} aria-label="Yakınlaştır">+</button>
      <button class="arac-dugme" onClick={() => { const c = cizici; if (c) c.zoom(1 / 1.5, window.innerWidth / 2, window.innerHeight / 2); }} aria-label="Uzaklaştır">−</button>
    </div>
  );
}

function SecimBandi() {
  const b = bolgeSecimi.value!;
  return (
    <div class="secim-bandi" role="status">
      <Simge ad="flag-objective" boy={18} />
      <span>{b.baslik}</span>
      <button onClick={() => { bolgeSecimi.value = null; }}>Vazgeç</button>
    </div>
  );
}

// ---------------- Orta sütun: birlik seçimi, plan kartı ve komut ----------------
function OrtaAlan() {
  const s = komutSonuc.value;
  return (
    <div class={`orta ${s ? 'kartli' : ''}`}>
      {seciliBirlik.value.size > 0 && !s && <BirlikSecim />}
      {s && <Sonuc s={s} />}
      <KomutAlani />
    </div>
  );
}

function BirlikSecim() {
  const s = seciliBirlik.value;
  const b = (harita.value?.birimler ?? []).filter((x) => s.has(x.id));
  const yer = [...new Set(b.map((x) => x.bolge))];
  const kisi = b.reduce((t, x) => t + x.kisi, 0);
  const tanim = b.length === 1 ? b[0]!.ad : `${b.length} birlik`;
  return (
    <div class="birliksecim" role="status">
      <span class="bs-metin"><strong>{tanim}</strong> <span class="soluk">{yer.length === 1 ? trEk(pkg.bolgeler[yer[0]!]!.ad, 'de') : `${yer.length} bölgede`} · {kisalt(kisi)} kişi — hedef bölgeye dokunun</span></span>
      <span class="dugmeler">
        <button onClick={() => onizle({ tur: 'dur', birlikler: [...s] })}>Dur</button>
        <button onClick={() => onizle({ tur: 'durus', birlikler: [...s], durus: 1 })}>Esnek</button>
        <button onClick={() => { seciliBirlik.value = new Set(); }}>Bırak</button>
      </span>
    </div>
  );
}

function KomutAlani() {
  const ref = useRef<HTMLInputElement>(null);
  const [odak, setOdak] = useState(false);
  const s = komutSonuc.value;
  const o = ozet.value;
  const cal = (m: string) => { komutMetni.value = ''; void komutCalistir(m); };
  // boş çubukta bağlama göre öneriler
  const oneriler = (() => {
    const out: string[] = [];
    const c = cekmece.value;
    const r = c?.tur === 'bolge' ? c.r : -1;
    if (r >= 0) {
      const ad = pkg.bolgeler[r]!.ad;
      out.push((o?.savasta ?? []).includes(harita.value?.bolgeler[r]?.k ?? -1) ? `${trEk(ad, 'e')} saldır` : `${trEk(ad, 'e')} git`);
    }
    if (o?.gidaGun < 30) out.push('Her hafta 300 gıda satın al');
    if (o?.olaylar?.length) out.push('Ne yapmalıyım?');
    const sab = o?.donem?.sablonlar?.[0]?.ad?.toLocaleLowerCase('tr');
    out.push(...['Huzur neden düşüyor?', 'Rakipler ne planlıyor?', sab ? `2 ${sab} kur` : '2 piyade tümeni kur'].filter((x) => !out.includes(x)));
    return out.slice(0, 3);
  })();
  return (
    <div class="komut-alani">
      <form class="komut" onSubmit={(e) => { e.preventDefault(); cal(komutMetni.value); }}>
        <label for="komut" class="gizli">Komut</label>
        <Simge ad="quill-ink" boy={20} class="komut-simge" />
        <input id="komut" ref={ref} value={komutMetni.value} onInput={(e) => { komutMetni.value = (e.target as HTMLInputElement).value; }}
          onFocus={() => setOdak(true)} onBlur={() => setTimeout(() => setOdak(false), 150)} placeholder="Emir yazın: “Varşova'ya saldır”, “vergiyi %18 yap”, “huzur neden düşüyor?”" autocomplete="off" enterKeyHint="send" disabled={ilerliyor.value} />
        <button type="submit" class="gonder ana" disabled={ilerliyor.value || !komutMetni.value.trim()}>Gönder</button>
      </form>
      {!s && (odak || !seciliBirlik.value.size) && (
        <div class="cipler">
          {(odak && sonKomutlar.value.length ? sonKomutlar.value.slice(0, 3) : oneriler).map((m) => (
            <button key={m} class="cip" onMouseDown={(e) => e.preventDefault()} onClick={() => cal(m)}>{m}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function Sonuc({ s }: { s: any }) {
  const kapat = () => { komutSonuc.value = null; hedefBolge.value = -1; };
  if (s.tur === 'yardim') return (
    <div class="sonuc"><div class="sonuc-bas"><strong>Komut örnekleri</strong><button class="kapat" onClick={kapat} aria-label="Kapat">×</button></div>
      <p class="soluk">Fiili sona yazın; ekleri olduğu gibi kullanabilirsiniz (saldır, saldırsın, saldıralım, saldırmalıyız). Olumsuz emir mevcut emri iptal eder (“saldırmayın”). Soru cümleleri danışmana gider.</p>
      <div class="cipler sar">{['Başkentte 2 piyade kur', 'Vergiyi %15 yap', 'Mühimmat üretimine 4 fabrika ayır', 'Savaş ekonomisine geç', 'Bilime %40 ayır', 'Ne yapmalıyım?'].map((m) => <button class="cip" onClick={() => void komutCalistir(m)}>{m}</button>)}</div>
    </div>);
  if (s.tur === 'emir') return <PlanKarti kart={s.ek} emir={s.yorum.emir} esdeger={s.yorum.esdeger} kapat={kapat} />;
  if (s.tur === 'belirsiz') return (
    <div class="sonuc"><div class="sonuc-bas"><strong>Hangisini kastettiniz?</strong><button class="kapat" onClick={kapat} aria-label="Kapat">×</button></div>
      <p class="soluk">{s.neden}</p>
      <div class="cipler sar">{s.secenekler.map((y: any, i: number) => <button class="cip" onClick={() => { komutSonuc.value = { tur: 'emir', yorum: y, ek: s.ek[i] }; }}>{y.esdeger}</button>)}</div>
    </div>);
  if (s.tur === 'soru') return (
    <div class="sonuc danisman"><div class="sonuc-bas"><span class="etiket">Danışman</span><strong>{s.ek.baslik}</strong><button class="kapat" onClick={kapat} aria-label="Kapat">×</button></div>
      {s.ek.paragraflar.filter(Boolean).map((p: string) => <p>{p}</p>)}
      {s.ek.oneriler.length > 0 && <div class="cipler sar">{s.ek.oneriler.map((m: string) => <button class="cip" onClick={() => void komutCalistir(m)}>{m}</button>)}</div>}
    </div>);
  if (s.tur === 'bilgi') return <div class="sonuc"><div class="sonuc-bas"><span>{s.metin}</span><button class="kapat" onClick={kapat} aria-label="Kapat">×</button></div></div>;
  if (s.tur === 'ret') return (
    <div class="sonuc ret"><div class="sonuc-bas"><strong>Anlaşılamadı</strong><button class="kapat" onClick={kapat} aria-label="Kapat">×</button></div>
      <p>{s.neden} En yakın seçenekler:</p>
      <div class="cipler sar">{s.oneriler.map((m: string) => <button class="cip" onClick={() => { komutMetni.value = m; void komutCalistir(m); }}>{m}</button>)}</div>
    </div>);
  return null;
}

export function PlanKarti({ kart, emir, esdeger, kapat }: { kart: any; emir: any; esdeger: string; kapat: () => void }) {
  if (!kart) return null;
  return (
    <div class={`sonuc plan ${kart.gecerli ? '' : 'gecersiz'}`} role="dialog" aria-label={kart.baslik}>
      <div class="sonuc-bas"><span class="etiket">Plan</span><strong>{kart.baslik}</strong><button class="kapat" onClick={kapat} aria-label="Vazgeç">×</button></div>
      {kart.kapsam && <p class="kapsam">{kart.kapsam}</p>}
      {kart.neden && <p class="neden-red">{kart.neden}</p>}
      <div class="plan-izgara">
        {kart.bugun?.length > 0 && <div><h4>Bugün · kesin</h4><ul>{kart.bugun.map((x: string) => <li>{x}</li>)}</ul></div>}
        {kart.tahmin?.length > 0 && <div class="tahmin"><h4>30 gün · tahmin</h4><ul>{kart.tahmin.map((x: string) => <li>{x}</li>)}</ul></div>}
      </div>
      {kart.siyasi && <p class="soluk">Siyasi tepki: {kart.siyasi}</p>}
      {kart.uyari?.map((u: string) => <p class="uyari">{u}</p>)}
      <div class="plan-alt">
        <span class="esdeger">Komutu: <button class="bag" onClick={() => { komutMetni.value = esdeger; document.getElementById('komut')?.focus(); }}>{esdeger}</button></span>
        {kart.iptal && <span class="soluk">İptal: {kart.iptal}</span>}
      </div>
      <div class="plan-dugme">
        <button onClick={kapat}>Vazgeç</button>
        <button class="ana" disabled={!kart.gecerli} onClick={async () => { if (await gonder(emir)) hedefBolge.value = -1; }}>Onayla</button>
      </div>
    </div>
  );
}

function Ilerleme() {
  const p = ilerleme.value!;
  return <div class="ilerleme" role="status"><div class="cubuk" style={{ width: `${p.yuzde}%` }} /><span>{p.tarih}</span></div>;
}

export function Rapor() {
  const r = rapor.value;
  if (!r) return <p class="soluk">Henüz tur raporu yok. Zamanı ilerletin.</p>;
  const neden = { hedef: 'Süre doldu', olay: 'Önemli olay', kullanici: 'Durduruldu', hata: 'Hata' }[r.neden] ?? r.neden;
  return (
    <div class="bolumler">
      <p class="rapor-ozet"><span class="etiket">{r.gecen} gün geçti</span> <strong>{neden}</strong></p>
      {r.durmalar.length > 0 && <ul class="durmalar">{r.durmalar.map((d: any) => <li>{d.metin}</li>)}</ul>}
      {(ozet.value?.teklifler ?? []).map((t: any) => (
        <div class="teklif kutu" key={t.id}>
          <span><strong>{t.kimdenAd}</strong>: {t.ad}{t.detay ? ` — ${t.detay}` : ''}</span>
          <span class="dugmeler"><button onClick={() => onizle({ tur: 'teklifYanit', teklif: t.id, kabul: 0 })}>Reddet</button><button class="ana" onClick={() => onizle({ tur: 'teklifYanit', teklif: t.id, kabul: 1 })}>Kabul et</button></span>
        </div>
      ))}
      <ul class="telgraf">{r.olaylar.length ? r.olaylar.map((o) => <li class={o.onem >= 3 ? 'onemli' : ''}><span class="t-tarih">{o.tarih}</span> {o.metin}</li>) : <li class="soluk">Kayda değer gelişme yok.</li>}</ul>
    </div>
  );
}

function OlayModal() {
  const o = ozet.value;
  const ol = o?.olaylar?.[0];
  if (!ol || ilerliyor.value) return null;
  return (
    <div class="perde" role="dialog" aria-modal="true" aria-label={ol.baslik}>
      <article class="olay">
        <header><span class="etiket">Telgraf · {o.tarih}</span><h2>{ol.baslik}</h2></header>
        <p class="olay-metin">{ol.metin}</p>
        <div class="secenekler">
          {ol.secenekler.map((s: any, i: number) => (
            <button class="secenek" onClick={async () => { const r = await istemci.istek('submit', { tur: 'olaySec', olay: ol.id, secim: i }); if (r.sonuc?.[0]?.kabul) { tost(`Karar verildi: ${s.ad}. İlk ilerleyen günde uygulanır.`, 'iyi'); await ilerlet('gun', 1); } }}>
              <strong>{s.ad}</strong><span>{s.etki}</span>
            </button>
          ))}
        </div>
        <footer class="soluk">Yanıtsız kalırsa {ol.kalan} gün sonra danışman karar verir.</footer>
      </article>
    </div>
  );
}

function Yikildi() {
  const o = ozet.value;
  const [sec, setSec] = useState(-1);
  if (!o || o.bolgeSayisi > 0 || o.mod === 2 || ilerliyor.value) return null;
  const gec = async (oyuncu: number, mod: number) => { await istemci.istek('switch', { oyuncu, mod }); await tazele(); };
  const h = harita.value;
  const adaylar = pkg.ulkeler.map((u, i) => ({ u, i, n: (h?.bolgeler ?? []).filter((b) => b.k === i).length })).filter((x) => x.i !== o.oyuncu && !x.u.pasif && x.n > 0).sort((a, b) => b.n - a.n);
  return (
    <div class="perde" role="dialog" aria-modal="true" aria-label="Devlet yıkıldı">
      <article class="olay">
        <header><span class="etiket">Telgraf · {o.tarih}</span><h2>{o.ulke.ad} tarihe karıştı</h2></header>
        <p class="olay-metin">Son toprağınız da el değiştirdi. Oyuna başka bir devletle devam edebilir ya da dünyayı gözlemci olarak izleyebilirsiniz.</p>
        <label class="secim-satiri"><span>Devlet</span>
          <select value={sec} onChange={(e) => setSec(Number((e.target as HTMLSelectElement).value))}>
            <option value={-1}>Seçin…</option>
            {adaylar.map(({ u, i, n }) => <option value={i}>{u.ad} · {n} bölge</option>)}
          </select>
        </label>
        <div class="secenekler">
          <button class="secenek" disabled={sec < 0} onClick={() => gec(sec, o.mod)}><strong>{sec >= 0 ? `${pkg.ulkeler[sec]!.ad} ile devam et` : 'Bir devlet seçin'}</strong><span>Kalan kaynaklar ve ordu devralınır</span></button>
          <button class="secenek" onClick={() => gec(o.oyuncu, 2)}><strong>Gözlemci ol</strong><span>Bütün devletler kendini yönetir</span></button>
        </div>
      </article>
    </div>
  );
}

function Neden() {
  const n = nedenAcik.value;
  return (
    <div class="perde" onClick={(e) => { if (e.target === e.currentTarget) nedenAcik.value = null; }}>
      <article class="neden">
        <header class="sonuc-bas"><span class="etiket">Neden?</span><strong>{n.baslik}</strong><button class="kapat" onClick={() => { nedenAcik.value = null; }} aria-label="Kapat">×</button></header>
        <p class="neden-deger">{n.deger}</p>
        <table class="neden-tablo"><tbody>{n.satirlar.map((s: any) => <tr class={s.isaret > 0 ? 'iyi-yazi' : s.isaret < 0 ? 'kotu-yazi' : ''}><td>{s.ad}</td><td class="sayi">{s.deger}</td></tr>)}</tbody></table>
        {n.not && <p class="soluk">{n.not}</p>}
      </article>
    </div>
  );
}

function Tostlar() {
  return <div class="tostlar" aria-live="polite">{tostlar.value.map((t) => <div key={t.id} class={`tost ${t.tur}`}>{t.metin}</div>)}</div>;
}

export { tazele, yuzde };
