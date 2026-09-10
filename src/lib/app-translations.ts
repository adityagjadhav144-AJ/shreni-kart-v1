export interface LangInfo {
  code: string;
  label: string;
  native: string;
  region?: string;
}

export const ALL_LANGUAGES: LangInfo[] = [
  { code: "en", label: "English", native: "English", region: "Global / India" },
  { code: "hi", label: "Hindi", native: "हिन्दी", region: "North & Central India" },
  { code: "mr", label: "Marathi", native: "मराठी", region: "Maharashtra" },
  { code: "bn", label: "Bengali", native: "বাংলা", region: "West Bengal" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી", region: "Gujarat" },
  { code: "ta", label: "Tamil", native: "தமிழ்", region: "Tamil Nadu" },
  { code: "te", label: "Telugu", native: "తెలుగు", region: "Andhra Pradesh & Telangana" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", region: "Karnataka" },
  { code: "ml", label: "Malayalam", native: "മലയാളം", region: "Kerala" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ", region: "Punjab" },
  { code: "or", label: "Odia", native: "ଓଡ଼ିଆ", region: "Odisha" },
];

const DICTIONARY: Record<string, Record<string, string>> = {
  hi: {
    Products: "उत्पाद",
    "Your Orders": "आपके ऑर्डर",
    Inquiry: "पूछताछ",
    "Buyer Inquiries": "खरीदार की पूछताछ",
    "Add Product": "उत्पाद जोड़ें",
    "Voice Command": "आवाज आदेश",
    "Shreni AI": "श्रेणी एआई",
    "My Products": "मेरे उत्पाद",
    "Popular Picks": "लोकप्रिय हस्तशिल्प",
    "Turn your craft into your next opportunity.": "अपनी कला को अपने नए अवसर में बदलें।",
    "Identity & e-KYC Status": "पहचान और ई-केवाईसी स्थिति",
    "Verified Artisan": "सत्यापित शिल्पकार",
    "Verification pending": "सत्यापन लंबित",
    "New Order": "नया ऑर्डर",
    Processing: "प्रक्रिया में",
    "Ready to Ship": "भेजने के लिए तैयार",
    Shipped: "भेज दिया गया",
    Delivered: "वितरित",
  },
  mr: {
    Products: "उत्पादने",
    "Your Orders": "तुमच्या ऑर्डर्स",
    Inquiry: "चौकशी",
    "Buyer Inquiries": "ग्राहकांची चौकशी",
    "Add Product": "उत्पादन जोडा",
    "Voice Command": "व्हॉइस कमांड",
    "Shreni AI": "श्रेणी एआय",
    "My Products": "माझी उत्पादने",
    "Popular Picks": "लोकप्रिय हस्तकला",
    "Turn your craft into your next opportunity.": "तुमच्या कलेचे नवीन संधीत रूपांतर करा.",
    "Identity & e-KYC Status": "ओळख आणि ई-केवायसी स्थिती",
    "Verified Artisan": "प्रमाणित कारागीर",
    "Verification pending": "पडताळणी प्रलंबित",
    "New Order": "नवीन ऑर्डर",
    Processing: "प्रक्रियेत आहे",
    "Ready to Ship": "पाठवण्यासाठी तयार",
    Shipped: "पाठवले",
    Delivered: "वितरित केले",
  },
};

export function applyInAppDomTranslation(langCode: string) {
  if (typeof document === "undefined") return;

  // Broadcast event for responsive component re-renders
  window.dispatchEvent(
    new CustomEvent("shreni:language_changed", {
      detail: { langCode },
    }),
  );

  const dict = DICTIONARY[langCode];
  if (!dict) return;

  // Lightweight in-app text node replacement for instant bilingual rendering
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.nodeValue?.trim();
    if (text && dict[text]) {
      node.nodeValue = dict[text];
    }
  }
}
