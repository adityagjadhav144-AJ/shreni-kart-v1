export type OrderStatus = "New Order" | "Processing" | "Ready to Ship" | "Shipped" | "Delivered";

export type ProductStatus = "Published" | "Draft" | "Out of Stock";

export interface Product {
  id: string;
  name: string;
  price: number;
  rating: number;
  stock: number;
  status: ProductStatus;
  image: string;
  craft?: string;
  description?: string;
}

export interface Order {
  id: string;
  product: string;
  image: string;
  buyer: string;
  qty: number;
  price: number;
  date: string;
  status: OrderStatus;
}

export interface Inquiry {
  id: string;
  buyer: string;
  product: string;
  image: string;
  message: string;
  time: string;
  aiReply: string;
}

export function inr(amount?: number | null): string {
  const numeric = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(numeric);
}

export const statusTone: Record<OrderStatus, string> = {
  "New Order": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Processing: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "Ready to Ship": "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  Shipped: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  Delivered: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

export const images = {
  vase: "https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=700&auto=format&fit=crop&q=80",
  pot: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=700&auto=format&fit=crop&q=80",
  shawl:
    "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=700&auto=format&fit=crop&q=80",
  brass:
    "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=700&auto=format&fit=crop&q=80",
  saree:
    "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=700&auto=format&fit=crop&q=80",
  rug: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=700&auto=format&fit=crop&q=80",
};

export const products: Product[] = [
  {
    id: "prod-1",
    name: "Handmade Terracotta Glazed Pot",
    price: 750,
    rating: 4.9,
    stock: 12,
    status: "Published",
    image: images.pot,
    craft: "Terracotta Pottery",
    description: "Authentic hand-turned clay pot with natural mineral glaze from Khurja artisans.",
  },
  {
    id: "prod-2",
    name: "Pure Pashmina Embroidered Shawl",
    price: 3450,
    rating: 5.0,
    stock: 4,
    status: "Published",
    image: images.shawl,
    craft: "Kashmiri Weaving",
    description: "Fine hand-spun Himalayan wool with traditional sozni needle embroidery.",
  },
  {
    id: "prod-3",
    name: "Antique Hand-Engraved Brass Diya",
    price: 1299,
    rating: 4.8,
    stock: 20,
    status: "Published",
    image: images.brass,
    craft: "Moradabad Metalcraft",
    description: "Solid brass peacock lamp hand-cast using lost-wax technique.",
  },
  {
    id: "prod-4",
    name: "Chanderi Silk Handloom Saree",
    price: 4200,
    rating: 5.0,
    stock: 2,
    status: "Draft",
    image: images.saree,
    craft: "Handloom Weaving",
    description: "Traditional zari border handloom saree woven with pure silk warp.",
  },
];

export const orders: Order[] = [
  {
    id: "ORD-8492",
    product: "Handmade Terracotta Glazed Pot",
    image: images.pot,
    buyer: "Priya Sharma (Mumbai)",
    qty: 2,
    price: 1500,
    date: "10 Sep 2026",
    status: "New Order",
  },
  {
    id: "ORD-8488",
    product: "Pure Pashmina Embroidered Shawl",
    image: images.shawl,
    buyer: "Amitabh Sen (Kolkata)",
    qty: 1,
    price: 3450,
    date: "09 Sep 2026",
    status: "Processing",
  },
  {
    id: "ORD-8465",
    product: "Antique Hand-Engraved Brass Diya",
    image: images.brass,
    buyer: "Ananya Desai (Ahmedabad)",
    qty: 3,
    price: 3897,
    date: "08 Sep 2026",
    status: "Ready to Ship",
  },
  {
    id: "ORD-8420",
    product: "Handmade Terracotta Glazed Pot",
    image: images.pot,
    buyer: "Rahul Verma (Bengaluru)",
    qty: 1,
    price: 750,
    date: "05 Sep 2026",
    status: "Delivered",
  },
];

export const inquiries: Inquiry[] = [
  {
    id: "INQ-201",
    buyer: "Meera Krishnan",
    product: "Handmade Terracotta Glazed Pot",
    image: images.pot,
    message:
      "Namaste! Can this terracotta pot be safely used for daily drinking water storage in summers?",
    time: "10 mins ago",
    aiReply:
      "Namaste Meera ji! Yes, absolutely. Our terracotta pots are naturally porous and cooled, making them ideal for healthy, traditional drinking water storage.",
  },
  {
    id: "INQ-198",
    buyer: "Sunil Kothari",
    product: "Pure Pashmina Embroidered Shawl",
    image: images.shawl,
    message: "Hello, do you provide authentic silk mark certification with this handwoven shawl?",
    time: "2 hours ago",
    aiReply:
      "Namaste Sunil ji! Yes, every shawl carries the official government craftmark certification proving genuine hand-spun Kashmiri Pashmina.",
  },
];
