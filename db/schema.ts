import { sqliteTable, text, index, integer, real } from "drizzle-orm/sqlite-core";
export const records = sqliteTable(
  "records",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    kind: text("kind").notNull(),
    market: text("market").notNull(),
    data: text("data").notNull(),
    created: text("created").notNull(),
  },
  (t) => [
    index("idx_records_owner_kind").on(t.owner, t.kind),
    index("idx_records_market_kind").on(t.market, t.kind),
  ],
);
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updated: text("updated").notNull(),
});
export const contracts = sqliteTable(
  "contracts",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    contractor: text("contractor").notNull(),
    market: text("market").notNull(),
    projectId: text("project_id").unique(),
    bookingId: text("booking_id").unique(),
    data: text("data").notNull(),
    version: integer("version").notNull().default(0),
    created: text("created").notNull(),
  },
  (t) => [
    index("idx_contracts_owner").on(t.owner),
    index("idx_contracts_contractor").on(t.contractor),
  ],
);
export const costSamples = sqliteTable(
  "cost_samples",
  {
    id: text("id").primaryKey(),
    market: text("market").notNull(),
    city: text("city").notNull(),
    service: text("service").notNull(),
    labor: real("labor").notNull(),
    materials: real("materials").notNull(),
    source: text("source").notNull(),
    observed: text("observed").notNull(),
  },
  (t) => [index("idx_cost_samples_location_service").on(t.market, t.city, t.service)],
);
export const audit = sqliteTable("audit", {
  id: text("id").primaryKey(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  target: text("target").notNull(),
  detail: text("detail").notNull(),
  created: text("created").notNull(),
});
