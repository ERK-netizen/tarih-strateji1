import { useEffect, useRef, useState } from 'preact/hooks';
import { HaritaCizici } from '@ts/map';
import { pkg, istemci, ekran, tazele, tost, fmt } from './durum.ts';

const TANITIM = [
  'Batının sanayi krallığı. Mavikıyı\'nın bağımsızlığının garantörü; güçlü demiryolu ağı, temkinli saray.',
  'Kuzey kıyısında küçük bir ticaret prensliği. Tunçkale suikastı yüzünden fırtınanın tam ortasında.',
  'Doğunun büyük ve yayılmacı imparatorluğu. Veliahdını kaybetti; ordusu kalabalık, sabrı az.',
  'Güneyin tahıl ambarı cumhuriyet. Fırsat kollar; Hanlar Diyarı üzerinde eski iddiaları var.',
];
const ZORLUK = ['Orta', 'Zor', 'Kolay', 'Orta'];
const MODLAR: [number, string, string][] = [[0, 'Normal', 'Rekabetçi puan açık'], [1, 'Sandbox', 'Kaynak ekle/çıkar; kalıcı etiket'], [2, 'Gözlemci', 'Dört devlet de kendini yönetir']];

export function Baslangic() {
  const [secim, setSecim] = useState(0);
  const [mod, setMod] = useState(0);
  const [kayitlar, setKayitlar] = useState<any[]>([]);
  const [bekle, setBekle] = useState(false);
  const ref = useRef<HTMLCanvasElement>(null);
  const dosya = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void istemci.istek('saves', null).then(setKayitlar).catch(() => setKayitlar([]));
    const c = new HaritaCizici(ref.current!, pkg);
    const sol = () => (window.innerWidth > 700 ? Math.min(520, window.innerWidth) * 0.85 : 0);
    c.boyutla(); c.sigdir(sol());
    c.veri = { bolgeler: pkg.bolgeler.map((b) => ({ k: b.sahip, s: b.sahip, kontrol: 80_000, itaat: 0, direnis: 0, cephe: 0, isyan: 0, guvence: 1_000_000, demiryolu: b.demiryolu, altyapi: b.altyapi, nufus: 0, fabrika: 0, uretim: 0, istihbarat: 0 })), birimler: [], yabanci: [], savaslar: [], ulkeler: pkg.ulkeler.map((u) => ({ kisa: u.kisa, renk: u.renk })) };
    c.isaretle();
    const ro = new ResizeObserver(() => { c.boyutla(); c.sigdir(sol()); });
    ro.observe(ref.current!);
    return () => ro.disconnect();
  }, []);
  const basla = async () => {
    setBekle(true);
    try { await istemci.istek('init', { oyuncu: secim, mod }); await tazele(); ekran.value = 'oyun'; }
    catch (e: any) { tost(e?.ayrinti ?? 'Başlatılamadı', 'hata'); setBekle(false); }
  };
  const yukle = async (yuva?: string, bayt?: ArrayBuffer) => {
    setBekle(true);
    try { await istemci.istek('load', bayt ? { bayt } : { yuva }, undefined, [], bayt ? [bayt] : []); await tazele(); ekran.value = 'oyun'; }
    catch (e: any) { tost(e?.ayrinti ?? 'Kayıt açılamadı', 'hata'); setBekle(false); }
  };
  const nufus = (u: number) => pkg.bolgeler.filter((b) => b.sahip === u).reduce((s, b) => s + b.nufus.reduce((a, c) => a + c, 0), 0);
  return (
    <div class="baslangic">
      <canvas ref={ref} class="harita arka" aria-hidden="true" />
      <section class="bas-panel">
        <header>
          <p class="etiket">Senaryo · 28 Haziran 1914</p>
          <h1>Tarih Strateji</h1>
          <p class="alt-baslik">{pkg.senaryo.ad.replace(' (1A kurgusal)', '')} — dört taht, kırk sekiz bölge, bir suikast.</p>
        </header>
        <div class="ulkeler" role="radiogroup" aria-label="Ülke seçin">
          {pkg.ulkeler.map((u, i) => (
            <button key={u.kod} role="radio" aria-checked={secim === i} class={`ulke-kart ${secim === i ? 'secili' : ''}`} onClick={() => setSecim(i)}>
              <span class="muhur" style={{ background: u.renk }} />
              <span class="uk-metin">
                <strong>{u.ad}</strong>
                <span class="soluk">{pkg.bolgeler.filter((b) => b.sahip === i).length} bölge · {fmt(Math.round(nufus(i) / 100_000) / 10)} mn · zorluk: {ZORLUK[i]}</span>
                <span class="uk-tanitim">{TANITIM[i]}</span>
              </span>
            </button>
          ))}
        </div>
        <div class="mod-sec" role="radiogroup" aria-label="Oyun modu">
          {MODLAR.map(([k, ad, aciklama]) => <button key={k} role="radio" aria-checked={mod === k} class={mod === k ? 'acik' : ''} onClick={() => setMod(k)} title={aciklama}>{ad}</button>)}
        </div>
        <div class="bas-dugme">
          <button class="ana" disabled={bekle} onClick={basla}>{pkg.ulkeler[secim]!.kisa} ile başla</button>
          {kayitlar[0] && <button disabled={bekle} onClick={() => yukle(kayitlar[0].yuva)}>Devam et · {kayitlar[0].etiket}</button>}
          <button disabled={bekle} onClick={() => dosya.current?.click()}>Kayıt dosyası aç</button>
          <input ref={dosya} id="kayit-dosya" type="file" accept=".tsk,application/octet-stream" hidden onChange={async (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) await yukle(undefined, await f.arrayBuffer()); }} />
        </div>
        <p class="soluk kucuk">Çevrimdışı · yapay zekâsız kural motoru · Aşama 1A kurgusal dünya</p>
      </section>
    </div>
  );
}
