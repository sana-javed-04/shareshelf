import { api, buildQuery } from "@/lib/api/client";
import type { DashboardStats, Item, ItemQuery, Paginated } from "@/lib/types";

export interface ItemPayload {
  title: string;
  description: string;
  category: string;
  item_condition: string;
  listing_type: string;
  price: number;
  security_deposit?: number | null;
  quantity?: number;
  available_quantity?: number;
  max_rental_days?: number | null;
  area_name: string;
  status?: string;
  latitude?: number | null;
  longitude?: number | null;
  image_path?: string | null;
}

export const itemService = {
  list(query: ItemQuery = {}) {
    return api.get<Paginated<Item>>(`/items${buildQuery(query as Record<string, unknown>)}`);
  },
  get(id: number) {
    return api.get<Item>(`/items/${id}`);
  },
  create(payload: ItemPayload) {
    return api.post<Item>("/items", payload as unknown as Record<string, unknown>);
  },
  update(id: number, payload: Partial<ItemPayload>) {
    return api.put<Item>(`/items/${id}`, payload as Record<string, unknown>);
  },
  remove(id: number) {
    return api.delete<{ detail: string }>(`/items/${id}`);
  },
  /**
   * Real backend: multipart POST /api/items/{id}/image saved to UPLOAD_DIR.
   * Demo mode: the validated image is stored as a data URL on the record.
   */
  uploadImage(id: number, imagePath: string) {
    return api.post<Item>(`/items/${id}/image`, { image_path: imagePath });
  },
  myStats() {
    return api.get<DashboardStats & { total_listings: number }>("/users/me/stats");
  },
};

export const MAX_IMAGE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function validateImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return "Please upload a JPG, PNG, WEBP or GIF image.";
  if (file.size > MAX_IMAGE_MB * 1024 * 1024)
    return `Image must be smaller than ${MAX_IMAGE_MB} MB.`;
  return null;
}

export function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that image file."));
    reader.readAsDataURL(file);
  });
}
