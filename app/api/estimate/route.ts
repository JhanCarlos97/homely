import { database } from "@/db/raw";
import { estimateServices, roundMoney } from "@/lib/policy";
import { policy, failure, HttpError } from "@/lib/server";
export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams;
    const market = q.get("market") || "US",
      city = q.get("city") || "";
    const p = await policy();
    if (!["US", "CO"].includes(market) || !p.cities[market as "US" | "CO"].includes(city))
      throw new HttpError("Unsupported location / Ubicación no disponible");
    const rows = await database()
      .prepare(
        "SELECT service,AVG(labor) labor,AVG(materials) materials,COUNT(*) count,MAX(observed) latest FROM cost_samples WHERE market=? AND city=? GROUP BY service",
      )
      .bind(market, city)
      .all();
    const items = estimateServices.map((s) => {
      const r: any = rows.results.find((r: any) => r.service === s.id);
      return {
        ...s,
        labor: roundMoney(r ? Number(r.labor) : s[market as "US" | "CO"].labor, market),
        materials: roundMoney(r ? Number(r.materials) : s[market as "US" | "CO"].materials, market),
        count: r ? Number(r.count) : 0,
        latest: r?.latest || null,
      };
    });
    return Response.json({ items });
  } catch (e) {
    return failure(e);
  }
}
