"use client";
import { useState, useEffect } from "react";
import {
  House,
  Search,
  MapPin,
  ArrowUpRight,
  ArrowRight,
  Check,
  Star,
  ShieldCheck,
  CalendarDays,
  Heart,
  ChevronLeft,
  ChevronRight,
  Globe,
  Plus,
  SlidersHorizontal,
  Wrench,
  Zap,
  Droplets,
  PaintRoller,
  Sparkles,
  Hammer,
  Wind,
  LayoutGrid,
  CheckCircle2,
  Clock,
  Wallet,
  FileText,
  Briefcase,
  UserRound,
  LockKeyhole,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Toaster, toast } from "sonner";
import { categories, providers, Provider } from "@/lib/catalog";
import { DEFAULT_POLICY, Policy } from "@/lib/policy";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  MaterialChoice,
  Estimator,
  FeeGuide,
  ProjectCheckout,
  ContractsPanel,
  InsuranceResearch,
} from "@/components/marketplace-controls";
const icons = [LayoutGrid, Droplets, Zap, Wrench, PaintRoller, Sparkles, Hammer, Wind];
type Rec = { id: string; kind: string; market: string; mine: boolean; data: any };
function Pick({
  value,
  onChange,
  items,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  items: { value: string; label: string }[];
  label: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v);
      }}
    >
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export default function Home() {
  const [lang, setLang] = useState("en"),
    [market, setMarket] = useState("US"),
    [view, setView] = useState("find"),
    [category, setCategory] = useState("all"),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [city, setCity] = useState("Austin, TX"),
    [sort, setSort] = useState("recommended"),
    [available, setAvailable] = useState(false),
    [favorites, setFavorites] = useState<string[]>([]),
    [week, setWeek] = useState(0),
    [records, setRecords] = useState<Rec[]>([]),
    [loaded, setLoaded] = useState(false),
    [signedIn, setSignedIn] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [modal, setModal] = useState(""),
    [selected, setSelected] = useState<Provider>(providers[0]),
    [slot, setSlot] = useState({ date: "", time: "" }),
    [selectedRecord, setSelectedRecord] = useState<Rec | null>(null),
    [form, setForm] = useState<any>({}),
    [consent, setConsent] = useState(false),
    [rating, setRating] = useState(5);
  const [rules, setRules] = useState<Policy>(DEFAULT_POLICY),
    [admin, setAdmin] = useState(false),
    [catalog, setCatalog] = useState<any>({});
  const es = lang === "es";
  const t = (en: string, sp: string) => (es ? sp : en);
  const money = (n: number, m = market) =>
    new Intl.NumberFormat(es ? "es-CO" : "en-US", {
      style: "currency",
      currency: m === "CO" ? "COP" : "USD",
      minimumFractionDigits: m === "US" && n % 1 !== 0 ? 2 : 0,
      maximumFractionDigits: m === "CO" ? 0 : 2,
    }).format(n) + (m === "CO" ? " COP" : "");
  const name = (p: Provider) => (market === "CO" ? p.coName : p.name);
  const price = (p: Provider) =>
    market === "CO" ? (catalog[p.id]?.cop ?? p.cop) : (catalog[p.id]?.price ?? p.price);
  const label = (id: string) => {
    const c = categories.find((c) => c.id === id);
    return c ? (es ? c.es : c.en) : id;
  };
  const dates = Array.from({ length: 3 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + 1 + i + week * 3);
    return {
      id: [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-"),
      day: d.toLocaleDateString(es ? "es-CO" : "en-US", { weekday: "short" }),
      num: d.toLocaleDateString(es ? "es-CO" : "en-US", { month: "short", day: "numeric" }),
    };
  });
  async function refresh() {
    try {
      const r = await fetch("/api/marketplace");
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setRecords(d.records);
      setSignedIn(d.signedIn);
      setError("");
    } catch (e) {
      setError(
        t(
          "Could not load saved activity. Please retry.",
          "No se pudo cargar tu actividad. Intenta de nuevo.",
        ),
      );
    } finally {
      setLoaded(true);
    }
  }
  useEffect(() => {
    refresh();
    const m = localStorage.getItem("homely-market");
    if (m === "CO") changeMarket("CO");
    fetch("/api/config")
      .then(async (r) => {
        const d: any = await r.json();
        if (!r.ok) throw Error();
        setRules(d.policy);
        setAdmin(d.admin);
        setCatalog(d.overrides);
      })
      .catch(() => setError("Unable to load site settings / No se pudo cargar la configuración"));
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem("homely-language", lang);
  }, [lang]);
  useEffect(() => {
    const mc = (document as any).modelContext;
    if (!mc?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      mc.registerTool(
        {
          name: "search_contractors",
          description: "Filter the visible contractor directory by service or contractor name.",
          inputSchema: {
            type: "object",
            properties: { query: { type: "string", maxLength: 100 } },
            required: ["query"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute: async (input: any) => {
            if (typeof input?.query !== "string" || input.query.length > 100)
              throw Error("Invalid search query");
            setView("find");
            setQuery(input.query);
            setSearch(input.query);
            return { query: input.query, view: "contractor_directory" };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, []);
  function changeMarket(v: string) {
    setMarket(v);
    setLang(v === "CO" ? "es" : "en");
    localStorage.setItem("homely-market", v);
    setCity(rules.cities[v as "US" | "CO"][0] || (v === "CO" ? "Medellín" : "Austin, TX"));
    setWeek(0);
  }
  function open(type: string, data: any = {}) {
    setForm(data);
    setConsent(false);
    setModal(type);
  }
  function book(p: Provider, date: string, time: string) {
    setSelected(p);
    setSlot({ date, time });
    open("booking");
  }
  async function save(kind: string, data: any) {
    setBusy(true);
    try {
      const r = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          market:
            selectedRecord && ["review", "payment", "complete", "accept"].includes(kind)
              ? selectedRecord.market
              : market,
          data,
        }),
      });
      const d: any = await r.json();
      if (!r.ok)
        throw Error(
          r.status === 401 ? t("Please sign in to save.", "Inicia sesión para guardar.") : d.error,
        );
      await refresh();
      setModal("");
      toast.success(t("Saved successfully", "Guardado correctamente"));
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
      return false;
    } finally {
      setBusy(false);
    }
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (modal === "booking")
      save("booking", {
        providerId: selected.id,
        ...slot,
        city,
        address: form.address,
        notes: form.notes,
      });
    if (modal === "post")
      save("project", {
        ...form,
        city: form.city || city,
        category: form.category || "plumbing",
        materials: form.materials || "client",
        budgetMode: form.budgetMode || "manual",
        budget: Number(form.budget),
      });
    if (modal === "join")
      save("provider", {
        ...form,
        city: form.city || city,
        category: form.category || "plumbing",
        price: Number(form.price),
      });
    if (modal === "proposal")
      save("proposal", { ...form, projectId: selectedRecord?.id, amount: Number(form.amount) });
    if (modal === "review")
      save("review", { bookingId: selectedRecord?.id, rating, comment: form.comment });
    if (modal === "payment")
      save("payment", { bookingId: selectedRecord?.id, amount: Number(form.amount) });
  }
  const registered = records
    .filter(
      (r) =>
        r.kind === "provider" &&
        r.market === market &&
        r.data.status === "approved" &&
        r.data.city === city,
    )
    .map((r) => ({
      id: r.id,
      name: r.data.name,
      coName: r.data.name,
      category: r.data.category,
      initials: r.data.name
        .split(" ")
        .map((x: string) => x[0])
        .join("")
        .slice(0, 2),
      color: "#e5ecdf",
      rating: 0,
      reviews: 0,
      years: 0,
      price: r.data.price,
      cop: r.data.price,
      tags: [r.data.description, r.data.description],
      description: [r.data.description, r.data.description],
    }));
  const filtered = [...registered, ...providers]
    .filter((p) => catalog[p.id]?.enabled !== false)
    .filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (!available || p.id !== "p4") &&
        `${name(p)} ${p.category} ${label(p.category)} ${p.tags[es ? 1 : 0]}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "price" ? price(a) - price(b) : sort === "rating" ? b.rating - a.rating : 0,
    );
  const sampleJobs: Rec[] = [
    {
      id: "sample-1",
      kind: "project",
      market,
      mine: false,
      data: {
        title: t("Give our living room a fresh coat", "Renovar la pintura de nuestra sala"),
        description: t(
          "Looking for a careful painter for a living room and hallway. Walls are in good condition. Paint can be provided.",
          "Buscamos un pintor para la sala y el pasillo. Las paredes están en buen estado. Podemos suministrar la pintura.",
        ),
        city,
        category: "painting",
        budget: market === "CO" ? 1400000 : 650,
      },
    },
    {
      id: "sample-2",
      kind: "project",
      market,
      mine: false,
      data: {
        title: t("Install kitchen sink and faucet", "Instalar lavaplatos y grifería"),
        description: t(
          "Replacing our kitchen sink and faucet. New fixtures are ready; looking for installation and a leak check.",
          "Queremos cambiar el lavaplatos y la grifería. Ya tenemos las piezas; necesitamos instalación y revisión de fugas.",
        ),
        city,
        category: "plumbing",
        budget: market === "CO" ? 350000 : 250,
      },
    },
    {
      id: "sample-3",
      kind: "project",
      market,
      mine: false,
      data: {
        title: t("Custom shelves for a home office", "Estanterías a medida para estudio"),
        description: t(
          "Three floating oak shelves, approximately 1.5 meters wide. Please include materials in the quote.",
          "Tres estanterías flotantes de madera de 1,5 metros. Incluye los materiales en la cotización.",
        ),
        city,
        category: "carpentry",
        budget: market === "CO" ? 2200000 : 950,
      },
    },
  ];
  const jobs = [
    ...records.filter(
      (r) =>
        r.kind === "project" &&
        r.market === market &&
        r.data.status === "open" &&
        r.data.city === city,
    ),
    ...sampleJobs,
  ].filter((r) => category === "all" || r.data.category === category);
  const myBookings = records.filter((r) => r.mine && r.kind === "booking");
  const field = (key: string, title: string, type = "text", placeholder = "") => (
    <label className="field">
      {title}
      {type === "textarea" ? (
        <textarea
          required
          minLength={2}
          maxLength={3000}
          placeholder={placeholder}
          value={form[key] || ""}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      ) : (
        <input
          required
          minLength={type === "text" ? 2 : undefined}
          min={type === "number" ? 1 : undefined}
          max={type === "number" ? 1000000000 : undefined}
          type={type}
          placeholder={placeholder}
          value={form[key] || ""}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      )}
    </label>
  );
  return (
    <>
      <Toaster position="bottom-right" richColors />
      <header className="header">
        <div className="navwrap">
          <button className="logo" onClick={() => setView("find")}>
            <span className="logomark">
              <House size={23} />
            </span>
            homely<span className="logodot">.</span>
          </button>
          <nav aria-label={t("Main navigation", "Navegación principal")}>
            {[
              ["find", t("Find a professional", "Buscar profesionales")],
              ["jobs", t("Explore projects", "Explorar proyectos")],
              ["bookings", t("My activity", "Mi actividad")],
            ].map(([id, title]) => (
              <button
                key={id}
                className={view === id ? "active" : ""}
                onClick={() => {
                  setView(id);
                  setCategory("all");
                }}
              >
                {title}
              </button>
            ))}
          </nav>
          <div className="navright">
            <Pick
              label="Market"
              value={market}
              onChange={changeMarket}
              items={[
                { value: "US", label: "🇺🇸 US" },
                { value: "CO", label: "🇨🇴 CO" },
              ]}
            />
            <button className="language" onClick={() => changeMarket(es ? "US" : "CO")}>
              <Globe size={15} />
              {es ? "ES" : "EN"}
            </button>
            {admin && (
              <a className="adminlink" href="/admin">
                Admin
              </a>
            )}
            <span className="navdivider" />
            <button className="prolink" onClick={() => open("join")}>
              {t("For professionals", "Soy profesional")}
              <ArrowUpRight size={15} />
            </button>
            <button
              className="avatar"
              aria-label={t("My account", "Mi cuenta")}
              onClick={() => open("account")}
            >
              <UserRound size={19} />
            </button>
          </div>
        </div>
      </header>
      <main>
        {error && (
          <div className="notice" role="alert">
            {error}
            <button onClick={() => location.reload()}>{t("Retry", "Reintentar")}</button>
          </div>
        )}
        <section className="intro">
          <div className="introtext">
            <div className="eyebrow">
              <span />
              {t("GOOD PEOPLE. GREAT WORK.", "BUENAS PERSONAS. BUEN TRABAJO.")}
            </div>
            <h1>
              {view === "find"
                ? t("A little help. A happier home.", "Una mano. Un hogar más feliz.")
                : view === "jobs"
                  ? t("Good work starts here.", "Un buen proyecto empieza aquí.")
                  : t("Your home projects, together.", "Tus proyectos, en un solo lugar.")}
            </h1>
            <p>
              {view === "find"
                ? t(
                    "Find the right local professional. Book a visit. Make yourself at home.",
                    "Encuentra al profesional ideal. Agenda una visita. Disfruta tu hogar.",
                  )
                : view === "jobs"
                  ? t(
                      "Find your next project, or tell local professionals what you need.",
                      "Encuentra tu próximo proyecto o cuéntales a los profesionales qué necesitas.",
                    )
                  : t(
                      "Manage visits, project payments, and feedback in one place.",
                      "Gestiona visitas, pagos de proyectos y reseñas en un solo lugar.",
                    )}
            </p>
          </div>
          <button className="primary posttop" onClick={() => open("post")}>
            <Plus size={18} />
            {t("Post a project", "Publicar proyecto")}
          </button>
        </section>
        {view !== "bookings" && (
          <>
            <form
              className="searchbar"
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(query);
                if (view === "jobs") setView("find");
              }}
            >
              <div className="searchfield">
                <Search size={22} />
                <div>
                  <label htmlFor="service">
                    {t("What needs a little care?", "¿Qué necesita tu hogar?")}
                  </label>
                  <input
                    id="service"
                    placeholder={t(
                      "Try “plumbing” or “electrical”",
                      "Prueba “plomería” o “electricidad”",
                    )}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="locationfield">
                <MapPin size={21} />
                <div>
                  <label>{t("Where do you need it?", "¿Dónde lo necesitas?")}</label>
                  <Pick
                    label={t("City", "Ciudad")}
                    value={city}
                    onChange={setCity}
                    items={rules.cities[market as "US" | "CO"].map((c) => ({ value: c, label: c }))}
                  />
                </div>
              </div>
              <button className="primary searchbutton" type="submit">
                <Search size={18} />
                {t("Find a professional", "Buscar profesional")}
              </button>
            </form>
            <div className="categories">
              {categories.map((c, i) => {
                const Icon = icons[i];
                return (
                  <button
                    className={category === c.id ? "selected" : ""}
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                  >
                    <Icon size={21} />
                    {es ? c.es : c.en}
                  </button>
                );
              })}
            </div>
          </>
        )}
        <div className="workspace">
          <div className="results">
            {view === "find" && (
              <>
                <div className="resultsheading">
                  <div>
                    <h2>{t("Professionals near you", "Profesionales cerca de ti")}</h2>
                    <p>
                      {filtered.length} {t("professionals in", "profesionales en")} {city}{" "}
                      <span className="sampletag">
                        {t("Sample profiles", "Perfiles de muestra")}
                      </span>
                    </p>
                  </div>
                  <Pick
                    label={t("Sort professionals", "Ordenar profesionales")}
                    value={sort}
                    onChange={setSort}
                    items={[
                      { value: "recommended", label: t("Recommended", "Recomendados") },
                      { value: "rating", label: t("Highest rated", "Mejor calificados") },
                      { value: "price", label: t("Lowest visit price", "Menor precio de visita") },
                    ]}
                  />
                </div>
                <div className="filterline">
                  <label className="checklabel">
                    <Checkbox
                      checked={available}
                      onCheckedChange={(v) => setAvailable(v === true)}
                    />
                    {t("Available this week", "Disponibles esta semana")}
                  </label>
                  <button onClick={() => open("fees")}>
                    <SlidersHorizontal size={15} />
                    {t("Prices & booking fees", "Precios y tarifas")}
                  </button>
                </div>
                {filtered.length === 0 && (
                  <div className="empty">
                    <Search />
                    <h3>{t("No matches yet", "No encontramos resultados")}</h3>
                    <p>
                      {t(
                        "Try a different service or clear your filters.",
                        "Prueba otro servicio o borra los filtros.",
                      )}
                    </p>
                    <button
                      className="outline"
                      onClick={() => {
                        setCategory("all");
                        setQuery("");
                        setSearch("");
                        setAvailable(false);
                      }}
                    >
                      {t("Clear filters", "Borrar filtros")}
                    </button>
                  </div>
                )}
                {filtered.map((p, index) => (
                  <article className="procard" key={p.id}>
                    <div className="proinfo">
                      <div className="protop">
                        <div className="portrait" style={{ background: p.color }}>
                          {market === "CO"
                            ? p.coName
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                            : p.initials}
                          <span>
                            <Check size={11} />
                          </span>
                        </div>
                        <div>
                          <div className="pro-name">
                            <button
                              onClick={() => {
                                setSelected(p);
                                open("profile");
                              }}
                            >
                              {name(p)}
                            </button>
                            <button
                              className={"heart " + (favorites.includes(p.id) ? "saved" : "")}
                              aria-label={t("Save professional", "Guardar profesional")}
                              onClick={() =>
                                setFavorites(
                                  favorites.includes(p.id)
                                    ? favorites.filter((x) => x !== p.id)
                                    : [...favorites, p.id],
                                )
                              }
                            >
                              <Heart
                                size={19}
                                fill={favorites.includes(p.id) ? "currentColor" : "none"}
                              />
                            </button>
                          </div>
                          <p className="trade">
                            {label(p.category)}
                            <span>
                              {" "}
                              ·{" "}
                              {p.years
                                ? `${p.years} ${t("years of experience", "años de experiencia")}`
                                : t("Registered professional", "Profesional registrado")}
                            </span>
                          </p>
                          <div className="rating">
                            <Star size={14} fill="currentColor" />
                            <b>{p.rating || t("New", "Nuevo")}</b>
                            <span>
                              ({p.reviews} {t("sample reviews", "reseñas de muestra")})
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="protags">
                        <span>
                          <ShieldCheck size={14} />
                          {p.id.length > 10
                            ? t("Registered · demo bookings", "Registrado · reservas demo")
                            : t("Sample professional", "Profesional de muestra")}
                        </span>
                        {index === 0 && (
                          <span className="popular">{t("Popular choice", "Más solicitado")}</span>
                        )}
                      </div>
                      <p className="description">{p.description[es ? 1 : 0]}</p>
                      <p className="specialties">{p.tags[es ? 1 : 0]}</p>
                      <div className="probottom">
                        <span>
                          <MapPin size={14} />
                          {city}
                        </span>
                        <button
                          onClick={() => {
                            setSelected(p);
                            open("profile");
                          }}
                        >
                          {t("View profile", "Ver perfil")}
                          <ArrowUpRight size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="schedule">
                      <div className="scheduletop">
                        <span>{t("Home visit", "Visita a domicilio")}</span>
                        <strong>
                          {money(price(p))}
                          <small>
                            {" "}
                            +{rules.visitRate}% {t("fee", "tarifa")}
                          </small>
                        </strong>
                      </div>
                      <div className="datehead">
                        <button
                          aria-label={t("Previous dates", "Fechas anteriores")}
                          disabled={!week}
                          onClick={() => setWeek(Math.max(0, week - 1))}
                        >
                          <ChevronLeft size={15} />
                        </button>
                        {dates.map((d) => (
                          <div key={d.id}>
                            <span>{d.day}</span>
                            <b>{d.num}</b>
                          </div>
                        ))}
                        <button
                          aria-label={t("Next dates", "Fechas siguientes")}
                          onClick={() => setWeek(week + 1)}
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>
                      <div className="slotgrid">
                        {dates.map((d, di) => (
                          <div key={d.id}>
                            {["09:00", "10:30", "14:30"].map((time, ti) => (
                              <button
                                key={time}
                                disabled={(index + di + ti) % 5 === 3}
                                onClick={() => book(p, d.id, time)}
                              >
                                {(index + di + ti) % 5 === 3 ? "—" : time}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                      <p className="slotnote">
                        <Clock size={12} />
                        {t("30-min assessment · Local time", "Diagnóstico de 30 min · Hora local")}
                      </p>
                    </div>
                  </article>
                ))}
              </>
            )}
            {view === "jobs" && (
              <>
                <div className="resultsheading">
                  <div>
                    <h2>
                      {t("Projects looking for a helping hand", "Proyectos que necesitan una mano")}
                    </h2>
                    <p>
                      {t(
                        "Clear scope. Your budget. The right professional.",
                        "Alcance claro. Tu presupuesto. El profesional ideal.",
                      )}
                    </p>
                  </div>
                  <span className="count">{jobs.length}</span>
                </div>
                {jobs.map((job) => (
                  <article className="jobcard" key={job.id}>
                    <div className="jobmeta">
                      <span className="pill">{label(job.data.category)}</span>
                      <span>
                        {job.id.startsWith("sample")
                          ? t("Sample project", "Proyecto de muestra")
                          : t("Open project", "Proyecto abierto")}
                      </span>
                    </div>
                    <h3>{job.data.title}</h3>
                    <p>{job.data.description}</p>
                    <p className="fineprint">
                      {job.data.materials === "contractor"
                        ? t(
                            "Contractor supplies materials · materials advance",
                            "Materiales del contratista · anticipo de materiales",
                          )
                        : t(
                            "Customer supplies materials · no advance",
                            "Materiales del cliente · sin anticipo",
                          )}{" "}
                      · {t("Customer fee", "Tarifa al cliente")}: {rules.projectRate}%
                    </p>
                    <div className="jobfooter">
                      <span>
                        <MapPin size={15} />
                        {job.data.city}
                      </span>
                      <span>
                        {t("Budget", "Presupuesto")} <b>{money(job.data.budget)}</b>
                      </span>
                      <button
                        className="outline"
                        onClick={() => {
                          setSelectedRecord(job);
                          open("proposal");
                        }}
                      >
                        {t("Send a proposal", "Enviar propuesta")}
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </article>
                ))}
                {!jobs.length && (
                  <div className="empty">
                    {t(
                      "No projects in this category yet. Post the first one.",
                      "Aún no hay proyectos en esta categoría. Publica el primero.",
                    )}
                  </div>
                )}
              </>
            )}
            {view === "bookings" && (
              <>
                <ContractsPanel es={es} />
                <div className="resultsheading">
                  <div>
                    <h2>{t("Visits & work", "Visitas y trabajos")}</h2>
                    <p>
                      {t(
                        "Saved to your account across devices.",
                        "Guardado en tu cuenta para todos tus dispositivos.",
                      )}
                    </p>
                  </div>
                  <CalendarDays size={24} />
                </div>
                {error && (
                  <div className="notice">
                    {error}
                    <button onClick={refresh}>{t("Retry", "Reintentar")}</button>
                  </div>
                )}
                {!loaded && (
                  <div className="empty">
                    {t("Loading your activity…", "Cargando tu actividad…")}
                  </div>
                )}
                {loaded && !signedIn && !error && (
                  <div className="empty">
                    <UserRound />
                    <h3>{t("Your projects belong here", "Tus proyectos tienen su lugar")}</h3>
                    <p>
                      {t(
                        "Sign in to keep your bookings, projects and feedback together.",
                        "Inicia sesión para guardar tus reservas, proyectos y reseñas.",
                      )}
                    </p>
                    <a className="primary" href="/signin-with-chatgpt?return_to=/" target="_top">
                      {t("Sign in with ChatGPT", "Iniciar sesión con ChatGPT")}
                    </a>
                  </div>
                )}
                {signedIn && !myBookings.length && (
                  <div className="empty">
                    <CalendarDays />
                    <h3>{t("A fresh start for your home", "Un nuevo comienzo para tu hogar")}</h3>
                    <p>
                      {t(
                        "Your visit requests will appear here.",
                        "Tus solicitudes de visita aparecerán aquí.",
                      )}
                    </p>
                    <button className="primary" onClick={() => setView("find")}>
                      {t("Find a professional", "Buscar profesional")}
                    </button>
                  </div>
                )}
                {myBookings.map((b) => (
                  <article className="jobcard" key={b.id}>
                    <div className="jobmeta">
                      <span className="pill">
                        {b.data.status === "completed"
                          ? t("Completed · demo", "Completado · demo")
                          : t("Visit requested · demo", "Visita solicitada · demo")}
                      </span>
                      <span>{b.market}</span>
                    </div>
                    <h3>{b.data.providerName}</h3>
                    <p>
                      {b.data.date} · {b.data.time} · {b.data.city}
                    </p>
                    <p>{b.data.notes}</p>
                    <div className="receipt">
                      <span>{t("Visit + booking fee", "Visita + tarifa de reserva")}</span>
                      <b>{money(b.data.price + b.data.fee, b.market)}</b>
                    </div>
                    {records
                      .filter((r) => r.kind === "review" && r.data.bookingId === b.id)
                      .map((r) => (
                        <div className="notice" key={r.id}>
                          <b>★ {r.data.rating}/5</b> · {r.data.comment}
                        </div>
                      ))}
                    <div className="actions">
                      <button
                        className="outline"
                        disabled={b.data.status !== "completed"}
                        onClick={() => {
                          setSelectedRecord(b);
                          open("payment");
                        }}
                      >
                        <Wallet size={16} />
                        {t("Start a project", "Iniciar proyecto")}
                      </button>
                      {b.data.status === "requested" ? (
                        <button
                          className="primary"
                          onClick={() => {
                            setSelectedRecord(b);
                            open("complete");
                          }}
                        >
                          {t("Mark visit complete", "Marcar visita completada")}
                        </button>
                      ) : records.some((r) => r.kind === "review" && r.data.bookingId === b.id) ? (
                        <span className="pill">
                          <Check size={15} />
                          {t("Feedback submitted", "Reseña enviada")}
                        </span>
                      ) : (
                        <button
                          className="primary"
                          onClick={() => {
                            setSelectedRecord(b);
                            setRating(5);
                            open("review");
                          }}
                        >
                          <Star size={15} />
                          {t("Leave feedback", "Dejar reseña")}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
                {signedIn && (
                  <>
                    {records
                      .filter((r) => r.kind === "project" && r.mine)
                      .map((project) => (
                        <div key={project.id}>
                          <h2 className="sectiontitle">{project.data.title}</h2>
                          <p>{t("Compare proposals", "Comparar propuestas")}</p>
                          {records
                            .filter((r) => r.kind === "proposal" && r.data.projectId === project.id)
                            .map((proposal) => (
                              <article className="jobcard" key={proposal.id}>
                                <h3>{proposal.data.name}</h3>
                                <p>{proposal.data.description}</p>
                                <div className="jobfooter">
                                  <b>{money(proposal.data.amount, proposal.market)}</b>
                                  {proposal.data.status === "accepted" ? (
                                    <span className="pill">{t("Accepted", "Aceptada")}</span>
                                  ) : (
                                    project.data.status === "open" && (
                                      <button
                                        className="primary"
                                        onClick={() => {
                                          setSelectedRecord(proposal);
                                          open("accept");
                                        }}
                                      >
                                        {t("Accept proposal", "Aceptar propuesta")}
                                      </button>
                                    )
                                  )}
                                </div>
                              </article>
                            ))}
                          {!records.some(
                            (r) => r.kind === "proposal" && r.data.projectId === project.id,
                          ) && (
                            <p className="notice">
                              {t(
                                "No proposals yet. They will appear here.",
                                "Aún no hay propuestas. Aparecerán aquí.",
                              )}
                            </p>
                          )}
                        </div>
                      ))}
                    <h2 className="sectiontitle">
                      {t("Projects & proposals", "Proyectos y propuestas")}
                    </h2>
                    {records
                      .filter(
                        (r) =>
                          r.mine && ["project", "proposal", "provider", "payment"].includes(r.kind),
                      )
                      .map((r) => (
                        <article className="activityrow" key={r.id}>
                          <FileText size={20} />
                          <div>
                            <b>
                              {r.data.title ||
                                r.data.name ||
                                (
                                  {
                                    proposal: t("Project proposal", "Propuesta de proyecto"),
                                    payment: t("Demo payment record", "Registro de pago demo"),
                                  } as any
                                )[r.kind] ||
                                t("Professional application", "Registro profesional")}
                            </b>
                            <p>
                              {r.kind === "provider"
                                ? t(
                                    "Profile submitted · verification pending",
                                    "Perfil enviado · verificación pendiente",
                                  )
                                : r.kind === "payment"
                                  ? t(
                                      "No charge made · insurance not active",
                                      "Sin cobro · seguro no activo",
                                    )
                                  : r.data.description}
                            </p>
                          </div>
                          {(r.data.budget || r.data.amount) && (
                            <b>{money(r.data.budget || r.data.amount, r.market)}</b>
                          )}
                        </article>
                      ))}
                  </>
                )}
              </>
            )}
          </div>
          <aside>
            <div className="projectpromo">
              <div className="promoicon">
                <House size={23} />
                <Sparkles size={15} />
              </div>
              <h2>
                {t("Big plans?", "¿Grandes planes?")}
                <br />
                {t("Let the pros come to you.", "Que los expertos lleguen a ti.")}
              </h2>
              <p>
                {t(
                  "Describe your project, set your budget, and compare proposals from local professionals.",
                  "Describe tu proyecto, define tu presupuesto y compara propuestas de profesionales locales.",
                )}
              </p>
              <button className="primary" onClick={() => open("post")}>
                {t("Post a project for free", "Publicar proyecto gratis")}
                <ArrowUpRight size={17} />
              </button>
              <div className="promofine">
                <Check size={13} />
                {t("Your project. Your choice.", "Tu proyecto. Tú decides.")}
              </div>
            </div>
            <div className="peacecard">
              <div className="peaceheading">
                <ShieldCheck size={21} />
                <h3>{t("A little more peace of mind", "Un poco más de tranquilidad")}</h3>
              </div>
              <div className="benefit">
                <CalendarDays size={19} />
                <div>
                  <b>{t("A time that works for you", "Un horario que te convenga")}</b>
                  <p>
                    {t(
                      "Choose a visit slot with clear, upfront pricing.",
                      "Elige una visita con precios claros desde el inicio.",
                    )}
                  </p>
                </div>
              </div>
              <div className="benefit">
                <Wallet size={19} />
                <div>
                  <b>{t("Keep work payments together", "Todos los pagos en un lugar")}</b>
                  <p>
                    {t(
                      "Track the visit and the full project in your account.",
                      "Lleva el registro de la visita y del proyecto en tu cuenta.",
                    )}
                  </p>
                </div>
              </div>
              <div className="benefit">
                <Star size={19} />
                <div>
                  <b>{t("Feedback after the finish", "Reseñas al terminar")}</b>
                  <p>
                    {t(
                      "Share your experience once the work is complete.",
                      "Comparte tu experiencia cuando el trabajo esté terminado.",
                    )}
                  </p>
                </div>
              </div>
              <button className="textlink" onClick={() => open("protection")}>
                {t("About payments & protection", "Sobre pagos y protección")}
                <ArrowRight size={14} />
              </button>
            </div>
            <div className="homeimage">
              <img
                src="/kitchen.jpg"
                alt={t(
                  "Bright renovated kitchen with green cabinetry",
                  "Cocina renovada con gabinetes verdes",
                )}
              />
              <div>
                {t("Make room for better.", "Dale espacio a algo mejor.")}
                <span>{t("One home project at a time.", "Un proyecto a la vez.")}</span>
              </div>
            </div>
            <p className="demolabel">
              {t(
                "Preview marketplace · Sample professionals and availability. No real charges or active insurance.",
                "Marketplace de demostración · Profesionales y horarios de muestra. Sin cobros reales ni seguro activo.",
              )}
            </p>
          </aside>
        </div>
      </main>
      <footer>
        <button className="logo" onClick={() => setView("find")}>
          <House size={20} />
          homely.
        </button>
        <span>{t("Home, in good hands.", "Tu hogar, en buenas manos.")}</span>
        <div>
          <button onClick={() => open("fees")}>{t("How booking works", "Cómo reservar")}</button>
          <button onClick={() => open("protection")}>
            {t("Payments & protection", "Pagos y protección")}
          </button>
          <span>🇺🇸 & 🇨🇴</span>
        </div>
      </footer>
      <Dialog open={!!modal} onOpenChange={(v) => !v && setModal("")}>
        <DialogContent className="homelymodal">
          <DialogTitle>
            {
              (
                {
                  booking: t("Book a home visit", "Agenda una visita"),
                  post: t("Tell us about your project", "Cuéntanos sobre tu proyecto"),
                  join: t("Offer your services", "Ofrece tus servicios"),
                  profile: name(selected),
                  fees: t("Simple, upfront visit pricing", "Precios claros para tu visita"),
                  protection: t("Payments & work protection", "Pagos y protección del trabajo"),
                  account: t("Your Homely account", "Tu cuenta Homely"),
                  proposal: t("Send your proposal", "Envía tu propuesta"),
                  payment: t("Manage a work payment", "Gestiona un pago del trabajo"),
                  review: t("How did it go?", "¿Cómo te fue?"),
                  accept: t("Accept this proposal?", "¿Aceptar esta propuesta?"),
                  complete: t("Is the work complete?", "¿El trabajo está terminado?"),
                } as any
              )[modal]
            }
          </DialogTitle>
          <DialogDescription>
            {["fees", "protection", "account", "profile", "complete", "accept"].includes(modal)
              ? t(
                  "Everything you need to take the next step.",
                  "Todo lo que necesitas para el siguiente paso.",
                )
              : t(
                  "Preview mode. Your request is saved; no real payment is processed.",
                  "Modo demostración. Guardamos tu solicitud; no se procesan pagos reales.",
                )}
          </DialogDescription>
          {modal === "profile" && (
            <div className="profiledetail">
              <div className="portrait large" style={{ background: selected.color }}>
                {selected.initials}
              </div>
              <span className="pill">{label(selected.category)}</span>
              <h3>
                {selected.years} {t("years of experience", "años de experiencia")}
              </h3>
              <p>{selected.description[es ? 1 : 0]}</p>
              <p>{selected.tags[es ? 1 : 0]}</p>
              <p className="rating">
                <Star size={16} />
                {selected.rating} · {selected.reviews} {t("sample reviews", "reseñas de muestra")}
              </p>
              <div className="notice">
                {selected.id.length > 10
                  ? t(
                      "Registered profile. Bookings remain in demo mode; insurance is not active.",
                      "Perfil registrado. Las reservas siguen en modo demo; el seguro no está activo.",
                    )
                  : t(
                      "This is a sample profile, not a verified or available real contractor.",
                      "Este es un perfil de muestra, no un contratista real verificado o disponible.",
                    )}
              </div>
              <button className="primary full" onClick={() => book(selected, dates[0].id, "09:00")}>
                {t("Choose this visit", "Elegir esta visita")} · {money(price(selected))}
              </button>
            </div>
          )}
          {modal === "fees" && <FeeGuide market={market} es={es} policy={rules} />}
          {modal === "protection" && <InsuranceResearch es={es} />}
          {modal === "account" && (
            <div className="infocontent">
              <p>
                {signedIn
                  ? t(
                      "You are signed in. Your activity is saved securely to your account.",
                      "Has iniciado sesión. Tu actividad se guarda en tu cuenta.",
                    )
                  : t(
                      "Sign in to save visit requests, post projects, and offer your services.",
                      "Inicia sesión para guardar visitas, publicar proyectos y ofrecer tus servicios.",
                    )}
              </p>
              {signedIn ? (
                <button
                  className="primary full"
                  onClick={() => {
                    setModal("");
                    setView("bookings");
                  }}
                >
                  {t("View my activity", "Ver mi actividad")}
                </button>
              ) : (
                <a className="primary full" href="/signin-with-chatgpt?return_to=/" target="_top">
                  {t("Sign in with ChatGPT", "Iniciar sesión con ChatGPT")}
                </a>
              )}
            </div>
          )}
          {modal === "accept" && (
            <ProjectCheckout
              proposal={selectedRecord}
              project={records.find((r) => r.id === selectedRecord?.data.projectId)}
              records={records}
              market={selectedRecord?.market || market}
              es={es}
              policy={rules}
              onDone={() => {
                setModal("");
                refresh();
              }}
            />
          )}
          {modal === "payment" && (
            <ProjectCheckout
              booking={selectedRecord}
              market={selectedRecord?.market || market}
              es={es}
              policy={rules}
              onDone={() => {
                setModal("");
                refresh();
                setView("bookings");
              }}
            />
          )}
          {modal === "complete" && (
            <div className="infocontent">
              <p>
                {t(
                  "Mark the visit complete to use its base price as credit toward a project with the same contractor. No payment is released.",
                  "Marca la visita como completada para usar su valor base como saldo a favor en un proyecto con el mismo contratista. No se libera ningún pago.",
                )}
              </p>
              <button
                disabled={busy}
                className="primary full"
                onClick={() => save("complete", { bookingId: selectedRecord?.id })}
              >
                {t("Confirm completion", "Confirmar finalización")}
              </button>
            </div>
          )}
          {["booking", "post", "join", "proposal", "review"].includes(modal) && (
            <form className="modalform" onSubmit={submit}>
              {modal === "booking" && (
                <>
                  <div className="booksummary">
                    <div className="avatar">{selected.initials}</div>
                    <div>
                      <b>{name(selected)}</b>
                      <p>
                        {slot.date} · {slot.time} · {city}
                      </p>
                    </div>
                  </div>
                  {field(
                    "address",
                    t("Visit address", "Dirección de la visita"),
                    "text",
                    t("Street, apartment, ZIP code", "Calle, apartamento, código postal"),
                  )}
                  {field(
                    "notes",
                    t("What do you need help with?", "¿Con qué necesitas ayuda?"),
                    "textarea",
                  )}
                  <div className="receipt">
                    <span>{t("Assessment visit", "Visita de diagnóstico")}</span>
                    <b>{money(price(selected))}</b>
                  </div>
                  <div className="receipt">
                    <span>
                      {t("Booking fee", "Tarifa de reserva")} · {rules.visitRate}%
                    </span>
                    <b>{money((price(selected) * rules.visitRate) / 100)}</b>
                  </div>
                  <div className="receipt total">
                    <span>{t("Total for the visit", "Total de la visita")}</span>
                    <b>{money(price(selected) * (1 + rules.visitRate / 100))}</b>
                  </div>
                </>
              )}
              {modal === "post" && (
                <>
                  <RadioGroup
                    value={form.budgetMode || "manual"}
                    onValueChange={(v) => setForm({ ...form, budgetMode: v })}
                    className="optioncards"
                  >
                    <label>
                      <RadioGroupItem value="manual" />
                      {t("Describe work & set a budget", "Describir trabajo y definir presupuesto")}
                    </label>
                    <label>
                      <RadioGroupItem value="estimate" />
                      {t("Build a suggested budget", "Armar presupuesto sugerido")}
                    </label>
                  </RadioGroup>
                  <MaterialChoice
                    es={es}
                    value={form.materials || "client"}
                    onChange={(v) => setForm({ ...form, materials: v, estimate: undefined })}
                  />
                  {form.budgetMode === "estimate" && (
                    <Estimator
                      market={market}
                      city={form.city || city}
                      es={es}
                      materials={form.materials || "client"}
                      onUse={(budget, lines) =>
                        setForm({
                          ...form,
                          budget,
                          estimate: lines,
                          category: lines[0]?.category || form.category,
                        })
                      }
                    />
                  )}
                  <p className="notice">
                    {t(
                      "Posting is free. Your budget excludes the customer project fee.",
                      "Publicar es gratis. Tu presupuesto no incluye la tarifa del proyecto a cargo del cliente.",
                    )}{" "}
                    {rules.projectRate}%.
                  </p>
                </>
              )}
              {["post", "join"].includes(modal) && (
                <>
                  {field(
                    modal === "post" ? "title" : "name",
                    modal === "post"
                      ? t("Project title", "Título del proyecto")
                      : t("Your professional name", "Tu nombre profesional"),
                  )}
                  <label className="field">
                    {t("Service", "Servicio")}
                    <Pick
                      label="Service"
                      value={form.category || "plumbing"}
                      onChange={(v) => setForm({ ...form, category: v })}
                      items={categories
                        .slice(1)
                        .map((c) => ({ value: c.id, label: es ? c.es : c.en }))}
                    />
                  </label>
                  {field(
                    "description",
                    modal === "post"
                      ? t("What needs to be done?", "¿Qué hay que hacer?")
                      : t("Tell customers about your services", "Cuéntanos sobre tus servicios"),
                    "textarea",
                  )}
                  {field(
                    modal === "post" ? "budget" : "price",
                    (modal === "post"
                      ? t("Your project budget", "Presupuesto del proyecto")
                      : t("Your assessment visit price", "Precio de tu visita")) +
                      ` (${market === "CO" ? "COP" : "USD"})`,
                    "number",
                  )}
                  <label className="field">
                    {t("Location", "Ubicación")}
                    <Pick
                      label={t("Location", "Ubicación")}
                      value={form.city || city}
                      onChange={(v) => setForm({ ...form, city: v, estimate: undefined })}
                      items={rules.cities[market as "US" | "CO"].map((c) => ({
                        value: c,
                        label: c,
                      }))}
                    />
                  </label>
                  {modal === "join" && (
                    <div className="notice">
                      {t(
                        "Profiles are submitted for review. Credentials and insurance must be verified before accepting real work.",
                        "Los perfiles se envían a revisión. Se deben verificar las credenciales y el seguro antes de aceptar trabajos reales.",
                      )}
                    </div>
                  )}
                </>
              )}
              {modal === "proposal" && (
                <>
                  <p className="notice">
                    {t(
                      "Quote the full contractor price. The customer pays the project fee on top; nothing is deducted from your quote.",
                      "Cotiza el valor completo del contratista. El cliente paga la tarifa del proyecto por separado; no se descuenta de tu cotización.",
                    )}{" "}
                    {rules.projectRate}%.
                  </p>
                  <div className="notice">{selectedRecord?.data.title}</div>
                  {field("name", t("Your professional name", "Tu nombre profesional"))}
                  {field(
                    "amount",
                    t("Your quote", "Tu cotización") + ` (${market === "CO" ? "COP" : "USD"})`,
                    "number",
                  )}
                  {field(
                    "description",
                    t(
                      "Scope, materials & estimated timeline",
                      "Alcance, materiales y tiempo estimado",
                    ),
                    "textarea",
                  )}
                </>
              )}
              {modal === "review" && (
                <>
                  <div className="stars" role="group" aria-label={t("Rating", "Calificación")}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        type="button"
                        key={n}
                        aria-label={`${n} ${t("stars", "estrellas")}`}
                        onClick={() => setRating(n)}
                      >
                        <Star fill={n <= rating ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                  {field(
                    "comment",
                    t("Tell us about the completed work", "Cuéntanos sobre el trabajo terminado"),
                    "textarea",
                  )}
                </>
              )}
              {modal === "booking" && (
                <div className="notice">
                  {t(
                    "The base visit price becomes a one-time credit if you hire the same contractor for a project. The booking fee is excluded.",
                    "El valor base de la visita será saldo a favor, por una sola vez, si realizas un proyecto con el mismo contratista. La tarifa de reserva no se acredita.",
                  )}
                </div>
              )}
              {modal === "booking" && (
                <label className="checklabel consent">
                  <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
                  {t(
                    "I understand this saves a demo request, not a real appointment or charge.",
                    "Entiendo que esto guarda una solicitud demo, no una cita ni un cobro real.",
                  )}
                </label>
              )}
              {!signedIn && (
                <a className="textlink" href="/signin-with-chatgpt?return_to=/" target="_top">
                  {t("Sign in to save your request", "Inicia sesión para guardar tu solicitud")}
                  <ArrowUpRight size={14} />
                </a>
              )}
              <button
                type="submit"
                className="primary full"
                disabled={busy || (modal === "booking" && !consent)}
              >
                {busy
                  ? t("Saving…", "Guardando…")
                  : (
                      {
                        booking: t("Save demo visit request", "Guardar solicitud de visita demo"),
                        post: t("Publish project", "Publicar proyecto"),
                        join: t("Submit professional profile", "Enviar perfil profesional"),
                        proposal: t("Send proposal", "Enviar propuesta"),
                        payment: t("Save demo payment", "Guardar pago demo"),
                        review: t("Submit feedback", "Enviar reseña"),
                      } as any
                    )[modal]}
                <ArrowRight size={17} />
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
