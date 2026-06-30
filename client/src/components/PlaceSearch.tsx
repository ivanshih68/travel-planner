/**
 * PlaceSearch — Google Places autocomplete input component
 * Design: Coastal Morning theme
 * * Features:
 * - Autocomplete suggestions
 * - Place selection with details
 * - Loading and error states
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Loader2, AlertCircle } from "lucide-react";
import { useGooglePlaces, type PlaceResult, type AutocompleteResult } from "@/hooks/useGooglePlaces";

interface PlaceSearchProps {
  defaultValue?: string; // 【修改1】使用 defaultValue 來接收編輯時的舊資料
  onPlaceSelect: (place: Partial<PlaceResult> & { name: string }) => void; // 配合 TripDetail 的命名
  placeholder?: string;
  className?: string;
}

export function PlaceSearch({
  defaultValue = "",
  onPlaceSelect,
  placeholder = "搜尋地點...",
  className = "",
}: PlaceSearchProps) {
  const [input, setInput] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { searchPlaces, getPlaceDetails, isLoading, error } = useGooglePlaces();

  // 【修改2】監聽 defaultValue 變化，確保編輯不同活動時能正確顯示舊地點
  useEffect(() => {
    setInput(defaultValue || "");
  }, [defaultValue]);

  // Search places on input change
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (input.trim().length > 2) {
        const results = await searchPlaces(input);
        setSuggestions(results);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [input, searchPlaces]);

  // 【修改3】當使用者單純打字時，也即時把文字存回表單
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInput(text);
    
    // 即時同步給外層 TripDetail，讓手打文字也能成功存進資料庫
    onPlaceSelect({
      name: text,
      address: "",
      lat: undefined,
      lng: undefined
    });
  };

  const handleSelectPlace = async (suggestion: AutocompleteResult) => {
    setIsLoadingDetails(true);
    try {
      const details = await getPlaceDetails(suggestion.placeId);
      if (details) {
        onPlaceSelect(details); // 傳遞完整的 Google 地圖資訊
        setInput(details.name);
        setShowSuggestions(false);
      }
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.65_0.06_220)]" />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange} // 改用新的 handleInputChange
          onFocus={() => input.trim().length > 2 && setShowSuggestions(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 border border-[oklch(0.88_0.008_220)] rounded-lg focus:border-[oklch(0.62_0.12_220)] focus:ring-1 focus:ring-[oklch(0.62_0.12_220)]/20 h-11 bg-white transition-all duration-150"
        />
        {(isLoading || isLoadingDetails) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.62_0.12_220)] animate-spin" />
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-[oklch(0.88_0.008_220)] rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.placeId}
                onClick={() => handleSelectPlace(suggestion)}
                className={`w-full text-left px-4 py-3 hover:bg-[oklch(0.96_0.008_220)] transition-colors ${
                  index !== suggestions.length - 1 ? "border-b border-[oklch(0.94_0.008_220)]" : ""
                }`}
              >
                <p className="font-medium text-sm text-[oklch(0.22_0.08_220)]">
                  {suggestion.mainText}
                </p>
                {suggestion.secondaryText && (
                  <p className="text-xs text-[oklch(0.55_0.05_220)] mt-0.5">
                    {suggestion.secondaryText}
                  </p>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
