import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronDown, Clock, Package, Truck, User } from "lucide-react";
import { toast } from "sonner";
import { Phone, ScreenHeader } from "@/components/kk/shell";
import {
  inr,
  orders as sampleOrders,
  statusTone,
  type Order,
  type OrderStatus,
} from "@/lib/kalakart-data";
import { useAuth } from "@/lib/auth";
import { subscribeOrders, updateOrderStatus } from "@/lib/firestore-service";
import { updateOrderStatusInCloudSql } from "@/lib/cloudsql-service.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "Your Orders — Shreni Kart" },
      {
        name: "description",
        content:
          "Track every handicraft order: buyer, quantity, price and delivery status in one simple screen.",
      },
      { property: "og:title", content: "Your Orders — Shreni Kart" },
      {
        property: "og:description",
        content: "Simple order tracking for artisans selling on Shreni Kart.",
      },
    ],
  }),
  component: Orders,
});

const nextStatuses: Record<OrderStatus, OrderStatus | null> = {
  "New Order": "Processing",
  Processing: "Ready to Ship",
  "Ready to Ship": "Shipped",
  Shipped: "Delivered",
  Delivered: null,
};

export function Orders() {
  const { user, session } = useAuth();
  const artisanId = user?.uid || session?.user?.id || "";
  const [liveOrders, setLiveOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!artisanId) return;
    const unsub = subscribeOrders(artisanId, (items) => {
      setLiveOrders(items);
    });
    return () => unsub();
  }, [artisanId]);

  const displayedOrders = liveOrders.length > 0 ? liveOrders : sampleOrders;

  const handleAdvanceStatus = async (o: Order) => {
    const next = nextStatuses[o.status];
    if (!next) {
      toast.success("Order already delivered!");
      return;
    }
    try {
      await updateOrderStatus(o.id, next);
      void updateOrderStatusInCloudSql({
        data: {
          orderId: o.id,
          status: next,
        },
      });
      toast.success(`Order updated to: ${next}`);
    } catch {
      void updateOrderStatusInCloudSql({
        data: {
          orderId: o.id,
          status: next,
        },
      });
      // optimistic update if local sample
      setLiveOrders((prev) =>
        prev.map((item) => (item.id === o.id ? { ...item, status: next } : item)),
      );
      toast.success(`Order status moved to ${next}`);
    }
  };

  return (
    <Phone withNav>
      <ScreenHeader
        title="Your Orders"
        subtitle={`${displayedOrders.length} orders from buyers`}
        back={false}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 landscape:grid-cols-2 gap-3.5 px-4 sm:px-5 py-4 sm:py-5">
        {displayedOrders.map((o, i) => {
          const next = nextStatuses[o.status];
          return (
            <article
              key={o.id}
              className="rise rounded-3xl bg-card p-4 shadow-soft"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="flex gap-3">
                <img
                  src={o.image}
                  alt={o.product}
                  loading="lazy"
                  width={700}
                  height={700}
                  className="size-20 shrink-0 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{o.product}</p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                        statusTone[o.status] || "bg-secondary text-secondary-foreground",
                      )}
                    >
                      {o.status}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="size-3.5" /> {o.buyer} · Qty {o.qty}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <CalendarDays className="size-3.5" /> {o.date} · #{o.id}
                  </p>
                  <p className="mt-1 text-base font-bold text-primary">{inr(o.price)}</p>
                </div>
              </div>

              {next ? (
                <button
                  type="button"
                  onClick={() => handleAdvanceStatus(o)}
                  className="tap mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary py-3 text-sm font-semibold text-primary"
                >
                  <Truck className="size-4" /> Move to {next}
                </button>
              ) : (
                <div className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl bg-leaf/10 py-2.5 text-xs font-semibold text-leaf">
                  <CheckCircle2 className="size-4" /> Completed & Delivered
                </div>
              )}
            </article>
          );
        })}
      </div>
    </Phone>
  );
}
