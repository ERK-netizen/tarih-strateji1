/** Atomic peace clause validator and accounting sample. Does not mutate canonical game state. */
import type {CountryId,DiplomaticClause,PeaceTreaty,RegionId} from './contracts.ts';
export interface PeaceSnapshot {regions:Map<RegionId,CountryId>;treasury:Map<CountryId,number>;wars:Set<number>}
export function applyPeace(draft:PeaceTreaty,w:PeaceSnapshot):PeaceSnapshot {
  if(draft.status!=='accepted')throw new Error('Treaty not accepted');
  if(!w.wars.has(draft.warId))throw new Error('War no longer active');
  const regions=new Map(w.regions),treasury=new Map(w.treasury),wars=new Set(w.wars);
  for(const clause of draft.clauses){
    if(!draft.participants.includes(clause.from)||!draft.participants.includes(clause.to))throw new Error('Party not in treaty');
    if(clause.kind==='cession'){
      if(!clause.regions?.length)throw new Error('Territorial clause has no regions');
      for(const r of clause.regions){if(regions.get(r)!==clause.from)throw new Error('Territory not owned by transferor');regions.set(r,clause.to);}
    }else if(clause.kind==='reparations'){
      const amt=clause.money??0;
      if(amt<0||!Number.isSafeInteger(amt))throw new Error('Invalid reparations');
      if((treasury.get(clause.from)??0)<amt)throw new Error('Reparations exceed available treasury; use installment agreement');
      treasury.set(clause.from,(treasury.get(clause.from)??0)-amt);
      treasury.set(clause.to,(treasury.get(clause.to)??0)+amt);
    }
    // Other treaty clauses carry obligations and require the canonical treaty ledger.
  }
  wars.delete(draft.warId);
  return {regions,treasury,wars};
}
