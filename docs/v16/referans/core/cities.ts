/** City construction slots: level 1..10, four per level; network infrastructure is exempt. */
import type { Building, BuildingKind, City } from './contracts.ts';
export const NETWORK_WORKS:ReadonlySet<BuildingKind>=new Set(['rail','irrigation','infrastructure','urban_planning']);
export function cityLevel(level:number):number { if(!Number.isInteger(level)||level<1||level>10)throw new RangeError('city level must be 1..10');return level; }
export function citySlots(city:Pick<City,'level'>):number {return cityLevel(city.level)*4;}
export function usedSlots(city:Pick<City,'existingBuildings'>):number {
  return city.existingBuildings.filter(b=>!NETWORK_WORKS.has(b.kind)).reduce((n,b)=>n+b.slots,0);
}
export function availableSlots(city:Pick<City,'level'|'existingBuildings'>):number {return Math.max(0,citySlots(city)-usedSlots(city));}
export function canConstruct(city:Pick<City,'level'|'existingBuildings'|'occupied'>, b:Pick<Building,'kind'|'slots'>):{ok:boolean;reason:string} {
  if(city.occupied)return {ok:false,reason:'İşgal yönetimi veya barış sonrası inşa izni gereklidir'};
  if(!Number.isInteger(b.slots)||b.slots<0)return {ok:false,reason:'Geçersiz yuva gereksinimi'};
  if(NETWORK_WORKS.has(b.kind))return {ok:true,reason:'Ağ/imar yatırımı yapı yuvası tüketmez; kaynak ve proje maliyeti yine gerekir'};
  return availableSlots(city)>=b.slots?{ok:true,reason:'İnşa yuvası mevcut'}:{ok:false,reason:'Şehir düzeyini artır veya mevcut yapıları dönüştür'};
}
/** Level upgrade only changes capacity. No free factory or production. */
export function upgradeCity(city:City,newLevel:number,paid:boolean):City {
  cityLevel(newLevel);
  if(newLevel!==city.level+1)throw new Error('Only one level per completed project');
  if(!paid)throw new Error('Urban development cannot be free');
  return {...city,level:newLevel,existingBuildings:[...city.existingBuildings]};
}
