/** Tactical combat reference model; deterministic, bounded and UI independent.
 * This is a new pure module awaiting integration with existing kara.ts / P9.
 * Displays HP/ammo/organization; never apply both this and the legacy combat losses.
 */
import { SCALE, type Id } from './contracts.ts';
export interface BattleUnit { id:Id; country:Id; manpower:number; maxManpower:number; hp:number; maxHp:number; org:number; morale:number; ammo:number; ammoPerRound:number; attack:number; defense:number; armor:number; piercing:number; speed:number; supply:number; commanderAttack:number; commanderDefense:number; equipmentReliability:number; retreating:boolean }
export interface BattleContext { terrainDefense:number; fortification:number; weather:number; airAttack:number; navalAttack:number; attackDirectionCount:number }
export interface BattleEvent { attacker:Id; defender:Id; hpLost:number; orgLost:number; ammoUsed:number; impact:'hit'|'armor'|'empty' }
export interface BattleResult { attackers:BattleUnit[]; defenders:BattleUnit[]; events:BattleEvent[]; winner:'attackers'|'defenders'|'ongoing'; round:number }
const cap=(x:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,x));
const mul=(a:number,b:number)=>Math.trunc(a*b/SCALE);
export function combatRound(attackers:BattleUnit[],defenders:BattleUnit[],ctx:BattleContext,round:number):BattleResult {
  if(!Number.isSafeInteger(round)||round<0)throw new RangeError('round');
  const a=attackers.map(x=>({...x})),d=defenders.map(x=>({...x}));
  const events:BattleEvent[]=[];
  // Snapshot sides; all outgoing fire is calculated before casualties are applied.
  const hits:Map<Id,{hp:number;org:number}>=new Map();
  const fire=(side:BattleUnit[],targets:BattleUnit[],attacking:boolean)=>{
    const live=targets.filter(t=>t.hp>0&&!t.retreating);
    for(const u of side.sort((x,y)=>x.id-y.id)){
      if(u.hp<=0||u.org<=0||u.retreating||live.length===0)continue;
      const target=live[(u.id+round)%live.length]!;
      const ammo=Math.min(u.ammo,Math.max(0,u.ammoPerRound));
      u.ammo-=ammo;
      const supply=cap(u.supply,100_000,SCALE);
      const orgFactor=cap(Math.trunc(u.org*SCALE/100_000),150_000,SCALE);
      const cmd=cap(SCALE+(attacking?u.commanderAttack:u.commanderDefense),650_000,1_350_000);
      const air=attacking?ctx.airAttack:0;
      const navy=attacking?ctx.navalAttack:0;
      const comb=cap(SCALE+air+navy,500_000,1_350_000);
      let force=mul(mul(mul(mul(u.attack,cmd),supply),orgFactor),comb);
      if(ammo<u.ammoPerRound)force=Math.trunc(force*ammo/Math.max(1,u.ammoPerRound));
      if(!attacking){force=mul(force,cap(ctx.terrainDefense+ctx.fortification,500_000,2_000_000));}
      force=mul(force,cap(ctx.weather,500_000,SCALE));
      const armorBlocked=target.armor>u.piercing;
      const defense=cap(target.defense,0,1_000_000);
      const hit=Math.max(0,Math.trunc(force*(armorBlocked?35:75)/(100+defense/1000)));
      const hp=Math.min(target.hp,hit);
      const org=Math.min(target.org,Math.trunc(hit/3));
      const old=hits.get(target.id)??{hp:0,org:0};hits.set(target.id,{hp:old.hp+hp,org:old.org+org});
      events.push({attacker:u.id,defender:target.id,hpLost:hp,orgLost:org,ammoUsed:ammo,impact:ammo===0?'empty':armorBlocked?'armor':'hit'});
    }
  };
  fire(a,d,true);fire(d,a,false);
  for(const u of [...a,...d]){
    const dmg=hits.get(u.id);if(!dmg)continue;
    u.hp=Math.max(0,u.hp-dmg.hp);u.org=Math.max(0,u.org-dmg.org);
    u.manpower=Math.min(u.manpower,Math.trunc(u.maxManpower*u.hp/Math.max(1,u.maxHp)));
    if(u.org===0||u.hp===0)u.retreating=true;
  }
  const aLive=a.some(x=>x.hp>0&&!x.retreating),dLive=d.some(x=>x.hp>0&&!x.retreating);
  return {attackers:a,defenders:d,events,winner:!aLive?'defenders':!dLive?'attackers':'ongoing',round};
}
