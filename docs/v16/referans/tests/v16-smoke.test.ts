import test from 'node:test';
import assert from 'node:assert/strict';
import { registerEffect,getEffective,once,type Ledger } from '../core/effects.ts';
import { citySlots,canConstruct,upgradeCity } from '../core/cities.ts';
import { assignMission } from '../core/operations.ts';
import { combatRound, type BattleUnit } from '../core/combat.ts';
import type { City } from '../core/contracts.ts';

test('effect ledger avoids double register, expiry, executes once',()=>{
 let s:Ledger={effects:[],consumedKeys:[]};
 const fx={id:1,sourceId:2,domain:'ekonomi' as const,targetId:10,key:'vergi',op:'add' as const,amount:500,starts:5,expires:10,explanation:'',priority:1};
 s=registerEffect(s,fx);s=registerEffect(s,fx);
 assert.equal(s.effects.length,1);assert.equal(getEffective(100,s,7,'ekonomi',10,'vergi'),600);
 assert.equal(getEffective(100,s,11,'ekonomi',10,'vergi'),100);
 let n=0;assert.equal(once(s,'test',()=>n++),true);assert.equal(once(s,'test',()=>n++),false);assert.equal(n,1);
});
test('city develops 1..10, infrastructure does not occupy a slot',()=>{
 const c:City={id:1,region:0,country:0,name:'Ankara',level:1,population:1000,infrastructure:0,rail:0,irrigation:0,zoning:0,existingBuildings:[],occupied:false};
 assert.equal(citySlots(c),4);assert.ok(canConstruct(c,{kind:'rail',slots:10}).ok);
 assert.equal(citySlots(upgradeCity(c,2,true)),8);
 assert.throws(()=>upgradeCity(c,2,false));
});
test('air unit cannot execute overlapping missions or fly beyond range',()=>{
 const world={missions:[],wings:[{id:5,country:0,baseRegion:0,currentRegion:0,modelId:0,aircraft:20,ready:20,fuel:100,condition:100}],fleets:[]};
 const m={id:1,unitId:5,domain:'air' as const,type:'cas' as const,targetId:9,start:0,reservedFuel:1,reservedAmmo:0};
 const w=assignMission(world,m,0,()=>true);
 assert.throws(()=>assignMission(w,{...m,id:2},0,()=>true));
 assert.throws(()=>assignMission(world,m,0,()=>false));
});
test('tactical combat consumes ammunition and updates state deterministically',()=>{
 const make=(id:number):BattleUnit=>({id,country:id,manpower:1000,maxManpower:1000,hp:1000,maxHp:1000,org:80000,morale:80000,ammo:100,ammoPerRound:10,attack:120,defense:50,armor:10,piercing:20,speed:5,supply:1000000,commanderAttack:0,commanderDefense:0,equipmentReliability:900000,retreating:false});
 const ctx={terrainDefense:1000000,fortification:0,weather:1000000,airAttack:0,navalAttack:0,attackDirectionCount:1};
 const r=combatRound([make(1)],[make(2)],ctx,1);
 assert.equal(r.attackers[0]!.ammo,90);assert.equal(r.defenders[0]!.ammo,90);
 assert.deepEqual(r,combatRound([make(1)],[make(2)],ctx,1));
});

test('cohort settlement moves real population even without prior ethnic presence',async()=>{
 const {transferCohort,population,validatePopulation,distribution}=await import('../core/demography.ts');
 const one={id:1,region:0,ethnicity:9,culture:8,language:7,faith:6,age:1,sex:0,education:0,occupation:0,classId:0,status:0,persons:100};
 const before={cohorts:[one],births:0,deaths:0,externalImmigration:0,externalEmigration:0};
 const after=transferCohort(before,1,17,10,2);
 assert.equal(population(after),100);assert.ok(validatePopulation(before,after));assert.equal(distribution(after,17,'ethnicity')[0]?.id,9);
});
test('peace deal atomically transfers territory and reparations',async()=>{
 const {applyPeace}=await import('../core/peace.ts');
 const start={regions:new Map([[7,0]]),treasury:new Map([[0,100],[1,0]]),wars:new Set([3])};
 const draft={id:1,warId:3,proposed:10,participants:[0,1],status:'accepted' as const,clauses:[{kind:'cession' as const,from:0,to:1,regions:[7]},{kind:'reparations' as const,from:0,to:1,money:30}]};
 const result=applyPeace(draft,start);
 assert.equal(result.regions.get(7),1);assert.equal(result.treasury.get(0),70);assert.equal(result.treasury.get(1),30);assert.equal(start.regions.get(7),0);
 assert.throws(()=>applyPeace({...draft,clauses:[{kind:'cession',from:0,to:1,regions:[8]}]},start));
});
test('research unlocks equipment only when all four stages finish',async()=>{
 const {researchDaily}=await import('../core/research.ts');
 const node={id:3,code:'motor',name:'Motor',domain:'teknoloji' as const,prereq:[],equipmentUnlock:[9],year:1920,stages:['research','prototype','industrialization','deployment'] as ['research','prototype','industrialization','deployment'],stageCosts:[1,1,1,1] as [number,number,number,number]};
 let state={project:{id:1,country:0,nodeId:3,stage:0 as 0|1|2|3,progress:0,scientists:10,budget:100,started:0},completedNodes:new Set<number>(),stock:{money:1000},unlockedModels:new Set<number>()};
 const budget={money:100,scientists:10,laboratoryCapacity:2,education:1000000,infrastructure:1000000,otherProjects:0};
 for(let i=0;i<3;i++){state=researchDaily(node,state,budget).state;assert.equal(state.unlockedModels.size,0);}
 state=researchDaily(node,state,budget).state;assert.ok(state.unlockedModels.has(9));
});

test('historic person cannot be assigned after death, commander cannot duplicate',async()=>{
 const {availablePerson,appoint,assignCommander}=await import('../core/persons.ts');
 const person={id:9,country:0,name:'Historical Commander',born:-10000,died:100,provenance:{kind:'historical' as const},traits:{leadership:2,logistics:3,attack:4,defense:5,administration:2,diplomacy:1,ideology:1},experience:10,loyalty:20,activeRoles:[]};
 assert.equal(availablePerson(person,99),true);assert.equal(availablePerson(person,100),false);
 assert.throws(()=>appoint([person],[],9,0,'komutan',100));
 const f={id:1,country:0,kind:'army' as const,region:0,manpower:500,maximumManpower:800,organization:90000,morale:90000,experience:0,equipment:{}};
 const assigned=assignCommander([{...f},{...f,id:2}],9,1);
 assert.throws(()=>assignCommander(assigned,9,2));
});
test('commander respects minimum supply before advancing',async()=>{
 const {executeCommanderPlan}=await import('../core/commanders.ts');
 const p={id:1,country:0,name:'Commander',born:-10000,provenance:{kind:'fictional' as const},traits:{leadership:2,logistics:3,attack:4,defense:5,administration:2,diplomacy:1,ideology:1},experience:10,loyalty:20,activeRoles:[]};
 const f={id:9,country:0,kind:'army' as const,region:1,commanderId:1,manpower:1000,maximumManpower:1000,organization:90000,morale:90000,experience:1,equipment:{}};
 const plan={id:4,commanderId:1,formationId:9,kind:'advance' as const,target:[4],minSupply:700000,minOrganization:70000,casualtyLimit:1000,autonomy:'auto' as const,created:0,priority:1};
 const ctx={frontline:new Set([4]),enemies:new Set([4]),supply:new Map([[9,500000]]),targetThreat:new Map([[4,1000]]),currentDay:1};
 assert.equal(executeCommanderPlan(plan,[f],[p],ctx).action,'hold');
 ctx.supply.set(9,900000);assert.equal(executeCommanderPlan(plan,[f],[p],ctx).action,'attack');
});
