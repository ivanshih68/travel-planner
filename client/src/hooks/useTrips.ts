/**
 * useTrips — Custom hook for real-time trip data from Firestore
 * Design: Coastal Morning theme
 */

import { useState, useEffect } from "react";
import { subscribeToTrips, type Trip } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export const useTrips = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToTrips(user.uid, (fetchedTrips) => {
      setTrips(fetchedTrips);
      setLoading(false);
      setError(null);
    });

    return unsubscribe;
  }, [user]);

  return { trips, loading, error };
};
