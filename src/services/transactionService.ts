import { api } from "@/lib/api/client";
import type { Transaction } from "@/lib/types";

export interface ReviewPayload {
  transaction_id: number;
  rating: number;
  comment: string;
}

export const transactionService = {
  request(itemId: number) {
    return api.post<Transaction>("/transactions/request", { item_id: itemId });
  },
  my() {
    return api.get<Transaction[]>("/transactions/my");
  },
  incoming() {
    return api.get<Transaction[]>("/transactions/incoming");
  },
  all() {
    return api.get<Transaction[]>("/transactions");
  },
  approve(id: number) {
    return api.patch<Transaction>(`/transactions/${id}/approve`);
  },
  reject(id: number) {
    return api.patch<Transaction>(`/transactions/${id}/reject`);
  },
  verifyPin(id: number, pin: string) {
    return api.post<Transaction>(`/transactions/${id}/verify-pin`, { pin });
  },
  confirmReturn(id: number) {
    return api.post<Transaction>(`/transactions/${id}/return`);
  },
  cancel(id: number) {
    return api.post<Transaction>(`/transactions/${id}/cancel`);
  },
  dispute(id: number) {
    return api.post<Transaction>(`/transactions/${id}/dispute`);
  },
  submitReview(payload: ReviewPayload) {
    return api.post<{ message: string; id: number }>(
      "/reviews",
      payload as unknown as Record<string, unknown>,
    );
  },
};
