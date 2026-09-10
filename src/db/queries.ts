import { eq, desc } from "drizzle-orm";
import { db } from "./index";
import { profiles, products, orders, inquiries } from "./schema";

export type ProfileData = typeof profiles.$inferSelect;
export type NewProfileData = typeof profiles.$inferInsert;

export type ProductData = typeof products.$inferSelect;
export type NewProductData = typeof products.$inferInsert;

export type OrderData = typeof orders.$inferSelect;
export type NewOrderData = typeof orders.$inferInsert;

export type InquiryData = typeof inquiries.$inferSelect;
export type NewInquiryData = typeof inquiries.$inferInsert;

// ================= PROFILES =================
export async function getProfileByIdOrUid(idOrUid: string): Promise<ProfileData | null> {
  try {
    const records = await db.select().from(profiles).where(eq(profiles.id, idOrUid)).limit(1);

    if (records.length > 0 && records[0]) return records[0];

    const byUid = await db.select().from(profiles).where(eq(profiles.uid, idOrUid)).limit(1);

    return byUid[0] ?? null;
  } catch (error) {
    console.error("Error fetching profile from Cloud SQL:", error);
    throw new Error("Failed to fetch profile", { cause: error });
  }
}

export async function upsertProfile(data: NewProfileData): Promise<ProfileData> {
  try {
    const result = await db
      .insert(profiles)
      .values(data)
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          fullName: data.fullName,
          mobile: data.mobile,
          email: data.email,
          artisanName: data.artisanName,
          craftCategory: data.craftCategory,
          experienceYears: data.experienceYears,
          preferredLanguage: data.preferredLanguage,
          profileComplete: data.profileComplete,
          village: data.village,
          district: data.district,
          state: data.state,
          verificationStatus: data.verificationStatus,
          verificationMethod: data.verificationMethod,
          verifiedAt: data.verifiedAt,
          providerReferenceId: data.providerReferenceId,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!result[0]) {
      throw new Error("Failed to return upserted profile");
    }
    return result[0];
  } catch (error) {
    console.error("Error upserting profile in Cloud SQL:", error);
    throw new Error("Failed to upsert profile", { cause: error });
  }
}

export async function updateArtisanVerification(
  idOrUid: string,
  status: string,
  method?: string | null,
  refId?: string | null,
) {
  try {
    const now = new Date();
    const result = await db
      .update(profiles)
      .set({
        verificationStatus: status,
        verificationMethod: method ?? null,
        providerReferenceId: refId ?? null,
        verifiedAt: status === "verified" ? now : null,
        updatedAt: now,
      })
      .where(eq(profiles.id, idOrUid))
      .returning();

    return result[0] || null;
  } catch (error) {
    console.error("Error updating verification in Cloud SQL:", error);
    throw new Error("Failed to update verification", { cause: error });
  }
}

// ================= PRODUCTS =================
export async function getArtisanProducts(artisanId: string): Promise<ProductData[]> {
  try {
    return await db
      .select()
      .from(products)
      .where(eq(products.artisanId, artisanId))
      .orderBy(desc(products.createdAt));
  } catch (error) {
    console.error("Error fetching products from Cloud SQL:", error);
    throw new Error("Failed to fetch products", { cause: error });
  }
}

export async function createProductRecord(data: NewProductData): Promise<ProductData> {
  try {
    const result = await db.insert(products).values(data).returning();
    if (!result[0]) {
      throw new Error("Failed to return created product");
    }
    return result[0];
  } catch (error) {
    console.error("Error creating product in Cloud SQL:", error);
    throw new Error("Failed to create product", { cause: error });
  }
}

// ================= ORDERS =================
export async function getArtisanOrders(artisanId: string): Promise<OrderData[]> {
  try {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.artisanId, artisanId))
      .orderBy(desc(orders.createdAt));
  } catch (error) {
    console.error("Error fetching orders from Cloud SQL:", error);
    throw new Error("Failed to fetch orders", { cause: error });
  }
}

export async function updateOrderStatusRecord(
  orderId: string,
  status: string,
): Promise<OrderData | null> {
  try {
    const result = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return result[0] || null;
  } catch (error) {
    console.error("Error updating order status in Cloud SQL:", error);
    throw new Error("Failed to update order status", { cause: error });
  }
}

// ================= INQUIRIES =================
export async function getArtisanInquiries(artisanId: string): Promise<InquiryData[]> {
  try {
    return await db
      .select()
      .from(inquiries)
      .where(eq(inquiries.artisanId, artisanId))
      .orderBy(desc(inquiries.createdAt));
  } catch (error) {
    console.error("Error fetching inquiries from Cloud SQL:", error);
    throw new Error("Failed to fetch inquiries", { cause: error });
  }
}

export async function replyToInquiryRecord(
  inquiryId: string,
  aiReply: string,
): Promise<InquiryData | null> {
  try {
    const result = await db
      .update(inquiries)
      .set({ aiReply })
      .where(eq(inquiries.id, inquiryId))
      .returning();
    return result[0] || null;
  } catch (error) {
    console.error("Error replying to inquiry in Cloud SQL:", error);
    throw new Error("Failed to reply to inquiry", { cause: error });
  }
}
