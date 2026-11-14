/** v1.7 state-facing UI. All mutations use the game's preview/confirm workflow. */
import {useEffect,useState} from 'preact/hooks';
import {istemci,panelSurum,ozet,pkg,seciliBirlik} from './durum.ts';
import {onizle} from './eylem.ts';

export function V17Panel() {
  const [v,setV]=useState<any>(null);
  const [target,setTarget]=useState(0);
  const [clause,setClause]=useState('ticaret');
  const [minister,setMinister]=useState('');
  const [portfolio,setPortfolio]=useState('uretim');
  const [site,setSite]=useState(-1);
  const [agency,setAgency]=useState(0);
  const [operation,setOperation]=useState('bilgi');
  const [front,setFront]=useState(-1);
  const [planKind,setPlanKind]=useState('savun');
  const [model,setModel]=useState('');
  const [adet,setAdet]=useState(1);
  const ps=panelSurum.value,day=ozet.value?.gun;
  useEffect(()=>{let live=true;void istemci.istek('query',{gorunum:'v17'}).then((x)=>{if(live)setV(x.veri);});return()=>{live=false;};},[ps,day]);
  if(!v)return null;
  const people=v.availablePoliticians??[];
  const sites=v.sites??[];
  const networks=v.networks??[];
  const goals=(v.goals??[]) as any[];
  const proposals=v.proposals??[];
  const countryNames=ozet.value?.ulke?.kisa??'Ülkem';
  return <section class="bolum" aria-label="v1.7 devlet yönetimi">
    <h3>v1.7 · Gelişmiş devlet yönetimi</h3>
    <p class="soluk kucuk">Kalıcı kabine, istihbarat ağı ve anlaşma revizyonları. Fiziksel üretim motoru henüz geçiş kilidindedir.</p>
    <h4>Ulusal hedefler · hedef puanı {v.goalScore??0}</h4>
    <p class="soluk kucuk">Hedefler devletinizin gerçek durumunu ölçer; ilerleme 120 günlük ortalamadır, bir kerelik iyi durum tamamlamaz. Tarih sonucu dayatılmaz.</p>
    <ul class="komutan-liste">{goals.map((g:any)=><li key={g.id}>
      <div class="km-bas"><strong>{g.label}</strong>
        <span class="km-rozet">{g.status==='completed'?'Tamamlandı':g.status==='failed'?'Kaybedildi':`Aşama ${g.stage}/${g.stages.length}`}</span></div>
      <div class="cubukluk" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(g.progress*100/g.threshold)} aria-label={`${g.label} ilerlemesi`}><span style={{width:`${Math.min(100,Math.floor(g.progress*100/g.threshold))}%`}} /></div>
      <p class="soluk kucuk">{g.metricName}: {v.goalsMeasured?`şimdi %${Math.floor(g.value/10000)}`:'ilk ölçüm bekleniyor'} · ilerleme %{Math.floor(g.progress/10000)} / hedef %{Math.floor(g.threshold/10000)} · +{g.weight} puan</p>
      {g.paths?.length>0&&<details><summary class="soluk kucuk">Nasıl ulaşılır?</summary><ul class="liste">{g.paths.map((y:string)=><li key={y} class="kucuk">{y}</li>)}</ul></details>}
    </li>)}</ul>
    <h4>Kabine</h4>
    <p class="soluk kucuk">{(v.ministers??[]).map((m:any)=>`${m.portfolio}: ${m.personKey}`).join(' · ')||'Ek kabine ataması yapılmadı'}</p>
    <div class="satir-ayar"><label>Bakanlık</label><select value={portfolio} onChange={e=>setPortfolio((e.target as HTMLSelectElement).value)}>
      {['ekonomi','arastirma','uretim','ordu','insa'].map(x=><option value={x}>{x}</option>)}
    </select></div>
    <div class="satir-ayar"><label>Görevli kişi</label><select value={minister} onChange={e=>setMinister((e.target as HTMLSelectElement).value)}>
      <option value="">Kişi seç</option>{people.map((p:any)=><option value={p.ad}>{p.ad} · {p.rol}</option>)}
    </select></div>
    <button disabled={!minister} onClick={()=>onizle({tur:'v17BakanAta',alan:portfolio,kisi:minister})}>Bakan atamasını önizle</button>
    <h4>Şehir ve sanayi politikası</h4>
    <div class="satir-ayar"><label>Tesis</label><select value={site} onChange={e=>setSite(Number((e.target as HTMLSelectElement).value))}>
      <option value={-1}>Tesis seç</option>{sites.slice(0,100).map((s:any)=><option value={s.id}>{s.regionName} · {s.kind} · kapasite {s.capacity}</option>)}
    </select></div>
    <div class="dugmeler"><button disabled={site<0} onClick={()=>onizle({tur:'v17SehirPolitika',tesis:site,politika:'verim'})}>Verimliliğe odaklan</button>
    <button disabled={site<0} onClick={()=>onizle({tur:'v17SehirPolitika',tesis:site,politika:'normal'})}>Normal üretim</button></div>
    <h4>İstihbarat</h4>
    <p class="soluk kucuk">Aktif ağlar: {networks.length} · Hazırlanan operasyonlar: {(v.operations??[]).filter((x:any)=>x.status==='preparing').length}</p>
    <div class="satir-ayar"><label>Hedef ülke</label><select value={target} onChange={e=>setTarget(Number((e.target as HTMLSelectElement).value))}>
      {pkg.ulkeler.map((c:any,i:number)=><option key={i} value={i}>{c.kisa}</option>)}
    </select></div>
    <button onClick={()=>onizle({tur:'v17AgKur',hedef:target})}>Ağ kur / güçlendir</button>
    {networks.length>0&&<><div class="satir-ayar"><label>Ağ</label><select value={agency} onChange={e=>setAgency(Number((e.target as HTMLSelectElement).value))}>
    <option value={0}>Ağ seç</option>{networks.map((n:any)=><option value={n.id}>{n.targetName} · ağ gücü %{Math.floor(n.strength/10000)}</option>)}
    </select></div><select value={operation} onChange={e=>setOperation((e.target as HTMLSelectElement).value)}><option value="bilgi">Bilgi toplama</option><option value="nufuz">Siyasi nüfuz</option></select>
    <button disabled={!agency} onClick={()=>onizle({tur:'v17Operasyon',ag:agency,operasyon:operation})}>Operasyonu önizle</button></>}
    <h4>Diplomatik müzakere</h4>
    <p class="soluk kucuk">{countryNames}: tekliflerde sürüm ve müzakere durumu kayıtlıdır.</p>
    <div class="satir-ayar"><label>Madde</label><select value={clause} onChange={e=>setClause((e.target as HTMLSelectElement).value)}>
      {['ticaret','gecis','saldirmazlik','garanti'].map(x=><option value={x}>{x}</option>)}
    </select></div>
    <button onClick={()=>onizle({tur:'v17Teklif',hedef:target,madde:clause})}>Teklif gönder</button>
    {proposals.filter((p:any)=>p.status==='pending').slice(-5).map((p:any)=><div class="liste" key={p.id}>
      <p>{p.fromName} → {p.toName}: {p.clause}, rev. {p.revision}</p>
      {p.to===ozet.value?.oyuncu&&<div class="dugmeler"><button onClick={()=>onizle({tur:'v17TeklifYanit',teklif:p.id,yanit:'accept'})}>Kabul</button><button onClick={()=>onizle({tur:'v17TeklifYanit',teklif:p.id,yanit:'reject'})}>Ret</button><button onClick={()=>onizle({tur:'v17TeklifYanit',teklif:p.id,yanit:'counter'})}>Karşı teklif</button></div>}
    </div>)}
    {(v.namedModels??[]).length>0&&<><h4>Adlı ekipman modelleri</h4>
    <p class="soluk kucuk">Ülkenizin ve yılın kapısından geçen modeller. Üretim mevcut fabrika hattından yapılır; model yalnız çıktıya ad verir (ikinci hat ya da ek hammadde tüketimi yoktur).</p>
    <div class="satir-ayar"><label>Model</label><select value={model} onChange={e=>setModel((e.target as HTMLSelectElement).value)}>
      <option value="">Model seç</option>{v.namedModels.map((m:any)=><option key={m.id} value={m.id}>{m.ad} · {m.aile} · {m.yil}</option>)}
    </select></div>
    {model&&(()=>{const m=v.namedModels.find((x:any)=>x.id===model);const ucak=m?.aile?.endsWith('uçağı');return <div class="satir-ayar"><label>{ucak?'Filo adedi':'Askerî fabrika'}</label>
      <input type="number" min={0} max={20} value={adet} onInput={e=>setAdet(Number((e.target as HTMLInputElement).value))} />
      <button onClick={()=>onizle(ucak?{tur:'v17SanayiGorevi',model,adet:Math.max(1,adet)}:{tur:'v17SanayiGorevi',model,fabrika:Math.max(0,adet)*1000})}>{ucak?'Uçak siparişini önizle':adet===0?'Üretimi durdurmayı önizle':'Model üretimini önizle'}</button></div>;})()}
    {(v.modelLines??[]).length>0&&<ul class="liste">{v.modelLines.map((l:any)=><li key={l.id} class="kucuk">{l.modelName}: üretilen {l.produced}</li>)}</ul>}</>}
    <h4>Harekât planı</h4>
    <p class="soluk kucuk">{seciliBirlik.value.size} seçili birlik için kalıcı emir. Önce haritadan birlik seçin.</p>
    <div class="satir-ayar"><label>Hedef bölge</label><select value={front} onChange={e=>setFront(Number((e.target as HTMLSelectElement).value))}>
      <option value={-1}>Bölge seç</option>{pkg.bolgeler.map((r:any,i:number)=><option key={i} value={i}>{r.ad}</option>)}
    </select></div>
    <div class="satir-ayar"><label>Emir</label><select value={planKind} onChange={e=>setPlanKind((e.target as HTMLSelectElement).value)}>
      {['savun','taarruz','intikal','garnizon'].map(x=><option key={x} value={x}>{x}</option>)}
    </select></div>
    <button disabled={front<0||seciliBirlik.value.size===0} onClick={()=>onizle({tur:'v17Harekat',birlikler:[...seciliBirlik.value],emir:planKind,hedef:front})}>Harekât planını önizle</button>
  </section>;
}
