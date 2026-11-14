/** Tarih Strateji 1.7 additive state. No external dependencies, no nondeterministic APIs. */
export type V17Kind = 'sivil' | 'askeri' | 'maden' | 'rafineri' | 'tersane' | 'hava';
export type V17GoalStatus = 'active' | 'completed' | 'failed';
export type V17ProposalStatus = 'pending' | 'countered' | 'accepted' | 'rejected' | 'expired';
export type V17OperationStatus = 'preparing' | 'completed' | 'failed' | 'exposed';
export interface V17Site {
  id: number; country: number; region: number; kind: V17Kind; capacity: number;
  specialization: number; /** index into game equipment families; -1 unassigned */
  policy: 'normal' | 'verim' | 'istihdam';
}
export interface V17Resource { id: number; region: number; kind: 'celik'|'komur'|'petrol'; capacity: number; reserve: number; /** -1 unknown */ }
export interface V17EquipmentModel {
  id: string; label: string; era: string; family: number; firstYear: number;
  inputSteel: number; inputCoal: number; labor: number; machine: number; /** fixed-point canonical sample */
}
export interface V17Job { id:number; country:number; siteId:number; modelId:string; target:number; produced:number; wip:number; active:boolean }
export interface V17Minister { id: number; country: number; portfolio: 'ekonomi'|'arastirma'|'uretim'|'ordu'|'insa'; personKey: string; skill: number; appointedDay: number }
export interface V17Network { id:number; owner:number; target:number; strength:number; exposure:number; nextActionDay:number }
export interface V17Operation { id:number; owner:number; target:number; region:number; networkId:number; kind: 'sabotaj'|'bilgi'|'nufuz'; createdDay:number; resolveDay:number; status: V17OperationStatus; result:number }
export interface V17Proposal { id:number; from:number; to:number; clause: 'ticaret'|'gecis'|'saldirmazlik'|'garanti'; revision:number; parentId:number; status:V17ProposalStatus; createdDay:number; expiryDay:number; visibility:'public'|'parties' }
export interface V17Order { id:number; country:number; unitIds:number[]; kind:'savun'|'taarruz'|'intikal'|'garnizon'; targetRegion:number; createdDay:number; expiryDay:number; lastAppliedDay:number; status:'active'|'completed'|'cancelled' }
/** Ulusal hedef: metrik (0..S ölçütü, v17/hedef.ts) zamanla yumuşatılarak ilerlemeye dönüşür; eşik üç aşamayla izlenir. */
export interface V17Goal {
  id:number; country:number; code:string; label:string; category:string; weight:number;
  metric:string; threshold:number; stages:number[]; stage:number;
  /** 0..S: ölçütün 120 günlük üstel ortalaması (anlık dalgalanma hedefi tamamlamaz) */ progress:number;
  /** son ölçüm (0..S) */ value:number; status:V17GoalStatus; completedDay:number; paths:string[];
}
/** Adlı model üretim hattı: gerçek üretim eski (tek) hattan yapılır; bu kayıt hangi adlı modelin üretildiğini ve toplamını izler. */
export interface V17ModelLine { id:number; country:number; modelId:string; /** 'ekip<i>' (EKIPMAN dizini) ya da 'ucak<tür>' */ product:string; produced:number; startedDay:number }
export interface V17Stats { goalScore:number; goalDay:number; industrialDays:number; opsResolved:number; treatiesAccepted:number; ordersExecuted:number; sourceLedger:Record<string,number> }
export interface V17Flags {
  /** advanced production isn't turned on until old factory math is cut over; prevents double production */
  detailedProduction: boolean;
  enableAiDiplomacy: boolean;
  enableAiPlans: boolean;
  enableIntel: boolean;
}
export interface V17State {
  version:1; nextId:number; lastDay:number;
  sites:V17Site[]; resources:V17Resource[]; models:V17EquipmentModel[]; jobs:V17Job[];
  ministers:V17Minister[]; networks:V17Network[]; operations:V17Operation[];
  proposals:V17Proposal[]; orders:V17Order[]; goals:V17Goal[]; modelLines:V17ModelLine[];
  flags:V17Flags; stats:V17Stats;
}
export function emptyV17():V17State {
  return {version:1,nextId:1,lastDay:-1,sites:[],resources:[],models:[],jobs:[],ministers:[],networks:[],operations:[],proposals:[],orders:[],goals:[],modelLines:[],
    flags:{detailedProduction:false,enableAiDiplomacy:true,enableAiPlans:false,enableIntel:true},
    stats:{goalScore:0,goalDay:-1,industrialDays:0,opsResolved:0,treatiesAccepted:0,ordersExecuted:0,sourceLedger:{}}};
}
export function nextV17Id(s:V17State):number {const v=s.nextId; if(!Number.isSafeInteger(v)||v<=0||v>=2**31)throw Error('v17 kimlik tavanı');s.nextId++;return v;}
export function safeNonnegative(v:number,name:string):number {if(!Number.isSafeInteger(v)||v<0)throw Error(`v17 geçersiz sayı ${name}:${v}`);return v;}
export function assertV17(s:V17State):void {
  if(s.version!==1)throw Error('v17 eklenti sürümü');safeNonnegative(s.nextId,'nextId');
  for(const [name,rows] of Object.entries({sites:s.sites,resources:s.resources,jobs:s.jobs,ministers:s.ministers,networks:s.networks,operations:s.operations,proposals:s.proposals,orders:s.orders,goals:s.goals,modelLines:s.modelLines})) {
    const seen=new Set<number>();for(const row of rows){if(seen.has(row.id))throw Error(`v17 mükerrer ${name}:${row.id}`);seen.add(row.id);safeNonnegative(row.id,`id:${name}`);}
  }
  for(const q of s.resources){safeNonnegative(q.capacity,'resource.capacity');if(q.reserve!==-1)safeNonnegative(q.reserve,'resource.reserve');}
  for(const q of s.jobs){safeNonnegative(q.target,'job.target');safeNonnegative(q.produced,'job.produced');safeNonnegative(q.wip,'job.wip');}
  for(const q of s.networks){if(q.strength<0||q.strength>1000000||q.exposure<0||q.exposure>1000000)throw Error('v17 ağ sınırı');}
  for(const q of s.operations)if(q.resolveDay<q.createdDay)throw Error('v17 operasyon süresi');
}
