import assert from "node:assert/strict";
import { projectPricing, canRelease, roundMoney } from "../lib/policy.ts";
const p = projectPricing(1000000, 100000, "contractor", "CO");
assert.deepEqual(p, {
  amount: 1000000,
  credit: 100000,
  fee: 50000,
  due: 950000,
  advance: 400000,
  final: 500000,
  contractorTotal: 1000000,
  projectRate: 5,
  advanceRate: 40,
});
assert.equal(110000 + p.due, 1060000);
assert.equal(p.credit + p.advance + p.final, p.amount);
const direct = projectPricing(1000, 0, "client", "US");
assert.equal(direct.fee, 50);
assert.equal(direct.advance, 0);
assert.equal(direct.final, 1000);
const almost = projectPricing(100, 90, "contractor", "US");
assert.equal(almost.advance, 10);
assert.equal(almost.final, 0);
assert.throws(() => projectPricing(100, 110, "client", "US"));
assert.throws(() => projectPricing(-1, 0, "client", "US"));
assert.equal(roundMoney(65 * 0.1, "US"), 6.5);
const d = {
  demo: true,
  status: "review",
  claim: null,
  requirementsAccepted: true,
  verified: true,
  funded: true,
  reviewUntil: "2020-01-01T00:00:00Z",
};
assert.equal(canRelease(d), true);
for (const blocked of [
  { claim: { reason: "Leak" } },
  { status: "disputed" },
  { status: "released" },
  { verified: false },
  { funded: false },
  { demo: false },
  { requirementsAccepted: false },
  { reviewUntil: "2099-01-01T00:00:00Z" },
])
  assert.equal(canRelease({ ...d, ...blocked }), false);
for (const market of ["US", "CO"])
  for (const amount of [100, 1000, 1000000])
    for (const credit of [0, amount * 0.1, amount * 0.9, amount])
      for (const materials of ["client", "contractor"]) {
        const plan = projectPricing(amount, credit, materials, market);
        assert.ok(plan.final >= 0);
        assert.ok(plan.advance >= 0);
        assert.equal(roundMoney(plan.advance + plan.final + plan.credit, market), plan.amount);
        assert.equal(
          roundMoney(plan.due - plan.fee, market),
          roundMoney(plan.amount - plan.credit, market),
        );
      }
console.log(
  "Passed: credit accounting, 10%/5% example, rounding, advance cap, client materials and release gates.",
);
