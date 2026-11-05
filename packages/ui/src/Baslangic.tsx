// Başlangıç: 1) senaryo seçimi (beş tarihî dönem), 2) devlet seçimi (öne çıkanlar, arama, haritadan seçim) ve oyun modu.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { HaritaCizici } from '@ts/map';
import type { Paket } from '@ts/engine';
import { istemci, tost, fmt, SENARYOLAR, SIMGE, paketGetir, geoYukle, oyunAc, type SenaryoOzet } from './durum.ts';
import { senaryoAdi } from './Paneller.tsx';
import { Simge } from './Simge.tsx';

const MODLAR: [number, string, string][] = [[0, 'Normal', 'Rekabetçi oyun'], [1, 'Sandbox', 'Kaynak ekle/çıkar; kayıtta kalıcı etiket'], [2, 'Gözlemci', 'Bütün devletler kendini yönetir']];
const DONEM_SIMGE: Record<string, string> = { orta: 'swordman', barut: 'musket', buyuk: 'brodie-helmet', ikinci: 'tank', modern: 'missile-launcher' };

export function Baslangic() {
  const [senaryo, setSenaryo] = useState<SenaryoOzet | null>(null);
  const [p, setP] = useState<Paket | null>(null);
  const [kayitlar, setKayitlar] = useState<any[]>([]);
  const [bekle, setBekle] = useState(false);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const cizRef = useRef<HaritaCizici | null>(null);
  const dosya = useRef<HTMLInputElement>(null);
  const [secim, setSecim] = useState(-1);
  useEffect(() => { void istemci.istek('saves', null).then(setKayitlar).catch(() => setKayitlar([])); }, []);
  // arka plan haritası: senaryo seçilince o dönemin siyasi haritası
  useEffect(() => {
    let iptal = false;
    let ro: ResizeObserver | null = null;
    void (async () => {
      const g = await geoYukle();
      const pk = senaryo ? await paketGetir(senaryo.kimlik) : null;
      if (iptal || !cvRef.current) return;
      // senaryo seçilmeden önce yalnız kara/deniz (boş paket iskeleti)
      const base = pk ?? ({ bolgeler: [], ulkeler: [], eyaletler: [], harita: { gen: g.gen, yuk: g.yuk, deniz: [], cizgiler: [], denizAdlari: [] } } as unknown as Paket);
      cizRef.current?.kapat();
      const c = new HaritaCizici(cvRef.current, base, g, SIMGE);
      cizRef.current = c;
      if (pk) c.veri = { bolgeler: pk.bolgeler.map((b) => ({ k: b.sahip, s: b.sahip, kontrol: 80_000, itaat: 0, direnis: 0, cephe: 0, isyan: 0, guvence: 1_000_000, demiryolu: b.demiryolu, altyapi: b.altyapi, nufus: 0, fabrika: 0, uretim: 0, istihbarat: 0 })), birimler: [], yabanci: [], savaslar: (pk.savaslar ?? []).flatMap((s) => s.a.flatMap((a) => s.b.map((b) => [a, b]))), ulkeler: pk.ulkeler.map((u) => ({ kisa: u.kisa, renk: u.renk })) };
      const yerles = () => {
        c.boyutla();
        const yatay = window.innerWidth >= window.innerHeight;
        const panel = document.querySelector('.bas-panel')?.getBoundingClientRect();
        c.bosluk = yatay ? { sol: panel?.right ?? 0, ust: 0, sag: 0, alt: 0 } : { sol: 0, ust: 0, sag: 0, alt: window.innerHeight - (panel?.top ?? window.innerHeight) };
        c.sigdir();
      };
      yerles();
      if (senaryo) setP(pk);
      ro = new ResizeObserver(yerles);
      ro.observe(cvRef.current);
      c.onBolge = (r) => {
        if (!pk) return;
        const u = pk.bolgeler[r]!.sahip;
        if (u >= 0 && !pk.ulkeler[u]!.pasif) setSecim(u);
      };
    })();
    return () => { iptal = true; ro?.disconnect(); };
  }, [senaryo?.kimlik]);
  useEffect(() => () => { cizRef.current?.kapat(); cizRef.current = null; }, []);
  // seçili devletin başkentini vurgula ve haritada odakla
  useEffect(() => {
    const c = cizRef.current;
    if (!c || !p) return;
    c.seciliBolge = secim >= 0 ? p.ulkeler[secim]!.baskent : -1;
    if (secim >= 0) c.odakBolgeler([p.ulkeler[secim]!.baskent, ...p.bolgeler.map((b, i) => ({ b, i })).filter(({ b }) => b.sahip === secim).map(({ i }) => i)], 1.4);
    c.isaretle();
  }, [secim, p]);

  const yukle = async (yuva?: string, bayt?: ArrayBuffer) => {
    setBekle(true);
    try { await oyunAc({ tur: 'kayit', yuva, bayt }); }
    catch (e: any) { tost(e?.ayrinti ?? e?.message ?? 'Kayıt açılamadı', 'hata'); setBekle(false); }
  };
  return (
    <div class="baslangic">
      <canvas ref={cvRef} class="harita arka" aria-label={senaryo ? 'Haritaya dokunarak devlet seçin' : undefined} aria-hidden={senaryo ? undefined : 'true'} />
      <section class="bas-panel">
        {!senaryo ? (
          <SenaryoAdim sec={(s) => { setSecim(-1); setP(null); setSenaryo(s); }} kayitlar={kayitlar} bekle={bekle} yukle={yukle} dosya={() => dosya.current?.click()} />
        ) : (
          <UlkeAdim s={senaryo} p={p} secim={secim} setSecim={setSecim} geri={() => { setSenaryo(null); setP(null); setSecim(-1); }} bekle={bekle} setBekle={setBekle} />
        )}
        <input ref={dosya} id="kayit-dosya" type="file" accept=".tsk,application/octet-stream" hidden onChange={async (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) await yukle(undefined, await f.arrayBuffer()); }} />
      </section>
    </div>
  );
}

function SenaryoAdim({ sec, kayitlar, bekle, yukle, dosya }: { sec: (s: SenaryoOzet) => void; kayitlar: any[]; bekle: boolean; yukle: (yuva?: string) => void; dosya: () => void }) {
  return (
    <>
      <header class="bas-bas">
        <p class="etiket">Çevrimdışı tarih stratejisi</p>
        <h1>Tarih Strateji</h1>
        <p class="alt-baslik">Beş dönem, gerçek devletler ve hükümdarlar. Bir senaryo seçin.</p>
      </header>
      {kayitlar[0] && (
        <div class="devam">
          <button class="ana genis-dugme" disabled={bekle} onClick={() => yukle(kayitlar[0].yuva)}>
            <Simge ad="hourglass" boy={20} />
            <span><strong>Devam et</strong><span class="kucuk">{kayitlar[0].etiket} · {senaryoAdi(kayitlar[0])}</span></span>
          </button>
        </div>
      )}
      <ul class="senaryolar">
        {SENARYOLAR.map((s) => (
          <li key={s.kimlik}>
            <button class="senaryo-kart" disabled={bekle} onClick={() => sec(s)}>
              <span class="sk-simge"><Simge ad={DONEM_SIMGE[s.donem] ?? 'crossed-swords'} boy={34} /></span>
              <span class="sk-metin">
                <span class="etiket">{s.alt}</span>
                <strong>{s.ad}</strong>
                <span class="sk-aciklama">{s.aciklama}</span>
                <span class="sk-ulkeler">{s.oneCikan.slice(0, 5).map((u) => <span class="cipcik" key={u.i}><span class="muhur kucuk-muhur" style={{ background: u.renk }} />{u.kisa}</span>)}<span class="soluk kucuk"> · {s.ulkeSayi} devlet</span></span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div class="bas-dugme">
        <button disabled={bekle} onClick={dosya}><Simge ad="save" boy={18} /> Kayıt dosyası aç</button>
      </div>
      {kayitlar.length > 1 && (
        <details class="kayit-liste">
          <summary>Kayıtlı oyunlar · {kayitlar.length}</summary>
          <ul class="liste">{kayitlar.map((k) => <li key={k.yuva}><span><strong>{k.yuva}</strong> · {k.etiket}<br /><span class="soluk kucuk">{senaryoAdi(k)}</span></span><button disabled={bekle} onClick={() => yukle(k.yuva)}>Yükle</button></li>)}</ul>
        </details>
      )}
      <p class="soluk kucuk">Yapay zekâsız kural motoru · simgeler game-icons.net (CC BY 3.0) · harita Natural Earth</p>
    </>
  );
}

function UlkeAdim({ s, p, secim, setSecim, geri, bekle, setBekle }: { s: SenaryoOzet; p: Paket | null; secim: number; setSecim: (i: number) => void; geri: () => void; bekle: boolean; setBekle: (b: boolean) => void }) {
  const [mod, setMod] = useState(0);
  const [ara, setAra] = useState('');
  const bolgeSay = useMemo(() => { const n: number[] = []; for (const b of p?.bolgeler ?? []) n[b.sahip] = (n[b.sahip] ?? 0) + 1; return n; }, [p]);
  const nufus = useMemo(() => { const n: number[] = []; for (const b of p?.bolgeler ?? []) n[b.sahip] = (n[b.sahip] ?? 0) + b.nufus.reduce((a, c) => a + c, 0); return n; }, [p]);
  const tum = useMemo(() => (p?.ulkeler ?? []).map((u, i) => ({ u, i })).filter(({ u, i }) => !u.pasif && (bolgeSay[i] ?? 0) > 0).sort((a, b) => (bolgeSay[b.i] ?? 0) - (bolgeSay[a.i] ?? 0)), [p, bolgeSay]);
  useEffect(() => { if (p && secim < 0) setSecim(s.oneCikan[0]?.i ?? tum[0]?.i ?? 0); }, [p]);
  const q = ara.trim().toLocaleLowerCase('tr');
  const liste = q ? tum.filter(({ u }) => u.ad.toLocaleLowerCase('tr').includes(q) || u.kisa.toLocaleLowerCase('tr').includes(q) || u.lider.toLocaleLowerCase('tr').includes(q)) : tum;
  const basla = async () => {
    if (secim < 0) return;
    setBekle(true);
    try { await oyunAc({ tur: 'yeni', kimlik: s.kimlik, oyuncu: secim, mod }); }
    catch (e: any) { tost(e?.ayrinti ?? e?.message ?? 'Başlatılamadı', 'hata'); setBekle(false); }
  };
  const su = p && secim >= 0 ? p.ulkeler[secim] : null;
  const one = new Set(s.oneCikan.map((x) => x.i));
  return (
    <>
      <header class="bas-bas">
        <button class="geri" onClick={geri} disabled={bekle}>‹ Senaryolar</button>
        <p class="etiket">{s.alt}</p>
        <h1 class="orta-baslik">{s.ad}</h1>
        <p class="alt-baslik">{s.aciklama}</p>
      </header>
      {!p ? <p class="soluk">Senaryo yükleniyor…</p> : <>
        <h3 class="adim-baslik">Öne çıkan devletler</h3>
        <div class="ulkeler" role="radiogroup" aria-label="Öne çıkan devletler">
          {s.oneCikan.map((x) => (
            <button key={x.i} role="radio" aria-checked={secim === x.i} class={`ulke-kart ${secim === x.i ? 'secili' : ''}`} onClick={() => setSecim(x.i)}>
              <span class="muhur" style={{ background: x.renk }} />
              <span class="uk-metin"><strong>{x.ad}</strong><span class="soluk kucuk">{x.lider} · {bolgeSay[x.i] ?? 0} bölge</span></span>
            </button>
          ))}
        </div>
        <details class="tum-ulke" open={!!q}>
          <summary>Bütün devletler · {tum.length} <span class="soluk kucuk">(haritaya dokunarak da seçebilirsiniz)</span></summary>
          <input class="ara" type="search" value={ara} placeholder="Devlet ya da hükümdar ara…" onInput={(e) => setAra((e.target as HTMLInputElement).value)} aria-label="Devlet ara" />
          <ul class="ulke-liste">
            {liste.slice(0, 120).map(({ u, i }) => (
              <li key={i}><button class={secim === i ? 'secili' : ''} aria-pressed={secim === i} onClick={() => setSecim(i)}>
                <span class="muhur kucuk-muhur" style={{ background: u.renk }} />
                <span class="ul-ad">{u.ad}{one.has(i) ? ' ★' : ''}</span>
                <span class="soluk kucuk">{bolgeSay[i] ?? 0}</span>
              </button></li>
            ))}
          </ul>
        </details>
        {su && (
          <div class="secili-ulke">
            <span class="muhur buyuk" style={{ background: su.renk }} />
            <div>
              <strong>{su.ad}</strong>
              <p class="soluk kucuk">{su.yonetimAd ?? ''}{su.yonetimAd ? ' · ' : ''}{su.lider}</p>
              <p class="soluk kucuk">{bolgeSay[secim] ?? 0} bölge · {fmt(Math.round((nufus[secim] ?? 0) / 100_000) / 10)} mn nüfus · başkent {p.bolgeler[su.baskent]?.ad ?? '—'}</p>
            </div>
          </div>
        )}
        <div class="mod-sec segment genis" role="radiogroup" aria-label="Oyun modu">
          {MODLAR.map(([k, ad, aciklama]) => <button key={k} role="radio" aria-checked={mod === k} class={mod === k ? 'acik' : ''} onClick={() => setMod(k)} title={aciklama}>{ad}</button>)}
        </div>
        <div class="bas-dugme">
          <button class="ana genis-dugme" disabled={bekle || secim < 0} onClick={basla}><Simge ad="crown" boy={20} /><span><strong>{su ? `${su.kisa} ile başla` : 'Devlet seçin'}</strong></span></button>
        </div>
      </>}
    </>
  );
}
