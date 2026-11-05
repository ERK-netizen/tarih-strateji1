import { useEffect, useRef, useState } from 'preact/hooks';
import { HaritaCizici, type HaritaModu } from '@ts/map';
import {
  pkg, istemci, ekran, ozet, harita, panel, haritaModu, seciliBolge, seciliBirlik, ilerliyor, ilerleme, rapor, komutSonuc, nedenAcik, tostlar,
  komutMetni, tazele, fmt, kisalt, puan, yuzde, sessiz, sonKomutlar, tost, type Panel,
} from './durum.ts';
import { komutCalistir, onizle, gonder, ilerlet, durdur } from './eylem.ts';
import { Paneller } from './Paneller.tsx';
import { Baslangic } from './Baslangic.tsx';

export function App() {
  return ekran.value === 'baslangic' ? <Baslangic /> : <Oyun />;
}

// ---------------- Oyun ekranı ----------------
function Oyun() {
  return (
    <div class="oyun">
      <HaritaKatmani />
      <UstBar />
      <SolRay />
      <ModSecici />
      {seciliBolge.value >= 0 && <BolgeKarti r={seciliBolge.value} />}
      {seciliBirlik.value.size > 0 && <BirlikSecim />}
      {panel.value && <Paneller />}
      <KomutAlani />
      {ilerleme.value && <Ilerleme />}
      {rapor.value && !ilerliyor.value && <Rapor />}
      <OlayModal />
      <Yikildi />
      {nedenAcik.value && <Neden />}
      <Tostlar />
    </div>
  );
}

let cizici: HaritaCizici | null = null;
export const haritaCizici = () => cizici;

function HaritaKatmani() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const c = new HaritaCizici(cv, pkg);
    cizici = c;
    const yatay = () => window.innerWidth > 700 && window.innerHeight < window.innerWidth;
    const sig = () => c.sigdir(yatay() ? 92 : 0, yatay() ? 44 : 80, yatay() ? 60 : 150);
    c.boyutla(); sig();
    let ilk = cv.getBoundingClientRect().width > 0;
    const ro = new ResizeObserver(() => { c.boyutla(); if (!ilk && cv.getBoundingClientRect().width > 0) { ilk = true; sig(); } });
    ro.observe(cv);
    c.onBolge = (r) => {
      const sec = seciliBirlik.value;
      if (sec.size > 0 && r !== seciliBolge.value) {
        // birlik seçiliyken bölgeye dokunmak hareket/taarruz kartı açar
        const savas: number[] = ozet.value?.savasta ?? [];
        const kontrol = harita.value?.bolgeler[r]?.k ?? -1;
        c.hedefIsaret = r; c.isaretle();
        void onizle({ tur: savas.includes(kontrol) ? 'saldir' : 'hareket', birlikler: [...sec], hedef: r });
        return;
      }
      seciliBolge.value = r; c.seciliBolge = r; c.isaretle();
    };
    c.onBirlik = (id, coklu) => {
      const s = new Set(coklu ? seciliBirlik.value : []);
      if (seciliBirlik.value.has(id) && !coklu && seciliBirlik.value.size === 1) s.delete(id); else if (s.has(id)) s.delete(id); else s.add(id);
      seciliBirlik.value = s; c.seciliBirlik = s; c.isaretle();
    };
    c.onBos = () => { seciliBolge.value = -1; c.seciliBolge = -1; c.hedefIsaret = -1; seciliBirlik.value = new Set(); c.seciliBirlik = new Set(); c.isaretle(); };
    return () => ro.disconnect();
  }, []);
  // veri değişimleri
  const h = harita.value, o = ozet.value;
  useEffect(() => {
    if (!cizici || !h) return;
    cizici.veri = h; cizici.oyuncu = o?.oyuncu ?? 0; cizici.mod = haritaModu.value;
    cizici.seciliBirlik = seciliBirlik.value;
    if (!komutSonuc.value) cizici.hedefIsaret = -1;
    cizici.isaretle();
  }, [h, o, haritaModu.value, seciliBirlik.value, komutSonuc.value]);
  useEffect(() => {
    if (!cizici || haritaModu.value !== 'iliski') return;
    void istemci.istek('query', { gorunum: 'diplomasi' }).then((d) => {
      const g: number[] = [];
      for (const u of d.veri.ulkeler) g[u.id] = u.gorusBize;
      cizici!.gorus = g; cizici!.isaretle();
    });
  }, [haritaModu.value, o?.gun]);
  return <canvas ref={ref} class="harita" aria-label="Harita: bölgeye dokunarak seçin, birliğe dokunarak birlik seçin" />;
}

function Gosterge({ ad, deger, ton, neden, alt }: { ad: string; deger: string; ton?: string; neden?: string; alt?: string }) {
  return (
    <button class={`gosterge ${ton ?? ''}`} onClick={() => neden && void istemci.istek('explain', neden).then((v) => { nedenAcik.value = v; })} title={neden ? 'Neden?' : undefined}>
      <span class="g-ad">{ad}</span>
      <span class="g-deger">{deger}</span>
      {alt && <span class="g-alt">{alt}</span>}
    </button>
  );
}

function UstBar() {
  const o = ozet.value;
  if (!o) return null;
  const P = o.oyuncu;
  const ton = (v: number, iyi: number, kotu: number) => (v >= iyi ? 'iyi' : v <= kotu ? 'kotu' : '');
  return (
    <header class="ustbar">
      <div class="kimlik">
        <span class="muhur" style={{ background: o.ulke.renk }} />
        <div class="kimlik-metin">
          <strong>{o.ulke.kisa}</strong>
          <span class="tarih">{o.tarih}{o.mod === 1 ? ' · SANDBOX' : o.mod === 2 ? ' · GÖZLEMCİ' : ''}</span>
        </div>
      </div>
      <div class="gostergeler">
        <Gosterge ad="Hazine" deger={kisalt(o.hazine)} alt={`${o.gelirDun - o.giderDun >= 0 ? '+' : ''}${kisalt(o.gelirDun - o.giderDun)}/gün`} ton={ton(o.hazineGun, 120, 30)} neden={`gelir:${P}`} />
        <Gosterge ad="Siyasi güç" deger={puan(o.pg)} neden={`pg:${P}`} />
        <Gosterge ad="Huzur" deger={puan(o.huzur)} ton={ton(o.huzur, 60_000, 35_000)} neden={`huzur:${P}`} />
        <Gosterge ad="Gıda" deger={`${o.gidaGun > 998 ? '∞' : o.gidaGun} gün`} alt={yuzde(o.gidaGuvence)} ton={ton(o.gidaGun, 60, 20)} neden={`gida:${P}`} />
        <Gosterge ad="İnsan gücü" deger={kisalt(o.insanY)} ton={ton(o.insanY, 40_000, 8000)} />
        <Gosterge ad="Destek" deger={puan(o.destek)} alt={o.savasta.length ? `yorgunluk ${puan(o.yorgunluk)}` : undefined} neden={`destek:${P}`} />
      </div>
      <Zaman />
    </header>
  );
}

function Zaman() {
  if (ilerliyor.value) return <div class="zaman"><button class="zaman-dur" onClick={durdur}>Durdur</button></div>;
  return (
    <div class="zaman" role="group" aria-label="Zamanı ilerlet">
      <button onClick={() => ilerlet('gun', 1)}>1 gün</button>
      <button onClick={() => ilerlet('hafta', 1)}>1 hafta</button>
      <button onClick={() => ilerlet('ay', 1)}>1 ay</button>
      <button class="ana" onClick={() => ilerlet('olay', 1)} title="Sonraki önemli olaya kadar">Sonraki olay ▸</button>
    </div>
  );
}

const PANELLER: [Exclude<Panel, null>, string][] = [['devlet', 'Devlet'], ['ordu', 'Ordu'], ['ekonomi', 'Ekonomi'], ['diplomasi', 'Diplomasi'], ['arastirma', 'Araştırma'], ['istatistik', 'İstatistik'], ['kronik', 'Kronik'], ['kayit', 'Kayıt']];

function SolRay() {
  const o = ozet.value;
  return (
    <nav class="solray" aria-label="Paneller">
      {PANELLER.map(([k, ad]) => (
        <button key={k} class={panel.value === k ? 'acik' : ''} onClick={() => { panel.value = panel.value === k ? null : k; }}>
          {ad}
          {k === 'diplomasi' && o?.teklifler?.length ? <span class="rozet">{o.teklifler.length}</span> : null}
        </button>
      ))}
    </nav>
  );
}

const MODLAR: [HaritaModu, string][] = [['siyasi', 'Siyasi'], ['kontrol', 'Kontrol'], ['gida', 'Gıda'], ['nufus', 'Nüfus'], ['iliski', 'İlişki'], ['altyapi', 'Altyapı']];
function ModSecici() {
  return (
    <div class="modlar" role="radiogroup" aria-label="Harita modu">
      {MODLAR.map(([k, ad]) => <button key={k} role="radio" aria-checked={haritaModu.value === k} class={haritaModu.value === k ? 'acik' : ''} onClick={() => { haritaModu.value = k; }}>{ad}</button>)}
    </div>
  );
}

function BolgeKarti({ r }: { r: number }) {
  const [v, setV] = useState<any>(null);
  const o = ozet.value;
  useEffect(() => { void istemci.istek('query', { gorunum: 'bolge', kapsam: r }).then((x) => setV(x.veri)); }, [r, o?.gun]);
  if (!v) return null;
  const P = o?.oyuncu ?? 0;
  const ulke = (c: number) => pkg.ulkeler[c]!.kisa;
  const benim = v.kontrolEden === P && v.sahip === P;
  const kapat = () => { seciliBolge.value = -1; haritaCizici()?.onBos(); };
  return (
    <aside class="bolgekarti" aria-label={`Bölge: ${v.ad}`}>
      <div class="bk-bas">
        <div>
          <h3>{v.ad}</h3>
          <span class="soluk">{v.eyalet} · {v.arazi} · {v.yerlesim}</span>
        </div>
        <button class="kapat" onClick={kapat} aria-label="Kapat">×</button>
      </div>
      <dl class="cift">
        <dt>Sahip / kontrol</dt><dd>{ulke(v.sahip)}{v.kontrolEden !== v.sahip ? ` · işgalde (${ulke(v.kontrolEden)})` : ''}</dd>
        {v.nufus !== null && <><dt>Nüfus</dt><dd>{fmt(v.nufus)}</dd></>}
        {v.kontrolEden === v.sahip ? <><dt>Kontrol</dt><dd><button class="bag" onClick={() => void istemci.istek('explain', `kontrol:${r}`).then((x) => { nedenAcik.value = x; })}>{puan(v.kontrol)} · {v.mesafe} gün</button></dd></>
          : <><dt>İtaat / direniş</dt><dd><button class="bag" onClick={() => void istemci.istek('explain', `itaat:${r}`).then((x) => { nedenAcik.value = x; })}>{puan(v.itaat)} / {puan(v.direnis)}</button></dd></>}
        <dt>Fabrika (sivil/askerî)</dt><dd>{v.sivilF} / {v.askeriF}</dd>
        <dt>Altyapı · demiryolu</dt><dd>{v.altyapi} · {v.demiryolu}</dd>
        {v.uretim !== null && <><dt>Tarım</dt><dd>{(v.uretim / 1000).toFixed(1).replace('.', ',')} birim/gün</dd></>}
        {(v.celik > 0 || v.komur > 0) && <><dt>Maden</dt><dd>{v.celik > 0 ? `çelik ${(v.celik / 1000).toFixed(1)}` : ''} {v.komur > 0 ? `kömür ${(v.komur / 1000).toFixed(1)}` : ''}</dd></>}
        {v.iddia.length > 0 && <><dt>İddia eden</dt><dd>{v.iddia.join(', ')}</dd></>}
        {v.kimlik.length > 0 && <><dt>Halk</dt><dd>{v.kimlik.slice(0, 3).map((k: any) => `${k.ad} %${v.nufus ? Math.round((k.kisi * 100) / v.nufus) : 0}`).join(' · ')}</dd></>}
        {v.cephe && <><dt>Durum</dt><dd class="kotu-yazi">Aktif cephe</dd></>}
      </dl>
      {v.projeler.length > 0 && <p class="soluk">İnşaat: {v.projeler.map((p: any) => `${p.ad} %${p.yuzde}`).join(', ')}</p>}
      <div class="bk-eylem">
        {benim && <>
          <button onClick={() => onizle({ tur: 'insa', proje: 0, bolge: r })}>Sivil fabrika</button>
          <button onClick={() => onizle({ tur: 'insa', proje: 1, bolge: r })}>Askerî fabrika</button>
          <button onClick={() => onizle({ tur: 'insa', proje: 3, bolge: r })}>Demiryolu</button>
          <button onClick={() => onizle({ tur: 'birlikKur', sablon: 0, adet: 1, bolge: r })}>Tümen kur</button>
        </>}
        {!benim && (o?.savasta ?? []).includes(v.kontrolEden) && <button class="tehlike" onClick={() => onizle({ tur: 'saldir', birlikler: (harita.value?.birimler ?? []).filter((b) => v.komsu.includes(b.bolge)).map((b) => b.id), hedef: r })}>Komşu birliklerle saldır</button>}
        <button onClick={() => onizle({ tur: 'hareket', birlikler: (harita.value?.birimler ?? []).filter((b) => v.komsu.includes(b.bolge) || b.bolge === r).map((b) => b.id), hedef: r, durus: 0 })} disabled={!(harita.value?.birimler ?? []).some((b) => v.komsu.includes(b.bolge))}>Savun</button>
      </div>
    </aside>
  );
}

function BirlikSecim() {
  const s = seciliBirlik.value;
  const b = (harita.value?.birimler ?? []).filter((x) => s.has(x.id));
  return (
    <div class="birliksecim">
      <span><strong>{b.length === 1 ? b[0]!.ad : `${b.length} birlik`}</strong> <span class="soluk">seçili · hedef bölgeye dokunun</span></span>
      <button onClick={() => onizle({ tur: 'dur', birlikler: [...s] })}>Dur</button>
      <button onClick={() => onizle({ tur: 'durus', birlikler: [...s], durus: 1 })}>Esnek savunma</button>
      <button onClick={() => { seciliBirlik.value = new Set(); haritaCizici()?.onBos(); }}>Seçimi bırak</button>
    </div>
  );
}

// ---------------- Komut alanı ----------------
function KomutAlani() {
  const ref = useRef<HTMLInputElement>(null);
  const [odak, setOdak] = useState(false);
  const s = komutSonuc.value;
  const o = ozet.value;
  const cal = (m: string) => { komutMetni.value = ''; void komutCalistir(m); };
  // boş çubukta bağlama göre üç öneri
  const oneriler = (() => {
    const out: string[] = [];
    const r = seciliBolge.value;
    if (r >= 0) {
      const ad = pkg.bolgeler[r]!.ad;
      if ((o?.savasta ?? []).includes(harita.value?.bolgeler[r]?.k ?? -1)) out.push(`${ad}'${yonelmeEki(ad)} saldır`);
      else out.push(`${ad}'${yonelmeEki(ad)} git`);
    }
    if (o?.gidaGun < 30) out.push('Her hafta 300 gıda satın al');
    if (o?.olaylar?.length) out.push('Ne yapmalıyım?');
    out.push(...['Huzur neden düşüyor?', 'Rakipler ne planlıyor?', '2 piyade tümeni kur', 'Seri üretimi araştır'].filter((x) => !out.includes(x)));
    return out.slice(0, 3);
  })();
  return (
    <div class="komut-alani">
      {s && <Sonuc s={s} />}
      <form class="komut" onSubmit={(e) => { e.preventDefault(); cal(komutMetni.value); }}>
        <label for="komut" class="gizli">Komut</label>
        <input id="komut" ref={ref} value={komutMetni.value} onInput={(e) => { komutMetni.value = (e.target as HTMLInputElement).value; }}
          onFocus={() => setOdak(true)} onBlur={() => setTimeout(() => setOdak(false), 150)} placeholder="Emir yazın: “Tunçkale'ye saldır”, “vergiyi %18 yap”, “huzur neden düşüyor?”" autocomplete="off" enterKeyHint="send" disabled={ilerliyor.value} />
        <button type="submit" class="gonder" disabled={ilerliyor.value || !komutMetni.value.trim()}>Gönder</button>
      </form>
      {!s && (
        <div class="cipler">
          {(odak && sonKomutlar.value.length ? sonKomutlar.value.slice(0, 3) : oneriler).map((m) => (
            <button key={m} class="cip" onMouseDown={(e) => e.preventDefault()} onClick={() => cal(m)}>{m}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function yonelmeEki(ad: string): string {
  const k = ad.toLocaleLowerCase('tr');
  const u = [...k].reverse().find((c) => 'aeıioöuü'.includes(c)) ?? 'e';
  const son = k.slice(-1);
  const y = 'aeıioöuü'.includes(son) ? 'y' : '';
  return y + ('aıou'.includes(u) ? 'a' : 'e');
}

function Sonuc({ s }: { s: any }) {
  const kapat = () => { komutSonuc.value = null; };
  if (s.tur === 'yardim') return (
    <div class="sonuc"><div class="sonuc-bas"><strong>Komut örnekleri</strong><button class="kapat" onClick={kapat}>×</button></div>
      <p class="soluk">Fiili sona yazın; ekleri olduğu gibi kullanabilirsiniz (saldır, saldırsın, saldıralım, saldırmalıyız). Olumsuz emir mevcut emri iptal eder (“saldırmayın”). Soru cümleleri danışmana gider.</p>
      <div class="cipler">{['1. Piyade Tümeni Sarıova\'ya gitsin', 'Kızılova ile ticaret anlaşması öner', 'Mühimmat üretimine 4 fabrika ayır', 'Savaş ekonomisine geç', 'Bilime %40 ayır', 'Hazineye 1 milyon ekle'].map((m) => <button class="cip" onClick={() => void komutCalistir(m)}>{m}</button>)}</div>
    </div>);
  if (s.tur === 'emir') return <PlanKarti kart={s.ek} emir={s.yorum.emir} esdeger={s.yorum.esdeger} kapat={kapat} />;
  if (s.tur === 'belirsiz') return (
    <div class="sonuc"><div class="sonuc-bas"><strong>Hangisini kastettiniz?</strong><button class="kapat" onClick={kapat}>×</button></div>
      <p class="soluk">{s.neden}</p>
      <div class="cipler">{s.secenekler.map((y: any, i: number) => <button class="cip" onClick={() => { komutSonuc.value = { tur: 'emir', yorum: y, ek: s.ek[i] }; }}>{y.esdeger}</button>)}</div>
    </div>);
  if (s.tur === 'soru') return (
    <div class="sonuc danisman"><div class="sonuc-bas"><span class="etiket">Danışman</span><strong>{s.ek.baslik}</strong><button class="kapat" onClick={kapat}>×</button></div>
      {s.ek.paragraflar.filter(Boolean).map((p: string) => <p>{p}</p>)}
      {s.ek.oneriler.length > 0 && <div class="cipler">{s.ek.oneriler.map((m: string) => <button class="cip" onClick={() => void komutCalistir(m)}>{m}</button>)}</div>}
    </div>);
  if (s.tur === 'bilgi') return <div class="sonuc"><div class="sonuc-bas"><span>{s.metin}</span><button class="kapat" onClick={kapat}>×</button></div></div>;
  if (s.tur === 'ret') return (
    <div class="sonuc ret"><div class="sonuc-bas"><strong>Anlaşılamadı</strong><button class="kapat" onClick={kapat}>×</button></div>
      <p>{s.neden} En yakın seçenekler:</p>
      <div class="cipler">{s.oneriler.map((m: string) => <button class="cip" onClick={() => { komutMetni.value = m; void komutCalistir(m); }}>{m}</button>)}</div>
    </div>);
  return null;
}

export function PlanKarti({ kart, emir, esdeger, kapat }: { kart: any; emir: any; esdeger: string; kapat: () => void }) {
  if (!kart) return null;
  return (
    <div class={`sonuc plan ${kart.gecerli ? '' : 'gecersiz'}`} role="dialog" aria-label={kart.baslik}>
      <div class="sonuc-bas"><span class="etiket">Plan kartı</span><strong>{kart.baslik}</strong><button class="kapat" onClick={kapat} aria-label="Vazgeç">×</button></div>
      {kart.kapsam && <p class="kapsam">{kart.kapsam}</p>}
      {kart.neden && <p class="neden-red">{kart.neden}</p>}
      <div class="plan-izgara">
        {kart.bugun?.length > 0 && <div><h4>Bugün · kesin</h4><ul>{kart.bugun.map((x: string) => <li>{x}</li>)}</ul></div>}
        {kart.tahmin?.length > 0 && <div class="tahmin"><h4>30 gün · tahmin</h4><ul>{kart.tahmin.map((x: string) => <li>{x}</li>)}</ul></div>}
      </div>
      {kart.siyasi && <p class="soluk">Siyasi tepki: {kart.siyasi}</p>}
      {kart.uyari?.map((u: string) => <p class="uyari">{u}</p>)}
      <div class="plan-alt">
        <span class="esdeger">Bu eylemin komutu: <button class="bag" onClick={() => { komutMetni.value = esdeger; document.getElementById('komut')?.focus(); }}>{esdeger}</button></span>
        <span class="soluk">İptal: {kart.iptal}</span>
      </div>
      <div class="plan-dugme">
        <button onClick={kapat}>Vazgeç</button>
        <button class="ana" disabled={!kart.gecerli} onClick={() => void gonder(emir)}>Onayla</button>
      </div>
    </div>
  );
}

function Ilerleme() {
  const p = ilerleme.value!;
  return <div class="ilerleme" role="status"><div class="cubuk" style={{ width: `${p.yuzde}%` }} /><span>{p.tarih}</span></div>;
}

function Rapor() {
  const r = rapor.value!;
  const neden = { hedef: 'Süre doldu', olay: 'Önemli olay', kullanici: 'Durduruldu', hata: 'Hata' }[r.neden] ?? r.neden;
  return (
    <aside class="rapor" aria-label="Tur raporu">
      <div class="sonuc-bas"><span class="etiket">Tur raporu · {r.gecen} gün</span><strong>{neden}</strong><button class="kapat" onClick={() => { rapor.value = null; }}>×</button></div>
      {r.durmalar.length > 0 && <ul class="durmalar">{r.durmalar.map((d: any) => <li>{d.metin}</li>)}</ul>}
      {(ozet.value?.teklifler ?? []).map((t: any) => (
        <div class="teklif rapor-teklif" key={t.id}>
          <span><strong>{t.kimdenAd}</strong>: {t.ad}{t.detay ? ` — ${t.detay}` : ''}</span>
          <span class="dugmeler"><button onClick={() => onizle({ tur: 'teklifYanit', teklif: t.id, kabul: 0 })}>Reddet</button><button class="ana" onClick={() => onizle({ tur: 'teklifYanit', teklif: t.id, kabul: 1 })}>Kabul et</button></span>
        </div>
      ))}
      <ul class="telgraf">{r.olaylar.length ? r.olaylar.map((o) => <li class={o.onem >= 3 ? 'onemli' : ''}><span class="t-tarih">{o.tarih}</span> {o.metin}</li>) : <li class="soluk">Kayda değer gelişme yok.</li>}</ul>
    </aside>
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
  if (!o || o.bolgeSayisi > 0 || o.mod === 2 || ilerliyor.value) return null;
  const gec = async (oyuncu: number, mod: number) => { await istemci.istek('switch', { oyuncu, mod }); await tazele(); };
  return (
    <div class="perde" role="dialog" aria-modal="true" aria-label="Devlet yıkıldı">
      <article class="olay">
        <header><span class="etiket">Telgraf · {o.tarih}</span><h2>{o.ulke.ad} tarihe karıştı</h2></header>
        <p class="olay-metin">Son toprağınız da el değiştirdi. Oyuna başka bir devletle devam edebilir ya da dünyayı gözlemci olarak izleyebilirsiniz.</p>
        <div class="secenekler">
          {pkg.ulkeler.map((u, i) => (i !== o.oyuncu ? <button class="secenek" onClick={() => gec(i, o.mod)}><strong>{u.ad} ile devam et</strong><span>Kalan kaynaklar ve ordu devralınır</span></button> : null))}
          <button class="secenek" onClick={() => gec(o.oyuncu, 2)}><strong>Gözlemci ol</strong><span>Dört devlet kendini yönetir</span></button>
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
        <header class="sonuc-bas"><span class="etiket">Neden?</span><strong>{n.baslik}</strong><button class="kapat" onClick={() => { nedenAcik.value = null; }}>×</button></header>
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

export { tazele, sessiz };
