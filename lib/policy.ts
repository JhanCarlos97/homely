export type Market = "US" | "CO";
export const DEFAULT_POLICY = {
  visitRate: 10,
  projectRate: 5,
  advanceRate: 40,
  claimDays: 7,
  cities: {
    US: ["Austin, TX", "Miami, FL", "New York, NY", "Los Angeles, CA"],
    CO: [
      "Medellín",
      "Envigado",
      "Sabaneta",
      "Bello",
      "Bogotá",
      "Barranquilla",
      "Soledad",
      "Cali",
      "Palmira",
    ],
  },
};
export type Policy = typeof DEFAULT_POLICY;
export function roundMoney(n: number, market: string) {
  const scale = market === "CO" ? 1 : 100;
  return Math.round((n + Number.EPSILON) * scale) / scale;
}
export function projectPricing(
  amount: number,
  visit: number,
  materials: string,
  market: string,
  policy = DEFAULT_POLICY,
) {
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isFinite(visit) ||
    visit < 0 ||
    visit > amount
  )
    throw Error("Invalid project amount or visit credit / Valor o saldo a favor inválido");
  const total = roundMoney(amount, market),
    credit = roundMoney(visit, market),
    fee = roundMoney((total * policy.projectRate) / 100, market),
    remaining = roundMoney(total - credit, market);
  const advance =
    materials === "contractor"
      ? Math.min(roundMoney((total * policy.advanceRate) / 100, market), remaining)
      : 0;
  return {
    amount: total,
    credit,
    fee,
    due: roundMoney(remaining + fee, market),
    advance,
    final: roundMoney(remaining - advance, market),
    contractorTotal: total,
    projectRate: policy.projectRate,
    advanceRate: policy.advanceRate,
  };
}
export function canRelease(d: any, now = Date.now()) {
  return (
    d.demo === true &&
    d.status === "review" &&
    !d.claim &&
    d.requirementsAccepted === true &&
    d.verified === true &&
    d.funded === true &&
    !!d.reviewUntil &&
    Date.parse(d.reviewUntil) <= now
  );
}
export const estimateServices = [
  {
    id: "paint",
    category: "painting",
    en: "Paint interior walls",
    es: "Pintar paredes interiores",
    unit: "m²",
    material: "Paint, primer & protection / Pintura, base y protección",
    US: { labor: 7, materials: 4 },
    CO: { labor: 12000, materials: 9000 },
  },
  {
    id: "faucet",
    category: "plumbing",
    en: "Replace a faucet",
    es: "Cambiar una grifería",
    unit: "unit / unidad",
    material: "Faucet & fittings / Grifería y accesorios",
    US: { labor: 110, materials: 95 },
    CO: { labor: 90000, materials: 160000 },
  },
  {
    id: "outlet",
    category: "electrical",
    en: "Replace an electrical outlet",
    es: "Cambiar un tomacorriente",
    unit: "unit / unidad",
    material: "Outlet & fittings / Toma y accesorios",
    US: { labor: 70, materials: 18 },
    CO: { labor: 45000, materials: 20000 },
  },
  {
    id: "shelf",
    category: "carpentry",
    en: "Install a floating shelf",
    es: "Instalar una repisa flotante",
    unit: "unit / unidad",
    material: "Shelf & anchors / Repisa y anclajes",
    US: { labor: 65, materials: 55 },
    CO: { labor: 60000, materials: 85000 },
  },
];
export const guaranteeText = {
  en: "I accept the written scope, itemized materials, agreed price, delivery date, and the stated workmanship warranty. I will provide material receipts and completion evidence, address defects and claims, and meet applicable license, safety and insurance requirements. I understand that an open claim blocks the remaining payout.",
  es: "Acepto el alcance escrito, los materiales desglosados, el precio, la fecha de entrega y la garantía de mano de obra pactada. Entregaré soportes de compra y evidencia de terminación, atenderé defectos y reclamos y cumpliré los requisitos aplicables de licencias, seguridad y seguros. Un reclamo abierto bloquea el saldo pendiente.",
};
