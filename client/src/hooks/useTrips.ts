/**
 * useTrips — Trip data management hook
 * Uses REST API (Railway PostgreSQL) instead of Firestore real-time subscriptions
 */

import { useState, useEffect, useCallback } from "react";
import { tripsApi, Trip } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export const useTrips = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data } = await tripsApi.list();
      setTrips(data.trips);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch trips:", err);
      setError("無法載入行程，請稍後再試");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const createTrip = useCallback(
    async (data: {
      title: string;
      destination: string;
      startDate: string;
      endDate: string;
      description?: string;
      budget?: number;
      currency?: string;
      status?: string;
    }) => {
      const { data: res } = await tripsApi.create(data);
      setTrips((prev) => [res.trip, ...prev]);
      return res.trip;
    },
    []
  );

  const updateTrip = useCallback(
    async (
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
    ) => {
      const { data: res } = await tripsApi.update(id, data);
      setTrips((prev) => prev.map((t) => (t.id === id ? res.trip : t)));
      return res.trip;
    },
    []
  );

  const deleteTrip = useCallback(async (id: string) => {
    await tripsApi.delete(id);
    setTrips((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const uploadCover = useCallback(async (id: string, file: File) => {
    const { data } = await tripsApi.uploadCover(id, file);
    setTrips((prev) =>
      prev.map((t) => (t.id === id ? { ...t, coverImage: data.coverImage } : t))
    );
    return data.coverImage;
  }, []);

  return {
    trips,
    loading,
    error,
    refetch: fetchTrips,
    createTrip,
    updateTrip,
    deleteTrip,
    uploadCover,
  };
};
