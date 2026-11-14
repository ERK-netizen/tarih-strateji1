import {nextV17Id,type V17State,type V17Order} from './state.ts';
export function orderV17(s:V17State,country:number,unitIds:number[],kind:V17Order['kind'],targetRegion:number,day:number):V17Order {
  if(!unitIds.length||new Set(unitIds).size!==unitIds.length)throw Error('tekil birlik kimlikleri gerekli');
  if(s.orders.some(x=>x.status==='active'&&x.unitIds.some(u=>unitIds.includes(u))))throw Error('bu birliklerin yürürlükte planı var');
  const o:V17Order={id:nextV17Id(s),country,unitIds:[...unitIds].sort((a,b)=>a-b),kind,targetRegion,createdDay:day,expiryDay:day+90,lastAppliedDay:day-1,status:'active'};
  s.orders.push(o);return o;
}
export function executeV17(s:V17State,day:number,canDo:(o:V17Order,u:number)=>boolean,apply:(o:V17Order,u:number)=>void):void {
  for(const o of s.orders.filter(x=>x.status==='active').sort((a,b)=>a.id-b.id)) {
    if(day>o.expiryDay){o.status='completed';continue;}
    if(o.lastAppliedDay===day)continue;
    for(const u of o.unitIds)if(canDo(o,u)){apply(o,u);s.stats.ordersExecuted++;}
    o.lastAppliedDay=day;
  }
}
