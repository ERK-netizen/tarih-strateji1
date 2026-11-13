/** v1.6 deterministic effect ledger and dependency resolution; no I/O or wall-clock time. */
import { SCALE, type Domain, type GameDay, type Id } from './contracts.ts';
function mulRatioSafe(n:number,m:number):number {
  const z=(BigInt(n)*BigInt(m))/BigInt(SCALE);
  if(z>BigInt(Number.MAX_SAFE_INTEGER)||z<BigInt(Number.MIN_SAFE_INTEGER))throw new RangeError('effect ratio overflow');
  return Number(z);
}
export type EffectOp='add'|'ratio'|'min'|'max';
export interface Effect {
  id:Id; sourceId:Id; domain:Domain; targetId:Id; key:string; op:EffectOp; amount:number;
  starts:GameDay; expires?:GameDay; prerequisite?:string; explanation:string; priority:number;
}
export interface Ledger { effects:Effect[]; consumedKeys:string[] }
export function registerEffect(ledger:Ledger,e:Effect):Ledger {
  if(!Number.isSafeInteger(e.amount) || !Number.isSafeInteger(e.id)) throw new RangeError('invalid fixed-point amount');
  if(ledger.effects.some(x=>x.id===e.id)) return ledger;
  return { effects:[...ledger.effects,e].sort((a,b)=>a.priority-b.priority||a.id-b.id), consumedKeys:[...ledger.consumedKeys] };
}
/** One-time transfer tracked separately from modifiers; rerunning same event cannot mint goods. */
export function once(ledger:Ledger,key:string,fn:()=>void):boolean {
  if(ledger.consumedKeys.includes(key))return false;
  fn(); ledger.consumedKeys.push(key); ledger.consumedKeys.sort(); return true;
}
export function getEffective(base:number,ledger:Ledger,now:GameDay,domain:Domain,id:Id,key:string,conditions:Set<string>=new Set()):number {
  if(!Number.isSafeInteger(base)) throw new RangeError('base');
  let result=base;
  for(const e of ledger.effects){
    if(e.domain!==domain||e.targetId!==id||e.key!==key||e.starts>now||(e.expires!==undefined&&now>=e.expires))continue;
    if(e.prerequisite&&!conditions.has(e.prerequisite))continue;
    switch(e.op){case 'add':result+=e.amount;break;case 'ratio':result=mulRatioSafe(result,SCALE+e.amount);break;case 'min':result=Math.max(result,e.amount);break;case 'max':result=Math.min(result,e.amount);break;}
    if(!Number.isSafeInteger(result))throw new RangeError('effect overflow '+e.id);
  }
  return result;
}
export function activeEffects(ledger:Ledger,now:GameDay):Effect[]{return ledger.effects.filter(x=>x.starts<=now&&(x.expires===undefined||now<x.expires));}
