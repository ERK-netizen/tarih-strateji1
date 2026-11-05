import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  pkg, istemci, ozet, panelSurum, fmt, kisalt, puan, yuzde, nedenAcik, tost, sessiz, sessizDegis, taninmayan, ekran, seciliBirlik, harita, cekmece,
  oyunAc, SENARYOLAR, buyukHarf, type Panel,
} from './durum.ts';
import { onizle, komutCalistir } from './eylem.ts';
import { bolgeyeGit } from './App.tsx';
import { SablonSecici, KonuslanmaSecici, konuslanmaBolgesi, OrgBar, diploOdak } from './Cekmece.tsx';
import { BirlikPulu, Simge } from './Simge.tsx';

export const BASLIK: Record<Panel, string> = { devlet: 'Devlet', ordu: 'Ordu', ekonomi: 'Ekonomi', diplomasi: 'Diplomasi', arastirma: 'Araştırma', istatistik: 'Devlet istatistikleri', kronik: 'Kronik', kayit: 'Kayıt ve ayarlar' };

function useGorunum(gorunum: string, kapsam?: number, ek?: Record<string, unknown>) {
  const [v, setV] = useState<any>(null);
  const s = panelSurum.value;
  useEffect(() => { void istemci.istek('query', { gorunum, kapsam, ...ek }).then((x) => setV(x.veri)); }, [gorunum, kapsam, s, JSON.stringify(ek ?? {})]);
  return v;
}
const neden = (k: string) => void istemci.istek('explain', k).then((x) => { nedenAcik.value = x; });

export function Paneller({ p }: { p: Panel }) {
  return (
    <>
      {p === 'devlet' && <Devlet />}
      {p === 'ordu' && <Ordu />}
      {p === 'ekonomi' && <Ekonomi />}
      {p === 'diplomasi' && <Diplomasi />}
      {p === 'arastirma' && <Arastirma />}
      {p === 'istatistik' && <Istatistik />}
      {p === 'kronik' && <Kronik />}
      {p === 'kayit' && <Kayit />}
    </>
  );
}

function Adim({ deger, azalt, artir, birim }: { deger: string | number; azalt: () => void; artir: () => void; birim?: string }) {
  return <div class="adim"><button onClick={azalt} aria-label="Azalt">−</button><output><b>{deger}</b>{birim}</output><button onClick={artir} aria-label="Artır">+</button></div>;
}

// ---------- Devlet ----------
function Devlet() {
  const o = ozet.value;
  if (!o) return null;
  const P = o.oyuncu;
  const bt = ['Bilim', 'Eğitim', 'Altyapı ve tarım', 'Sosyal ve güvenlik'];
  const butceDegis = (i: number, d: number) => {
    const p = [...o.butce];
    p[i] = Math.max(0, Math.min(1_000_000, p[i] + d));
    const j = p.findIndex((x: number, k: number) => k !== i && x - d >= 0 && x - d <= 1_000_000);
    if (j < 0) return;
    p[j] -= d;
    void onizle({ tur: 'butce', paylar: p });
  };
  return (
    <div class="bolumler">
      <section>
        <div class="devlet-bas"><span class="muhur buyuk" style={{ background: o.ulke.renk }} /><div><h3>{o.ulke.ad}</h3><p class="soluk">{o.ulke.yonetim} · {o.ulke.lider}</p><p class="soluk kucuk">{o.senaryo} · {o.donem.ad}</p></div></div>
        <dl class="cift">
          <dt>Meşruiyet</dt><dd><button class="bag" onClick={() => neden(`mesru:${P}`)}>{puan(o.mesru)}</button></dd>
          <dt>Huzur</dt><dd><button class="bag" onClick={() => neden(`huzur:${P}`)}>{puan(o.huzur)}</button></dd>
          <dt>Savaşa destek</dt><dd><button class="bag" onClick={() => neden(`destek:${P}`)}>{puan(o.destek)}</button></dd>
          <dt>Yaşam düzeyi</dt><dd><button class="bag" onClick={() => neden(`yasam:${P}`)}>{puan(o.yasam)}</button></dd>
          <dt>Yönetim kapasitesi</dt><dd><button class="bag" onClick={() => neden(`kapasite:${P}`)}>Ayrıntı</button></dd>
          <dt>Bölge</dt><dd>{o.bolgeSayisi}</dd>
        </dl>
      </section>
      <section>
        <h3>Vergi ve bütçe</h3>
        <div class="satir-ayar"><span>Vergi oranı <strong>{yuzde(o.vergi)}</strong></span>
          <Adim deger="1" birim=" puan" azalt={() => onizle({ tur: 'vergi', oran: o.vergi - 10_000 })} artir={() => onizle({ tur: 'vergi', oran: o.vergi + 10_000 })} /></div>
        {bt.map((ad, i) => (
          <div class="satir-ayar" key={ad}><span class="ayar-ad">{ad} <strong>{yuzde(o.butce[i])}</strong></span>
            <span class="cubukluk"><span style={{ width: `${o.butce[i] / 10_000}%` }} /></span>
            <Adim deger="5" azalt={() => butceDegis(i, -50_000)} artir={() => butceDegis(i, 50_000)} /></div>
        ))}
        <div class="satir-ayar"><span class="ayar-ad">Politika harcaması <strong>{yuzde(o.harcamaOran)}</strong> <span class="soluk kucuk">gelir fazlasından</span></span>
          <Adim deger="10" azalt={() => onizle({ tur: 'harcama', oran: Math.max(0, o.harcamaOran - 100_000) })} artir={() => onizle({ tur: 'harcama', oran: Math.min(1_000_000, o.harcamaOran + 100_000) })} /></div>
        <div class="satir-ayar"><span class="ayar-ad">Borç <strong>{kisalt(o.borc)}</strong> <span class="soluk kucuk">limit {kisalt(o.krediLimit)} · faiz %{(o.faiz / 10_000).toFixed(1)}</span></span>
          <span class="dugmeler"><button onClick={() => onizle({ tur: 'borcAl', miktar: Math.min(o.krediLimit, 1_000_000) })} disabled={o.krediLimit <= 0}>1 mn al</button><button onClick={() => onizle({ tur: 'borcOde', miktar: o.borc })} disabled={o.borc <= 0}>Öde</button></span></div>
      </section>
      <section>
        <h3>Yasalar</h3>
        <SecimSatiri ad="Askerlik" secenek={o.ayarlar.yasa.askerlik} deger={o.askerlik} sec={(i) => onizle({ tur: 'askerlik', yasa: i })} />
        <SecimSatiri ad="Ekonomi" secenek={o.ayarlar.yasa.ekonomi} deger={o.ekonomiYasa} sec={(i) => onizle({ tur: 'ekonomi', yasa: i })} />
        <SecimSatiri ad="İşgal" secenek={o.ayarlar.yasa.isgal} deger={o.isgalPol} sec={(i) => onizle({ tur: 'isgalPol', pol: i })} />
        <SecimSatiri ad="Karne" secenek={['Yok', 'Uygula']} deger={o.karne} sec={(i) => onizle({ tur: 'karne', acik: i })} />
      </section>
      <section>
        <h3>Otomasyon</h3>
        <SecimSatiri ad="Cephe yönetimi" secenek={['Kapalı', 'Açık']} deger={o.otoCephe} sec={(i) => onizle({ tur: 'otoCephe', acik: i })} />
        <SecimSatiri ad="Takviye" secenek={['Kapalı', 'Açık']} deger={o.otoTakviye} sec={(i) => onizle({ tur: 'otoTakviye', acik: i })} />
        <SecimSatiri ad="Gıda alımı" secenek={['Kapalı', 'Açık']} deger={o.kaliciGida} sec={(i) => onizle({ tur: 'kaliciGida', acik: i })} />
      </section>
      {o.mod === 1 && <Sandbox />}
    </div>
  );
}

function SecimSatiri({ ad, secenek, deger, sec }: { ad: string; secenek: string[]; deger: number; sec: (i: number) => void }) {
  return (
    <div class="secim-satiri"><span>{ad}</span>
      <div class="segment">{secenek.map((s, i) => <button key={s} class={i === deger ? 'acik' : ''} aria-pressed={i === deger} onClick={() => i !== deger && sec(i)}>{s}</button>)}</div>
    </div>
  );
}

/** Etkin devletler (pasif boy ve beylikler hariç), seçilebilir liste için. */
function ulkeSecenekleri(oncelik: number) {
  return pkg.ulkeler.map((u, i) => ({ u, i })).filter(({ u, i }) => !u.pasif || i === oncelik)
    .sort((a, b) => (b.i === oncelik ? 1 : 0) - (a.i === oncelik ? 1 : 0) || a.u.ad.localeCompare(b.u.ad, 'tr'));
}
function UlkeSec({ deger, sec, id }: { deger: number; sec: (i: number) => void; id: string }) {
  const P = ozet.value?.oyuncu ?? 0;
  const l = useMemo(() => ulkeSecenekleri(P), [P]);
  return (
    <select id={id} value={deger} onChange={(e) => sec(Number((e.target as HTMLSelectElement).value))}>
      {l.map(({ u, i }) => <option key={i} value={i}>{u.ad}{i === P ? ' (siz)' : ''}</option>)}
    </select>
  );
}

function Sandbox() {
  const [ulke, setUlke] = useState(ozet.value?.oyuncu ?? 0);
  const d = ozet.value.donem;
  const alanlar: [string, string, number][] = [['hazine', 'Hazine', 1_000_000], ['gida', 'Gıda', 1000], ['muhimmat', buyukHarf(d.terim.muhimmat), 200], ['celik', d.mallar[1].ad, 100], ['pg', 'Siyasi güç', 50], ['huzur', 'Huzur', 10], ['insan', 'İnsan gücü', 20_000], ['ekip0', d.ekipman[0].ad, 1000]];
  return (
    <section class="sandbox">
      <h3>Sandbox</h3>
      <div class="satir-ayar"><label for="sb-ulke">Devlet</label><UlkeSec id="sb-ulke" deger={ulke} sec={setUlke} /></div>
      {alanlar.map(([k, ad, m]) => (
        <div class="satir-ayar" key={k}><span>{ad}</span><span class="dugmeler">
          <button onClick={() => onizle({ tur: 'sandbox', alan: k, miktar: -m, hedefUlke: ulke })}>−{kisalt(m)}</button>
          <button onClick={() => onizle({ tur: 'sandbox', alan: k, miktar: m, hedefUlke: ulke })}>+{kisalt(m)}</button></span></div>
      ))}
    </section>
  );
}

// ---------- Ordu ----------
function Ordu() {
  const b = useGorunum('birlik');
  const o = ozet.value;
  const [sab, setSab] = useState(0);
  const [adet, setAdet] = useState(1);
  if (!b || !o) return null;
  const d = o.donem;
  const sec = seciliBirlik.value;
  const tikla = (id: number) => { const s = new Set(sec); if (s.has(id)) s.delete(id); else s.add(id); seciliBirlik.value = s; };
  const yerler = new Map<number, any[]>();
  for (const x of b) { const l = yerler.get(x.bolge) ?? []; l.push(x); yerler.set(x.bolge, l); }
  const sirali = [...yerler.entries()].sort((a, c) => c[1].length - a[1].length);
  const hedef = konuslanmaBolgesi();
  const sb = d.sablonlar[sab];
  return (
    <div class="bolumler">
      <section>
        <h3>Birlik kur</h3>
        <SablonSecici sab={sab} setSab={setSab} />
        <div class="satir-ayar"><span>Adet</span><Adim deger={adet} azalt={() => setAdet(Math.max(1, adet - 1))} artir={() => setAdet(Math.min(10, adet + 1))} /></div>
        <KonuslanmaSecici />
        <div class="satir-ayar">
          <span class="soluk kucuk">{adet} × {sb.ad}: {fmt(sb.ihtiyac * adet)} kişi · erişilebilir {fmt(o.insanY)} · eğitimli yedek {fmt(o.insan.E)}</span>
          <button class="ana" disabled={hedef < 0} onClick={() => onizle({ tur: 'birlikKur', sablon: sab, adet, bolge: hedef })}>Önizle</button>
        </div>
      </section>
      <section>
        <div class="bolum-bas"><h3>Birlikler · {b.length}</h3>{sec.size > 0 && <button class="kucuk-dugme" onClick={() => { seciliBirlik.value = new Set(); }}>Seçimi bırak ({sec.size})</button>}</div>
        {sec.size > 0 && <div class="dugmeler sar">
          <span class="soluk kucuk">{sec.size} seçili — haritada hedefe dokunun</span>
          <button onClick={() => onizle({ tur: 'durus', birlikler: [...sec], durus: 0 })}>Hattı tut</button><button onClick={() => onizle({ tur: 'durus', birlikler: [...sec], durus: 1 })}>Esnek</button><button class="tehlike" onClick={() => onizle({ tur: 'terhis', birlikler: [...sec] })}>Terhis</button></div>}
        {sirali.map(([r, l]) => {
          const hepsi = l.every((x) => sec.has(x.id));
          return (
            <div class="ordu-yer" key={r}>
              <div class="ordu-yer-bas">
                <button class="bag" onClick={() => { bolgeyeGit(r); cekmece.value = { tur: 'bolge', r }; }}>{pkg.bolgeler[r]!.ad}</button>
                <span class="soluk kucuk">{l.length} birlik · {kisalt(l.reduce((t, x) => t + x.kisi, 0))} kişi</span>
                <button class="kucuk-dugme" onClick={() => { const s = new Set(sec); for (const x of l) { if (hepsi) s.delete(x.id); else s.add(x.id); } seciliBirlik.value = s; }}>{hepsi ? 'Bırak' : 'Hepsini seç'}</button>
              </div>
              <ul class="birlik-liste">
                {l.map((x: any) => {
                  const s = d.sablonlar.find((y: any) => y.ad === x.sablon) ?? d.sablonlar[0];
                  return (
                    <li key={x.id} class={sec.has(x.id) ? 'secili' : ''}>
                      <button class="satir-dugme" aria-pressed={sec.has(x.id)} onClick={() => tikla(x.id)}>
                        <BirlikPulu simge={s.simge} renk={o.ulke.renk} boy={26} />
                        <span class="bl-ad"><strong>{x.ad}</strong><span class="soluk kucuk">{x.egitim ? `eğitimde ${x.egitim} gün` : x.muharebe ? 'muharebede' : x.hedefAd ? `→ ${x.hedefAd}` : x.durus}</span></span>
                        <span class="sayi kucuk">{fmt(x.kisi)}<span class="soluk">/{kisalt(x.kisiHedef)}</span><br /><span class="soluk">ikmal {yuzde(Math.min(x.ikmalGida, x.ikmalMuh))}</span></span>
                        <OrgBar v={x.org / Math.max(1, x.orgMax)} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        {!b.length && <p class="soluk">Ordunuz yok. Yukarıdan birlik kurun.</p>}
      </section>
    </div>
  );
}

// ---------- Ekonomi ----------
const MAL_SIMGE = ['wheat', 'anvil', 'factory', 'crossed-swords'];
function Ekonomi() {
  const e = useGorunum('ekonomi');
  const o = ozet.value;
  const [mal, setMal] = useState(0);
  const [miktar, setMiktar] = useState(100);
  const [kalici, setKalici] = useState(0);
  if (!e || !o) return null;
  const d = o.donem;
  const hat = (urun: number) => e.hatlar.find((h: any) => h.urun === urun);
  const urunler: [number, string, string][] = [...d.ekipman.map((x: any) => [x.i, x.ad, x.simge] as [number, string, string]), [100, buyukHarf(d.terim.muhimmat), 'crossed-swords']];
  const atanan = e.hatlar.reduce((s: number, h: any) => s + h.fabrika, 0);
  return (
    <div class="bolumler">
      <section>
        <h3>Askerî üretim</h3>
        <p class="soluk kucuk">Etkin {d.terim.askeriF} {(e.askeriF / 1000).toFixed(1)} · atanan {(atanan / 1000).toFixed(1)} · {d.mallar[1].ad.toLocaleLowerCase('tr')} {(e.celikDun / 1000).toFixed(1)}/gün (stok {(e.celik / 1000).toFixed(0)}) · {d.mallar[2].ad.toLocaleLowerCase('tr')} {(e.komurDun / 1000).toFixed(1)}/gün</p>
        <ul class="uretim-liste">{urunler.map(([u, ad, s]) => {
          const h = hat(u);
          const stok = u === 100 ? Math.floor(e.muhimmat / 1000) : e.ekip[u]?.stok ?? 0;
          const kilit = u !== 100 && e.ekip[u]?.kilitli;
          return (
            <li key={u} class={kilit ? 'kilit' : ''}>
              <Simge ad={s} boy={24} />
              <span class="ur-ad"><strong>{ad}</strong><span class="soluk kucuk">stok {fmt(stok)}{kilit ? ' · araştırma gerekir' : h ? ` · verim ${yuzde(h.verim)}` : ''}</span></span>
              {!kilit && <Adim deger={h ? (h.fabrika / 1000).toFixed(1).replace('.', ',') : '0'} azalt={() => h && onizle({ tur: 'uretim', urun: u, fabrika: Math.max(0, h.fabrika - 1000) })} artir={() => onizle({ tur: 'uretim', urun: u, fabrika: (h?.fabrika ?? 0) + 1000 })} />}
            </li>
          );
        })}</ul>
      </section>
      <section>
        <h3>İnşaat · {d.terim.sivilF}</h3>
        <p class="soluk kucuk">Etkin {d.terim.sivilF} {(e.sivilF / 1000).toFixed(1)} · tüketim malı yeterliliği {yuzde(e.tuketimYet)}</p>
        {e.projeler.length ? <ul class="liste">{e.projeler.map((p: any) => <li><span>{p.ad} · {p.bolge}</span><OrgBar v={p.yuzde / 100} /></li>)}</ul> : <p class="soluk">Süren proje yok. Haritada kendi bölgenize dokunup inşa edin.</p>}
      </section>
      <section>
        <h3>Dünya pazarı</h3>
        <table class="tablo"><thead><tr><th>Mal</th><th class="sayi">Fiyat</th><th class="sayi">Referans</th><th class="sayi">Hacim</th></tr></thead>
          <tbody>{e.fiyat.map((f: any) => <tr><td>{f.ad}</td><td class={`sayi ${f.fiyat > f.p0 * 1.1 ? 'kotu-yazi' : f.fiyat < f.p0 * 0.9 ? 'iyi-yazi' : ''}`}>{fmt(f.fiyat)}</td><td class="sayi soluk">{fmt(f.p0)}</td><td class="sayi">{fmt(Math.floor(f.hacim / 1000))}</td></tr>)}</tbody></table>
        <div class="segment genis">{d.mallar.map((m: any, i: number) => <button class={mal === i ? 'acik' : ''} onClick={() => setMal(i)}><Simge ad={MAL_SIMGE[i]!} boy={16} /> {m.ad}</button>)}</div>
        <div class="satir-ayar"><span>Miktar <strong>{fmt(miktar)}</strong> birim</span><span class="dugmeler"><button onClick={() => setMiktar(Math.max(10, Math.round(miktar / 2)))}>÷2</button><button onClick={() => setMiktar(miktar * 2)}>×2</button></span></div>
        <SecimSatiri ad="Sıklık" secenek={['Bir kez', 'Her hafta']} deger={kalici} sec={setKalici} />
        <div class="dugmeler"><button onClick={() => onizle({ tur: 'satinAl', mal, miktar, kalici })}>Satın al</button><button onClick={() => onizle({ tur: 'sat', mal, miktar, kalici })}>Sat</button></div>
        {e.siparis.length > 0 && <ul class="liste">{e.siparis.map((s: any) => <li><span>{s.yon}: {fmt(s.miktar)} {s.mal.toLocaleLowerCase('tr')}</span><span class="soluk">{s.kalici ? 'haftalık' : 'tek sefer'}</span></li>)}</ul>}
      </section>
      <section>
        <h3>Gelir ve gider (günlük)</h3>
        <dl class="cift">
          <dt>Vergi geliri</dt><dd><button class="bag" onClick={() => neden(`gelir:${o.oyuncu}`)}>{fmt(e.gelirDun)}</button></dd>
          <dt>Personel</dt><dd>−{fmt(e.gider.personel)}</dd><dt>Ekipman bakımı</dt><dd>−{fmt(e.gider.bakim)}</dd><dt>İdare</dt><dd>−{fmt(e.gider.idari)}</dd><dt>Borç servisi</dt><dd>−{fmt(e.gider.borc)}</dd>
          <dt>Son üç ay geliri</dt><dd>{kisalt(e.g1)} · {kisalt(e.g2)} · {kisalt(e.g3)}</dd>
        </dl>
      </section>
    </div>
  );
}

// ---------- Diplomasi ----------
type DipFiltre = 'ilgili' | 'savas' | 'komsu' | 'tumu';
function Diplomasi() {
  const d = useGorunum('diplomasi');
  const h = harita.value;
  const P = ozet.value?.oyuncu ?? 0;
  const [filtre, setFiltre] = useState<DipFiltre>('ilgili');
  const [ara, setAra] = useState('');
  const [acik, setAcik] = useState<number>(diploOdak.ulke);
  useEffect(() => { if (diploOdak.ulke >= 0) { setAcik(diploOdak.ulke); setFiltre('tumu'); diploOdak.ulke = -1; } }, []);
  const komsu = useMemo(() => {
    const s = new Set<number>();
    if (!h) return s;
    h.bolgeler.forEach((b, r) => { if (b.k === P) for (const q of pkg.bolgeler[r]!.komsu) { const k = h.bolgeler[q]!.k; if (k !== P) s.add(k); } });
    return s;
  }, [h, P]);
  const bolgeSay = useMemo(() => { const n: number[] = []; for (const b of h?.bolgeler ?? []) n[b.k] = (n[b.k] ?? 0) + 1; return n; }, [h]);
  if (!d) return <p class="soluk">Yükleniyor…</p>;
  const q = ara.trim().toLocaleLowerCase('tr');
  const liste = d.ulkeler.filter((u: any) => (bolgeSay[u.id] ?? 0) > 0 || u.savasta || u.anlasmalar.length)
    .filter((u: any) => {
      if (q) return u.ad.toLocaleLowerCase('tr').includes(q) || u.kisa.toLocaleLowerCase('tr').includes(q) || u.lider.toLocaleLowerCase('tr').includes(q);
      if (filtre === 'savas') return u.savasta;
      if (filtre === 'komsu') return komsu.has(u.id);
      if (filtre === 'ilgili') return u.savasta || u.anlasmalar.length > 0 || komsu.has(u.id) || u.gerekceBize || u.id === acik || (!pkg.ulkeler[u.id]!.pasif && (bolgeSay[u.id] ?? 0) >= 8);
      return true;
    })
    .sort((a: any, b: any) => (b.savasta ? 2 : 0) + (komsu.has(b.id) ? 1 : 0) - ((a.savasta ? 2 : 0) + (komsu.has(a.id) ? 1 : 0)) || (bolgeSay[b.id] ?? 0) - (bolgeSay[a.id] ?? 0));
  const tehdit = (p: number) => (p >= 60_000 ? ['Yüksek', 'kotu'] : p >= 30_000 ? ['Orta', 'orta'] : ['Düşük', 'iyi']);
  return (
    <div class="bolumler">
      {d.gelen.length > 0 && (
        <section class="vurgulu">
          <h3>Gelen teklifler</h3>
          {d.gelen.map((t: any) => (
            <div class="teklif" key={t.id}>
              <span><strong>{t.kimdenAd}</strong>: {t.ad}{t.detay ? ` — ${t.detay}` : ''}</span>
              <span class="dugmeler"><button onClick={() => onizle({ tur: 'teklifYanit', teklif: t.id, kabul: 0 })}>Reddet</button><button class="ana" onClick={() => onizle({ tur: 'teklifYanit', teklif: t.id, kabul: 1 })}>Kabul et</button></span>
            </div>
          ))}
        </section>
      )}
      <section>
        <input class="ara" type="search" value={ara} placeholder="Devlet ya da lider ara…" onInput={(e) => setAra((e.target as HTMLInputElement).value)} aria-label="Devlet ara" />
        <div class="segment genis" role="radiogroup" aria-label="Süzgeç">
          {([['ilgili', 'İlgili'], ['savas', 'Savaşta'], ['komsu', 'Komşular'], ['tumu', 'Tümü']] as [DipFiltre, string][]).map(([k, a]) => <button role="radio" aria-checked={filtre === k} class={filtre === k ? 'acik' : ''} onClick={() => setFiltre(k)}>{a}</button>)}
        </div>
        <ul class="dip-liste">
          {liste.map((u: any) => {
            const [tad, tton] = tehdit(u.tehdit);
            const ac = acik === u.id;
            return (
              <li key={u.id} class={`dip ${ac ? 'acik' : ''}`}>
                <button class="dip-satir" onClick={() => setAcik(ac ? -1 : u.id)} aria-expanded={ac}>
                  <span class="muhur" style={{ background: u.renk }} />
                  <span class="dip-ad"><strong>{u.ad}</strong><span class="soluk kucuk">{u.lider} · {bolgeSay[u.id] ?? 0} bölge{komsu.has(u.id) ? ' · komşu' : ''}</span></span>
                  <span class="dip-durum">
                    {u.savasta ? <span class="durum-cip kotu">Savaşta</span> : u.anlasmalar.length ? <span class="durum-cip iyi">{u.anlasmalar[0]}</span> : null}
                    <span class="gorus-mini" title="Bize görüşü"><GorusBar v={u.gorusBize} /></span>
                  </span>
                </button>
                {ac && (
                  <div class="dip-ayrinti">
                    <p class="soluk kucuk">{u.yonetim} · {u.kisilik} · <span class={`durum-cip ${tton}`}>Tehdit: {tad}</span></p>
                    <div class="iki-bar">
                      <div><span class="soluk kucuk">Bize görüşü</span><GorusBar v={u.gorusBize} /></div>
                      <div><span class="soluk kucuk">Bizim görüşümüz</span><GorusBar v={u.gorusumuz} /></div>
                    </div>
                    <p class="kucuk">
                      {u.savasta ? <strong class="kotu-yazi">SAVAŞTAYIZ · skor {u.skor >= 0 ? '+' : ''}{puan(u.skor)} · barışa isteklilik %{Math.floor(u.isteklilikleri / 10_000)}</strong> : (u.anlasmalar.join(' · ') || 'Anlaşma yok')}
                      {u.gerekceBize && <span class="kotu-yazi"> · Size karşı gerekçe hazırlıyor</span>}
                      {u.gerekceBizim && <span> · Gerekçemiz {u.gerekceBizim}</span>}
                    </p>
                    <p class="soluk kucuk">Niyet işaretleri: {u.tehditBilesen.filter((b: any) => b.deger > 0).map((b: any) => b.ad.toLocaleLowerCase('tr')).join(', ') || 'yok'} · hazine {u.hazine} · ordu ≈ {Math.round(u.gucAlt / 1000)}–{Math.round(u.gucUst / 1000)} güç{u.savastaMi.length ? ` · savaşta: ${u.savastaMi.join(', ')}` : ''}{u.digerAnlasmalar.length ? ` · ${u.digerAnlasmalar.slice(0, 4).join(', ')}` : ''}</p>
                    <DipEylem u={u} P={P} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {!liste.length && <p class="soluk">Eşleşen devlet yok.</p>}
      </section>
      <p class="soluk kucuk">Eşikler: ticaret 20 · saldırmazlık 40 · geçiş, garanti ve ekipman 60 · ittifak 80 (karşı tarafın size görüşü). İzin kabul değildir.</p>
    </div>
  );
}

function DipEylem({ u, P }: { u: any; P: number }) {
  const h = harita.value;
  const [baris, setBaris] = useState<number[] | null>(null);
  const izin = (esik: number) => u.gorusBize >= esik;
  const d = ozet.value.donem;
  return (
    <>
      <div class="dugmeler sar">
        {u.savasta ? <>
          <button onClick={() => onizle({ tur: 'baris', kime: u.id, barisTur: 0, bolgeler: [] })}>Beyaz barış</button>
          <button onClick={() => setBaris((h?.bolgeler ?? []).map((b, i) => ({ b, i })).filter(({ b }) => b.s === u.id && b.k === P).map(({ i }) => i))}>Toprak iste…</button>
        </> : <>
          <button disabled={!izin(20_000)} onClick={() => onizle({ tur: 'teklif', kime: u.id, tip: 0 })}>Ticaret</button>
          <button disabled={!izin(40_000)} onClick={() => onizle({ tur: 'teklif', kime: u.id, tip: 1 })}>Saldırmazlık</button>
          <button disabled={!izin(60_000)} onClick={() => onizle({ tur: 'teklif', kime: u.id, tip: 2 })}>Geçiş hakkı</button>
          <button disabled={!izin(60_000)} onClick={() => onizle({ tur: 'teklif', kime: u.id, tip: 3 })}>Garanti ver</button>
          <button disabled={!izin(80_000)} onClick={() => onizle({ tur: 'teklif', kime: u.id, tip: 4 })}>İttifak</button>
          <button disabled={!izin(60_000)} onClick={() => onizle({ tur: 'teklif', kime: u.id, tip: 14, ekip: 0, adet: 200 })}>200 {d.ekipman[0].ad.toLocaleLowerCase('tr')} al</button>
          <button onClick={() => onizle({ tur: 'gerekce', hedef: u.id })}>Gerekçe hazırla</button>
          <button class="tehlike" onClick={() => onizle({ tur: 'savasIlan', hedef: u.id })}>Savaş ilan et</button>
        </>}
        <button onClick={() => onizle({ tur: 'tutum', kime: u.id, tutum: u.tutumumuz === 'Dostane' ? 1 : 0 })}>{u.tutumumuz === 'Dostane' ? 'Nötr tutum' : 'Dostane tutum'}</button>
        <button onClick={() => onizle({ tur: 'tutum', kime: u.id, tutum: 3 })}>Düşmanca</button>
      </div>
      {baris && (
        <div class="baris-sec">
          <p class="kucuk">İstenecek bölgeler (taviz bütçesi {u.tavizButcesi} puan):</p>
          <div class="cipler sar">{(h?.bolgeler ?? []).map((b, i) => ({ b, i })).filter(({ b }) => b.s === u.id).map(({ b, i }) => (
            <button class={`cip ${baris.includes(i) ? 'acik' : ''} ${b.k === P ? '' : 'soluk'}`} aria-pressed={baris.includes(i)} onClick={() => setBaris(baris.includes(i) ? baris.filter((x) => x !== i) : [...baris, i])}>{pkg.bolgeler[i]!.ad}</button>
          ))}</div>
          <div class="dugmeler"><button onClick={() => setBaris(null)}>Vazgeç</button><button class="ana" onClick={() => { void onizle({ tur: 'baris', kime: u.id, barisTur: 1, bolgeler: baris }); setBaris(null); }}>Önizle</button></div>
        </div>
      )}
    </>
  );
}

function GorusBar({ v }: { v: number }) {
  const p = v / 1000;
  return <span class="gorus-bar"><span class={p >= 60 ? 'iyi' : p >= 30 ? 'orta' : 'kotu'} style={{ width: `${Math.max(0, p)}%` }} /><b>{Math.round(p)}</b>{[20, 40, 60, 80].map((e) => <i style={{ left: `${e}%` }} />)}</span>;
}

// ---------- Araştırma ----------
function Arastirma() {
  const a = useGorunum('arastirma');
  if (!a) return null;
  const yuva = a.yuvalar.map((t: number) => (t >= 0 ? a.teknolojiler[t] : null));
  return (
    <div class="bolumler">
      <section>
        <h3>Araştırma yuvaları · {yuva.filter(Boolean).length}/{yuva.length}</h3>
        <p class="soluk kucuk">Günlük hız {(a.hiz / 1000).toFixed(2)} puan; her yuva bu hızla ayrı ayrı ilerler (bilim bütçesi ve eğitimle artar).</p>
        <ul class="liste">{yuva.map((t: any, i: number) => <li key={i}>{t ? <><span><Simge ad="telescope" boy={16} /> {t.ad} · {t.kalanGun} gün</span><OrgBar v={t.yuzde / 100} /></> : <span class="soluk">Boş yuva — aşağıdan bir teknoloji seçin</span>}</li>)}</ul>
        {a.sirada.length > 0 && <p class="soluk kucuk">Sırada (yarın başlar): {a.sirada.map((i: number) => a.teknolojiler[i].ad).join(', ')}</p>}
      </section>
      <section>
        <h3>Teknolojiler</h3>
        <ul class="tek-liste">{a.teknolojiler.map((t: any) => (
          <li key={t.i} class={t.bitti ? 'bitti' : !t.uygun ? 'kilit' : ''}>
            <div><strong>{t.ad}</strong> <span class="soluk">{t.yil}</span><br /><span class="kucuk">{t.etki}</span>{t.on.length > 0 && <span class="kucuk soluk"> · ön koşul: {t.on.join(', ')}</span>}</div>
            {t.bitti ? <span class="durum-cip iyi">Bitti</span> : t.arastiriliyor ? <span class="durum-cip orta">%{t.yuzde}</span> : t.sirada ? <span class="durum-cip orta">Sırada</span> : <button disabled={!t.uygun} onClick={() => onizle({ tur: 'arastir', tek: t.i })}>Araştır{t.yuzde > 0 ? ` (%${t.yuzde})` : ''}</button>}
          </li>
        ))}</ul>
      </section>
    </div>
  );
}

// ---------- İstatistik (bölüm 22) ----------
function Istatistik() {
  const [u, setU] = useState(ozet.value?.oyuncu ?? 0);
  const s = useGorunum('istatistik', u);
  return (
    <div class="bolumler">
      <div class="satir-ayar"><label for="ist-ulke">Devlet</label><UlkeSec id="ist-ulke" deger={u} sec={setU} /></div>
      {s && <>
        {!s.kesin && <p class="soluk kucuk">Yabancı devlet: değerler istihbarat aralığıyla gösterilir (istihbarat {puan(s.istihbarat)}).</p>}
        {s.seri.length > 1 && <section class="seriler">
          <Seri ad="Hazine" v={s.seri.map((x: any) => x.d[0])} />
          <Seri ad="Aylık gelir" v={s.seri.map((x: any) => x.d[1])} />
          <Seri ad="Huzur" v={s.seri.map((x: any) => x.d[2] / 1000)} />
          <Seri ad="Yorgunluk" v={s.seri.map((x: any) => x.d[4] / 1000)} kotu />
          <Seri ad="Asker" v={s.seri.map((x: any) => x.d[6])} />
          <Seri ad="Gıda güvencesi" v={s.seri.map((x: any) => x.d[7] / 10_000)} />
        </section>}
        {s.gruplar.map((g: any) => (
          <section key={g.ad}><h3>{g.ad}</h3><table class="tablo ist"><tbody>{g.satir.map(([a, b]: string[]) => <tr><td>{a}</td><td class="sayi">{b}</td></tr>)}</tbody></table></section>
        ))}
      </>}
    </div>
  );
}
function Seri({ ad, v, kotu }: { ad: string; v: number[]; kotu?: boolean }) {
  const W = 140, H = 36;
  const min = Math.min(...v), max = Math.max(...v);
  const sx = (i: number) => (i / Math.max(1, v.length - 1)) * W;
  const sy = (x: number) => H - 3 - ((x - min) / Math.max(1e-9, max - min)) * (H - 6);
  const d = v.map((x, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(x).toFixed(1)}`).join('');
  const son = v[v.length - 1] ?? 0;
  return (
    <figure class="seri">
      <figcaption><span>{ad}</span><strong>{Math.abs(son) >= 1e4 ? kisalt(son) : son.toFixed(son < 100 ? 1 : 0).replace('.', ',')}</strong></figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={`${d}L${W},${H}L0,${H}Z`} class={`alan ${kotu ? 'kotu' : ''}`} />
        <path d={d} class={`cizgi ${kotu ? 'kotu' : ''}`} />
        <circle cx={sx(v.length - 1)} cy={sy(son)} r="2.4" class={`nokta ${kotu ? 'kotu' : ''}`} />
      </svg>
    </figure>
  );
}

// ---------- Kronik ----------
function Kronik() {
  const [hepsi, setHepsi] = useState(false);
  const k = useGorunum('kronik', undefined, { hepsi });
  if (!k) return null;
  return (
    <div class="bolumler">
      <div class="segment genis"><button class={!hepsi ? 'acik' : ''} onClick={() => setHepsi(false)}>Önemli</button><button class={hepsi ? 'acik' : ''} onClick={() => setHepsi(true)}>Tümü</button></div>
      <ol class="telgraf uzun" reversed>{[...k].reverse().map((a: any, i: number) => <li key={i} class={a.onem >= 3 ? 'onemli' : ''}><span class="t-tarih">{a.tarih}</span> {a.metin}</li>)}</ol>
    </div>
  );
}

// ---------- Kayıt ----------
/** Gömülü önizleme çerçevesinde indirme bağlantıları çalışmaz; APK ve tarayıcıda gösterilir. */
const indirilebilir = (() => { try { return window.top === window || !!(window as any).Capacitor?.isNativePlatform?.(); } catch { return false; } })();
export function senaryoAdi(k: { paket?: string; senaryo?: string }): string {
  return k.senaryo ?? SENARYOLAR.find((s) => s.kimlik === k.paket)?.ad ?? (k.paket === 'fixture-1a' || !k.paket ? 'Kurgusal dünya (1A)' : k.paket);
}
function Kayit() {
  const [liste, setListe] = useState<any[]>([]);
  const [ad, setAd] = useState('');
  const yenile = () => void istemci.istek('saves', null).then(setListe);
  useEffect(yenile, []);
  const disaAktar = async () => {
    const r = await istemci.istek('exportSave', null);
    const blob = new Blob([r.bayt], { type: 'application/octet-stream' });
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        // APK: önbelleğe yaz, Android paylaşım sayfasıyla kaydet/gönder (ek izin gerekmez)
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');
        const b64 = await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] ?? ''); fr.readAsDataURL(blob); });
        const w = await Filesystem.writeFile({ path: r.ad, data: b64, directory: Directory.Cache });
        await Share.share({ title: 'Tarih Strateji kaydı', files: [w.uri] });
        return;
      }
    } catch { /* tarayıcı yolu */ }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = r.ad; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    tost(`Dışa aktarıldı: ${r.ad}`, 'iyi');
  };
  const turler: [string, string][] = [['proje', 'Proje tamamlama'], ['arastirma', 'Araştırma'], ['egitim', 'Birlik hazır'], ['teklif', 'Teklif yanıtı'], ['bolge', 'Bölge el değiştirdi'], ['isyan', 'İsyan']];
  return (
    <div class="bolumler">
      <section>
        <h3>Kaydet</h3>
        <div class="satir-ayar"><label for="kayit-ad" class="gizli">Kayıt adı</label><input id="kayit-ad" value={ad} placeholder="Yuva adı (ör. osmanli-1600)" onInput={(e) => setAd((e.target as HTMLInputElement).value)} />
          <button class="ana" onClick={async () => { await istemci.istek('save', { yuva: ad.trim() || 'manuel' }); tost('Kaydedildi.', 'iyi'); yenile(); }}>Kaydet</button></div>
        <div class="dugmeler sar">{indirilebilir && <button onClick={disaAktar}>Dosyaya aktar (.tsk)</button>}<button onClick={async () => { await istemci.istek('branch', { ad: `dal-${Date.now() % 100000}` }); tost('Yeni dal açıldı.', 'iyi'); yenile(); }}>Bu günden dal aç</button></div>
        <p class="soluk kucuk">Her tur sonunda “otomatik” yuvasına kaydedilir. Kayıtlar nesil dosyası ve A/B başlıkla yazılır; yarım kalan yazım bir önceki nesle döner.</p>
      </section>
      <section>
        <h3>Kayıtlı oyunlar</h3>
        <ul class="liste">{liste.map((k) => (
          <li key={k.yuva}><span><strong>{k.yuva}</strong> · {k.etiket}{k.sandbox ? ' · SANDBOX' : ''}<br /><span class="soluk kucuk">{senaryoAdi(k)} · nesil {k.nesil}</span></span>
            <span class="dugmeler"><button onClick={async () => { try { await oyunAc({ tur: 'kayit', yuva: k.yuva }); tost('Yüklendi.', 'iyi'); } catch (e: any) { tost(e?.ayrinti ?? String(e?.message ?? e), 'hata'); } }}>Yükle</button><button onClick={async () => { setListe(await istemci.istek('deleteSave', k.yuva)); }}>Sil</button></span></li>
        ))}</ul>
      </section>
      <section>
        <h3>Bildirimler</h3>
        <p class="soluk kucuk">Bu türler zamanı durdurmaz. Savaş ilanı, başkent tehdidi, kritik gıda ve zorunlu olaylar sessize alınamaz.</p>
        {turler.map(([k, a]) => <SecimSatiri key={k} ad={a} secenek={['Durdurur', 'Sessiz']} deger={sessiz.value.includes(k) ? 1 : 0} sec={() => sessizDegis(k)} />)}
      </section>
      <section>
        <h3>Tanınmayan komutlar · {taninmayan.value.length}</h3>
        <p class="soluk kucuk">Cihazınızda tutulur; komut kataloğunu büyütmek için dışa aktarılabilir.</p>
        <ul class="liste kucuk">{taninmayan.value.slice(0, 12).map((t) => <li><span>{t.metin}</span><span class="soluk">×{t.sayi}</span></li>)}</ul>
        <div class="dugmeler sar">{indirilebilir && <button onClick={() => { const b = new Blob([JSON.stringify(taninmayan.value, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'taninmayan-komutlar.json'; a.click(); }}>Günlüğü dışa aktar</button>}
          <button onClick={() => void komutCalistir('yardım')}>Komut örnekleri</button></div>
      </section>
      <section>
        <h3>Hakkında</h3>
        <p class="soluk kucuk">Çevrimdışı, kural tabanlı simülasyon. Harita: Natural Earth (kamu malı) ve GeoNames (CC BY 4.0). Birlik ve arayüz simgeleri: game-icons.net (Lorc, Delapouite ve diğerleri), CC BY 3.0.</p>
        <div class="dugmeler"><button class="tehlike" onClick={() => { ekran.value = 'baslangic'; cekmece.value = null; }}>Ana menüye dön</button></div>
      </section>
    </div>
  );
}
