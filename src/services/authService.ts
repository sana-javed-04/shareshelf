import { api, setToken } from "@/lib/api/client";
import type { User } from "@/lib/types";

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  area_name: string;
  latitude?: number;
  longitude?: number;
}

export const authService = {
  async register(payload: RegisterPayload) {
    const res = await api.post<AuthResponse>("/auth/register", { ...payload });
    setToken(res.access_token);
    return res.user;
  },
  async login(username: string, password: string) {
    const res = await api.post<AuthResponse>("/auth/login", { username, password });
    setToken(res.access_token);
    return res.user;
  },
  async logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      setToken(null);
    }
  },
  me() {
    return api.get<User>("/users/me");
  },
  updateMe(payload: Partial<Pick<User, "username" | "area_name" | "latitude" | "longitude">>) {
    return api.put<User>("/users/me", payload);
  },
};

/** Public, privacy-safe projection of any member. */
export const userService = {
  publicProfile(id: number) {
    return api.get<import("@/lib/types").OwnerPublic>(`/users/${id}`);
  },
};
