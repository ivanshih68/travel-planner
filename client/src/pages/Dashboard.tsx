/**
 * Dashboard — Trip Management Main Page
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, MapPin, Calendar, LogOut, User, Compass, LayoutGrid, CheckCircle2,
  Clock, Trash2, ChevronRight, Plane, Globe, Camera, ImagePlus, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, parseISO } from "date-fns";
import { zhTW } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/contexts/AuthContext";
import { useTrips } from "@/hooks/useTrips";
import { type Trip, type SharedTrip, tripSharingApi, tripsApi } from "@/lib/api";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663760105877/FKWg7QY89BMBENe4mCAPfG/logo-icon-nDuQzmKqhkrEYACEszfx6u.webp";
const CARD_IMG_1 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663760105877/FKWg7QY89BMBENe4mCAPfG/travel-card-1-5S2pMWQ95V9wp6iGv7j3yH.webp";
const CARD_IMG_2 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663760105877/FKWg7QY89BMBENe4mCAPfG/travel-card-2-6bszyXBiNQ9zQQmFK3CWui.webp";
const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663760105877/FKWg7QY89BMBENe4mCAPfG/hero-travel-fcqx36i6AkJoWerUJTQQw4.webp";
const CARD_IMAGES = [CARD_IMG_1, CARD_IMG_2, HERO_IMG];

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PLANNING: { label: "規劃中", color: "bg-amber-100 text-amber-700", icon: Clock },
  ONGOING: { label: "進行中", color: "bg-green-100 text-green-700", icon: Plane },
  COMPLETED: { label: "已完成", color: "bg-[oklch(0.92_0.05_220)] text-[oklch(0.35_0.1_220)]", icon: CheckCircle2 },
};

const CURRENCIES = ["TWD", "USD", "EUR", "JPY", "GBP", "AUD", "SGD", "HKD", "CNY", "KRW"];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { trips, loading, createTrip, deleteTrip, uploadCover } = useTrips();
  const [, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState<"all" | "planning" | "ongoing" | "completed">("all");
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);
  const [sharedTrips, setSharedTrips] = useState<SharedTrip[]>([]);
  const [sharedLoading, setSharedLoading] = useState(true);

  // 複製行程狀態
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [selectedTripToCopy, setSelectedTripToCopy] = useState<SharedTrip | null>(null);

  const handleCopyTrip = async () => {
    if (!selectedTripToCopy) return;
    try {
      await tripsApi.copy(selectedTripToCopy.id);
      toast.success("行程已複製！");
      setShowCopyDialog(false);
      window.location.reload(); 
    } catch {
      toast.error("複製失敗");
    }
  };

  useEffect(() => {
    tripSharingApi.getSharedWithMe()
      .then(({ data }) => setSharedTrips(data.trips))
      .catch(() => setSharedTrips([]))
      .finally(() => setSharedLoading(false));
  }, []);

  const filteredTrips = trips.filter((t) => activeFilter === "all" || t.status === activeFilter.toUpperCase());

  return (
    <div className="min-h-screen bg-[oklch(0.97_0.015_80)] flex">
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">我的行程</h1>
        
        {loading ? <Skeleton className="h-72 w-full" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTrips.map((trip, index) => (
              <TripCard key={trip.id} trip={trip} fallbackImage={CARD_IMAGES[index % CARD_IMAGES.length]} onOpen={() => setLocation(`/trip/${trip.id}`)} onDelete={() => setDeletingTrip(trip)} onUploadCover={uploadCover} />
            ))}
          </div>
        )}

        {/* Shared Trips Section */}
        {(sharedLoading || sharedTrips.length > 0) && (
          <div className="mt-10">
            <h2 className="text-xl font-bold mb-4">分享行程</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {sharedTrips.map((trip, index) => (
                <div key={trip.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-[oklch(0.92_0.008_220)] hover:shadow-lg transition-all">
                  <div className="relative h-44 overflow-hidden cursor-pointer" onClick={() => setLocation(`/trip/${trip.id}`)}>
                    <img src={trip.coverImage || CARD_IMAGES[index % CARD_IMAGES.length]} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="p-4 cursor-pointer" onClick={() => setLocation(`/trip/${trip.id}`)}>
                    <h3 className="font-bold text-lg">{trip.title}</h3>
                    <p className="text-sm text-gray-500">{trip.destination}</p>
                  </div>
                  <div className="px-4 pb-4">
                    <Button size="sm" variant="secondary" className="w-full rounded-xl" onClick={() => { setSelectedTripToCopy(trip); setShowCopyDialog(true); }}>
                      <Copy className="w-4 h-4 mr-2" /> 複製行程
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Copy Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="bg-white">
          <DialogTitle>複製行程</DialogTitle>
          <DialogDescription>確定要複製 "{selectedTripToCopy?.title}" 嗎？</DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyDialog(false)}>取消</Button>
            <Button onClick={handleCopyTrip}>確認複製</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 獨立的 TripCard 元件
function TripCard({ trip, fallbackImage, onOpen, onDelete, onUploadCover }: any) {
  const status = statusConfig[trip.status] || statusConfig.PLANNING;
  const StatusIcon = status.icon;
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-[oklch(0.92_0.008_220)] hover:shadow-lg transition-all cursor-pointer" onClick={onOpen}>
      <div className="relative h-44 overflow-hidden">
        <img src={trip.coverImage || fallbackImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
          <StatusIcon className="w-3 h-3" /> {status.label}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg">{trip.title}</h3>
        <p className="text-sm text-gray-500">{trip.destination}</p>
        <Button variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="mt-2 w-full text-red-500">刪除</Button>
      </div>
    </div>
  );
}
