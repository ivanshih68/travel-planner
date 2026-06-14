/**
 * MapPreview — Inline map display for activities
 * Design: Coastal Morning theme
 * 
 * Shows:
 * - Static map image with marker
 * - Navigation button
 * - Address display
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MapPreviewProps {
  lat: number;
  lng: number;
  title?: string;
  address?: string;
  compact?: boolean;
  onNavigate?: () => void;
}

export function MapPreview({
  lat,
  lng,
  title,
  address,
  compact = false,
  onNavigate,
}: MapPreviewProps) {
  const [imageError, setImageError] = useState(false);

  // Generate Google Static Maps URL
  const getStaticMapUrl = (zoom = 15, size = compact ? "200x150" : "300x200") => {
    const apiKey = (window as any).__GOOGLE_MAPS_API_KEY__ || "";
    if (!apiKey) return null;

    const markers = `color:0x3B9DD9|${lat},${lng}`;
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&markers=${markers}&key=${apiKey}`;
  };

  const mapUrl = getStaticMapUrl();
  const navigationUrl = `https://www.google.com/maps/search/${title || address || `${lat},${lng}`}/@${lat},${lng},15z`;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {mapUrl && !imageError ? (
          <motion.img
            src={mapUrl}
            alt="Map preview"
            onError={() => setImageError(true)}
            className="w-16 h-16 rounded-lg object-cover border border-[oklch(0.88_0.008_220)]"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-[oklch(0.94_0.008_220)] flex items-center justify-center border border-[oklch(0.88_0.008_220)]">
            <MapPin className="w-6 h-6 text-[oklch(0.65_0.05_220)]" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {address && <p className="text-xs text-[oklch(0.55_0.05_220)] truncate">{address}</p>}
          <a
            href={navigationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[oklch(0.62_0.12_220)] hover:text-[oklch(0.55_0.12_220)] font-medium transition-colors mt-1"
          >
            <Navigation className="w-3 h-3" />
            導航
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl border border-[oklch(0.88_0.008_220)] overflow-hidden"
    >
      {/* Map image */}
      <div className="relative h-48 bg-[oklch(0.94_0.008_220)] flex items-center justify-center overflow-hidden">
        {mapUrl && !imageError ? (
          <motion.img
            src={mapUrl}
            alt="Map preview"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-[oklch(0.65_0.05_220)]">
            <MapPin className="w-8 h-8" />
            <p className="text-sm">地圖無法載入</p>
          </div>
        )}

        {/* Navigation overlay */}
        <motion.a
          href={navigationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 bg-black/0 hover:bg-black/20 flex items-center justify-center transition-colors duration-200"
          whileHover={{ backgroundColor: "rgba(0,0,0,0.3)" }}
        >
          <motion.div
            className="bg-[oklch(0.62_0.12_220)] text-white rounded-full p-3 flex items-center justify-center shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Navigation className="w-5 h-5" />
          </motion.div>
        </motion.a>
      </div>

      {/* Info section */}
      {(title || address) && (
        <div className="p-3">
          {title && (
            <p className="font-medium text-sm text-[oklch(0.22_0.08_220)] mb-1">{title}</p>
          )}
          {address && (
            <p className="text-xs text-[oklch(0.55_0.05_220)] leading-relaxed">{address}</p>
          )}

          {/* Coordinates */}
          <div className="mt-2 flex items-center gap-2 text-xs text-[oklch(0.65_0.05_220)] font-['DM_Mono']">
            <span>{lat.toFixed(4)}</span>
            <span>•</span>
            <span>{lng.toFixed(4)}</span>
          </div>

          {/* Action button */}
          <Button
            asChild
            size="sm"
            className="w-full mt-3 bg-[oklch(0.62_0.12_220)] hover:bg-[oklch(0.55_0.12_220)] text-white gap-2"
          >
            <a href={navigationUrl} target="_blank" rel="noopener noreferrer">
              <Navigation className="w-3.5 h-3.5" />
              在 Google Maps 中開啟
            </a>
          </Button>
        </div>
      )}
    </motion.div>
  );
}
