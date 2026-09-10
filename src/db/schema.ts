import { boolean, integer, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";

// Artisan and User Profiles
export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  uid: text("uid").unique(),
  fullName: text("full_name").notNull(),
  mobile: text("mobile").notNull(),
  email: text("email"),
  artisanName: text("artisan_name"),
  craftCategory: text("craft_category"),
  experienceYears: integer("experience_years"),
  preferredLanguage: text("preferred_language").default("en"),
  profileComplete: boolean("profile_complete").default(false),
  village: text("village"),
  district: text("district"),
  state: text("state"),
  verificationStatus: text("verification_status").default("pending"),
  verificationMethod: text("verification_method"),
  verifiedAt: timestamp("verified_at"),
  providerReferenceId: text("provider_reference_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Artisan Products Catalog
export const products = pgTable("products", {
  id: text("id").primaryKey(),
  artisanId: text("artisan_id").notNull(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  rating: real("rating").default(5.0),
  stock: integer("stock").default(0),
  status: text("status").notNull().default("Draft"),
  image: text("image").notNull(),
  craft: text("craft"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Artisan Customer Orders
export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  artisanId: text("artisan_id").notNull(),
  product: text("product").notNull(),
  image: text("image").notNull(),
  buyer: text("buyer").notNull(),
  qty: integer("qty").notNull().default(1),
  price: integer("price").notNull(),
  date: text("date").notNull(),
  status: text("status").notNull().default("New Order"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Buyer Inquiries and AI Suggested Replies
export const inquiries = pgTable("inquiries", {
  id: text("id").primaryKey(),
  artisanId: text("artisan_id").notNull(),
  buyer: text("buyer").notNull(),
  product: text("product").notNull(),
  image: text("image").notNull(),
  message: text("message").notNull(),
  time: text("time").notNull(),
  aiReply: text("ai_reply"),
  createdAt: timestamp("created_at").defaultNow(),
});
