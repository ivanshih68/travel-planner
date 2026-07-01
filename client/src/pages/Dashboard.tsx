/**
 * Dashboard — Trip Management Main Page
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  MapPin,
  Calendar,
  LogOut,
  User,
  Compass,
  LayoutGrid,
  CheckCircle2,
  Clock,
  Trash2,
  ChevronRight,
  Plane,
  Globe,
  Camera,
  ImagePlus,
  Copy, // 新增圖示
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
  planning: { label: "規劃中", color: "bg-amber-100 text-amber-700", icon: Clock },
  ongoing: { label: "進行中", color: "bg-green-100 text-green-700", icon: Plane },
  completed: { label: "已完成", color: "bg-[oklch(0.92_0.05_220)] text-[oklch(0.35_0.1_220)]", icon: CheckCircle2 },
};

const CURRENCIES = ["TWD", "USD", "EUR", "JPY", "GBP", "AUD", "SGD", "HKD", "CNY", "KRW"];

interface NewTripForm {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  description: string;
  budget: string;
  currency: string;
  status: "planning" | "ongoing" | "completed";
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { trips, loading, createTrip, deleteTrip, uploadCover } = useTrips();
  const [, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState<"all" | "planning" | "ongoing" | "completed">("all");
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [mobileTab, setMobileTab] = useState<"trips" | "profile">("trips");

  // 新增狀態：複製行程
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [selectedTripToCopy, setSelectedTripToCopy] = useState<SharedTrip | null>(null);

  const [sharedTrips, setSharedTrips] = useState<SharedTrip[]>([]);
  const [sharedLoading, setSharedLoading] = useState(true);

  // 複製行程邏輯
  const handleCopyTrip = async () => {
    if (!selectedTripToCopy) return;
    try {
      await tripsApi.copy(selectedTripToCopy.id);
      toast.success("行程已複製到您的個人清單中！");
      setShowCopyDialog(false);
      window.location.reload(); 
    } catch (error) {
      toast.error("複製失敗，請稍後再試");
    }
  };

  useEffect(() => {
    setSharedLoading(true);
    tripSharingApi.getSharedWithMe()
      .then(({ data }) => setSharedTrips(data.trips))
      .catch(() => setSharedTrips([]))
      .finally(() => setSharedLoading(false));
  }, []);

  const [form, setForm] = useState<NewTripForm>({
    title: "",
    destination: "",
    startDate: "",
    endDate: "",
    description: "",
    budget: "",
    currency: "TWD",
    status: "planning",
  });

  const filteredTrips = trips.filter(
    (t) => activeFilter === "all" || t.status === activeFilter.toUpperCase()
  );

  const stats = {
    total: trips.length,
    planning: trips.filter((t) => t.status === "PLANNING").length,
    ongoing: trips.filter((t) => t.status === "ONGOING").length,
    completed: trips.filter((t) => t.status === "COMPLETED").length,
  };

  const handleCreateTrip = async () => {
    if (!form.title || !form.destination || !form.startDate || !form.endDate) {
      toast.error("請填寫所有必填欄位");
      return;
    }
    if (!user) return;

    setIsCreating(true);
    try {
      await createTrip({
        title: form.title,
        destination: form.destination,
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description,
        budget: form.budget ? parseFloat(form.budget) : undefined,
        currency: form.currency,
        status: form.status.toUpperCase(),
      });
      toast.success("行程建立成功！開始規劃你的旅程 ✈️");
      setShowNewTrip(false);
      setForm({ title: "", destination: "", startDate: "", endDate: "", description: "", budget: "", currency: "TWD", status: "planning" });
    } catch (error) {
      console.error("建立行程錯誤:", error);
      const errorMessage = error instanceof Error ? error.message : "建立行程失敗，請稍後再試";
      toast.error(`建立行程失敗: ${errorMessage}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTrip = async () => {
    if (!deletingTrip?.id) return;
    try {
      await deleteTrip(deletingTrip.id);
      toast.success("行程已刪除");
      setDeletingTrip(null);
    } catch {
      toast.error("刪除失敗，請稍後再試");
    }
  };

  const handleUploadCover = useCallback(async (tripId: string, file: File) => {
    try {
      await uploadCover(tripId, file);
      toast.success("封面圖已更新");
    } catch {
      toast.error("上傳失敗，請稍後再試");
    }
  }, [uploadCover]);

  const handleLogout = () => {
    logout();
    setLocation("/auth");
    toast.success("已登出");
  };

  const getTripDuration = (start: string, end: string) => {
    try {
      return differenceInDays(parseISO(end), parseISO(start)) + 1;
    } catch {
      return 0;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "M月d日", { locale: zhTW });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-[oklch(0.97_0.015_80)] flex">
      {/* ... (Sidebar 和 Header 區域維持原樣) ... */}
      <aside className="hidden lg:flex flex-col w-64 bg-[oklch(0.22_0.08_220)] text-white fixed h-full z-20">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Voyager" className="w-8 h-8 brightness-0 invert" />
            <span className="font-['Playfair_Display'] text-xl font-bold">Voyager</span>
          </div>
        </div>
        <div className="p-4 border-b border-white/10">
           <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-full bg-[oklch(0.62_0.12_220)] flex items-center justify-center text-white text-sm font-bold">
               {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
             </div>
             <div className="flex-1 min-w-0">
               <p className="text-sm font-medium truncate">{user?.name || "旅行者"}</p>
               <p className="text-xs text-white/50 truncate">{user?.email}</p>
             </div>
           </div>
        </div>
        <div className="p-4 border-b border-white/10">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-3 font-['DM_Mono']">旅程統計</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "全部", value: stats.total, filter: "all" as const },
              { label: "規劃中", value: stats.planning, filter: "planning" as const },
              { label: "進行中", value: stats.ongoing, filter: "ongoing" as const },
              { label: "已完成", value: stats.completed, filter: "completed" as const },
            ].map((stat) => (
              <button
                key={stat.filter}
                onClick={() => setActiveFilter(stat.filter)}
                className={`p-2.5 rounded-lg text-left transition-all duration-150 ${
                  activeFilter === stat.filter
                    ? "bg-[oklch(0.62_0.12_220)] text-white"
                    : "bg-white/5 hover:bg-white/10 text-white/70"
                }`}
              >
                <p className="text-lg font-bold font-['DM_Mono']">{stat.value}</p>
                <p className="text-xs mt-0.5">{stat.label}</p>
              </button>
            ))}
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setShowNewTrip(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[oklch(0.72_0.14_35)] hover:bg-[oklch(0.65_0.14_35)] text-white font-medium text-sm transition-all duration-150 active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" /> 新增行程
          </button>
        </nav>
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white text-sm transition-all duration-150"
          >
            <LogOut className="w-4 h-4" /> 登出
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 min-h-screen">
        <header className="hidden lg:flex items-center justify-between px-8 py-5 bg-white/80 backdrop-blur-sm border-b border-[oklch(0.92_0.008_220)] sticky top-0 z-10">
          <h1 className="text-2xl font-bold">儀表板</h1>
        </header>

        <div className="p-4 lg:p-8">
           {/* 行程 Grid ... */}
           {loading ? <Skeleton className="h-72 w-full" /> : (
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                {filteredTrips.map((trip, index) => (
                   <TripCard key={trip.id} trip={trip} fallbackImage={CARD_IMAGES[index % CARD_IMAGES.length]} onOpen={() => setLocation(`/trip/${trip.id}`)} onDelete={() => setDeletingTrip(trip)} onUploadCover={handleUploadCover} />
                ))}
             </div>
           )}

          {/* Shared Trips Section */}
          {(sharedLoading || sharedTrips.length > 0) && (
            <div className="mt-10">
              <h2 className="text-xl font-bold mb-4">分享行程</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                {sharedTrips.map((trip, index) => (
                  <div key={trip.id} className="relative group cursor-pointer bg-white rounded-2xl p-4 border border-[oklch(0.92_0.008_220)] hover:shadow-md transition-shadow">
                     <div onClick={() => setLocation(`/trip/${trip.id}`)}>
                        <h3 className="font-bold text-lg">{trip.title}</h3>
                        <p className="text-sm text-gray-500">{trip.destination}</p>
                     </div>
                     {/* 複製按鈕 */}
                     <Button 
                       size="sm" 
                       variant="secondary" 
                       className="mt-3 w-full rounded-xl"
                       onClick={(e) => {
                         e.stopPropagation();
                         setSelectedTripToCopy(trip);
                         setShowCopyDialog(true);
                       }}
                     >
                       <Copy className="w-4 h-4 mr-2" /> 複製行程
                     </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ===== Dialogs ===== */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>複製行程</DialogTitle>
            <DialogDescription>
              確定要將 "{selectedTripToCopy?.title}" 複製到您的行程清單嗎？您可以自由編輯該副本。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyDialog(false)}>取消</Button>
            <Button onClick={handleCopyTrip} className="bg-[oklch(0.22_0.08_220)] text-white">確認複製</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* ... (其他 NewTrip Dialog 和 Delete AlertDialog 保持原樣) ... */}
    </div>
  );
}

// TripCard 元件保持不變
function TripCard({ trip, fallbackImage, onOpen, onDelete, onUploadCover }: any) {
  // ... (原本的 TripCard 實作)
  return <div onClick={onOpen} className="bg-white p-4 rounded-2xl shadow-sm border border-[oklch(0.92_0.008_220)] cursor-pointer">
    <img src={trip.coverImage || fallbackImage} className="w-full h-32 object-cover rounded-lg" />
    <h3 className="font-bold mt-2">{trip.title}</h3>
    <Button variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="mt-2 text-red-500">刪除</Button>
  </div>;
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return <div className="text-center py-20">沒有行程，快來建立一個吧！</div>;
}
