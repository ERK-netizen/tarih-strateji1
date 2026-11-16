/** Strategic intent -> operational plan -> valid tactical order, with commander autonomy. */
import type {CommanderPlan,Formation,Id,Person} from './contracts.ts';
export interface OrderContext { frontline:ReadonlySet<Id>; enemies:ReadonlySet<Id>; supply:ReadonlyMap<Id,number>; targetThreat:ReadonlyMap<Id,number>; currentDay:number }
export interface CommanderDecision { planId:Id; formationId:Id; action:'attack'|'hold'|'reposition'|'withdraw'|'train'|'none'; target?:Id; reason:string }
export function executeCommanderPlan(plan:CommanderPlan,units:Formation[],people:Person[],ctx:OrderContext):CommanderDecision {
  const f=units.find(u=>u.id===plan.formationId);
  const p=people.find(x=>x.id===plan.commanderId);
  const none=(reason:string):CommanderDecision=>({planId:plan.id,formationId:plan.formationId,action:'none',reason});
  if(!f||!p||f.commanderId!==p.id)return none('Komutan veya birlik atanmış değil');
  if(plan.expires!==undefined&&ctx.currentDay>=plan.expires)return none('Harekât planı sona erdi');
  if(plan.autonomy==='advisory')return none('Komutan yalnız öneri yetkisine sahip');
  if(f.organization<plan.minOrganization)return {...none('Organizasyon yetersiz: birlik toparlanıyor'),action:'hold'};
  const supply=ctx.supply.get(f.id)??0;
  if(supply<plan.minSupply)return {...none('İkmal yetersiz: saldırı ertelendi'),action:'hold'};
  if(plan.kind==='withdraw')return {...none('Komutan kontrollü geri çekilme emrini uyguladı'),action:'withdraw'};
  if(plan.kind==='defend'||plan.kind==='reserve')return {...none('Savunma hattı tutuluyor'),action:'hold'};
  if(plan.kind==='train')return {...none('Birlik eğitim emrinde'),action:'train'};
  const target=plan.target.find(t=>ctx.frontline.has(t)&&ctx.enemies.has(t));
  if(target===undefined)return {...none('Aktif hedef bulunamadı'),action:'reposition',target:plan.target[0]};
  if((ctx.targetThreat.get(target)??0)>f.manpower*2)return {...none('Komutan: risk eşiği aşıldı'),action:'hold'};
  return {planId:plan.id,formationId:f.id,action:'attack',target,reason:'Ön koşullar uygun: operasyon başlatıldı'};
}
