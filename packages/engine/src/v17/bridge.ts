/** v1.7 additive integration. All mutations happen inside authoritative engine/worker. */
import type {World} from '../state/world.ts';
import {A} from '../state/world.ts';
import {AKTIF} from '../catalog.ts';
import type {Emir,Kart} from '../orders.ts';
import {tarih} from '../calendar/index.ts';
import {siyasiKisiler} from '../siyasiKisiler.ts';
import {rng,uniformInt,AMAC} from '../rng/index.ts';
import {anlasmaKur} from '../systems/diplomasi.ts';
import {rotaTip} from '../systems/ortak.ts';
import {istihbaratRaporu} from '../observe/index.ts';
import {emptyV17,nextV17Id,assertV17,type V17State,type V17Site,type V17Minister,type V17Order,type V17Proposal} from './state.ts';
import {MODELS_1914,PORTFOLIOS} from './catalog.ts';
import {kurHedefler,guncelleHedefler,OLCUTLER} from './hedef.ts';
import {MODELLER_TASARIM,KAYNAKLAR_TASARIM,TESISLER_TASARIM,modelKullanilabilir} from './katalogTasarim.ts';
import {addSite,factoryPolicyBonus} from './industry.ts';
import {offerV17,replyV17,expireV17,proposalVisible} from './diplomacy.ts';
import {networkV17,planOperationV17,resolveV17} from './intelligence.ts';
import {orderV17,executeV17} from './strategy.ts';

const money=(w:World,c:number)=>w.C.c.hazine[c]!;
const power=(w:World,c:number)=>w.C.c.pg[c]!;
const N=(a:unknown,d=-1):number=>typeof a==='number'&&Number.isSafeInteger(a)?a:d;
const S=1_000_000;
const bad=(name:string,reason:string):Kart=>({gecerli:false,baslik:name,kapsam:'',bugun:[],tahmin:[],neden:reason,iptal:'—'});
const good=(name:string,scope:string,cost:string[]=[],guess:string[]=[]):Kart=>({gecerli:true,baslik:name,kapsam:scope,bugun:cost,tahmin:guess,iptal:'Sonraki emirlerle değiştirilebilir'});
const countryOK=(w:World,c:number)=>c>=0&&c<w.nC&&w.C.c.pasif[c]!==1;

/** Build additive, read-only snapshot structures from current legacy world (not duplicate physical output). */
export function initialiseV17(w:World):V17State {
  const s=emptyV17();
  for(let r=0;r<w.nR;r++) {
    const c=w.R.c.sahip[r]!;
    for(const [kind,capacity] of [['sivil',w.R.c.sivilF[r]!],['askeri',w.R.c.askeriF[r]!]] as const) {
      if(capacity>0)addSite(s,c,r,kind,capacity);
    }
    const b=w.pkg.bolgeler[r]!;
    for(const [kind,capacity] of [['celik',b.celik],['komur',b.komur],['petrol',b.petrol?.[0]??0]] as const) {
      if(capacity>0)s.resources.push({id:nextV17Id(s),region:r,kind,capacity,reserve:-1});
    }
  }
  if(w.pkg.donem==='buyuk')s.models=MODELS_1914.map(x=>({...x}));
  kurHedefler(w,s,w.oyuncu);
  return s;
}
export function v17LoadFromLegacy(w:World):void {w.v17=initialiseV17(w);}

/** Returns a capped, additive country bonus; does not produce weapons separately. */
export function v17IndustryBonus(w:World,c:number):number {
  const s=w.v17;
  const policy=factoryPolicyBonus(s,c);
  const minister=s.ministers.find(m=>m.country===c&&m.portfolio==='uretim');
  return Math.min(150_000,policy+(minister?Math.max(0,Math.min(50_000,minister.skill*5000)):0));
}
function currentYear(w:World):number{return tarih(w.gun).y;}
function politician(w:World,c:number,key:string) {
  const year=currentYear(w),code=w.pkg.ulkeler[c]!.kod;
  return siyasiKisiler(AKTIF.donem).find(p=>p.kod===code&&p.ad===key&&p.bas<=year&&p.bit>=year);
}

/** New commands go through legacy preview/validate/apply pipeline; every role uses same handler. */
export const V17_COMMANDS=['v17BakanAta','v17AgKur','v17Operasyon','v17Teklif','v17TeklifYanit','v17SehirPolitika','v17Harekat','v17SanayiGorevi'] as const;
export function v17Preview(w:World,e:Emir):Kart {
  const c=e.ulke,s=w.v17;
  if(!countryOK(w,c))return bad('v1.7','Devlet geçersiz veya pasif');
  switch(e.tur){
    case 'v17BakanAta': {
      const area=String(e.alan),name=String(e.kisi??'');
      if(!PORTFOLIOS.some(x=>x===area))return bad('Kabine','Bakanlık alanı yok');
      const p=politician(w,c,name);if(!p)return bad('Kabine','Göreve uygun ve etkin tarihî kişi bulunamadı');
      if(power(w,c)<20_000||money(w,c)<5000)return bad('Kabine','20 siyasi güç ve 5.000 altın gerekli');
      if(s.ministers.some(m=>m.country===c&&m.personKey===name&&m.portfolio!==area))return bad('Kabine','Aynı kişi başka bakanlıkta görevli');
      return good('Bakan atama',`${p.ad} → ${area}`,['Siyasi güç −20','Hazine −5.000'],['Üretim bakanı verimliliği artırır; diğer bakanlıklar mevcut delegasyonla uyumlu kalır']);
    }
    case 'v17AgKur': {
      const target=N(e.hedef);if(!countryOK(w,target)||target===c)return bad('İstihbarat','Hedef geçersiz');
      if(power(w,c)<20_000||money(w,c)<10_000)return bad('İstihbarat','20 siyasi güç ve 10.000 altın gerekli');
      return good('İstihbarat ağı',`${w.pkg.ulkeler[target]!.kisa} ülkesinde kalıcı ağ`,['Siyasi güç −20','Hazine −10.000'],['Ağ bir sonraki operasyondan önce hazırlanır']);
    }
    case 'v17Operasyon': {
      const target=N(e.ag),kind=String(e.operasyon),region=N(e.bolge,-1);
      const n=s.networks.find(x=>x.id===target&&x.owner===c);
      if(!n)return bad('İstihbarat','Sizin ağınız bulunamadı');
      if(!['sabotaj','bilgi','nufuz'].includes(kind))return bad('İstihbarat','Operasyon türü geçersiz');
      if(w.gun<n.nextActionDay||s.operations.some(x=>x.networkId===n.id&&x.status==='preparing'))return bad('İstihbarat','Ağ henüz hazır değil');
      if(kind==='sabotaj'&&(region<0||region>=w.nR||w.R.c.sahip[region]!==n.target))return bad('İstihbarat','Sabotaj için hedef ülkeye ait bölge seçin');
      if(power(w,c)<30_000||money(w,c)<20_000)return bad('İstihbarat','30 siyasi güç ve 20.000 altın gerekli');
      return good('Gizli operasyon',`${kind} · hedef ${w.pkg.ulkeler[n.target]!.kisa}`,['Siyasi güç −30','Hazine −20.000'],['21 gün hazırlık; başarı garanti değildir']);
    }
    case 'v17Teklif': {
      const target=N(e.hedef),clause=String(e.madde);
      if(!countryOK(w,target)||target===c)return bad('Diplomasi','Hedef ülke geçersiz');
      if(!['ticaret','gecis','saldirmazlik','garanti'].includes(clause))return bad('Diplomasi','Anlaşma maddesi geçersiz');
      if(s.proposals.some(p=>p.status==='pending'&&p.from===c&&p.to===target&&p.clause===clause))return bad('Diplomasi','Aynı teklif zaten bekliyor');
      if(power(w,c)<10_000)return bad('Diplomasi','10 siyasi güç gerekli');
      return good('Diplomatik teklif',`${w.pkg.ulkeler[target]!.kisa} · ${clause}`,['Siyasi güç −10'],['Müzakere; AI hedefi üç gün sonra yanıtlar']);
    }
    case 'v17TeklifYanit': {
      const id=N(e.teklif),reply=String(e.yanit),p=s.proposals.find(q=>q.id===id);
      if(!p||p.status!=='pending'||p.to!==c||w.gun>p.expiryDay)return bad('Diplomasi','Yanıtlanabilir teklif yok');
      if(!['accept','reject','counter'].includes(reply))return bad('Diplomasi','Yanıt türü geçersiz');
      return good('Teklif yanıtı',`${p.clause} → ${reply}`,[],['Kabul edilirse mevcut antlaşma motorunda bir kere yürürlüğe girer']);
    }
    case 'v17SehirPolitika': {
      const id=N(e.tesis),policy=String(e.politika),site=s.sites.find(x=>x.id===id&&x.country===c);
      if(!site||w.R.c.kontrolEden[site.region]!==c)return bad('Şehir','Denetiminizde tesis bulunamadı');
      if(!['normal','verim','istihdam'].includes(policy))return bad('Şehir','Politika geçersiz');
      if(power(w,c)<5_000)return bad('Şehir','5 siyasi güç gerekli');
      return good('Şehir sanayi politikası',`${w.pkg.bolgeler[site.region]!.ad} · ${policy}`,['Siyasi güç −5'],['Üretim teşviği ülke hesabına sınırlı katkı verir']);
    }
    case 'v17Harekat': {
      const ids=Array.isArray(e.birlikler)?e.birlikler.map(x=>N(x)).filter(x=>x>=0):[];
      const hedef=N(e.hedef),kind=String(e.emir);
      if(!ids.length||ids.length>40||new Set(ids).size!==ids.length||hedef<0||hedef>=w.nR)return bad('Harekât','Birlikler veya hedef geçersiz');
      if(!['savun','taarruz','intikal','garnizon'].includes(kind))return bad('Harekât','Emir türü geçersiz');
      if(ids.some(id=>{const u=w.U.resolve(id);return u<0||w.U.c.ulke[u]!==c;}))return bad('Harekât','Seçilen birlikler ülkenize ait olmalı');
      if(ids.some(id=>s.orders.some(o=>o.status==='active'&&o.unitIds.includes(id))))return bad('Harekât','Seçilen birlik için yürürlükte plan var');
      if(ids.some(id=>{const u=w.U.resolve(id);return !rotaTip(w,c,0,w.U.c.bolge[u]!,hedef);}))return bad('Harekât','Birlik için uygun rota yok');
      return good('Harekât planı',`${ids.length} birlik · ${kind} · ${w.pkg.bolgeler[hedef]!.ad}`,[],['Emir gün başlangıcında doğrulanır, manuel emir önceliği korunur']);
    }
    case 'v17SanayiGorevi': return bad('Ayrıntılı üretim','Bu sürümde model bazlı gerçek stok dönüşümü henüz etkinleştirilmedi; çift üretimi önlemek için emir kilitli');
    default: return bad('v1.7','Emir bulunamadı');
  }
}
export function v17Apply(w:World,e:Emir):void {
  const card=v17Preview(w,e);if(!card.gecerli)throw Error(card.neden??'v17 geçersiz emir');
  const c=e.ulke,s=w.v17;
  switch(e.tur){
    case 'v17BakanAta': {
      const area=String(e.alan) as V17Minister['portfolio'],name=String(e.kisi);
      const p=politician(w,c,name)!;
      s.ministers=s.ministers.filter(x=>!(x.country===c&&x.portfolio===area));
      s.ministers.push({id:nextV17Id(s),country:c,portfolio:area,personKey:p.ad,skill:area==='uretim'?p.ekonomi:area==='ordu'?p.askerlik:area==='ekonomi'?p.ekonomi:p.idare,appointedDay:w.gun});
      w.C.c.pg[c]=power(w,c)-20_000;w.C.c.hazine[c]=money(w,c)-5000;break;
    }
    case 'v17AgKur':networkV17(s,c,N(e.hedef),w.gun);w.C.c.pg[c]=power(w,c)-20_000;w.C.c.hazine[c]=money(w,c)-10_000;break;
    case 'v17Operasyon':planOperationV17(s,c,N(e.ag),String(e.operasyon) as 'sabotaj'|'bilgi'|'nufuz',N(e.bolge),w.gun);w.C.c.pg[c]=power(w,c)-30_000;w.C.c.hazine[c]=money(w,c)-20_000;break;
    case 'v17Teklif':offerV17(s,c,N(e.hedef),String(e.madde) as V17Proposal['clause'],w.gun);w.C.c.pg[c]=power(w,c)-10_000;break;
    case 'v17TeklifYanit':{
      const id=N(e.teklif),p=s.proposals.find(q=>q.id===id)!;replyV17(s,id,c,String(e.yanit) as 'accept'|'reject'|'counter',w.gun);
      if(p.status==='accepted')applyAgreement(w,p);break;
    }
    case 'v17SehirPolitika':s.sites.find(q=>q.id===N(e.tesis))!.policy=String(e.politika) as 'normal'|'verim'|'istihdam';w.C.c.pg[c]=power(w,c)-5000;break;
    case 'v17Harekat':orderV17(s,c,(e.birlikler as number[]),String(e.emir) as V17Order['kind'],N(e.hedef),w.gun);break;
  }
}
function applyAgreement(w:World,p:V17Proposal):void {
  const type=({'ticaret':A.ticaret,'gecis':A.gecis,'saldirmazlik':A.saldirmazlik,'garanti':A.garanti} as const)[p.clause];
  anlasmaKur(w,type,p.from,p.to);
  // Military access is directional; the original game's convention remains unchanged.
}

/** P2: manual operational plans execute before country AI re-evaluates. */
export function v17P2(w:World):void {
  executeV17(w.v17,w.gun,(o,id)=>{
    const u=w.U.resolve(id);return u>=0&&w.U.c.ulke[u]===o.country&&w.U.c.elle[u]!<=w.gun;
  },(o,id)=>{
    const u=w.U.resolve(id);if(u<0)return;
    const target=o.targetRegion;
    if(o.kind!=='garnizon'&&(!rotaTip(w,o.country,0,w.U.c.bolge[u]!,target)))return;
    w.U.c.hedef[u]=o.kind==='garnizon'?-1:target;
    w.U.c.durus[u]=o.kind==='taarruz'?2:o.kind==='garnizon'?3:0;
    w.U.c.elle[u]=w.gun+3;
  });
}
/** P3: resolve prepared operations and auto-respond to nonplayer proposals. */
export function v17P3(w:World):void {
  const s=w.v17;expireV17(s,w.gun);
  if(s.flags.enableIntel)resolveV17(s,w.gun,id=>uniformInt(rng(w.tohum,w.gun,77,id,0,AMAC.sabotage,0,0),S),op=>{
    if(op.kind==='sabotaj'&&op.region>=0&&op.region<w.nR&&w.R.c.sahip[op.region]===op.target){
      w.R.c.hasar[op.region]=Math.min(500_000,w.R.c.hasar[op.region]!+75_000);
    } else if(op.kind==='bilgi') {
      istihbaratRaporu(w,op.owner,op.target);
    } else if(op.kind==='nufuz') {
      w.C.c.huzur[op.target]=Math.max(0,w.C.c.huzur[op.target]!-2500);
    }
    // Intelligence is saved through the existing uncertainty-bounded observe/index.ts report table.
  });
  if(s.flags.enableAiDiplomacy){
    for(const p of s.proposals.filter(p=>p.status==='pending'&&p.to!==w.oyuncu&&w.gun-p.createdDay>=3).sort((a,b)=>a.id-b.id)){
      const relation=w.gorus[p.to*w.nC+p.from]!;
      const score=relation+(p.clause==='ticaret'?15_000:0);
      replyV17(s,p.id,p.to,score>=60_000?'accept':'reject',w.gun);
      if(p.status==='accepted')applyAgreement(w,p);
    }
  }
}
/** P11: recompute goals at most once a day; no historical railroading. */
export function v17P11(w:World):void {
  const s=w.v17;if(s.lastDay===w.gun)return;s.lastDay=w.gun;
  // Newly built/captured factories are reflected in the additive site mirror without duplicating physical production.
  // bölge × tür → tesis dizini (günde bir kez kurulur; bölge başına doğrusal arama yapılmaz)
  const dizin=new Map<number,V17Site>();
  for(const q of s.sites)if(q.kind==='sivil'||q.kind==='askeri')dizin.set(q.region*2+(q.kind==='askeri'?1:0),q);
  for(let r=0;r<w.nR;r++)for(const [kind,capacity] of [['sivil',w.R.c.sivilF[r]!],['askeri',w.R.c.askeriF[r]!]] as const){
    const existing=dizin.get(r*2+(kind==='askeri'?1:0));
    if(existing){existing.capacity=capacity;existing.country=w.R.c.sahip[r]!;}
    else if(capacity>0)addSite(s,w.R.c.sahip[r]!,r,kind,capacity);
  }
  guncelleHedefler(w,s);
  assertV17(s);
}
/** Only own countries and directly involved diplomatic messages may be returned to player UI. */
export function v17View(w:World,viewer=w.oyuncu){
  const s=w.v17;
  return {
    schema:s.version,day:w.gun,flags:{...s.flags},
    ministers:s.ministers.filter(x=>x.country===viewer).map(x=>({...x})),
    sites:s.sites.filter(x=>x.country===viewer).map(x=>({...x,regionName:w.pkg.bolgeler[x.region]!.ad})),
    resources:s.resources.filter(x=>w.R.c.sahip[x.region]===viewer).map(x=>({...x})),
    networks:s.networks.filter(x=>x.owner===viewer).map(x=>({...x,targetName:w.pkg.ulkeler[x.target]!.kisa})),
    operations:s.operations.filter(x=>x.owner===viewer).map(x=>({...x})),
    proposals:s.proposals.filter(x=>proposalVisible(x,viewer)).map(x=>({...x,fromName:w.pkg.ulkeler[x.from]!.kisa,toName:w.pkg.ulkeler[x.to]!.kisa})),
    orders:s.orders.filter(x=>x.country===viewer).map(x=>({...x,unitIds:[...x.unitIds]})),
    goals:s.goals.filter(x=>x.country===viewer).map(x=>({...x,stages:[...x.stages],paths:[...x.paths],metricName:OLCUTLER[x.metric]?.ad??x.metric})),
    goalScore:viewer===w.oyuncu?s.stats.goalScore:0,
    goalsMeasured:s.stats.goalDay>=0,
    availablePoliticians:siyasiKisiler(AKTIF.donem).filter(x=>x.kod===w.pkg.ulkeler[viewer]!.kod&&x.bas<=currentYear(w)&&x.bit>=currentYear(w)).map(x=>({ad:x.ad,rol:x.gorev})),
    models:s.models.filter(x=>x.era===w.pkg.donem).map(x=>({...x})),
    /** Tasarım kataloğu: bu ülke ve yılda kullanılabilir adlı ekipman (üretim hattına henüz bağlı değil) */
    namedModels:w.pkg.donem==='buyuk'?MODELLER_TASARIM.filter(m=>modelKullanilabilir(m,w.pkg.ulkeler[viewer]!.kod,currentYear(w))).map(m=>({...m,girdi:{...m.girdi}})):[],
    catalog:{resources:KAYNAKLAR_TASARIM.map(x=>({...x})),facilityTypes:TESISLER_TASARIM.map(x=>({...x}))},
    stats:{...s.stats,sourceLedger:{...s.stats.sourceLedger}},
  };
}
