/**
 * Tarih Strateji v1.7 R2 — bağımsız deterministik algoritma ÖRNEĞİ.
 * Bu dosya oyun motorunun bir yaması veya dosya eşleniği DEĞİLDİR.
 * Gerçek motor sabit-nokta yardımcıları, SoA, gün fazları, rota cache ve idempotency ile uyarlanmalıdır.
 */
export const S = 1_000_000;
const int = (v, name='value') => {
  if (!Number.isSafeInteger(v)) throw new RangeError(`${name}: not safe int`);
  return v;
};
function ceilDivPos(a, b) {
  int(a); int(b);
  if (a < 0 || b <= 0) throw new RangeError('positive numerator / nonzero denominator');
  return Number((BigInt(a) + BigInt(b) - 1n) / BigInt(b));
}
function mulDivFloor(a,b,d) {
  int(a);int(b);int(d);
  if(a<0||b<0||d<=0)throw new RangeError('invalid mulDiv');
  const q=BigInt(a)*BigInt(b)/BigInt(d);
  if(q>BigInt(Number.MAX_SAFE_INTEGER))throw new RangeError('overflow');
  return Number(q);
}
const clone=(x)=>structuredClone(x);

/**
 * Advance a route for exactly one day or until a block/encounter.
 * Route edges: [{id, lengthMeters, speedMetersPerDay, permitted, defended, capacityAvailable}].
 * state: {edgeIndex, progressMeters, lastMovedDay}.
 * For enemy contacts stop BEFORE entering destination. Derived edge behavior is constant for that day.
 */
export function moveOneDay(state, routeEdges, day, maxEdgeTransitions=64) {
  const st=clone(state);
  int(day);int(st.edgeIndex);int(st.progressMeters);
  if(st.lastMovedDay===day) return {state:st,completed:st.edgeIndex>=routeEdges.length,stopped:'ALREADY_PROCESSED',crossed:[],timeUsedMicro:0};
  if(st.edgeIndex>=routeEdges.length) return {state:{...st,lastMovedDay:day},completed:true,stopped:'ARRIVED',crossed:[],timeUsedMicro:0};
  st.lastMovedDay=day;
  let remain=S,transitions=0, stopped='DAY_END'; const crossed=[];
  while(remain>0&&st.edgeIndex<routeEdges.length&&transitions<maxEdgeTransitions){
    const edge=routeEdges[st.edgeIndex];
    if(!edge||!Number.isSafeInteger(edge.id)||!Number.isSafeInteger(edge.lengthMeters)||edge.lengthMeters<=0)throw new RangeError('invalid edge');
    const speed=int(edge.speedMetersPerDay,'speed');
    if(!edge.permitted){stopped='ACCESS_DENIED';break;}
    if(edge.defended){stopped='CONTACT';break;}
    if(edge.capacityAvailable===false){stopped='CAPACITY_FULL';break;}
    if(speed<=0){stopped='ZERO_SPEED';break;}
    const need=edge.lengthMeters-st.progressMeters;
    if(need<=0)throw new RangeError('invalid progress');
    const micros=ceilDivPos(need*S,speed);
    if(micros<=remain){
      remain-=micros;crossed.push(edge.id);st.edgeIndex++;st.progressMeters=0;transitions++;
    } else {
      const advanced=mulDivFloor(speed,remain,S);
      st.progressMeters=Math.min(edge.lengthMeters-1,st.progressMeters+advanced);
      remain=0;
    }
  }
  if(st.edgeIndex>=routeEdges.length)stopped='ARRIVED';
  else if(transitions>=maxEdgeTransitions)stopped='HOP_LIMIT';
  return {state:st,completed:st.edgeIndex>=routeEdges.length,stopped,crossed,timeUsedMicro:S-remain};
}

/** Conservative ETA for unchanged fixed-condition edges. Returns null when blocked. */
export function estimateDays(state,routeEdges,startDay=1,maxDays=20000){
 let st=clone(state);
 for(let i=0;i<maxDays;i++){
  const next=moveOneDay(st,routeEdges,startDay+i);
  if(next.completed)return i+1;
  if(['ACCESS_DENIED','CONTACT','CAPACITY_FULL','ZERO_SPEED'].includes(next.stopped))return null;
  st=next.state;
 }
 return null;
}

/**
 * Resource-limited physical batch. Gross starts consume inputs; net finished output is capped by quality yield.
 * No input is created. Waste (started - completed) is explicit.
 * This is an illustrative discrete batch, not WIP/recipe refit from live game.
 */
export function produceBatch(stock,capacities,recipe){
 const res=clone(stock), r=clone(recipe);
 const minCost=['machineMinutesPerUnit','laborMinutesPerUnit','energyPerUnit'];
 for(const k of minCost) if(!Number.isSafeInteger(r[k])||r[k]<=0)throw new RangeError('invalid recipe cost');
 for(const k of ['machineMinutes','laborMinutes','energyAvailable']) if(!Number.isSafeInteger(capacities[k])||capacities[k]<0)throw new RangeError('invalid capacity');
 const quality=int(capacities.qualityFixed??S);
 if(quality<0||quality>S)throw new RangeError('invalid quality');
 let gross=Math.min(Math.floor(capacities.machineMinutes/r.machineMinutesPerUnit), Math.floor(capacities.laborMinutes/r.laborMinutesPerUnit), Math.floor(capacities.energyAvailable/r.energyPerUnit));
 for(const [item,qty] of Object.entries(r.materials)){
  if(!Number.isSafeInteger(qty)||qty<=0)throw new RangeError('recipe material');
  if(!Number.isSafeInteger(res[item]??0)||(res[item]??0)<0)throw new RangeError('negative stock');
  gross=Math.min(gross,Math.floor((res[item]??0)/qty));
 }
 gross=Math.max(0,gross);
 const consumed={};
 for(const [item,qty] of Object.entries(r.materials)){
  const cost=mulDivFloor(gross,qty,1);
  res[item]-=cost;consumed[item]=cost;
 }
 const completed=mulDivFloor(gross,quality,S);
 return {stock:res,started:gross,completed,scrap:gross-completed,consumed};
}

/** Immutable, idempotent treaty revision transitions. */
export function reviseTreaty(treaty,action,revisionNumber){
 const t=clone(treaty);int(revisionNumber);
 if(action==='COUNTER'){
   if(t.state!=='SENT'||t.revision!==revisionNumber)throw new Error('cannot counter');
   return {...t,state:'SENT',revision:t.revision+1,history:[...t.history,{event:'COUNTER',from:revisionNumber}]};
 }
 if(action==='ACCEPT'){
   if(t.state==='ACCEPTED'&&t.revision===revisionNumber)return t;
   if(t.state!=='SENT'||t.revision!==revisionNumber)throw new Error('stale/invalid accept');
   return {...t,state:'ACCEPTED',history:[...t.history,{event:'ACCEPT',revision:revisionNumber}]};
 }
 if(action==='REJECT'){
   if(t.state!=='SENT'||t.revision!==revisionNumber)throw new Error('cannot reject');
   return {...t,state:'REJECTED',history:[...t.history,{event:'REJECT',revision:revisionNumber}]};
 }
 throw new RangeError('unknown action');
}

/** Only authorized parties/readers or explicit intelligence reports can read secret clauses. */
export function visibleTreatyClauses(clauses,observerCountryId,knownByIntelClauseIds=[]){
 const known=new Set(knownByIntelClauseIds);
 return clauses.filter(c=>!c.secret||c.parties.includes(observerCountryId)||known.has(c.id)).map(c=>clone(c));
}
