import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import {
  type Product,
  type Order,
  type Inquiry,
  type OrderStatus,
  products as defaultProducts,
  orders as defaultOrders,
  inquiries as defaultInquiries,
} from "./kalakart-data";
import type { UserProfile } from "./auth";

export type { OrderStatus };

// In-memory / localStorage fallback cache for responsive offline operation
const localCache = {
  products: [...defaultProducts],
  orders: [...defaultOrders],
  inquiries: [...defaultInquiries],
};

export function subscribeProducts(
  artisanId: string,
  onUpdate: (items: Product[]) => void,
): Unsubscribe {
  try {
    const db = getFirebaseDb();
    const colRef = collection(db, "products");
    const q = query(colRef, where("artisanId", "==", artisanId));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
          onUpdate(items);
        } else {
          onUpdate(localCache.products);
        }
      },
      () => {
        onUpdate(localCache.products);
      },
    );
    return unsub;
  } catch {
    onUpdate(localCache.products);
    return () => {};
  }
}

export async function addProduct(
  artisanId: string,
  product: Partial<Product> & { id: string; name: string; price: number },
): Promise<void> {
  const fullProduct: Product = {
    id: product.id,
    name: product.name,
    price: product.price,
    rating: product.rating ?? 5.0,
    stock: product.stock ?? 10,
    status: (product.status as Product["status"]) || "Published",
    image:
      product.image ||
      "https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=700&auto=format&fit=crop&q=80",
    craft: product.craft || "Traditional Handicrafts",
    description: product.description || "Authentic handmade craft.",
  };

  localCache.products = [fullProduct, ...localCache.products];

  try {
    const db = getFirebaseDb();
    const docRef = doc(db, "products", product.id);
    await setDoc(docRef, { ...fullProduct, artisanId, createdAt: new Date() }, { merge: true });
  } catch (err) {
    console.warn("Firestore addProduct fallback to local cache:", err);
  }
}

export function subscribeOrders(
  artisanId: string,
  onUpdate: (items: Order[]) => void,
): Unsubscribe {
  try {
    const db = getFirebaseDb();
    const colRef = collection(db, "orders");
    const q = query(colRef, where("artisanId", "==", artisanId));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
          onUpdate(items);
        } else {
          onUpdate(localCache.orders);
        }
      },
      () => {
        onUpdate(localCache.orders);
      },
    );
    return unsub;
  } catch {
    onUpdate(localCache.orders);
    return () => {};
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  localCache.orders = localCache.orders.map((o) => (o.id === orderId ? { ...o, status } : o));

  try {
    const db = getFirebaseDb();
    const docRef = doc(db, "orders", orderId);
    await updateDoc(docRef, { status, updatedAt: new Date() });
  } catch (err) {
    console.warn("Firestore updateOrderStatus fallback to local cache:", err);
  }
}

export function subscribeInquiries(
  artisanId: string,
  onUpdate: (items: Inquiry[]) => void,
): Unsubscribe {
  try {
    const db = getFirebaseDb();
    const colRef = collection(db, "inquiries");
    const q = query(colRef, where("artisanId", "==", artisanId));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Inquiry);
          onUpdate(items);
        } else {
          onUpdate(localCache.inquiries);
        }
      },
      () => {
        onUpdate(localCache.inquiries);
      },
    );
    return unsub;
  } catch {
    onUpdate(localCache.inquiries);
    return () => {};
  }
}

export async function replyToInquiry(inquiryId: string, reply: string): Promise<void> {
  localCache.inquiries = localCache.inquiries.map((q) =>
    q.id === inquiryId ? { ...q, aiReply: reply } : q,
  );

  try {
    const db = getFirebaseDb();
    const docRef = doc(db, "inquiries", inquiryId);
    await updateDoc(docRef, { aiReply: reply, repliedAt: new Date() });
  } catch (err) {
    console.warn("Firestore replyToInquiry fallback to local cache:", err);
  }
}

export async function saveUserProfile(
  artisanId: string,
  data: Partial<UserProfile>,
): Promise<void> {
  try {
    const db = getFirebaseDb();
    const docRef = doc(db, "profiles", artisanId);
    await setDoc(docRef, { ...data, updatedAt: new Date() }, { merge: true });
  } catch (err) {
    console.warn("Firestore saveUserProfile fallback to local:", err);
  }
}
