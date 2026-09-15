import { api } from "@/lib/api/client";
import type { Report } from "@/lib/types";

export const reportService = {
  create(payload: {
    reason: string;
    description?: string;
    reported_item_id?: number;
    reported_user_id?: number;
  }) {
    return api.post<Report>("/reports", payload as Record<string, unknown>);
  },
};
