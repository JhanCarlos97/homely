import { getChatGPTUser } from "../../chatgpt-auth";
import { database } from "@/db/raw";
import { providers, categories } from "@/lib/catalog";
import { z } from "zod";
import { policy, overrides } from "@/lib/server";
import { roundMoney } from "@/lib/policy";
const text = z.string().trim().min(2).max(3000);
const base = z.object({
  kind: z.enum([
    "project",
    "provider",
    "booking",
    "proposal",
    "complete",
    "review",
    "payment",
    "accept",
  ]),
  market: z.enum(["US", "CO"]),
  data: z.record(z.string(), z.unknown()),
});
export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ records: [], signedIn: false });
    const rows = await database()
      .prepare(
        "SELECT r.id,r.kind,r.market,r.data,r.created,r.owner FROM records r WHERE r.owner = ? OR r.kind='project' OR (r.kind='provider' AND json_extract(r.data,'$.status')='approved') OR (r.kind='proposal' AND EXISTS (SELECT 1 FROM records p WHERE p.id=json_extract(r.data,'$.projectId') AND p.kind='project' AND p.owner=?)) ORDER BY r.created DESC LIMIT 300",
      )
      .bind(user.userId, user.userId)
      .all();
    return Response.json({
      signedIn: true,
      records: rows.results.map((r: any) => ({
        ...r,
        mine: r.owner === user.userId,
        owner: undefined,
        data: JSON.parse(r.data),
      })),
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Storage unavailable. Please try again." }, { status: 503 });
  }
}
export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return Response.json({ error: "Invalid origin" }, { status: 403 });
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "Sign in to save your request." }, { status: 401 });
    const input = base.parse(await request.json());
    let d: any = input.data;
    const db = database();
    if (input.kind === "accept" || input.kind === "payment")
      return Response.json(
        { error: "Use the new project checkout / Usa el nuevo flujo de proyectos" },
        { status: 400 },
      );
    if (input.kind === "booking") {
      d = z
        .object({
          providerId: text,
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          time: z.enum(["09:00", "10:30", "13:00", "14:30", "16:00"]),
          city: text,
          address: text,
          notes: text,
        })
        .parse(d);
      const original = providers.find((p) => p.id === d.providerId);
      const config = await overrides();
      let p: any = original ? { ...original, ...config[original.id] } : null;
      let providerOwner: string | null = null;
      if (!p) {
        const row: any = await db
          .prepare(
            "SELECT * FROM records WHERE id=? AND kind='provider' AND market=? AND json_extract(data,'$.status')='approved'",
          )
          .bind(d.providerId, input.market)
          .first();
        if (row) {
          const pd = JSON.parse(row.data);
          p = { name: pd.name, coName: pd.name, price: pd.price, cop: pd.price };
          providerOwner = row.owner;
        }
      }
      if (!p || p.enabled === false) throw Error("Invalid provider");
      const rules = await policy();
      if (!rules.cities[input.market].includes(d.city)) throw Error("Unsupported city");
      if (d.date < new Date().toISOString().slice(0, 10)) throw Error("Choose a future date");
      const price = input.market === "CO" ? p.cop : p.price;
      d = {
        ...d,
        providerName: input.market === "CO" ? p.coName : p.name,
        price,
        fee: roundMoney((price * rules.visitRate) / 100, input.market),
        visitRate: rules.visitRate,
        providerOwner,
        status: "requested",
        demo: true,
      };
    } else if (input.kind === "project")
      d = {
        ...z
          .object({
            title: text,
            description: text,
            category: z.enum(categories.slice(1).map((c) => c.id) as [string, ...string[]]),
            city: text,
            budget: z.number().positive().max(1000000000),
            materials: z.enum(["client", "contractor"]).default("client"),
            budgetMode: z.enum(["manual", "estimate"]).default("manual"),
            estimate: z.any().optional(),
          })
          .parse(d),
        status: "open",
      };
    else if (input.kind === "provider")
      d = {
        ...z
          .object({
            name: text,
            category: text,
            city: text,
            description: text,
            price: z.number().positive().max(10000000),
          })
          .parse(d),
        status: "pending",
        verified: false,
      };
    else if (input.kind === "proposal") {
      d = z
        .object({
          projectId: text,
          name: text,
          amount: z.number().positive().max(1000000000),
          description: text,
        })
        .parse(d);
      if (!d.projectId.startsWith("sample-")) {
        const project = await db
          .prepare("SELECT id FROM records WHERE id=? AND kind='project'")
          .bind(d.projectId)
          .first();
        if (!project) throw Error("Project not found");
      }
      d = { ...d, status: "submitted" };
    } else {
      const id = z.string().uuid().parse(d.bookingId);
      const row: any = await db
        .prepare("SELECT data FROM records WHERE id=? AND owner=? AND kind='booking'")
        .bind(id, user.userId)
        .first();
      if (!row) return Response.json({ error: "Booking not found" }, { status: 404 });
      const booking = JSON.parse(row.data);
      if (input.kind === "complete") {
        if (booking.status !== "requested") throw Error("Invalid booking state");
        await db
          .prepare("UPDATE records SET data=? WHERE id=? AND owner=?")
          .bind(JSON.stringify({ ...booking, status: "completed" }), id, user.userId)
          .run();
        return Response.json({ ok: true });
      }
      if (input.kind === "review") {
        if (booking.status !== "completed")
          throw Error("Complete the work before leaving feedback");
        const existing = await db
          .prepare(
            "SELECT id FROM records WHERE owner=? AND kind='review' AND json_extract(data,'$.bookingId')=?",
          )
          .bind(user.userId, id)
          .first();
        if (existing) throw Error("This booking already has feedback");
        d = z
          .object({
            bookingId: z.string().uuid(),
            rating: z.number().int().min(1).max(5),
            comment: text,
          })
          .parse(d);
      }
    }
    if (
      ["project", "provider"].includes(input.kind) &&
      !(await policy()).cities[input.market].includes(d.city)
    )
      throw Error("Unsupported city / Ciudad no disponible");
    const id = crypto.randomUUID();
    await db
      .prepare("INSERT INTO records (id,owner,kind,market,data,created) VALUES (?,?,?,?,?,?)")
      .bind(id, user.userId, input.kind, input.market, JSON.stringify(d), new Date().toISOString())
      .run();
    return Response.json({ ok: true, id });
  } catch (e) {
    console.error(e);
    return Response.json(
      {
        error:
          e instanceof z.ZodError
            ? "Please check the form fields."
            : e instanceof Error && !/D1|SQL|database|Storage/i.test(e.message)
              ? e.message
              : "Unable to save. Please try again.",
      },
      { status: 400 },
    );
  }
}
