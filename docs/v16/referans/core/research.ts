/** Research -> prototype -> production preparation -> deployment.
 * A new technical model, not a replacement for existing 36x12 technology state until schema migration.
 */
import {SCALE,type ResearchNode,type ResearchProject} from './contracts.ts';
function intSqrt(x:number):number {
  if(!Number.isSafeInteger(x)||x<0)throw new RangeError('sqrt input');
  if(x<2)return x;
  let lo=1,hi=Math.min(x,100_000_000),ans=1;
  while(lo<=hi){const m=Math.floor((lo+hi)/2);if(m<=Math.floor(x/m)){ans=m;lo=m+1;}else hi=m-1;}
  return ans;
}
export interface ResearchBudget {money:number; scientists:number; laboratoryCapacity:number; education:number; infrastructure:number; otherProjects:number}
export interface ResearchState { project:ResearchProject; completedNodes:ReadonlySet<number>; stock:{money:number}; unlockedModels:ReadonlySet<number> }
export function canResearch(node:ResearchNode,state:ResearchState):boolean{return node.prereq.every(n=>state.completedNodes.has(n));}
export function researchDaily(node:ResearchNode,state:ResearchState,budget:ResearchBudget):{state:ResearchState;cost:number;advanced:boolean}{
  if(!canResearch(node,state))throw new Error('Prerequisite not complete');
  const p=state.project,stage=p.stage;
  const cost=Math.min(budget.money,Math.max(0,p.budget));
  if(state.stock.money<cost)throw new Error('Insufficient treasury');
  // Strong investments can accelerate one field; limited by staff, labs and diminishing returns.
  const staff=Math.min(Math.max(0,p.scientists),Math.max(0,budget.scientists));
  const staffCap=Math.max(1,Math.min(staff,budget.laboratoryCapacity*10));
  const fundingBonus=Math.min(4*SCALE,Math.trunc(intSqrt(Math.max(0,cost))*1000));
  const education=Math.max(200_000,Math.min(SCALE,budget.education));
  const infrastructure=Math.max(200_000,Math.min(SCALE,budget.infrastructure));
  const competition= Math.max(1,budget.otherProjects+1);
  const points=Math.trunc((staffCap*100 +Math.trunc(fundingBonus/1000))*education/SCALE*infrastructure/SCALE/competition);
  const progress=p.progress+Math.max(1,points);
  const need=node.stageCosts[stage];
  const advanced=progress>=need;
  const final=advanced&&stage===3;
  const next:ResearchProject={...p,stage:advanced&&!final?(stage+1) as 0|1|2|3:stage,progress:advanced&&!final?progress-need:final?need:progress};
  return {state:{...state,stock:{money:state.stock.money-cost},project:next,completedNodes:final?new Set([...state.completedNodes,node.id]):state.completedNodes,unlockedModels:final?new Set([...state.unlockedModels,...node.equipmentUnlock]):state.unlockedModels},cost,advanced};
}
