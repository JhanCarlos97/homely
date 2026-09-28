import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
const require = createRequire(
  await realpath(new URL("../node_modules/wrangler/package.json", import.meta.url)),
);
const { Miniflare } = require("miniflare");
const root = path.resolve(".");
const files = (await readdir(root + "/dist/server", { recursive: true })).filter((f) =>
  /\.m?js$/.test(f),
);
files.sort((a, b) => (a === "index.js" ? -1 : b === "index.js" ? 1 : 0));
const modules = files.map((f) => ({ type: "ESModule", path: root + "/dist/server/" + f }));
const mf = new Miniflare({
  modules,
  modulesRoot: root + "/dist/server",
  compatibilityDate: "2026-05-15",
  compatibilityFlags: ["nodejs_compat"],
  bindings: { ADMIN_EMAILS: "qa-admin@example.test" },
  d1Databases: ["DB"],
});
try {
  const db = await mf.getD1Database("DB");
  for (const file of (await readdir("drizzle")).filter((x) => x.endsWith(".sql")).sort()) {
    const sql = await readFile("drizzle/" + file, "utf8");
    for (const statement of sql.split("--> statement-breakpoint").filter((x) => x.trim()))
      await db.prepare(statement).run();
  }
  async function req(route, body, user = "qa-customer", expected = 200) {
    const headers = { "Content-Type": "application/json", Origin: "http://test" };
    if (user) {
      headers["oai-authenticated-user-id"] = user;
      headers["oai-authenticated-user-email"] = user + "@example.test";
    }
    const r = await mf.dispatchFetch("http://test" + route, {
      method: body ? "POST" : "GET",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    assert.equal(r.status, expected, `${route}: ${text.slice(0, 300)}`);
    return JSON.parse(text);
  }
  await req("/api/admin", null, null, 401);
  await req("/api/admin", null, "qa-customer", 403);
  const admin = await req("/api/admin", null, "qa-admin");
  assert.equal(admin.policy.projectRate, 5);
  const b = await req("/api/marketplace", {
    kind: "booking",
    market: "CO",
    data: {
      providerId: "p1",
      date: "2027-01-20",
      time: "09:00",
      city: "Envigado",
      address: "QA demo address",
      notes: "QA plumbing repair",
    },
  });
  await req("/api/marketplace", { kind: "complete", market: "CO", data: { bookingId: b.id } });
  const base = {
    bookingId: b.id,
    amount: 1000000,
    materials: "contractor",
    scope: "QA repair with materials",
    warrantyDays: 30,
    deadline: "2027-01-25",
    materialList: "Fittings: 200000; other materials: 200000",
  };
  const c = await req("/api/contracts", { action: "create", data: base });
  await req("/api/contracts", { action: "create", data: base }, "qa-customer", 409);
  await req(
    "/api/contracts",
    { action: "agree", id: c.id, data: { accepted: true } },
    "qa-outsider",
    403,
  );
  await req("/api/contracts", { action: "fund", id: c.id }, "qa-customer", 400);
  await req("/api/contracts", { action: "agree", id: c.id, data: { accepted: true } }, "qa-admin");
  await req(
    "/api/contracts",
    { action: "verify", id: c.id, data: { evidence: "QA scope and warranty reviewed" } },
    "qa-admin",
  );
  await req("/api/contracts", { action: "fund", id: c.id });
  await req("/api/contracts", { action: "fund", id: c.id }, "qa-customer", 400);
  await req(
    "/api/contracts",
    {
      action: "deliver",
      id: c.id,
      data: { evidence: "QA finished photos and report", receipts: "QA invoice 100" },
    },
    "qa-admin",
  );
  await req("/api/contracts", { action: "claim", id: c.id, data: { reason: "QA leak remains" } });
  assert.equal((await req("/api/contracts", { action: "reconcile" })).released, 0);
  await req(
    "/api/contracts",
    { action: "resolve", id: c.id, data: { decision: "remediate", note: "QA repair requested" } },
    "qa-admin",
  );
  await req(
    "/api/contracts",
    {
      action: "deliver",
      id: c.id,
      data: { evidence: "QA repaired and tested", receipts: "QA invoice 100" },
    },
    "qa-admin",
  );
  await db
    .prepare(
      "UPDATE contracts SET data=json_set(data,'$.reviewUntil','2020-01-01T00:00:00Z') WHERE id=?",
    )
    .bind(c.id)
    .run();
  assert.equal((await req("/api/contracts", { action: "reconcile" })).released, 1);
  assert.equal((await req("/api/contracts", { action: "reconcile" })).released, 0);
  const saved = (await req("/api/contracts")).contracts[0];
  assert.equal(saved.data.status, "released");
  assert.equal(saved.data.plan.credit, 90000);
  assert.equal(saved.data.plan.fee, 50000);
  assert.equal(saved.data.advancePaid, 400000);
  assert.equal(saved.data.released, 510000);
  await req("/api/contracts", {
    action: "feedback",
    id: c.id,
    data: { rating: 5, comment: "QA good work" },
  });
  await req(
    "/api/contracts",
    { action: "feedback", id: c.id, data: { rating: 5, comment: "QA duplicate" } },
    "qa-customer",
    400,
  );
  const outsider = await req("/api/contracts", null, "qa-outsider");
  assert.equal(outsider.contracts.length, 0);
  await req(
    "/api/admin",
    {
      action: "cost",
      data: {
        market: "CO",
        city: "Envigado",
        service: "paint",
        labor: 10000,
        materials: 8000,
        source: "QA quote 1",
        observed: "2026-09-20",
      },
    },
    "qa-admin",
  );
  await req(
    "/api/admin",
    {
      action: "cost",
      data: {
        market: "CO",
        city: "Envigado",
        service: "paint",
        labor: 20000,
        materials: 10000,
        source: "QA quote 2",
        observed: "2026-09-21",
      },
    },
    "qa-admin",
  );
  const estimate = await req("/api/estimate?market=CO&city=Envigado");
  assert.equal(estimate.items[0].count, 2);
  assert.equal(estimate.items[0].labor, 15000);
  assert.equal(estimate.items[0].materials, 9000);
  const job = await req("/api/marketplace", {
    kind: "project",
    market: "US",
    data: {
      title: "QA posted project",
      description: "QA customer supplies materials",
      category: "painting",
      city: "Austin, TX",
      budget: 1000,
      materials: "client",
      budgetMode: "manual",
    },
  });
  const offer = await req(
    "/api/marketplace",
    {
      kind: "proposal",
      market: "US",
      data: {
        projectId: job.id,
        name: "QA professional",
        amount: 1000,
        description: "QA full labor price",
      },
    },
    "qa-pro",
  );
  const agreed = await req("/api/contracts", {
    action: "accept_proposal",
    data: {
      proposalId: offer.id,
      scope: "QA painting scope",
      warrantyDays: 30,
      deadline: "2027-01-25",
    },
  });
  const posted = (await req("/api/contracts")).contracts.find((x) => x.id === agreed.id);
  assert.equal(posted.data.plan.fee, 50);
  assert.equal(posted.data.plan.advance, 0);
  assert.equal(posted.data.plan.credit, 0);
  assert.equal(posted.data.plan.due, 1050);
  await req(
    "/api/contracts",
    { action: "agree", id: agreed.id, data: { accepted: true } },
    "qa-admin",
    403,
  );
  await req(
    "/api/contracts",
    { action: "agree", id: agreed.id, data: { accepted: true } },
    "qa-pro",
  );
  const page = await mf.dispatchFetch("http://test/admin", {
    headers: {
      "oai-authenticated-user-id": "qa-admin",
      "oai-authenticated-user-email": "qa-admin@example.test",
    },
  });
  assert.equal(page.status, 200);
  assert.ok((await page.text()).includes("marketplace"));
  console.log(
    "Passed API: admin access, ownership, single-use credit, funding gates, advance, claim hold, resolution, idempotent release, feedback and local cost averages.",
  );
} finally {
  await mf.dispose();
}
