/** Historical/fantasy persons and commander assignment without duplication. */
import type { Appointment, Formation, GameDay, Id, Person, Role } from './contracts.ts';
export function availablePerson(p:Person,day:GameDay):boolean{return day>=p.born+16*365&&(p.died===undefined||day<p.died);}
export function appoint(persons:Person[],appointments:Appointment[],personId:Id,country:Id,role:Role,day:GameDay):Appointment[]{
  const p=persons.find(x=>x.id===personId);
  if(!p||p.country!==country||!availablePerson(p,day))throw new Error('Person not available');
  if(appointments.some(x=>x.personId===personId&&x.role===role&&x.ended===undefined))throw new Error('Duplicate appointment');
  return [...appointments,{personId,country,role,started:day,authority:0}];
}
export function assignCommander(formations:Formation[],commanderId:Id,formationId:Id):Formation[]{
  if(formations.some(f=>f.commanderId===commanderId&&f.id!==formationId))throw new Error('Commander already assigned');
  if(!formations.some(f=>f.id===formationId))throw new Error('Formation not found');
  return formations.map(f=>f.id===formationId?{...f,commanderId}:f);
}
export function gainExperience(p:Person,earned:number,cap=100_000):Person {
  if(!Number.isSafeInteger(earned)||earned<0)throw new RangeError('experience');
  return {...p,experience:Math.min(cap,p.experience+earned)};
}
