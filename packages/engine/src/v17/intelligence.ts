import { nextV17Id, type V17State, type V17Network, type V17Operation } from './state.ts';
export function networkV17(s: V17State, owner: number, target: number, day: number): V17Network {
  if (owner === target || owner < 0 || target < 0) throw Error('ağ hedefi geçersiz');
  let n = s.networks.find((x) => x.owner === owner && x.target === target);
  if (n) {
    n.strength = Math.min(1_000_000, n.strength + 75_000);
    return n;
  }
  n = { id: nextV17Id(s), owner, target, strength: 100_000, exposure: 0, nextActionDay: day + 15 };
  s.networks.push(n);
  return n;
}
export function planOperationV17(
  s: V17State,
  owner: number,
  networkId: number,
  kind: V17Operation['kind'],
  region: number,
  day: number,
): V17Operation {
  const network = s.networks.find((x) => x.id === networkId && x.owner === owner);
  if (!network) throw Error('istihbarat ağı bulunamadı');
  if (day < network.nextActionDay) throw Error('ağ hazırlanıyor');
  if (s.operations.some((x) => x.networkId === networkId && x.status === 'preparing')) throw Error('aynı ağda başka aktif operasyon var');
  network.nextActionDay = day + 60;
  const op: V17Operation = {
    id: nextV17Id(s),
    owner,
    target: network.target,
    region,
    networkId,
    kind,
    createdDay: day,
    resolveDay: day + 21,
    status: 'preparing',
    result: 0,
  };
  s.operations.push(op);
  return op;
}
export function resolveV17(s: V17State, day: number, roll: (id: number) => number, onSuccess: (op: V17Operation) => void): void {
  for (const op of s.operations.filter((x) => x.status === 'preparing' && x.resolveDay <= day).sort((a, b) => a.id - b.id)) {
    const n = s.networks.find((x) => x.id === op.networkId);
    if (!n) {
      op.status = 'failed';
      continue;
    }
    const chance = Math.min(850_000, 180_000 + Math.floor((n.strength * 6) / 10));
    const v = roll(op.id);
    if (!Number.isSafeInteger(v) || v < 0 || v >= 1_000_000) throw Error('rng sınırı');
    if (v < chance) {
      op.status = 'completed';
      op.result = 1;
      onSuccess(op);
      n.strength = Math.max(0, n.strength - 20_000);
    } else {
      op.status = v > 920_000 ? 'exposed' : 'failed';
      op.result = 0;
      n.exposure = Math.min(1_000_000, n.exposure + 60_000);
    }
    s.stats.opsResolved++;
  }
}
