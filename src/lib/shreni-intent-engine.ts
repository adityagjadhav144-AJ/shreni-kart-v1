import type { ShreniAction, ShreniResponse } from "./shreni-ai.functions";

/**
 * Universal client-side and server-side intent recognition engine for Shreni AI.
 * Handles multilingual artisan commands in English, Hindi, Hinglish, Marathi, Gujarati,
 * Bengali, Tamil, Telugu, Kannada, Malayalam, Punjabi, Odia, and other Indian languages.
 *
 * Runs instantly both offline in PWA and online as fallback when Gemini network drops.
 */
export function resolveShreniIntent(prompt: string): ShreniResponse {
  const raw = prompt.trim();
  const lower = raw.toLowerCase();

  // Normalize spaces and common punctuation
  const clean = lower.replace(/[.,?!:;]/g, " ").replace(/\s+/g, " ");

  // ==========================================
  // 1. LANGUAGE CHANGE INTENTS
  // ==========================================
  // Hindi
  if (
    clean.includes("hindi") ||
    clean.includes("हिंदी") ||
    clean.includes("हिन्दी") ||
    clean.includes("hindi me") ||
    clean.includes("hindi karo")
  ) {
    const action: ShreniAction = {
      type: "change_language",
      languageCode: "hi",
      languageLabel: "Hindi (हिन्दी)",
      autoExecute: true,
    };
    return {
      reply: "नमस्ते! मैंने आपके लिए पूरी ऐप की भाषा हिंदी में बदल दी है।",
      actions: [action],
      action,
      detectedIntent: "language",
    };
  }

  // Marathi
  if (clean.includes("marathi") || clean.includes("मराठी") || clean.includes("marathi madhe")) {
    const action: ShreniAction = {
      type: "change_language",
      languageCode: "mr",
      languageLabel: "Marathi (मराठी)",
      autoExecute: true,
    };
    return {
      reply: "नमस्ते! मी तुमच्यासाठी ॲपची भाषा मराठी केली आहे.",
      actions: [action],
      action,
      detectedIntent: "language",
    };
  }

  // Gujarati
  if (
    clean.includes("gujarati") ||
    clean.includes("गुजराती") ||
    clean.includes("ગુજરાતી") ||
    clean.includes("gujarati ma")
  ) {
    const action: ShreniAction = {
      type: "change_language",
      languageCode: "gu",
      languageLabel: "Gujarati (ગુજરાતી)",
      autoExecute: true,
    };
    return {
      reply: "નમસ્તે! મેં તમારા માટે એપની ભાષા ગુજરાતીમાં બદલી છે.",
      actions: [action],
      action,
      detectedIntent: "language",
    };
  }

  // Tamil
  if (
    clean.includes("tamil") ||
    clean.includes("तमिल") ||
    clean.includes("தமிழ்") ||
    clean.includes("tamilil")
  ) {
    const action: ShreniAction = {
      type: "change_language",
      languageCode: "ta",
      languageLabel: "Tamil (தமிழ்)",
      autoExecute: true,
    };
    return {
      reply: "வணக்கம்! உங்களுக்காக ஆப் மொழியை தமிழில் மாற்றியுள்ளேன்.",
      actions: [action],
      action,
      detectedIntent: "language",
    };
  }

  // Bengali
  if (
    clean.includes("bengali") ||
    clean.includes("बंगाली") ||
    clean.includes("বাংলা") ||
    clean.includes("bangla")
  ) {
    const action: ShreniAction = {
      type: "change_language",
      languageCode: "bn",
      languageLabel: "Bengali (বাংলা)",
      autoExecute: true,
    };
    return {
      reply: "নমস্কার! আমি আপনার জন্য অ্যাপের ভাষা বাংলায় পরিবর্তন করেছি।",
      actions: [action],
      action,
      detectedIntent: "language",
    };
  }

  // Telugu
  if (clean.includes("telugu") || clean.includes("तेलुगु") || clean.includes("తెలుగు")) {
    const action: ShreniAction = {
      type: "change_language",
      languageCode: "te",
      languageLabel: "Telugu (తెలుగు)",
      autoExecute: true,
    };
    return {
      reply: "నమస్కారం! యాప్ భాషను తెలుగులోకి మార్చాను.",
      actions: [action],
      action,
      detectedIntent: "language",
    };
  }

  // Kannada
  if (clean.includes("kannada") || clean.includes("कन्नड़") || clean.includes("ಕನ್ನಡ")) {
    const action: ShreniAction = {
      type: "change_language",
      languageCode: "kn",
      languageLabel: "Kannada (ಕನ್ನಡ)",
      autoExecute: true,
    };
    return {
      reply: "ನಮಸ್ಕಾರ! ಆ್ಯಪ್ ಭಾಷೆಯನ್ನು ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಿದ್ದೇನೆ.",
      actions: [action],
      action,
      detectedIntent: "language",
    };
  }

  // Malayalam
  if (clean.includes("malayalam") || clean.includes("मलयालम") || clean.includes("മലയാളം")) {
    const action: ShreniAction = {
      type: "change_language",
      languageCode: "ml",
      languageLabel: "Malayalam (മലയാളം)",
      autoExecute: true,
    };
    return {
      reply: "നമസ്കാരം! ആപ്പ് ഭാഷ മലയാളത്തിലേക്ക് മാറ്റി.",
      actions: [action],
      action,
      detectedIntent: "language",
    };
  }

  // Punjabi
  if (clean.includes("punjabi") || clean.includes("पंजाबी") || clean.includes("ਪੰਜਾਬੀ")) {
    const action: ShreniAction = {
      type: "change_language",
      languageCode: "pa",
      languageLabel: "Punjabi (ਪੰਜਾਬੀ)",
      autoExecute: true,
    };
    return {
      reply: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਐਪ ਦੀ ਭਾਸ਼ਾ ਪੰਜਾਬੀ ਵਿੱਚ ਬਦਲ ਦਿੱਤੀ ਗਈ ਹੈ।",
      actions: [action],
      action,
      detectedIntent: "language",
    };
  }

  // Odia
  if (
    clean.includes("odia") ||
    clean.includes("oriya") ||
    clean.includes("उड़िया") ||
    clean.includes("ଓଡ଼ିଆ")
  ) {
    const action: ShreniAction = {
      type: "change_language",
      languageCode: "or",
      languageLabel: "Odia (ଓଡ଼ିଆ)",
      autoExecute: true,
    };
    return {
      reply: "ନମସ୍କାର! ଆପ୍ ଭାଷା ଓଡ଼ିଆରେ ପରିବର୍ତ୍ତନ କରାଯାଇଛି।",
      actions: [action],
      action,
      detectedIntent: "language",
    };
  }

  // English / Reset
  if (
    clean.includes("english") ||
    clean.includes("अंग्रेजी") ||
    clean.includes("अंग्रेज़ी") ||
    clean.includes("reset language") ||
    clean.includes("default language")
  ) {
    const action: ShreniAction = {
      type: "change_language",
      languageCode: "en",
      languageLabel: "English",
      autoExecute: true,
    };
    return {
      reply: "Namaste! I have restored the app language to English for you.",
      actions: [action],
      action,
      detectedIntent: "language",
    };
  }

  // ==========================================
  // 2. ORDER MANAGEMENT INTENTS
  // ==========================================
  if (
    clean.includes("mark as shipped") ||
    clean.includes("ship order") ||
    clean.includes("shipped") ||
    clean.includes("डिस्पैच") ||
    clean.includes("भेज दिया")
  ) {
    const action: ShreniAction = {
      type: "update_order_status",
      status: "Shipped",
      autoExecute: true,
    };
    return {
      reply:
        "Namaste! I have updated your order status to Shipped. Let me open your orders screen.",
      actions: [
        action,
        { type: "navigate", target: "/orders", label: "View Orders", autoExecute: true },
      ],
      action,
      detectedIntent: "update_order",
    };
  }

  if (
    clean.includes("ready to ship") ||
    clean.includes("process order") ||
    clean.includes("processing") ||
    clean.includes("तैयार है")
  ) {
    const action: ShreniAction = {
      type: "update_order_status",
      status: "Ready to Ship",
      autoExecute: true,
    };
    return {
      reply: "Namaste! I have marked your order as Ready to Ship for dispatch.",
      actions: [
        action,
        { type: "navigate", target: "/orders", label: "View Orders", autoExecute: true },
      ],
      action,
      detectedIntent: "update_order",
    };
  }

  if (
    clean.includes("order") ||
    clean.includes("ऑर्डर") ||
    clean.includes("ऑर्डर्स") ||
    clean.includes("sales") ||
    clean.includes("बिक्री")
  ) {
    const action: ShreniAction = {
      type: "navigate",
      target: "/orders",
      label: "Open Orders",
      autoExecute: true,
    };
    return {
      reply: "Namaste! Opening your orders and shipment tracker right now.",
      actions: [action],
      action,
      detectedIntent: "navigation",
    };
  }

  // ==========================================
  // 3. PRODUCT CATALOGING & CREATION INTENTS
  // ==========================================
  if (
    clean.includes("add") ||
    clean.includes("create") ||
    clean.includes("list") ||
    clean.includes("जोड़ें") ||
    clean.includes("नया उत्पाद") ||
    clean.includes("नया प्रोडक्ट") ||
    clean.includes("नया शिल्प") ||
    clean.includes("product studio")
  ) {
    const priceMatch = raw.match(/(?:₹|rs|rupees|रुपये)?\s*(\d{2,6})/i);
    const extractedPrice = priceMatch ? parseInt(priceMatch[1], 10) : 850;

    let craftTitle = "Handcrafted Artisan Specialty";
    let category = "Traditional Handicrafts";

    if (
      clean.includes("terracotta") ||
      clean.includes("pot") ||
      clean.includes("मिट्टी") ||
      clean.includes("घड़ा")
    ) {
      craftTitle = "Handmade Terracotta Water Pot";
      category = "Pottery & Clay";
    } else if (
      clean.includes("saree") ||
      clean.includes("silk") ||
      clean.includes("साड़ी") ||
      clean.includes("कपड़ा")
    ) {
      craftTitle = "Handloom Traditional Silk Weave";
      category = "Handloom & Textiles";
    } else if (clean.includes("wood") || clean.includes("लकड़ी")) {
      craftTitle = "Carved Wooden Heritage Craft";
      category = "Woodwork & Carving";
    } else if (clean.includes("brass") || clean.includes("metal") || clean.includes("पीतल")) {
      craftTitle = "Handcrafted Brass Decorative Piece";
      category = "Jewelry & Metalcraft";
    }

    const action: ShreniAction = {
      type: "fill_product_form",
      title: craftTitle,
      price: extractedPrice,
      category,
      description: `Authentic ${craftTitle} shaped with traditional techniques passed down through generations. Crafted using natural materials and slow artisan finishing.`,
      autoExecute: true,
    };

    return {
      reply: `Namaste! I am opening the Product Studio and prefilling your listing for "${craftTitle}" at ₹${extractedPrice}.`,
      actions: [action],
      action,
      detectedIntent: "create_product",
    };
  }

  // ==========================================
  // 4. INQUIRIES & BUYER MESSAGES
  // ==========================================
  if (
    clean.includes("inquiry") ||
    clean.includes("inquiries") ||
    clean.includes("message") ||
    clean.includes("buyer") ||
    clean.includes("ग्राहक") ||
    clean.includes("संदेश") ||
    clean.includes("पूछताछ")
  ) {
    const action: ShreniAction = {
      type: "navigate",
      target: "/inquiry",
      label: "Open Inquiries",
      autoExecute: true,
    };
    return {
      reply: "Namaste! Navigating to your buyer inquiries and messaging inbox.",
      actions: [action],
      action,
      detectedIntent: "navigation",
    };
  }

  // ==========================================
  // 5. e-KYC VERIFICATION
  // ==========================================
  if (
    clean.includes("verify") ||
    clean.includes("kyc") ||
    clean.includes("aadhaar") ||
    clean.includes("पहचान") ||
    clean.includes("सत्यापन")
  ) {
    const action: ShreniAction = {
      type: "navigate",
      target: "/verify",
      label: "Go to e-KYC Verification",
      autoExecute: true,
    };
    return {
      reply:
        "Namaste! Let's get your Verified Master Artisan badge. Opening the artisan e-KYC verification screen.",
      actions: [action],
      action,
      detectedIntent: "navigation",
    };
  }

  // ==========================================
  // 6. PROFILE & SETTINGS
  // ==========================================
  if (
    clean.includes("profile") ||
    clean.includes("setting") ||
    clean.includes("settings") ||
    clean.includes("account") ||
    clean.includes("प्रोफाइल") ||
    clean.includes("सेटिंग") ||
    clean.includes("खाता")
  ) {
    const action: ShreniAction = {
      type: "navigate",
      target: "/profile",
      label: "Open Profile",
      autoExecute: true,
    };
    return {
      reply: "Namaste! Opening your artisan profile and account settings.",
      actions: [action],
      action,
      detectedIntent: "navigation",
    };
  }

  // ==========================================
  // 7. SHARE STOREFRONT
  // ==========================================
  if (
    clean.includes("share") ||
    clean.includes("link") ||
    clean.includes("शेयर") ||
    clean.includes("लिंक")
  ) {
    const action: ShreniAction = {
      type: "share_storefront",
      autoExecute: true,
    };
    return {
      reply: "Namaste! Sharing your Shreni Kart storefront link right now.",
      actions: [action],
      action,
      detectedIntent: "share",
    };
  }

  // ==========================================
  // 8. INSTALL APP / PWA
  // ==========================================
  if (
    clean.includes("install") ||
    clean.includes("install app") ||
    clean.includes("pwa") ||
    clean.includes("डाउनलोड") ||
    clean.includes("ऐप इंस्टॉल") ||
    clean.includes("home screen")
  ) {
    const action: ShreniAction = {
      type: "install_app",
      autoExecute: true,
    };
    return {
      reply:
        "Namaste! Opening the app installation prompt so you can add Shreni Kart to your home screen.",
      actions: [action],
      action,
      detectedIntent: "install",
    };
  }

  // ==========================================
  // 9. VOICE & AUDIO CONTROLS
  // ==========================================
  if (
    clean.includes("mute") ||
    clean.includes("stop talking") ||
    clean.includes("turn off voice") ||
    clean.includes("आवाज बंद") ||
    clean.includes("चुप रहो")
  ) {
    const action: ShreniAction = {
      type: "toggle_tts",
      enabled: false,
      autoExecute: true,
    };
    return {
      reply: "I have muted voice read-aloud. You can still read all my answers on screen.",
      actions: [action],
      action,
      detectedIntent: "voice_settings",
    };
  }

  if (
    clean.includes("turn on voice") ||
    clean.includes("unmute") ||
    clean.includes("speak out") ||
    clean.includes("आवाज चालू") ||
    clean.includes("बोलना शुरू")
  ) {
    const action: ShreniAction = {
      type: "toggle_tts",
      enabled: true,
      autoExecute: true,
    };
    return {
      reply: "Voice read-aloud is now turned on. I will speak responses aloud for you.",
      actions: [action],
      action,
      detectedIntent: "voice_settings",
    };
  }

  if (
    clean.includes("chime") ||
    clean.includes("sound") ||
    clean.includes("घंटी") ||
    clean.includes("आवाज टेस्ट")
  ) {
    const action: ShreniAction = {
      type: "test_sound",
      autoExecute: true,
    };
    return {
      reply: "Playing activation chime sound.",
      actions: [action],
      action,
      detectedIntent: "voice_settings",
    };
  }

  // ==========================================
  // 10. DASHBOARD / HOME
  // ==========================================
  if (
    clean.includes("home") ||
    clean.includes("dashboard") ||
    clean.includes("होम") ||
    clean.includes("डैशबोर्ड") ||
    clean.includes("storefront")
  ) {
    const action: ShreniAction = {
      type: "navigate",
      target: "/dashboard",
      label: "Go to Dashboard",
      autoExecute: true,
    };
    return {
      reply: "Namaste! Taking you back to your main artisan dashboard.",
      actions: [action],
      action,
      detectedIntent: "navigation",
    };
  }

  // Default Guidance
  return {
    reply:
      "Namaste! I am Shreni AI with full control over Shreni Kart. You can ask me to change language, open orders, list new crafts, update shipments, or guide your artisan business.",
    actions: [],
    action: { type: "none" },
    detectedIntent: "general",
  };
}
