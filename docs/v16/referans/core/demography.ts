/** Sparse cohort accounting. No population is created when settling previously absent culture. */
import type {DemographicCohort,Id} from './contracts.ts';
export interface CohortLedger { cohorts:DemographicCohort[]; births:number; deaths:number; externalImmigration:number; externalEmigration:number }
export function population(l:CohortLedger):number{return l.cohorts.reduce((s,c)=>s+c.persons,0);}
export function transferCohort(l:CohortLedger,cohortId:Id,toRegion:Id,count:number,newId:Id):CohortLedger {
  if(!Number.isSafeInteger(count)||count<1)throw new RangeError('count');
  const from=l.cohorts.find(c=>c.id===cohortId);
  if(!from||from.persons<count)throw new Error('Insufficient population in origin');
  if(toRegion===from.region)throw new Error('Cannot transfer to same region');
  if(l.cohorts.some(c=>c.id===newId))throw new Error('Duplicate cohort id');
  const reduced=l.cohorts.map(c=>c.id===cohortId?{...c,persons:c.persons-count}:c);
  // No requirement that the destination already contains the ethnicity/culture.
  return {...l,cohorts:[...reduced,{...from,id:newId,region:toRegion,persons:count}]};
}
export function validatePopulation(before:CohortLedger,after:CohortLedger):boolean {
  const expected=population(before)+(after.births-before.births)-(after.deaths-before.deaths)+(after.externalImmigration-before.externalImmigration)-(after.externalEmigration-before.externalEmigration);
  return expected===population(after)&&after.cohorts.every(c=>Number.isSafeInteger(c.persons)&&c.persons>=0);
}
export function distribution(l:CohortLedger,region:Id,dimension:'ethnicity'|'culture'|'language'|'faith'):{id:Id;persons:number;partsPerMillion:number}[]{
  const m=new Map<Id,number>();let total=0;
  for(const c of l.cohorts)if(c.region===region&&c.persons>0){const id=c[dimension];m.set(id,(m.get(id)??0)+c.persons);total+=c.persons;}
  return [...m].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).map(([id,persons])=>({id,persons,partsPerMillion:total?Math.trunc(persons*1_000_000/total):0}));
}
