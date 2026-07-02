import axios from "axios";

// ── API 基礎設定 ─────────────────────────────────────────
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// 自動附加 JWT Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 統一處理 401 錯誤（Token 過期）
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

// ── 型別定義 ─────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface Trip {
  id: string;
  userId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  description: string | null;
  budget: number | null;
  currency: string;
  status: "PLANNING" | "ONGOING" | "COMPLETED";
  coverImage: string | null;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { activities: number };
  activities?: Activity[];
}

export type ActivityCategory =
  | "ATTRACTION"
  | "RESTAURANT"
  | "HOTEL"
  | "TRANSPORT"
  | "OTHER";

export interface Activity {
  id: string;
  tripId: string;
  day: number;
  date: string | null;
  title: string;
  category: ActivityCategory;
  time: string | null;
  duration: number | null;
  location: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  cost: number | null;
  notes: string | null;
  images: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ── Auth API ─────────────────────────────────────────────
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<{ token: string; user: User }>("/api/auth/register", data),

  login: (data: { email: string; password: string }) =>
    api.post<{ token: string; user: User }>("/api/auth/login", data),

  me: () => api.get<{ user: User }>("/api/auth/me"),

  updateMe: (data: { name?: string; avatarUrl?: string | null }) =>
    api.patch<{ user: User }>("/api/auth/me", data),
};

// ── Trips API ─────────────────────────────────────────────
export const tripsApi = {
  list: () => api.get<{ trips: Trip[] }>("/api/trips"),

  create: (data: {
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
    description?: string;
    budget?: number;
    currency?: string;
    status?: string;
    coverImage?: string; // ✅ 這裡已經幫你補上囉！
  }) => api.post<{ trip: Trip }>("/api/trips", data),

  get: (id: string) => api.get<{ trip: Trip }>(`/api/trips/${id}`),

  update: (
    id: string,
    data: Partial<{
      title: string;
      destination: string;
      startDate: string;
      endDate: string;
      description: string;
      budget: number;
      currency: string;
      status: string;
    }>
  ) => api.patch<{ trip: Trip }>(`/api/trips/${id}`, data),

  delete: (id: string) => api.delete(`/api/trips/${id}`),

  uploadCover: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    return api.post<{ coverImage: string }>(`/api/trips/${id}/cover`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  share: (id: string) =>
    api.post<{ shareToken: string }>(`/api/trips/${id}/share`),

  getShared: (token: string) =>
    api.get<{ trip: Trip & { activities: Activity[] } }>(`/api/trips/shared/${token}`),

  // ✅ 新增：複製行程 API
  copy: (id: string) => api.post<{ trip: Trip }>(`/api/trips/${id}/copy`),
};

// ── Activities API ────────────────────────────────────────
export const activitiesApi = {
  list: (tripId: string) =>
    api.get<{ activities: Activity[] }>(`/api/trips/${tripId}/activities`),

  create: (
    tripId: string,
    data: {
      day: number;
      title: string;
      category: ActivityCategory;
      date?: string;
      time?: string;
      duration?: number;
      location?: string;
      address?: string;
      lat?: number;
      lng?: number;
      cost?: number;
      notes?: string;
      images?: string[];
      sortOrder?: number;
    }
  ) =>
    api.post<{ activity: Activity }>(
      `/api/trips/${tripId}/activities`,
      data
    ),

  update: (id: string, data: Partial<Activity>) =>
    api.patch<{ activity: Activity }>(`/api/activities/${id}`, data),

  delete: (id: string) => api.delete(`/api/activities/${id}`),

  reorder: (
    tripId: string,
    orders: { id: string; sortOrder: number }[]
  ) =>
    api.patch(`/api/trips/${tripId}/activities/reorder`, { orders }),
};

// ── Trip Sharing API ─────────────────────────────────
export interface TripShare {
  id: string;
  tripId: string;
  ownerId: string;
  sharedWith: string;
  createdAt: string;
}

export interface SharedTrip extends Trip {
  sharedAt: string;
  sharedBy: { id: string; name: string; email: string };
}

export const tripSharingApi = {
  shareWith: (tripId: string, email: string) =>
    api.post<{ message: string }>(`/api/trips/${tripId}/share-with`, { email }),

  unshareWith: (tripId: string, email: string) =>
    api.delete<{ message: string }>(`/api/trips/${tripId}/share-with`, { data: { email } }),

  getShares: (tripId: string) =>
    api.get<{ shares: TripShare[] }>(`/api/trips/${tripId}/shares`),

  getSharedWithMe: () =>
    api.get<{ trips: SharedTrip[] }>(`/api/trips/shared-with-me`),
};
