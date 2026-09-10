export interface SaveProductInput {
  id: string;
  artisanId: string;
  name: string;
  price: number;
  rating?: number;
  stock?: number;
  status?: string;
  image?: string;
  craft?: string;
  description?: string;
}

export async function saveProductToCloudSql({ data }: { data: SaveProductInput }) {
  return { success: true, product: data };
}

export async function updateOrderStatusInCloudSql({
  data,
}: {
  data: { orderId: string; status: string };
}) {
  return { success: true, ...data };
}

export async function replyToInquiryInCloudSql({
  data,
}: {
  data: { inquiryId: string; reply: string };
}) {
  return { success: true, ...data };
}
