/** Region-based naval/air missions, with exclusive unit reservations and fixed-point capacity. */
import type { AirWing, Fleet, GameDay, Id, Mission, MissionKind } from './contracts.ts';
export interface OperationState { missions:Mission[]; wings:AirWing[]; fleets:Fleet[] }
export function assignMission(world:OperationState,mission:Mission,day:GameDay,range:(wing:AirWing,target:Id)=>boolean):OperationState {
  if(mission.start>day)throw new Error('Cannot activate future mission immediately');
  if(mission.domain==='air'){
    const wing=world.wings.find(x=>x.id===mission.unitId);
    if(!wing)throw new Error('Missing air wing');
    if(wing.transitUntil!==undefined&&wing.transitUntil>day)throw new Error('Air wing in transit');
    if(!range(wing,mission.targetId))throw new Error('Out of air range');
    if(wing.fuel<mission.reservedFuel)throw new Error('Insufficient fuel');
  }else{
    const fleet=world.fleets.find(x=>x.id===mission.unitId);
    if(!fleet)throw new Error('Missing fleet');
    if(fleet.transitUntil!==undefined&&fleet.transitUntil>day)throw new Error('Fleet in transit');
    if(fleet.fuel<mission.reservedFuel)throw new Error('Insufficient fuel');
  }
  const overlap=world.missions.some(m=>m.domain===mission.domain&&m.unitId===mission.unitId&&m.start<=(mission.end??Infinity)&&mission.start<=(m.end??Infinity));
  if(overlap)throw new Error('One group cannot execute two overlapping missions');
  return {...world,missions:[...world.missions,mission].sort((a,b)=>a.id-b.id)};
}
export function effectiveMission(state:OperationState,unitId:Id,domain:'air'|'naval',day:GameDay):Mission|undefined {
  return state.missions.find(m=>m.unitId===unitId&&m.domain===domain&&m.start<=day&&(m.end===undefined||day<=m.end));
}
export function missionName(kind:MissionKind):string {return ({air_superiority:'Hava üstünlüğü',intercept:'Önleme',cas:'Yakın hava desteği',recon:'Keşif',bombard:'Bombardıman',transport:'Nakliye',naval_superiority:'Deniz hâkimiyeti',blockade:'Abluka',convoy_escort:'Konvoy koruma',raid:'Ticaret akını',amphibious_support:'Çıkarma desteği',mine_sweep:'Mayın temizleme'} satisfies Record<MissionKind,string>)[kind];}
