/**
 * useGooglePlaces — Google Places API integration for location search
 * Design: Coastal Morning theme
 * 
 * Features:
 * - Autocomplete place search
 * - Get place details (coordinates, address, etc.)
 * - Generate Google Maps navigation URL
 */

import { useState, useCallback, useRef, useEffect } from "react";

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  formattedAddress: string;
}

export interface AutocompleteResult {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText?: string;
}

export const useGooglePlaces = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | undefined>(undefined);

  // Initialize Google Maps services
  useEffect(() => {
    if (typeof google === "undefined") {
      console.warn("Google Maps API not loaded");
      return;
    }

    // Create a dummy map element for services
    const dummyDiv = document.createElement("div");
    const map = new google.maps.Map(dummyDiv);

    placesServiceRef.current = new google.maps.places.PlacesService(map);
    geocoderRef.current = new google.maps.Geocoder();
    autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
    sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
  }, []);

  // Search places by query string
  const searchPlaces = useCallback(
    async (query: string): Promise<AutocompleteResult[]> => {
      if (!query.trim() || !autocompleteServiceRef.current) {
        return [];
      }

      setIsLoading(true);
      setError(null);

      try {
        const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>(
          (resolve, reject) => {
            autocompleteServiceRef.current!.getPlacePredictions(
              {
                input: query,
                sessionToken: sessionTokenRef.current || undefined,
                componentRestrictions: { country: ["tw", "hk", "jp", "sg", "kr", "th", "vn"] },
              },
              (predictions, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                  resolve(predictions);
                } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                  resolve([]);
                } else {
                  reject(new Error(`Places API error: ${status}`));
                }
              }
            );
          }
        );

        return predictions.map((p) => ({
          placeId: p.place_id,
          description: p.description,
          mainText: p.structured_formatting.main_text,
          secondaryText: p.structured_formatting.secondary_text,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "搜尋失敗";
        setError(message);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Get detailed place information
  const getPlaceDetails = useCallback(
    async (placeId: string): Promise<PlaceResult | null> => {
      if (!placesServiceRef.current) {
        setError("Google Maps 服務未初始化");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const details = await new Promise<google.maps.places.PlaceResult | null>(
          (resolve, reject) => {
            placesServiceRef.current!.getDetails(
              {
                placeId,
                fields: [
                  "name",
                  "formatted_address",
                  "geometry",
                  "place_id",
                  "address_components",
                ],
                sessionToken: sessionTokenRef.current || undefined,
              },
              (result, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && result) {
                  resolve(result);
                } else {
                  reject(new Error(`Places API error: ${status}`));
                }
              }
            );
          }
        );

        if (!details || !details.geometry?.location) {
          throw new Error("無法取得地點座標");
        }

        // Create new session token for next search
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();

        return {
          placeId,
          name: details.name || "",
          address: details.formatted_address || "",
          lat: details.geometry.location.lat(),
          lng: details.geometry.location.lng(),
          formattedAddress: details.formatted_address || "",
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "取得地點詳情失敗";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Geocode address to coordinates
  const geocodeAddress = useCallback(
    async (address: string): Promise<{ lat: number; lng: number } | null> => {
      if (!geocoderRef.current || !address.trim()) {
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const results = await new Promise<google.maps.GeocoderResult[]>(
          (resolve, reject) => {
            geocoderRef.current!.geocode({ address }, (results, status) => {
              if (status === google.maps.GeocoderStatus.OK && results) {
                resolve(results);
              } else {
                reject(new Error(`Geocoder error: ${status}`));
              }
            });
          }
        );

        if (results.length === 0) {
          throw new Error("找不到該地址");
        }

        const location = results[0].geometry.location;
        return {
          lat: location.lat(),
          lng: location.lng(),
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "地址轉換失敗";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Generate Google Maps navigation URL
  const getNavigationUrl = useCallback(
    (lat: number, lng: number, label?: string): string => {
      const query = label ? `${label} @${lat},${lng}` : `${lat},${lng}`;
      return `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${lat},${lng},15z`;
    },
    []
  );

  // Generate Google Maps embed URL for iframe
  const getMapEmbedUrl = useCallback(
    (lat: number, lng: number, zoom = 15): string => {
      const apiKey = (window as any).__GOOGLE_MAPS_API_KEY__ || "";
      return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${lat},${lng}&zoom=${zoom}`;
    },
    []
  );

  return {
    searchPlaces,
    getPlaceDetails,
    geocodeAddress,
    getNavigationUrl,
    getMapEmbedUrl,
    isLoading,
    error,
  };
};
