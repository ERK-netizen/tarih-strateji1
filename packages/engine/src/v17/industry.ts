import { nextV17Id, safeNonnegative, type V17State, type V17Kind, type V17Job, type V17EquipmentModel } from './state.ts';
/** DETERMINISTIC physical production kernel: independent from legacy factory accounting until cutover. */
export type V17Stock = Record<string, number>;
export interface V17ProductionInput {
  stock: V17Stock;
  labor: number;
  machine: number;
  energy: number;
  efficiency: number /** 0..1e6 */;
}
export interface V17ProductionResult {
  completed: number;
  laborUsed: number;
  machineUsed: number;
  energyUsed: number;
  inputs: V17Stock;
  limiting: string;
}
const floor = (a: number, b: number) => (b <= 0 ? Number.MAX_SAFE_INTEGER : Math.floor(a / b));
export function produceV17(model: V17EquipmentModel, requested: number, x: V17ProductionInput): V17ProductionResult {
  for (const [name, n] of Object.entries({ requested, labor: x.labor, machine: x.machine, energy: x.energy, efficiency: x.efficiency }))
    safeNonnegative(n, name);
  if (x.efficiency > 1_000_000) throw Error('verim > %100');
  const limits: [string, number][] = [
    ['labor', floor(x.labor, model.labor)],
    ['machine', floor(x.machine, model.machine)],
    ['energy', floor(x.energy, 1)],
    ['celik', floor(x.stock.celik ?? 0, model.inputSteel)],
    ['komur', floor(x.stock.komur ?? 0, model.inputCoal)],
  ];
  const [limiting, max] = limits.sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0]!;
  const possible = Math.min(requested, max);
  const completed = Math.floor(possible / 1_000_000) * x.efficiency + Math.floor(((possible % 1_000_000) * x.efficiency) / 1_000_000);
  return {
    completed,
    laborUsed: completed * model.labor,
    machineUsed: completed * model.machine,
    energyUsed: completed,
    inputs: { celik: completed * model.inputSteel, komur: completed * model.inputCoal },
    limiting: possible < requested ? limiting : completed < requested ? 'verim' : 'yok',
  };
}
export function commitProduction(stock: V17Stock, model: V17EquipmentModel, result: V17ProductionResult): void {
  const entries = Object.entries(result.inputs);
  for (const [k, n] of entries) if ((stock[k] ?? 0) < n) throw Error('v17 stok yarışması');
  for (const [k, n] of entries) stock[k] = (stock[k] ?? 0) - n;
  stock[`ekip:${model.id}`] = (stock[`ekip:${model.id}`] ?? 0) + result.completed;
}
export function addSite(s: V17State, country: number, region: number, kind: V17Kind, capacity: number): number {
  safeNonnegative(capacity, 'capacity');
  const id = nextV17Id(s);
  s.sites.push({ id, country, region, kind, capacity, specialization: -1, policy: 'normal' });
  return id;
}
export function addJob(s: V17State, country: number, siteId: number, modelId: string, target: number): V17Job {
  safeNonnegative(target, 'target');
  const site = s.sites.find((q) => q.id === siteId && q.country === country);
  if (!site || site.kind !== 'askeri') throw Error('üretim için askerî tesis gerekli');
  if (!s.models.some((m) => m.id === modelId)) throw Error('model bulunamadı');
  const job: V17Job = { id: nextV17Id(s), country, siteId, modelId, target, produced: 0, wip: 0, active: true };
  s.jobs.push(job);
  return job;
}
export function reserveSequential(
  stock: V17Stock,
  reqs: { id: number; model: V17EquipmentModel; target: number; capacity: V17ProductionInput }[],
): { id: number; result: V17ProductionResult }[] {
  const tmp = { ...stock };
  const out: { id: number; result: V17ProductionResult }[] = [];
  for (const q of [...reqs].sort((a, b) => a.id - b.id)) {
    const result = produceV17(q.model, q.target, { ...q.capacity, stock: tmp });
    commitProduction(tmp, q.model, result);
    out.push({ id: q.id, result });
  }
  for (const [k, v] of Object.entries(tmp)) stock[k] = v;
  return out;
}
/** Existing engine continues to own actual factory output. This forecast is not applied in P5 by default. */
export function factoryPolicyBonus(s: V17State, country: number): number {
  const sites = s.sites.filter((q) => q.country === country && q.kind === 'askeri' && q.policy === 'verim');
  return Math.min(
    100_000,
    sites.reduce((v, q) => v + q.capacity * 2500, 0),
  );
}
