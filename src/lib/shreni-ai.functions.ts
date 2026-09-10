import { GoogleGenAI, Type } from "@google/genai";
import { resolveShreniIntent } from "./shreni-intent-engine";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const key =
    typeof process !== "undefined" && process.env ? process.env["GEMINI_API_KEY"] : undefined;
  if (!key || key === "MY_GEMINI_API_KEY") return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

export type ShreniMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ShreniAction = {
  type:
    | "navigate"
    | "change_language"
    | "create_product"
    | "fill_product_form"
    | "update_order_status"
    | "send_inquiry_reply"
    | "toggle_tts"
    | "share_storefront"
    | "install_app"
    | "test_sound"
    | "none";
  target?: string;
  label?: string;
  languageCode?: string;
  languageLabel?: string;
  title?: string;
  price?: number;
  category?: string;
  description?: string;
  orderId?: string;
  status?: string;
  replyText?: string;
  enabled?: boolean;
  autoExecute?: boolean;
};

export type ShreniResponse = {
  reply: string;
  actions: ShreniAction[];
  action?: ShreniAction; // Backwards-compatible single action
  detectedIntent?: string;
};

const SHRENI_SYSTEM_INSTRUCTION = `You are Shreni AI (श्रेणी), an autonomous, warm, and highly capable AI assistant with FULL ACCESS to control the Shreni Kart platform for Indian artisans, weavers, potters, and craftspeople.

You have direct in-app control capabilities. When the user asks you to do something, you don't just talk—you EXECUTE the action for them using the "actions" array!

AVAILABLE IN-APP CONTROLS:
1. "navigate":
   - Target screens:
     * "/dashboard" -> Home, Storefront overview, Products
     * "/orders" -> Orders, Shipments, Sales tracking
     * "/inquiry" -> Buyer messages, inquiries
     * "/add-product" -> Add/create new craft listing
     * "/profile" -> Profile, Store details, Settings
     * "/verify" -> Artisan ID, Aadhaar e-KYC Verification
     * "/chat" -> Buyer live messaging
     * "/login" -> Login screen
     * "/register" -> Register artisan account

2. "change_language":
   - Supported language codes:
     * "hi" -> Hindi (हिन्दी)
     * "mr" -> Marathi (मराठी)
     * "gu" -> Gujarati (ગુજરાતી)
     * "bn" -> Bengali (বাংলা)
     * "ta" -> Tamil (தமிழ்)
     * "te" -> Telugu (తెలుగు)
     * "kn" -> Kannada (ಕನ್ನಡ)
     * "ml" -> Malayalam (മലയാളം)
     * "pa" -> Punjabi (ਪੰਜਾਬੀ)
     * "or" -> Odia (ଓଡ଼ିଆ)
     * "ur" -> Urdu (اردو)
     * "as" -> Assamese (অসমীয়া)
     * "sa" -> Sanskrit (संस्कृतम्)
     * "ne" -> Nepali (नेपाली)
     * "en" -> English
   Trigger this whenever user asks to change language, translate app, speak in Hindi/Marathi/Gujarati/etc., or reset to English.

3. "create_product" or "fill_product_form":
   - When user asks to add, list, or craft a new product (e.g. "Add a terracotta water pot for 750 rupees"):
   - Extract title, price (number), category (e.g. "Pottery & Clay", "Handloom & Textiles", "Woodwork & Carving", "Jewelry & Metalcraft"), and a rich authentic craft description.
   - Use "create_product" if the user gives explicit craft details, or "fill_product_form" to prefill the creator studio.

4. "update_order_status":
   - When user asks to update an order (e.g. "Mark order as shipped", "Process order", "Order is ready to ship"):
   - Set status to: "Processing" | "Ready to Ship" | "Shipped" | "Delivered" | "Cancelled".

5. "send_inquiry_reply":
   - When user asks to reply to a customer/buyer inquiry:
   - Provide "replyText" with courteous, professional artisan response.

6. "toggle_tts":
   - When user asks to mute, stop speaking, turn off voice ("enabled": false) or turn on speech read-aloud ("enabled": true).

7. "share_storefront":
   - When user asks to share their store or copy their link.

8. "install_app":
   - When user asks to install the app or add to home screen.

9. "test_sound":
   - When user asks to test the chime or activation sound.

OUTPUT FORMAT:
You MUST output valid JSON matching this schema:
{
  "reply": "Warm, respectful, concise conversational response in the artisan's language (2-3 short sentences max). Mention the action you executed!",
  "actions": [
    {
      "type": "navigate" | "change_language" | "create_product" | "fill_product_form" | "update_order_status" | "send_inquiry_reply" | "toggle_tts" | "share_storefront" | "install_app" | "test_sound" | "none",
      "target": "/orders",
      "label": "Open Orders",
      "languageCode": "hi",
      "languageLabel": "Hindi",
      "title": "Terracotta Pot",
      "price": 750,
      "category": "Pottery & Clay",
      "description": "Handcrafted river clay pot...",
      "status": "Shipped",
      "replyText": "Yes, we can customize this craft for you.",
      "enabled": true,
      "autoExecute": true
    }
  ],
  "detectedIntent": "navigation | language | create_product | update_order | inquiry | voice_settings | share | general"
}

Tone:
- Always greet warmly with "Namaste!".
- Be encouraging and respectful of traditional heritage crafts.
- Keep the reply concise and spoken-friendly.`;

function getFallbackArtisanResponse(prompt: string): ShreniResponse {
  return resolveShreniIntent(prompt);
}

const CANDIDATE_MODELS = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function askShreniAi({
  data,
}: {
  data: { message: string; history?: ShreniMessage[] };
}): Promise<ShreniResponse> {
  const { message } = data;
  const client = getGeminiClient();

  if (!client) {
    return getFallbackArtisanResponse(message);
  }

  const config = {
    systemInstruction: SHRENI_SYSTEM_INSTRUCTION,
    temperature: 0.4,
    maxOutputTokens: 400,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        reply: {
          type: Type.STRING,
          description:
            "Spoken and written conversational reply to the artisan (2-3 sentences max).",
        },
        actions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                description:
                  "One of: navigate, change_language, create_product, fill_product_form, update_order_status, send_inquiry_reply, toggle_tts, share_storefront, install_app, test_sound, none",
              },
              target: { type: Type.STRING },
              label: { type: Type.STRING },
              languageCode: { type: Type.STRING },
              languageLabel: { type: Type.STRING },
              title: { type: Type.STRING },
              price: { type: Type.NUMBER },
              category: { type: Type.STRING },
              description: { type: Type.STRING },
              orderId: { type: Type.STRING },
              status: { type: Type.STRING },
              replyText: { type: Type.STRING },
              enabled: { type: Type.BOOLEAN },
              autoExecute: { type: Type.BOOLEAN },
            },
            required: ["type"],
          },
        },
        detectedIntent: { type: Type.STRING },
      },
      required: ["reply", "actions"],
    },
  };

  let experiencedCapacitySpike = false;

  // Try candidate models in order to absorb 503 high demand or temporary unavailability
  for (let i = 0; i < CANDIDATE_MODELS.length; i++) {
    const model = CANDIDATE_MODELS[i];
    try {
      const response = await client.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [{ text: message }],
          },
        ],
        config,
      });

      const rawReply = response.text?.trim() || "";
      if (!rawReply) {
        continue;
      }

      try {
        const parsed = JSON.parse(rawReply) as {
          reply: string;
          actions?: ShreniAction[];
          detectedIntent?: string;
        };

        const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
        // Ensure autoExecute defaults to true
        const processedActions = actions.map((a) => ({
          ...a,
          autoExecute: a.autoExecute !== false,
        }));

        return {
          reply: parsed.reply || "Namaste! Action executed.",
          actions: processedActions,
          action: processedActions[0] || { type: "none" },
          detectedIntent: parsed.detectedIntent || "assistant",
        };
      } catch {
        // If JSON parse failed, try next model or fallback
        continue;
      }
    } catch (err: unknown) {
      const errString = String(err).toLowerCase();
      const isTemporarySpike =
        errString.includes("503") ||
        errString.includes("unavailable") ||
        errString.includes("high demand") ||
        errString.includes("429");

      if (isTemporarySpike) {
        experiencedCapacitySpike = true;
        // Brief jittered pause before trying the fallback model
        if (i < CANDIDATE_MODELS.length - 1) {
          await sleep(200 + i * 150);
          continue;
        }
      }
    }
  }

  if (experiencedCapacitySpike) {
    console.info(
      "Shreni AI: Temporary high demand on upstream models; seamlessly serving artisan request via local response engine.",
    );
  }

  return getFallbackArtisanResponse(message);
}
