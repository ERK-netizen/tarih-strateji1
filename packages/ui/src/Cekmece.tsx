// Sağ çekmece: aynı anda tek pencere. Panel, bölge ayrıntısı ya da tur raporu burada açılır; hiçbiri üst üste binmez.
import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  pkg, istemci, cekmece, ozet, harita, seciliBirlik, panelSurum, fmt, kisalt, puan, nedenAcik, bolgeSecimi, konuslanma, panelAc, buyukHarf,
} from './durum.ts';
import { onizle } from './eylem.ts';
import { Paneller, BASLIK } from './Paneller.tsx';
import { PANELLER, Rapor } from './App.tsx';
import { Simge, BirlikPulu } from './Simge.tsx';

export function Cekmece() {
  const c = cekmece.value!;
  const kapat = () => { cekmece.value = null; };
  let baslik = '', simge = 'scroll-unfurled';
  if (c.tur === 'panel') { baslik = BASLIK[c.panel]; simge = PANELLER.find(([k]) => k === c.panel)?.[2] ?? simge; }
  else if (c.tur === 'rapor') { baslik = 'Tur raporu'; simge = 'hourglass'; }
  return (
    <aside class={`cekmece cekmece-${c.tur}`} aria-label={baslik || 'Bölge'}>
      {c.tur !== 'bolge' && (
        <header class="cekmece-bas">
          <Simge ad={simge} boy={22} class="vurgu-yazi" />
          <h2>{baslik}</h2>
          <button class="kapat" onClick={kapat} aria-label="Kapat">×</button>
        </header>
      )}
      <div class="cekmece-govde">
        {c.tur === 'panel' && <Paneller p={c.panel} />}
        {c.tur === 'rapor' && <Rapor />}
        {c.tur === 'bolge' && <BolgeCekmece key={c.r} r={c.r} kapat={kapat} />}
      </div>
    </aside>
  );
}

// ---------------- Bölge ----------------
function BolgeCekmece({ r, kapat }: { r: number; kapat: () => void }) {
  const [v, setV] = useState<any>(null);
  const o = ozet.value;
  const ps = panelSurum.value;
  useEffect(() => { void istemci.istek('query', { gorunum: 'bolge', kapsam: r }).then((x) => setV(x.veri)); }, [r, o?.gun, ps]);
  if (!v || !o) return <p class="soluk">Yükleniyor…</p>;
  const P = o.oyuncu;
  const d = o.donem;
  const benim = v.kontrolEden === P;
  const tamBenim = benim && v.sahip === P;
  const savasta = (o.savasta ?? []).includes(v.kontrolEden);
  const neden = (k: string) => void istemci.istek('explain', k).then((x) => { nedenAcik.value = x; });
  return (
    <div class="bolge">
      <header class="bolge-bas">
        <span class="muhur buyuk" style={{ background: v.kontrolRenk }} />
        <div class="bolge-ad">
          <h2>{v.baskent >= 0 && <span class="baskent-isaret" title="Başkent">★ </span>}{v.ad}</h2>
          <span class="soluk">{v.kontrolAd}{v.kontrolEden !== v.sahip ? ` işgalinde · asıl sahibi ${v.sahipAd}` : ''}</span>
          <span class="soluk kucuk">{v.arazi} · {v.yerlesim}{v.eyalet && v.eyalet !== v.ad ? ` · ${v.eyalet}` : ''}{v.cephe ? ' · ' : ''}{v.cephe && <b class="kotu-yazi">aktif cephe</b>}</span>
        </div>
        <button class="kapat" onClick={kapat} aria-label="Kapat">×</button>
      </header>

      <BirlikBolumu v={v} />

      <section class="bolum">
        <h3>Bölge</h3>
        <dl class="cift">
          {v.nufus !== null && <><dt>Nüfus</dt><dd>{fmt(v.nufus)}</dd></>}
          {v.kontrolEden === v.sahip ? <><dt>Kontrol</dt><dd><button class="bag" onClick={() => neden(`kontrol:${r}`)}>{puan(v.kontrol)} · başkente {v.mesafe} gün</button></dd></>
            : <><dt>İtaat / direniş</dt><dd><button class="bag" onClick={() => neden(`itaat:${r}`)}>{puan(v.itaat)} / {puan(v.direnis)}</button></dd></>}
          <dt>{buyukHarf(d.terim.sivilF)} / {d.terim.askeriF}</dt><dd>{v.sivilF} / {v.askeriF}</dd>
          <dt>Altyapı · {d.terim.demiryolu}</dt><dd>{v.altyapi} · {v.demiryolu}</dd>
          {v.uretim !== null && <><dt>Tarım</dt><dd>{(v.uretim / 1000).toFixed(1).replace('.', ',')} birim/gün</dd></>}
          {(v.celik > 0 || v.komur > 0) && <><dt>Maden</dt><dd>{v.celik > 0 ? `${d.mallar[1].ad.toLocaleLowerCase('tr')} ${(v.celik / 1000).toFixed(1)}` : ''} {v.komur > 0 ? `${d.mallar[2].ad.toLocaleLowerCase('tr')} ${(v.komur / 1000).toFixed(1)}` : ''}</dd></>}
          {v.vergi !== null && <><dt>Vergi</dt><dd>{fmt(v.vergi)}/gün</dd></>}
          {v.iddia.length > 0 && <><dt>Hak iddiası</dt><dd>{v.iddia.join(', ')}</dd></>}
          {v.kimlik.length > 0 && <><dt>Halk</dt><dd>{v.kimlik.slice(0, 3).map((k: any) => `${k.ad} %${v.nufus ? Math.round((k.kisi * 100) / v.nufus) : 0}`).join(' · ')}</dd></>}
          {v.isyan > 0 && <><dt>Durum</dt><dd class="kotu-yazi">İsyan</dd></>}
        </dl>
        {v.projeler.length > 0 && <p class="soluk">İnşaat: {v.projeler.map((p: any) => `${p.ad} %${p.yuzde}`).join(', ')}</p>}
      </section>

      {tamBenim && <InsaBolumu r={r} />}
      {benim && <KurBolumu r={r} />}

      {!benim && (
        <section class="bolum">
          <div class="dugmeler sar">
            {savasta && seciliBirlik.value.size === 0 && <button class="tehlike" onClick={() => onizle({ tur: 'saldir', birlikler: (harita.value?.birimler ?? []).filter((b) => v.komsu.includes(b.bolge)).map((b) => b.id), hedef: r })} disabled={!(harita.value?.birimler ?? []).some((b) => v.komsu.includes(b.bolge))}>Komşu birliklerle saldır</button>}
            <button onClick={() => { panelAc('diplomasi'); diploOdak.ulke = v.kontrolEden; }}>{v.kontrolAd}: diplomasi</button>
          </div>
        </section>
      )}
    </div>
  );
}

/** Diplomasi paneline belirli ülkeyle açılma isteği. */
export const diploOdak = { ulke: -1 };

/** En hazır birlik önce: eğitimde olmayan, organizasyonu ve doluluğu yüksek. */
function hazirlik(b: any): number { return (b.egitim > 0 ? -1e6 : 0) + b.org * 1000 + Math.floor((b.kisi * 100) / Math.max(1, b.kisiHedef)); }

function BirlikBolumu({ v }: { v: any }) {
  const o = ozet.value;
  const d = o.donem;
  const [ayrinti, setAyrinti] = useState(false);
  const sec = seciliBirlik.value;
  const renk = o.ulke.renk;
  const gruplar = useMemo(() => {
    const m = new Map<number, any[]>();
    for (const b of v.birlikler) { const l = m.get(b.sablon) ?? []; l.push(b); m.set(b.sablon, l); }
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([s, l]) => ({ s, l: [...l].sort((a, b) => hazirlik(b) - hazirlik(a)) }));
  }, [v]);
  const ayarla = (l: any[], k: number) => {
    const n = new Set(sec);
    for (const b of l) n.delete(b.id);
    for (const b of l.slice(0, Math.max(0, Math.min(l.length, k)))) n.add(b.id);
    seciliBirlik.value = n;
  };
  const buradakiSecili = v.birlikler.filter((b: any) => sec.has(b.id));
  const hepsi = v.birlikler.length > 0 && buradakiSecili.length === v.birlikler.length;
  if (!v.birlikler.length && !v.yabanci.length) return (
    <section class="bolum"><h3>Birlikler</h3><p class="soluk">Bu bölgede görünen birlik yok.</p></section>
  );
  return (
    <section class="bolum">
      {v.birlikler.length > 0 && <>
        <div class="bolum-bas">
          <h3>Birliklerimiz · {v.birlikler.length}</h3>
          <button class="kucuk-dugme" onClick={() => ayarla(v.birlikler, hepsi ? 0 : v.birlikler.length)}>{hepsi ? 'Seçimi bırak' : 'Tümünü seç'}</button>
        </div>
        <ul class="grup-liste">
          {gruplar.map(({ s, l }) => {
            const k = l.filter((b) => sec.has(b.id)).length;
            const sb = d.sablonlar[s];
            const kisi = l.reduce((t, b) => t + b.kisi, 0);
            const org = Math.round(l.reduce((t, b) => t + b.org, 0) / l.length);
            const egitim = l.filter((b) => b.egitim > 0).length;
            return (
              <li key={s} class={`grup ${k > 0 ? 'secili' : ''}`}>
                <BirlikPulu simge={sb?.simge ?? d.simge.piyade} renk={renk} boy={38} />
                <div class="grup-metin">
                  <strong>{sb?.ad ?? 'Birlik'}</strong>
                  <span class="soluk kucuk">{l.length} birlik · {kisalt(kisi)} kişi · org. %{org}{egitim ? ` · ${egitim} eğitimde` : ''}</span>
                </div>
                <div class="adim" role="group" aria-label={`${sb?.ad} seçimi`}>
                  <button onClick={() => ayarla(l, k - 1)} disabled={k === 0} aria-label="Bir azalt">−</button>
                  <output aria-live="polite"><b>{k}</b>/{l.length}</output>
                  <button onClick={() => ayarla(l, k + 1)} disabled={k === l.length} aria-label="Bir artır">+</button>
                </div>
              </li>
            );
          })}
        </ul>
        {buradakiSecili.length > 0 ? (
          <div class="secim-ozet">
            <p><strong>{buradakiSecili.length} birlik seçili.</strong> <span class="soluk">Haritada hedef bölgeye dokunun.</span></p>
            <div class="dugmeler sar">
              <button onClick={() => onizle({ tur: 'durus', birlikler: buradakiSecili.map((b: any) => b.id), durus: 0 })}>Hattı tut</button>
              <button onClick={() => onizle({ tur: 'durus', birlikler: buradakiSecili.map((b: any) => b.id), durus: 1 })}>Esnek savunma</button>
              <button onClick={() => onizle({ tur: 'dur', birlikler: buradakiSecili.map((b: any) => b.id) })}>Dur</button>
              <button class="tehlike" onClick={() => onizle({ tur: 'terhis', birlikler: buradakiSecili.map((b: any) => b.id) })}>Terhis</button>
            </div>
          </div>
        ) : <p class="soluk kucuk">+ ve − ile kaç birlik göndereceğinizi seçin; sonra haritada hedefe dokunun.</p>}
        <button class="bag" onClick={() => setAyrinti(!ayrinti)}>{ayrinti ? 'Ayrıntıyı gizle' : 'Birlikleri tek tek göster'}</button>
        {ayrinti && (
          <ul class="birlik-liste">
            {gruplar.flatMap(({ l }) => l).map((b: any) => (
              <li key={b.id} class={sec.has(b.id) ? 'secili' : ''}>
                <button class="satir-dugme" aria-pressed={sec.has(b.id)} onClick={() => { const n = new Set(sec); if (n.has(b.id)) n.delete(b.id); else n.add(b.id); seciliBirlik.value = n; }}>
                  <span class={`kutucuk ${sec.has(b.id) ? 'dolu' : ''}`} aria-hidden="true" />
                  <span class="bl-ad"><strong>{b.ad}</strong><span class="soluk kucuk">{b.egitim ? `eğitimde ${b.egitim} gün` : b.muharebe ? 'muharebede' : b.hedefAd ? `→ ${b.hedefAd}` : b.durus}</span></span>
                  <span class="sayi kucuk">{fmt(b.kisi)}<span class="soluk">/{kisalt(b.kisiHedef)}</span></span>
                  <OrgBar v={b.org / 100} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </>}
      {v.yabanci.length > 0 && <>
        <h3>Yabancı birlikler</h3>
        <ul class="grup-liste">
          {v.yabanci.map((f: any) => (
            <li key={f.ulke} class="grup">
              <BirlikPulu simge={d.simge.piyade} renk={f.renk} boy={34} adet={f.birlik} />
              <div class="grup-metin">
                <strong>{f.ad}</strong>
                <span class="soluk kucuk">{f.birlik} birlik · {f.kesin ? `${kisalt(f.kisiAlt)} kişi` : `${kisalt(f.kisiAlt)}–${kisalt(f.kisiUst)} kişi`} · güç {f.kesin ? f.gucAlt : `${f.gucAlt}–${f.gucUst}`}</span>
              </div>
            </li>
          ))}
        </ul>
      </>}
    </section>
  );
}

export function OrgBar({ v }: { v: number }) {
  const c = v > 0.6 ? 'iyi' : v > 0.3 ? 'orta' : 'kotu';
  return <span class={`mini-bar ${c}`} title={`%${Math.round(v * 100)}`}><span style={{ width: `${Math.max(0, Math.min(100, v * 100))}%` }} /></span>;
}

function InsaBolumu({ r }: { r: number }) {
  const d = ozet.value.donem;
  const simge = ['factory', 'anvil', 'wheat', 'railway', 'road', 'castle'];
  return (
    <section class="bolum">
      <h3>İnşa et</h3>
      <div class="izgara-dugme">
        {d.projeler.map((p: any, i: number) => (
          <button key={i} onClick={() => onizle({ tur: 'insa', proje: i, bolge: r })}><Simge ad={simge[i] ?? 'anvil'} boy={20} /><span>{p.ad}</span></button>
        ))}
      </div>
    </section>
  );
}

function KurBolumu({ r }: { r: number }) {
  const o = ozet.value;
  const d = o.donem;
  const [sab, setSab] = useState(0);
  const [adet, setAdet] = useState(1);
  return (
    <section class="bolum">
      <h3>Burada birlik kur</h3>
      <SablonSecici sab={sab} setSab={setSab} />
      <div class="satir-ayar">
        <span>Adet</span>
        <div class="adim"><button onClick={() => setAdet(Math.max(1, adet - 1))} aria-label="Azalt">−</button><output><b>{adet}</b></output><button onClick={() => setAdet(Math.min(10, adet + 1))} aria-label="Artır">+</button></div>
        <button class="ana" onClick={() => { konuslanma.value = r; void onizle({ tur: 'birlikKur', sablon: sab, adet, bolge: r }); }}>Önizle</button>
      </div>
      <p class="soluk kucuk">{adet} × {d.sablonlar[sab].ad}: {fmt(d.sablonlar[sab].ihtiyac * adet)} kişi · erişilebilir insan gücü {fmt(o.insanY)}</p>
    </section>
  );
}

export function SablonSecici({ sab, setSab }: { sab: number; setSab: (i: number) => void }) {
  const o = ozet.value;
  const d = o.donem;
  return (
    <div class="sablon-sec" role="radiogroup" aria-label="Birlik türü">
      {d.sablonlar.map((s: any) => (
        <button key={s.i} role="radio" aria-checked={sab === s.i} class={sab === s.i ? 'acik' : ''} onClick={() => setSab(s.i)}>
          <BirlikPulu simge={s.simge} renk={o.ulke.renk} boy={30} />
          <span>{s.ad}</span>
        </button>
      ))}
    </div>
  );
}

/** Konuşlanma seçici: kendi bölgelerimiz (başkent önce, sonra nüfusa göre) ve haritadan seçme. */
export function KonuslanmaSecici() {
  const o = ozet.value;
  const h = harita.value;
  const P = o.oyuncu;
  const liste = useMemo(() => (h?.bolgeler ?? []).map((b, i) => ({ b, i })).filter(({ b }) => b.k === P)
    .sort((a, b) => (b.i === o.baskent ? 1 : 0) - (a.i === o.baskent ? 1 : 0) || b.b.nufus - a.b.nufus), [h, P]);
  const secili = konuslanma.value >= 0 && h?.bolgeler[konuslanma.value]?.k === P ? konuslanma.value : (o.baskent >= 0 && h?.bolgeler[o.baskent]?.k === P ? o.baskent : liste[0]?.i ?? -1);
  return (
    <div class="satir-ayar">
      <label for="konus">Konuşlanma</label>
      <select id="konus" value={secili} onChange={(e) => { konuslanma.value = Number((e.target as HTMLSelectElement).value); }}>
        {liste.map(({ b, i }) => <option key={i} value={i}>{i === o.baskent ? '★ ' : ''}{pkg.bolgeler[i]!.ad} · {kisalt(b.nufus)}</option>)}
      </select>
      <button onClick={() => {
        const geri = cekmece.value;
        cekmece.value = null;
        bolgeSecimi.value = {
          baslik: 'Yeni birliklerin konuşlanacağı şehre dokunun',
          uygun: (r) => harita.value?.bolgeler[r]?.k === P,
          sec: (r) => { konuslanma.value = r; cekmece.value = geri; },
        };
      }}><Simge ad="flag-objective" boy={16} /> Haritadan seç</button>
    </div>
  );
}
export function konuslanmaBolgesi(): number {
  const o = ozet.value, h = harita.value;
  const P = o?.oyuncu ?? 0;
  if (konuslanma.value >= 0 && h?.bolgeler[konuslanma.value]?.k === P) return konuslanma.value;
  if (o?.baskent >= 0 && h?.bolgeler[o.baskent]?.k === P) return o.baskent;
  return (h?.bolgeler ?? []).findIndex((b) => b.k === P);
}
