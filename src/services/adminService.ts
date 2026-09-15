import { api } from "@/lib/api/client";
import type { AdminStats, Item, Report, Transaction, User } from "@/lib/types";

export const adminService = {
  stats() {
    return api.get<AdminStats>("/admin/stats");
  },
  users() {
    return api.get<User[]>("/admin/users");
  },
  ban(userId: number) {
    return api.patch<User>(`/admin/users/${userId}/ban`);
  },
  unban(userId: number) {
    return api.patch<User>(`/admin/users/${userId}/unban`);
  },
  items() {
    return api.get<Item[]>("/admin/items");
  },
  removeItem(itemId: number) {
    return api.delete<{ detail: string }>(`/admin/items/${itemId}`);
  },
  reports() {
    return api.get<Report[]>("/admin/reports");
  },
  reviewReport(id: number) {
    return api.patch<Report>(`/admin/reports/${id}/review`);
  },
  dismissReport(id: number) {
    return api.patch<Report>(`/admin/reports/${id}/dismiss`);
  },
  transactions() {
    return api.get<Transaction[]>("/admin/transactions");
  },
};
