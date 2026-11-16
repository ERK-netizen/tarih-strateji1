import {test} from 'node:test';
import assert from 'node:assert/strict';
import {moveOneDay,estimateDays,produceBatch,reviseTreaty,visibleTreatyClauses,S} from './strateji_ref.mjs';
const base={edgeIndex:0,progressMeters:0,lastMovedDay:0};
const edge=(id,km,speedKm=150,x={})=>({id,lengthMeters:km*1000,speedMetersPerDay:speedKm*1000,permitted:true,defended:false,capacityAvailable:true,...x});
test('two edges in one day without speed disappearing',()=>{
 const r=moveOneDay(base,[edge(1,50),edge(2,50)],1);
 assert.equal(r.completed,true);assert.deepEqual(r.crossed,[1,2]);assert.equal(r.state.edgeIndex,2);
});
test('long edge partial progress and next day completion',()=>{
 const rt=[edge(1,100,75)];const a=moveOneDay(base,rt,1);assert.equal(a.state.progressMeters,75000);
 const b=moveOneDay(a.state,rt,2);assert.equal(b.completed,true);
});
test('defended enemy node cannot be skipped',()=>{
 const r=moveOneDay(base,[edge(1,50),edge(2,50,150,{defended:true}),edge(3,20)],1);
 assert.equal(r.stopped,'CONTACT');assert.deepEqual(r.crossed,[1]);assert.equal(r.state.edgeIndex,1);
});
test('without available rail capacity movement halts',()=>{
 const r=moveOneDay(base,[edge(1,100,700,{capacityAvailable:false})],1);
 assert.equal(r.stopped,'CAPACITY_FULL');assert.equal(r.state.progressMeters,0);
});
test('fixed ETA equals actual repeated day advancement',()=>{
 const route=[edge(1,100,75),edge(2,20,75)];let st={...base};let days=0;
 do {const result=moveOneDay(st,route,days+1);st=result.state;days++;if(result.completed)break;}while(days<10);
 assert.equal(estimateDays(base,route),days);
});
test('duplicate same day cannot move again',()=>{
 const one=moveOneDay(base,[edge(1,100,75)],1);
 const repeat=moveOneDay(one.state,[edge(1,100,75)],1);
 assert.equal(repeat.stopped,'ALREADY_PROCESSED');assert.deepEqual(repeat.state,one.state);
});
test('no material means zero rifles',()=>{
 const r=produceBatch({steel:0,coal:40},{machineMinutes:4000,laborMinutes:4000,energyAvailable:4000,qualityFixed:S},{machineMinutesPerUnit:100,laborMinutesPerUnit:100,energyPerUnit:1,materials:{steel:1}});
 assert.equal(r.completed,0);assert.equal(r.stock.steel,0);
});
test('no staff despite resources means zero',()=>{
 const r=produceBatch({steel:100},{machineMinutes:1000,laborMinutes:0,energyAvailable:100,qualityFixed:S},{machineMinutesPerUnit:10,laborMinutesPerUnit:10,energyPerUnit:1,materials:{steel:1}});
 assert.equal(r.completed,0);
});
test('input batches cannot spend same steel twice',()=>{
 const recipe={machineMinutesPerUnit:10,laborMinutesPerUnit:10,energyPerUnit:1,materials:{steel:1}};
 const cap={machineMinutes:100,laborMinutes:100,energyAvailable:100,qualityFixed:S};
 const first=produceBatch({steel:1},cap,recipe);const second=produceBatch(first.stock,cap,recipe);
 assert.equal(first.completed+second.completed,1);assert.equal(second.stock.steel,0);
});
test('quality scrap explicit, no extra output',()=>{
 const r=produceBatch({steel:10},{machineMinutes:100,laborMinutes:100,energyAvailable:100,qualityFixed:500000},{machineMinutesPerUnit:10,laborMinutesPerUnit:10,energyPerUnit:1,materials:{steel:1}});
 assert.equal(r.started,10);assert.equal(r.completed,5);assert.equal(r.scrap,5);assert.equal(r.stock.steel,0);
});
test('treaty counter invalidates previous revision',()=>{
 const a={state:'SENT',revision:1,history:[]};const b=reviseTreaty(a,'COUNTER',1);
 assert.equal(a.revision,1);assert.equal(b.revision,2);assert.throws(()=>reviseTreaty(b,'ACCEPT',1));
});
test('duplicate accept idempotent',()=>{
 const x={state:'SENT',revision:5,history:[]},a=reviseTreaty(x,'ACCEPT',5),b=reviseTreaty(a,'ACCEPT',5);
 assert.equal(a.history.length,1);assert.deepEqual(a,b);
});
test('secret clauses require party or intel authorization',()=>{
 const c=[{id:1,secret:false,parties:[1,2]},{id:2,secret:true,parties:[1,2]},{id:3,secret:true,parties:[2,3]}];
 assert.deepEqual(visibleTreatyClauses(c,4).map(x=>x.id),[1]);
 assert.deepEqual(visibleTreatyClauses(c,1).map(x=>x.id),[1,2]);
 assert.deepEqual(visibleTreatyClauses(c,4,[3]).map(x=>x.id),[1,3]);
});
