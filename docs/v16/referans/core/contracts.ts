/** Tarih Strateji v1.6 — ayrı derlenebilen veri sözleşmeleri.
 * Bu tipler tasarlanmış genişleme katmanıdır. Mevcut şema 7'ye henüz entegre DEĞİLDİR.
 * Kanonik durum için float değil güvenli tam sayılar; oran ölçeği 1_000_000.
 */
export type Id = number;
export type GameDay = number;
export type RegionId = Id;
export type CountryId = Id;
export const SCALE = 1_000_000;

export type Domain = 'demografi'|'ekonomi'|'siyaset'|'diplomasi'|'istihbarat'|'teknoloji'|'kara'|'hava'|'deniz'|'sehir'|'lojistik'|'olay';
export type Role = 'devlet_baskani'|'hukumet_baskani'|'bakan'|'parti_lideri'|'ideolog'|'diplomat'|'komutan'|'bilim_insani'|'istihbarat';
export interface HistoricalProvenance { kind:'historical'|'fictional'|'alternate'; source?:string; validFrom?:GameDay; validUntil?:GameDay }
export interface Person {
  id:Id; country:CountryId; name:string; born:GameDay; died?:GameDay;
  provenance:HistoricalProvenance;
  traits:{ leadership:number; logistics:number; attack:number; defense:number; administration:number; diplomacy:number; ideology:Id };
  experience:number; loyalty:number; activeRoles:Role[];
}
export interface Appointment { personId:Id; country:CountryId; role:Role; started:GameDay; ended?:GameDay; authority:number }
export interface Party { id:Id; country:CountryId; name:string; ideologyId:Id; organization:number; popularity:number; banned:boolean; leaderPersonId?:Id; born:GameDay; dissolved?:GameDay }
export interface Ideology { id:Id; code:string; name:string; periodFrom:number; periodTo?:number; axes:{ authoritarian:number; economic:number; nationalist:number; reform:number }; compatibleRegimes:string[] }
export interface Government { country:CountryId; regimeId:Id; parties:Id[]; ministers:Appointment[]; legitimacy:number; electionDay?:GameDay; trustByCountry:Record<CountryId,number> }
export type FormationKind = 'division'|'corps'|'army'|'army_group'|'front'|'naval_task_force'|'air_wing';
export type CommanderOrder = 'defend'|'prepare'|'advance'|'breakthrough'|'encircle'|'withdraw'|'reserve'|'train'|'reposition';
export interface CommanderPlan { id:Id; commanderId:Id; formationId:Id; kind:CommanderOrder; from?:RegionId; target:RegionId[]; minSupply:number; minOrganization:number; casualtyLimit:number; autonomy:'advisory'|'auto'; created:GameDay; expires?:GameDay; priority:number }
export interface Formation { id:Id; country:CountryId; kind:FormationKind; parentId?:Id; commanderId?:Id; region:RegionId; manpower:number; maximumManpower:number; organization:number; morale:number; experience:number; equipment:Record<Id,number>; allocatedPlanId?:Id }
export interface EquipmentModel { id:Id; name:string; realName?:string; country?:CountryId; firstYear:number; provenance:HistoricalProvenance; prerequisiteTechnology:Id[]; attack:number; defense:number; penetration:number; protection:number; reliability:number; speed:number; supply:number; maintenance:number; fuel:number; ammunition:number; productionCost:number; factoryType:'civil'|'military'|'shipyard'|'aircraft' }
export interface MilitaryStock { country:CountryId; modelId:Id; produced:number; available:number; assigned:number; damaged:number; destroyed:number; inTransit:number }
export interface AirWing { id:Id; country:CountryId; commanderId?:Id; baseRegion:RegionId; currentRegion:RegionId; modelId:Id; aircraft:number; ready:number; fuel:number; condition:number; mission?:Mission; transitUntil?:GameDay }
export interface Fleet { id:Id; country:CountryId; commanderId?:Id; homePort:RegionId; currentSeaZone:Id; shipModels:Record<Id,number>; personnel:number; fuel:number; condition:number; mission?:Mission; transitUntil?:GameDay }
export type MissionKind='air_superiority'|'intercept'|'cas'|'recon'|'bombard'|'transport'|'naval_superiority'|'blockade'|'convoy_escort'|'raid'|'amphibious_support'|'mine_sweep';
export interface Mission { id:Id; unitId:Id; domain:'air'|'naval'; type:MissionKind; targetId:Id; frontId?:Id; start:GameDay; end?:GameDay; reservedFuel:number; reservedAmmo:number }
export interface City { id:Id; region:RegionId; country:CountryId; name:string; level:number; population:number; infrastructure:number; rail:number; irrigation:number; zoning:number; existingBuildings:Building[]; occupied:boolean }
export type BuildingKind='military_factory'|'civil_factory'|'airbase'|'shipyard'|'barracks'|'laboratory'|'hospital'|'university'|'housing'|'power_plant'|'depot'|'port'|'rail'|'irrigation'|'infrastructure'|'urban_planning';
export interface Building { id:Id; cityId:Id; kind:BuildingKind; level:number; slots:number; damaged:number; maintained:boolean }
export interface ResearchNode { id:Id; code:string; name:string; domain:Domain; prereq:Id[]; equipmentUnlock:Id[]; year:number; stages:['research','prototype','industrialization','deployment']; stageCosts:[number,number,number,number] }
export interface ResearchProject { id:Id; country:CountryId; nodeId:Id; stage:0|1|2|3; progress:number; laboratoryId?:Id; scientists:number; budget:number; started:GameDay }
export interface DemographicCohort { id:Id; region:RegionId; ethnicity:Id; culture:Id; language:Id; faith:Id; age:Id; sex:Id; education:Id; occupation:Id; classId:Id; status:Id; persons:number }
export interface IntelReport { id:Id; country:CountryId; targetCountry:CountryId; topic:Domain; targetId?:Id; observedDay:GameDay; knownFrom:'public'|'agent'|'recon'|'diplomatic'; confidence:number; lower:number; upper:number; expires?:GameDay }
export interface DiplomaticClause { kind:'cession'|'reparations'|'demilitarization'|'ceasefire'|'puppet'|'recognition'|'access'|'release_country'|'sanction_end'; from:CountryId; to:CountryId; regions?:RegionId[]; money?:number; installments?:number; duration?:number }
export interface PeaceTreaty { id:Id; warId:Id; proposed:GameDay; participants:CountryId[]; clauses:DiplomaticClause[]; status:'draft'|'sent'|'accepted'|'rejected'|'expired' }
export interface DiplomaticMemory { id:Id; actor:CountryId; target:CountryId; day:GameDay; type:string; trustDelta:number; public:boolean; expires?:GameDay }
export interface HistoricalEvent { id:Id; key:string; earliest:GameDay; latest?:GameDay; conditions:unknown; choices:{ id:Id; label:string; effects:Id[] }[]; selected?:Id; triggeredAt?:GameDay; repeatable:boolean }
export interface StrategicAiPlan { id:Id; country:CountryId; goal:string; started:GameDay; priority:number; budget:number; constraints:Record<string,number>; objectives:Id[]; lastReview:GameDay; status:'planning'|'executing'|'suspended'|'complete'|'failed' }
export interface ChangeTrace { day:GameDay; domain:Domain; sourceId:Id; targetId:Id; before:number; after:number; reason:string }
export interface V16Indexes { personsByCountry:Record<Id,Id[]>; formationsByCountry:Record<Id,Id[]>; partiesByCountry:Record<Id,Id[]>; missionsByUnit:Record<Id,Id> }
