// v1.7 paketinin saf çekirdek testleri (üretim, diplomasi, istihbarat, harekât); hedef testleri v17hedef.test.ts'tedir.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { emptyV17, assertV17, type V17EquipmentModel } from '../../packages/engine/src/v17/state.ts';
import {
  produceV17,
  commitProduction,
  addSite,
  addJob,
  reserveSequential,
  factoryPolicyBonus,
} from '../../packages/engine/src/v17/industry.ts';
import { offerV17, replyV17, proposalVisible, expireV17 } from '../../packages/engine/src/v17/diplomacy.ts';
import { networkV17, planOperationV17, resolveV17 } from '../../packages/engine/src/v17/intelligence.ts';
import { orderV17, executeV17 } from '../../packages/engine/src/v17/strategy.ts';
const model: V17EquipmentModel = {
  id: 't1',
  label: 'Deneme',
  era: 'buyuk',
  family: 0,
  firstYear: 1914,
  inputSteel: 4,
  inputCoal: 2,
  labor: 3,
  machine: 5,
};
const input = (stock = { celik: 40, komur: 20 }) => ({ stock, labor: 30, machine: 50, energy: 20, efficiency: 1_000_000 });
test('state empty is canonical, has unique IDs', () => {
  const s = emptyV17();
  const a = addSite(s, 0, 10, 'askeri', 4),
    b = addSite(s, 0, 10, 'sivil', 5);
  assert.notEqual(a, b);
  assertV17(s);
});
test('industrial model obeys all physical inputs', () => {
  const out = produceV17(model, 100, input());
  assert.equal(out.completed, 10);
  assert.equal(out.limiting, 'celik');
  assert.equal(out.inputs.celik, 40);
});
test('zero steel produces zero equipment', () => assert.equal(produceV17(model, 9, input({ celik: 0, komur: 20 })).completed, 0));
test('zero workers produces zero equipment', () => assert.equal(produceV17(model, 9, { ...input(), labor: 0 }).completed, 0));
test('zero machines produces zero equipment', () => assert.equal(produceV17(model, 9, { ...input(), machine: 0 }).completed, 0));
test('zero energy produces zero equipment', () => assert.equal(produceV17(model, 9, { ...input(), energy: 0 }).completed, 0));
test('efficiency does not create fractional units', () =>
  assert.equal(produceV17(model, 9, { ...input(), efficiency: 500_000 }).completed, 4));
test('production subtracts exact resources and adds product once', () => {
  const stock = { celik: 40, komur: 20 };
  commitProduction(stock, model, produceV17(model, 9, input(stock)));
  assert.deepEqual(stock, { celik: 4, komur: 2, 'ekip:t1': 9 });
});
test('insufficient resources never partially subtract before rejection', () => {
  const stock = { celik: 0, komur: 20 };
  assert.throws(() =>
    commitProduction(stock, model, {
      completed: 1,
      limiting: 'celik',
      laborUsed: 3,
      machineUsed: 5,
      energyUsed: 1,
      inputs: { celik: 4, komur: 2 },
    }),
  );
  assert.deepEqual(stock, { celik: 0, komur: 20 });
});
test('multiple lines use one reserve in stable order', () => {
  const stock = { celik: 44, komur: 22 };
  const a = reserveSequential(stock, [
    { id: 2, model, target: 9, capacity: input() },
    { id: 1, model, target: 9, capacity: input() },
  ]);
  assert.equal(a[0]!.id, 1);
  assert.equal(a[0]!.result.completed, 9);
  assert.equal(a[1]!.result.completed, 2);
  assert.equal(stock.celik, 0);
  assert.equal(stock.komur, 0);
  assert.equal((stock as Record<string, number>)['ekip:t1'], 11);
});
test('line requires real site and known product', () => {
  const s = emptyV17();
  s.models.push(model);
  const a = addSite(s, 0, 3, 'askeri', 2);
  assert.equal(addJob(s, 0, a, 't1', 3).target, 3);
  assert.throws(() => addJob(s, 1, a, 't1', 3));
});
test('factory bonus is bounded', () => {
  const s = emptyV17();
  const id = addSite(s, 0, 2, 'askeri', 100);
  s.sites[0]!.policy = 'verim';
  assert.equal(factoryPolicyBonus(s, 0), 100_000);
  assert.equal(factoryPolicyBonus(s, 1), 0);
});
test('diplomatic offer is pending & hidden from outsiders', () => {
  const s = emptyV17();
  const p = offerV17(s, 0, 1, 'ticaret', 10);
  assert.equal(p.status, 'pending');
  assert.equal(proposalVisible(p, 2), false);
  assert.equal(proposalVisible(p, 1), true);
});
test('duplicate active offer is rejected', () => {
  const s = emptyV17();
  offerV17(s, 0, 1, 'ticaret', 10);
  assert.throws(() => offerV17(s, 0, 1, 'ticaret', 11));
});
test('counteroffer uses immutable original and grows revision', () => {
  const s = emptyV17();
  const a = offerV17(s, 0, 1, 'ticaret', 10);
  const b = replyV17(s, a.id, 1, 'counter', 11)!;
  assert.equal(a.status, 'countered');
  assert.equal(b.revision, 2);
  assert.equal(b.parentId, a.id);
  assert.equal(b.from, 1);
});
test('only addressee can accept once', () => {
  const s = emptyV17();
  const a = offerV17(s, 0, 1, 'ticaret', 10);
  assert.throws(() => replyV17(s, a.id, 2, 'accept', 11));
  replyV17(s, a.id, 1, 'accept', 11);
  assert.throws(() => replyV17(s, a.id, 1, 'accept', 12));
  assert.equal(s.stats.treatiesAccepted, 1);
});
test('pending offers expire', () => {
  const s = emptyV17();
  const a = offerV17(s, 0, 1, 'garanti', 10);
  expireV17(s, 56);
  assert.equal(a.status, 'expired');
});
test('spy network is persistent and strengthening is capped', () => {
  const s = emptyV17();
  const a = networkV17(s, 0, 1, 3);
  for (let i = 0; i < 30; i++) networkV17(s, 0, 1, 3);
  assert.equal(s.networks.length, 1);
  assert.equal(a.strength, 1_000_000);
});
test('spy operations obey cooldown', () => {
  const s = emptyV17();
  const n = networkV17(s, 0, 1, 3);
  assert.throws(() => planOperationV17(s, 0, n.id, 'bilgi', -1, 4));
  planOperationV17(s, 0, n.id, 'bilgi', -1, 18);
  assert.throws(() => planOperationV17(s, 0, n.id, 'bilgi', -1, 19));
});
test('spy operation resolves once with deterministic roll', () => {
  const s = emptyV17(),
    n = networkV17(s, 0, 1, 0);
  const op = planOperationV17(s, 0, n.id, 'sabotaj', 4, 15);
  let called = 0;
  resolveV17(
    s,
    36,
    () => 0,
    () => called++,
  );
  resolveV17(
    s,
    36,
    () => 0,
    () => called++,
  );
  assert.equal(called, 1);
  assert.equal(op.status, 'completed');
  assert.equal(s.stats.opsResolved, 1);
});
test('operation failure does not call successful effect', () => {
  const s = emptyV17(),
    n = networkV17(s, 0, 1, 0);
  const op = planOperationV17(s, 0, n.id, 'sabotaj', 4, 15);
  let called = 0;
  resolveV17(
    s,
    36,
    () => 990_000,
    () => called++,
  );
  assert.equal(called, 0);
  assert.equal(op.status, 'exposed');
});
test('orders are stable and conflicting group orders forbidden', () => {
  const s = emptyV17();
  const a = orderV17(s, 0, [2, 1], 'savun', 4, 10);
  assert.deepEqual(a.unitIds, [1, 2]);
  assert.throws(() => orderV17(s, 0, [2], 'taarruz', 5, 11));
});
test('plans execute once per day, not once per invocation', () => {
  const s = emptyV17();
  orderV17(s, 0, [5], 'intikal', 3, 10);
  let called = 0;
  executeV17(
    s,
    11,
    () => true,
    () => called++,
  );
  executeV17(
    s,
    11,
    () => true,
    () => called++,
  );
  assert.equal(called, 1);
});
test('plans expire without endless execution', () => {
  const s = emptyV17();
  const p = orderV17(s, 0, [5], 'intikal', 3, 10);
  executeV17(
    s,
    101,
    () => true,
    () => {
      throw Error('should not run');
    },
  );
  assert.equal(p.status, 'completed');
});
