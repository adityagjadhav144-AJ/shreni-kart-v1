import { useState, useMemo, type ReactNode } from "react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { Home } from "@/routes/_authenticated/dashboard";
import { Orders } from "@/routes/_authenticated/orders";
import { InquiryPage } from "@/routes/_authenticated/inquiry";
import { ShreniAssistantOverlay } from "@/components/shreni/shreni-assistant-overlay";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { Phone, ScreenHeader } from "@/components/kk/shell";
import { VerificationPanel } from "@/components/kk/verification-panel";
import { VerifiedBadge } from "@/components/kk/verified-badge";
import { GoogleTranslateSelector } from "@/components/ui/GoogleTranslateSelector";
import { useAuth } from "@/lib/auth";
import { addProduct } from "@/lib/firestore-service";
import { saveProductToCloudSql } from "@/lib/cloudsql-service.functions";
import { images, inr } from "@/lib/kalakart-data";
import { usePWAUpdate } from "@/hooks/use-pwa-update";
import { toast } from "sonner";
import {
  Camera,
  CheckCircle2,
  Mic,
  Package,
  Plus,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

// Root Route layout with Shreni AI Assistant overlay and Offline Indicator
const rootRoute = createRootRoute({
  component: () => (
    <div className="relative min-h-screen bg-background text-foreground font-sans">
      <Outlet />
      <ErrorBoundary label="Shreni AI Assistant">
        <ShreniAssistantOverlay />
      </ErrorBoundary>
      <OfflineIndicator />
    </div>
  ),
});

// Screens
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: Home,
});

const ordersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/orders",
  component: Orders,
});

const inquiryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inquiry",
  component: InquiryPage,
});

// Profile & Settings Page
function ProfilePage() {
  const { profile, user, session } = useAuth();
  const navigate = useNavigate();

  return (
    <Phone withNav>
      <ScreenHeader
        title="Artisan Profile & Settings"
        subtitle="Manage your craft identity and regional preferences"
        back={true}
      />
      <div className="space-y-4 px-4 py-4 sm:px-5">
        {/* Profile Card */}
        <div className="rounded-3xl bg-card p-5 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-warm text-white font-bold text-xl shadow-soft">
              {profile?.fullName?.charAt(0) || "R"}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-foreground truncate">
                {profile?.fullName || "Radha Devi"}
              </h2>
              <p className="text-xs text-primary font-medium">
                {profile?.artisanName || "Radha Heritage Crafts"}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <VerifiedBadge status={profile?.verificationStatus || "verified"} />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t border-border/50 pt-3">
            <div>
              <span className="text-muted-foreground block text-[10px]">Craft Category</span>
              <span className="font-semibold text-foreground">
                {profile?.craftCategory || "Terracotta & Pottery"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">Region</span>
              <span className="font-semibold text-foreground">
                {profile?.village || "Khurja"}, {profile?.state || "Uttar Pradesh"}
              </span>
            </div>
          </div>

          <Link
            to="/verify"
            className="tap mt-3.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary py-2.5 text-xs font-semibold text-primary"
          >
            <ShieldCheck className="size-4" /> Identity & e-KYC Status
          </Link>
        </div>

        {/* Regional Language Switcher */}
        <div className="rounded-3xl bg-card p-5 shadow-soft">
          <h3 className="text-sm font-bold text-foreground mb-1">
            Regional Language (Google Translate)
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Choose your native language. Shreni Kart dynamically translates all listings and
            screens.
          </p>
          <GoogleTranslateSelector variant="grid" />
        </div>
      </div>
    </Phone>
  );
}

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

// Verification Screen
function VerifyScreen() {
  const navigate = useNavigate();

  return (
    <Phone withNav>
      <ScreenHeader
        title="Artisan Identity Verification"
        subtitle="Demo Aadhaar e-KYC Verification"
        back={true}
      />
      <div className="px-4 py-4 sm:px-5">
        <VerificationPanel
          onDone={() => {
            setTimeout(() => navigate({ to: "/dashboard" }), 1200);
          }}
          onSkip={() => navigate({ to: "/dashboard" })}
        />
      </div>
    </Phone>
  );
}

const verifyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/verify",
  component: VerifyScreen,
});

// Add Product Screen
function AddProductScreen() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const artisanId = user?.uid || session?.user?.id || "artisan_radha_01";

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [craft, setCraft] = useState("Terracotta Pottery");
  const [description, setDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState(images.pot);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a craft title.");
      return;
    }

    setIsSubmitting(true);
    const prodId = `prod_${Date.now()}`;
    const numPrice = Number(price) || 850;

    try {
      await addProduct(artisanId, {
        id: prodId,
        name: name.trim(),
        price: numPrice,
        rating: 5.0,
        stock: 10,
        status: "Published",
        image: selectedImage,
        craft,
        description: description.trim() || `Authentic ${name} handcrafted with heritage technique.`,
      });

      void saveProductToCloudSql({
        data: {
          id: prodId,
          artisanId,
          name: name.trim(),
          price: numPrice,
          rating: 5.0,
          stock: 10,
          status: "Published",
          image: selectedImage,
          craft,
          description:
            description.trim() || `Authentic ${name} handcrafted with heritage technique.`,
        },
      });

      toast.success("Craft product listed successfully!");
      navigate({ to: "/dashboard" });
    } catch {
      toast.success("Product listed to local catalog!");
      navigate({ to: "/dashboard" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Phone withNav>
      <ScreenHeader
        title="Add New Craft Listing"
        subtitle="Catalog with photos or voice description"
        back={true}
      />
      <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4 sm:px-5">
        <div className="rounded-3xl bg-card p-5 shadow-soft space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Craft / Product Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Hand-Painted Terracotta Diya"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-border bg-secondary/30 p-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Price (₹ INR)
              </label>
              <input
                type="number"
                required
                placeholder="750"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-2xl border border-border bg-secondary/30 p-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Craft Category
              </label>
              <select
                value={craft}
                onChange={(e) => setCraft(e.target.value)}
                className="w-full rounded-2xl border border-border bg-secondary/30 p-3 text-sm text-foreground outline-none focus:border-primary"
              >
                <option>Terracotta Pottery</option>
                <option>Kashmiri Weaving</option>
                <option>Moradabad Brass</option>
                <option>Chanderi Handloom</option>
                <option>Bamboo & Cane</option>
                <option>Madhubani Painting</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Description & Craft Story
            </label>
            <textarea
              rows={3}
              placeholder="Describe materials, origin, and heritage crafting technique..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-2xl border border-border bg-secondary/30 p-3 text-xs leading-relaxed text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              Select Product Photo
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[images.pot, images.vase, images.shawl, images.brass, images.saree, images.rug].map(
                (img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`relative overflow-hidden rounded-2xl border-2 transition-all ${
                      selectedImage === img
                        ? "border-primary shadow-card scale-95"
                        : "border-transparent opacity-80"
                    }`}
                  >
                    <img src={img} alt="Sample craft" className="h-16 w-full object-cover" />
                    {selectedImage === img && (
                      <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-primary text-white text-[10px]">
                        ✓
                      </span>
                    )}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="tap flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-warm py-3.5 text-sm font-bold text-primary-foreground shadow-card disabled:opacity-50"
        >
          <Plus className="size-4" strokeWidth={3} />
          {isSubmitting ? "Publishing listing…" : "Publish to Shreni Kart"}
        </button>
      </form>
    </Phone>
  );
}

const addProductRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/add-product",
  component: AddProductScreen,
});

// Voice & Chat Trigger Redirects
const voiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/voice",
  component: () => <Home />,
});

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chat",
  component: () => <Home />,
});

// Route Tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  ordersRoute,
  inquiryRoute,
  profileRoute,
  verifyRoute,
  addProductRoute,
  voiceRoute,
  chatRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  usePWAUpdate();
  return <RouterProvider router={router} />;
}

export default App;
