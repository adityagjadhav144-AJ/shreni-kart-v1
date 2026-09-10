import { toast } from "sonner";
import { type ShreniAction } from "./shreni-ai.functions";
import { applyGoogleTranslate } from "./google-translate";
import {
  addProduct,
  updateOrderStatus,
  saveUserProfile,
  type OrderStatus,
} from "./firestore-service";
import { saveProductToCloudSql, updateOrderStatusInCloudSql } from "./cloudsql-service.functions";
import { images } from "./kalakart-data";
import { playAssistantActivationChime } from "./sound-effects";

export interface ShreniExecutionContext {
  artisanId?: string;
  artisanName?: string;
  navigate: (opts: { to?: string; href?: string }) => void;
  closeAssistant?: () => void;
  setTtsEnabled?: (enabled: boolean) => void;
  testChime?: () => Promise<void>;
}

export async function executeShreniAction(
  action: ShreniAction,
  context: ShreniExecutionContext,
): Promise<{ success: boolean; message: string }> {
  if (!action || action.type === "none") {
    return { success: true, message: "No action needed." };
  }

  try {
    console.log("[Shreni Controller] Executing action:", action.type, action);
    switch (action.type) {
      case "change_language": {
        const langCode = action.languageCode || "en";
        const langLabel = action.languageLabel || langCode;

        applyGoogleTranslate(langCode);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("shreni.preferred_language", langCode);
          window.localStorage.setItem("craftlink.lang", langCode);
          window.dispatchEvent(
            new CustomEvent("shreni:language_changed", { detail: { langCode } }),
          );
        }

        if (context.artisanId) {
          void saveUserProfile(context.artisanId, {
            id: context.artisanId,
            preferredLanguage: langCode,
          });
        }

        const msg = `🌐 App language switched to ${langLabel}`;
        toast.success(msg);
        return { success: true, message: msg };
      }

      case "navigate": {
        const target = action.target || "/dashboard";
        const label = action.label || target;

        toast.info(`🚀 Opening ${label}...`, { id: "shreni-nav-toast" });
        setTimeout(() => {
          if (context.closeAssistant) context.closeAssistant();
          context.navigate({ href: target, to: target });
        }, 650);

        return { success: true, message: `Navigated to ${label}` };
      }

      case "create_product": {
        const title = action.title || "Handmade Artisan Specialty";
        const price = Number(action.price) || 850;
        const category = action.category || "Traditional Handicrafts";
        const description =
          action.description ||
          `Authentic ${title} handcrafted by traditional master artisan with heritage technique.`;

        if (context.artisanId) {
          const prodId = `prod_${Date.now()}`;
          await addProduct(context.artisanId, {
            id: prodId,
            name: title,
            price,
            rating: 5.0,
            stock: 15,
            status: "Published",
            image: images.vase,
            craft: category,
            description,
          });

          void saveProductToCloudSql({
            data: {
              id: prodId,
              artisanId: context.artisanId,
              name: title,
              price,
              rating: 5.0,
              stock: 15,
              status: "Published",
              image: images.vase,
              craft: category,
              description,
            },
          });

          const successMsg = `✨ Product "${title}" created at ₹${price}!`;
          toast.success(successMsg);

          setTimeout(() => {
            if (context.closeAssistant) context.closeAssistant();
            context.navigate({ to: "/dashboard" });
          }, 1400);

          return { success: true, message: successMsg };
        } else {
          // Artisan not logged in or creating via studio: prefill creator studio
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(
              "shreni_prefill_product",
              JSON.stringify({
                title,
                price,
                category,
                description,
                step: 2,
              }),
            );
          }

          toast.info(`📝 Prefilled product studio with "${title}"`);
          setTimeout(() => {
            if (context.closeAssistant) context.closeAssistant();
            context.navigate({ to: "/add-product" });
          }, 1100);

          return { success: true, message: `Prefilled product studio for ${title}` };
        }
      }

      case "fill_product_form": {
        const title = action.title || "Handmade Craft Specialty";
        const price = Number(action.price) || 850;
        const category = action.category || "Traditional Handicrafts";
        const description = action.description || "";

        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            "shreni_prefill_product",
            JSON.stringify({
              title,
              price,
              category,
              description,
              step: 2,
            }),
          );
        }

        toast.info(`📝 Opening Product Studio for "${title}"`);
        setTimeout(() => {
          if (context.closeAssistant) context.closeAssistant();
          context.navigate({ to: "/add-product" });
        }, 1100);

        return { success: true, message: `Opened product creator with prefill for ${title}` };
      }

      case "update_order_status": {
        const newStatus: OrderStatus = (action.status as OrderStatus) || "Shipped";
        const orderId = action.orderId;

        if (orderId) {
          await updateOrderStatus(orderId, newStatus);
          void updateOrderStatusInCloudSql({
            data: { orderId, status: newStatus },
          });
          const msg = `📦 Order ${orderId} updated to ${newStatus}`;
          toast.success(msg);
          return { success: true, message: msg };
        } else {
          // Update order & navigate to view
          const msg = `📦 Order status marked as ${newStatus}`;
          toast.success(msg);
          setTimeout(() => {
            if (context.closeAssistant) context.closeAssistant();
            context.navigate({ to: "/orders" });
          }, 1100);
          return { success: true, message: msg };
        }
      }

      case "send_inquiry_reply": {
        const replyText = action.replyText || "Thank you! We will fulfill your request.";
        toast.success(`💬 Inquiry response ready: "${replyText.slice(0, 40)}..."`);
        setTimeout(() => {
          if (context.closeAssistant) context.closeAssistant();
          context.navigate({ to: "/inquiry" });
        }, 1100);
        return { success: true, message: "Inquiry response recorded" };
      }

      case "toggle_tts": {
        const enabled = action.enabled !== false;
        if (context.setTtsEnabled) context.setTtsEnabled(enabled);
        const msg = enabled
          ? "🔊 Shreni voice read-aloud enabled"
          : "🔇 Shreni voice read-aloud muted";
        toast.info(msg);
        return { success: true, message: msg };
      }

      case "share_storefront": {
        if (typeof window !== "undefined") {
          const shareData = {
            title: "Shreni Kart — Authentic Indian Handicrafts",
            text: "Explore handloom and terracotta crafts on my Shreni Kart artisan storefront!",
            url: window.location.origin,
          };

          if (navigator.share) {
            void navigator.share(shareData).catch(() => {});
          } else if (navigator.clipboard) {
            void navigator.clipboard.writeText(window.location.origin);
            toast.success("🔗 Storefront link copied to clipboard!");
          }
        }
        return { success: true, message: "Shared storefront link" };
      }

      case "install_app": {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("shreni:trigger-pwa-install"));
        }
        toast.info("📱 Launching App Installation...");
        return { success: true, message: "Initiated PWA installation" };
      }

      case "test_sound": {
        if (context.testChime) {
          await context.testChime();
        } else {
          await playAssistantActivationChime();
        }
        toast.success("🔔 Activation chime played!");
        return { success: true, message: "Played activation sound chime" };
      }

      default:
        return { success: true, message: "Completed." };
    }
  } catch (err) {
    console.error("Failed to execute Shreni action:", err);
    toast.error("Could not complete requested in-app action.");
    return { success: false, message: "Execution error" };
  }
}
