/**
 * useActivities — Activity data management hook
 * Uses REST API (Railway PostgreSQL) instead of Firestore real-time subscriptions
 * Design: Coastal Morning theme
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { activitiesApi, Activity, ActivityCategory } from "@/lib/api";

export const useActivities = (tripId: string | null | undefined) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!tripId) {
      setActivities([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data } = await activitiesApi.list(tripId);
      setActivities(data.activities);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch activities:", err);
      setError("無法載入活動，請稍後再試");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // 按天分組 - memoize to prevent unnecessary re-renders
  const activitiesByDay = useMemo(
    () =>
      activities.reduce(
        (acc, activity) => {
          const day = activity.day;
          if (!acc[day]) acc[day] = [];
          acc[day].push(activity);
          return acc;
        },
        {} as Record<number, Activity[]>
      ),
    [activities]
  );

  const createActivity = useCallback(
    async (data: {
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
    }) => {
      if (!tripId) throw new Error("tripId is required");
      const { data: res } = await activitiesApi.create(tripId, data);
      setActivities((prev) => [...prev, res.activity]);
      return res.activity;
    },
    [tripId]
  );

  const updateActivity = useCallback(async (id: string, data: Partial<Activity>) => {
    const { data: res } = await activitiesApi.update(id, data);
    setActivities((prev) => prev.map((a) => (a.id === id ? res.activity : a)));
    return res.activity;
  }, []);

  const deleteActivity = useCallback(async (id: string) => {
    await activitiesApi.delete(id);
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const reorderActivities = useCallback(
    async (orders: { id: string; sortOrder: number }[]) => {
      if (!tripId) return;
      await activitiesApi.reorder(tripId, orders);
      setActivities((prev) => {
        const orderMap = new Map(orders.map((o) => [o.id, o.sortOrder]));
        return [...prev].sort(
          (a, b) =>
            (orderMap.get(a.id) ?? a.sortOrder) -
            (orderMap.get(b.id) ?? b.sortOrder)
        );
      });
    },
    [tripId]
  );

  return {
    activities,
    activitiesByDay,
    loading,
    error,
    refetch: fetchActivities,
    createActivity,
    updateActivity,
    deleteActivity,
    reorderActivities,
  };
};
