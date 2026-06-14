/**
 * useActivities — Custom hook for real-time activity data from Firestore
 * Design: Coastal Morning theme
 */

import { useState, useEffect } from "react";
import { subscribeToActivities, type Activity } from "@/lib/firebase";

export const useActivities = (tripId: string | null) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToActivities(tripId, (fetchedActivities) => {
      setActivities(fetchedActivities);
      setLoading(false);
      setError(null);
    });

    return unsubscribe;
  }, [tripId]);

  // Group activities by day
  const activitiesByDay = activities.reduce(
    (acc, activity) => {
      const day = activity.day;
      if (!acc[day]) acc[day] = [];
      acc[day].push(activity);
      return acc;
    },
    {} as Record<number, Activity[]>
  );

  return { activities, activitiesByDay, loading, error };
};
