import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Mic, Plus, Search, Sparkles, Star, UserRound } from "lucide-react";
import heroImg from "@/assets/hero-artisan.jpg";
import { Phone, SectionTitle } from "@/components/kk/shell";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import { GoogleTranslateSelector } from "@/components/ui/GoogleTranslateSelector";
import { inr, products as sampleProducts, images, type Product } from "@/lib/kalakart-data";
import { useAuth } from "@/lib/auth";
import { subscribeProducts } from "@/lib/firestore-service";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Shreni Kart — Empowering Artisans, Connecting Traditions" },
      {
        name: "description",
        content:
          "Shreni Kart turns an artisan's voice or photo into a professional listing with AI descriptions, image enhancement and smart price suggestions.",
      },
      { property: "og:title", content: "Shreni Kart — Empowering Artisans" },
      {
        property: "og:description",
        content:
          "AI marketplace and smart cataloging assistant for Indian artisans. Speak in your language, sell everywhere.",
      },
    ],
  }),
  component: Home,
});

const filters = ["All", "Published", "Draft", "Out of Stock"] as const;

export function Home() {
  const { profile, user, session } = useAuth();
  const artisanId = user?.uid || session?.user?.id || "";
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!artisanId) return;
    const unsub = subscribeProducts(artisanId, (items) => {
      setLiveProducts(items);
    });
    return () => unsub();
  }, [artisanId]);

  // Use live products from Firestore if available, otherwise fallback to defaults
  const catalog =
    Array.isArray(liveProducts) && liveProducts.length > 0 ? liveProducts : sampleProducts;

  const searchQuery = (query || "").trim().toLowerCase();
  const mine = (catalog || []).filter((p) => {
    if (!p) return false;
    const matchesFilter = filter === "All" || (p.status || "Published") === filter;
    const productName = (p.name || "").toLowerCase();
    return matchesFilter && (!searchQuery || productName.includes(searchQuery));
  });

  const artisanDisplayName =
    profile?.artisan_name ||
    profile?.full_name ||
    profile?.artisanName ||
    profile?.fullName ||
    "Artisan";

  return (
    <Phone withNav>
      {/* Top bar */}
      <div className="flex items-start justify-between gap-3 px-5 pt-6">
        <div>
          <p className="font-display text-xl font-semibold tracking-[0.18em] text-primary">
            SHRENI KART
          </p>
          <h1
            className="mt-1.5 text-[22px] leading-tight font-semibold text-foreground"
            suppressHydrationWarning
          >
            Hello, {mounted ? artisanDisplayName : "Artisan"}! 👋
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Turn your craft into your next opportunity.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <GoogleTranslateSelector variant="compact" />
          <PWAInstallButton variant="compact" />
          <Link
            to="/profile"
            aria-label="Profile and language settings"
            className="tap grid size-11 shrink-0 place-items-center rounded-2xl bg-card text-primary shadow-soft"
          >
            <UserRound className="size-5" />
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="rise mt-4 px-5">
        <div className="relative overflow-hidden rounded-3xl shadow-card">
          <img
            src={heroImg}
            alt="Indian artisan shaping a terracotta pot on a potter's wheel"
            width={1200}
            height={912}
            className="h-56 landscape:h-44 sm:landscape:h-52 w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-hero opacity-80" />
          <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-5">
            <span className="w-fit rounded-full bg-ivory/15 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-ivory backdrop-blur">
              AI CATALOGING
            </span>
            <div>
              <h2 className="font-display text-2xl landscape:text-xl sm:landscape:text-2xl leading-[1.05] font-semibold text-ivory">
                YOUR CRAFT.
                <br />
                YOUR STORY.
                <br />
                YOUR MARKET.
              </h2>
              <p className="mt-1.5 landscape:mt-1 max-w-[15rem] sm:max-w-md text-[11px] leading-snug text-ivory/75">
                Turn your handmade products into professional digital listings with AI.
              </p>
              <Link
                to="/add-product"
                className="tap mt-2.5 inline-flex items-center gap-2 rounded-full bg-gradient-gold px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-gold-foreground shadow-float"
              >
                <Plus className="size-4" strokeWidth={3} />
                Add Product
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Two feature cards */}
      <section className="mt-4 grid grid-cols-2 gap-3 px-5">
        <Link
          to="/voice"
          className="tap rise rounded-3xl bg-card p-4 shadow-soft"
          style={{ animationDelay: "80ms" }}
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-warm text-primary-foreground">
            <Mic className="size-5" />
          </span>
          <p className="mt-3 text-sm font-semibold text-foreground">Voice Command</p>
          <p className="text-[11px] text-primary">Speak in your language</p>
          <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
            Describe products, create listings and control the app using your voice.
          </p>
        </Link>
        <Link
          to="/chat"
          className="tap rise rounded-3xl bg-card p-4 shadow-soft"
          style={{ animationDelay: "160ms" }}
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-maroon text-maroon-foreground">
            <Sparkles className="size-5" />
          </span>
          <p className="mt-3 text-sm font-semibold text-foreground">Shreni AI</p>
          <p className="text-[11px] text-primary">Say “Namaste Shreni”</p>
          <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
            Voice trigger active anytime. Ask about prices, craft stories, orders.
          </p>
        </Link>
      </section>

      {/* Popular picks */}
      <section className="mt-5">
        <div className="px-5">
          <SectionTitle
            title="Popular Picks"
            subtitle="Trending handicrafts buyers love"
            action={<ArrowRight className="size-4 text-primary" />}
          />
        </div>
        <ErrorBoundary label="Popular Picks">
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-5 pb-2">
            {(sampleProducts || []).map((p, i) => (
              <article
                key={p?.id || `popular-${i}`}
                className="rise w-40 shrink-0 rounded-3xl bg-card p-2.5 shadow-soft"
                style={{ animationDelay: `${120 + i * 60}ms` }}
              >
                <div className="overflow-hidden rounded-2xl bg-beige">
                  <img
                    src={p?.image || images.pot}
                    alt={p?.name || "Artisan Craft"}
                    loading="lazy"
                    width={700}
                    height={700}
                    className="h-28 w-full object-cover"
                  />
                </div>
                <p className="mt-2 line-clamp-2 h-8 text-xs font-semibold text-foreground">
                  {p?.name || "Handmade Craft"}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-primary">{inr(p?.price)}</p>
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Star className="size-3 fill-gold text-gold" />
                      {p?.rating ?? 5.0}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Add ${p?.name || "Craft"}`}
                    onClick={() => toast.success(`${p?.name || "Craft"} added to your showcase`)}
                    className="tap grid size-8 place-items-center rounded-xl bg-gradient-warm text-primary-foreground"
                  >
                    <Plus className="size-4" strokeWidth={3} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </ErrorBoundary>
      </section>

      {/* My products */}
      <section className="mt-6 px-5">
        <SectionTitle
          title="My Products"
          subtitle="Your artisan catalog"
          action={
            <Link
              to="/add-product"
              className="tap inline-flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              <Plus className="size-3.5" strokeWidth={3} /> Add
            </Link>
          }
        />

        <div className="relative">
          <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your products"
            className="w-full rounded-2xl border border-border bg-card py-3 pr-4 pl-11 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "tap shrink-0 rounded-full px-4 py-2 text-xs font-semibold",
                filter === f
                  ? "bg-maroon text-maroon-foreground"
                  : "bg-card text-muted-foreground shadow-soft",
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <ErrorBoundary label="Artisan Product Grid">
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 landscape:grid-cols-2 gap-3">
            {mine.map((p, idx) => (
              <article
                key={p?.id || `product-${idx}`}
                className="flex items-center gap-3 rounded-3xl bg-card p-3 shadow-soft"
              >
                <img
                  src={p?.image || images.pot}
                  alt={p?.name || "Craft Product"}
                  loading="lazy"
                  width={700}
                  height={700}
                  className="size-20 shrink-0 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {p?.name || "Handcrafted Product"}
                  </p>
                  <p className="text-sm font-bold text-primary">{inr(p?.price)}</p>
                  <p className="text-[11px] text-muted-foreground">{p?.stock ?? 0} available</p>
                  <span
                    className={cn(
                      "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      p?.status === "Published" && "bg-leaf/15 text-leaf",
                      p?.status === "Draft" && "bg-gold/25 text-gold-foreground",
                      p?.status === "Out of Stock" && "bg-destructive/10 text-destructive",
                    )}
                  >
                    {p?.status || "Published"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toast(`Editing ${p?.name || "Product"}`)}
                  className="tap self-start rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
                >
                  Edit
                </button>
              </article>
            ))}
            {mine.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground col-span-full">
                No products match this filter yet.
              </p>
            ) : null}
          </div>
        </ErrorBoundary>
      </section>
    </Phone>
  );
}
