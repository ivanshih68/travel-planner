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
  Copy,
  MoreHorizontal,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, parseISO } from "date-fns";
import { zhTW } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileNav } from "@/components/MobileNav";

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
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [mobileTab, setMobileTab] = useState<"trips" | "profile">("trips");

  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [selectedTripToCopy, setSelectedTripToCopy] = useState<SharedTrip | null>(null);

  const [sharedTrips, setSharedTrips] = useState<SharedTrip[]>([]);
  const [sharedLoading, setSharedLoading] = useState(true);

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
      // 建立行程，由後端自動處理 Unsplash 圖片抓取與快取
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

  const openEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
    const formatDate = (dateString: string) => {
      if (!dateString) return "";
      return new Date(dateString).toISOString().split('T')[0];
    };

    setForm({
      title: trip.title,
      destination: trip.destination,
      startDate: formatDate(trip.startDate),
      endDate: formatDate(trip.endDate),
      description: trip.description || "",
      budget: trip.budget?.toString() || "",
      currency: trip.currency || "TWD",
      status: trip.status.toLowerCase() as any,
    });
  };

  const handleUpdateTrip = async () => {
    if (!editingTrip?.id || !form.title || !form.destination || !form.startDate || !form.endDate) {
      toast.error("請填寫所有必填欄位");
      return;
    }
    
    setIsCreating(true);
    try {
      await tripsApi.update(editingTrip.id, {
        title: form.title,
        destination: form.destination,
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description,
        budget: form.budget ? parseFloat(form.budget) : undefined,
        currency: form.currency,
        status: form.status.toUpperCase(),
      });
      
      toast.success("行程更新成功！");
      setEditingTrip(null);
      window.location.reload(); 
    } catch (error) {
      toast.error("更新失敗，請稍後再試");
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

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "M月d日", { locale: zhTW });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-[oklch(0.97_0.015_80)] flex">
      {/* Desktop Sidebar */}
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
                  activeFilter === stat.filter ? "bg-[oklch(0.62_0.12_220)] text-white" : "bg-white/5 hover:bg-white/10 text-white/70"
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
            onClick={() => {
              setEditingTrip(null);
              setForm({ title: "", destination: "", startDate: "", endDate: "", description: "", budget: "", currency: "TWD", status: "planning" });
              setShowNewTrip(true);
            }}
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
      
      {/* Main Content */}
      <main className="flex-1 lg:ml-64 min-h-screen pb-24 lg:pb-0">
        <header className="hidden lg:flex items-center justify-between px-8 py-5 bg-white/80 backdrop-blur-sm border-b border-[oklch(0.92_0.008_220)] sticky top-0 z-10">
           <h1 className="font-['Playfair_Display'] text-2xl font-bold text-[oklch(0.22_0.08_220)]">所有行程</h1>
        </header>

        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-4 bg-[oklch(0.22_0.08_220)] sticky top-0 z-10 shadow-md">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="Voyager" className="w-7 h-7 brightness-0 invert" />
            <span className="font-['Playfair_Display'] text-lg font-bold text-white">Voyager</span>
          </div>
        </header>

        <div className="p-4 lg:p-8">
           {loading ? <Skeleton className="h-72 w-full rounded-2xl" /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
              {filteredTrips.map((trip, index) => (
                <TripCard 
                  key={trip.id} 
                  trip={trip} 
                  fallbackImage={CARD_IMAGES[index % CARD_IMAGES.length]} 
                  onOpen={() => setLocation(`/trip/${trip.id}`)} 
                  onEdit={() => openEditTrip(trip)}
                  onDelete={() => setDeletingTrip(trip)} 
                  onUploadCover={handleUploadCover}
                />
              ))}
            </div>
          )}

          {/* Shared Trips Section */}
          {(sharedLoading || sharedTrips.length > 0) && (
            <div className="mt-10">
              <h2 className="font-['Playfair_Display'] text-xl font-bold text-[oklch(0.22_0.08_220)] mb-6 flex items-center gap-2">
                <Globe className="w-5 h-5 text-[oklch(0.62_0.12_220)]" />
                分享行程
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                {sharedTrips.map((shared, index) => (
                  <div key={shared.id} className="relative group bg-white rounded-2xl overflow-hidden shadow-sm border border-[oklch(0.92_0.008_220)] hover:shadow-lg transition-all duration-200 cursor-pointer">
                    <div onClick={() => setLocation(`/trip/${shared.id}`)}>
                      <div className="h-44 overflow-hidden relative">
                        <img 
                          src={shared.trip.coverImage || CARD_IMAGES[(index + 2) % CARD_IMAGES.length]} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <div className="absolute bottom-3 left-3 text-white">
                          <p className="text-xs opacity-80">分享者: {shared.ownerName || "朋友"}</p>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-lg truncate">{shared.trip.title}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5" /> {shared.trip.destination}
                        </p>
                      </div>
                    </div>
                    
                    <div className="absolute top-3 right-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedTripToCopy(shared); setShowCopyDialog(true); }}>
                            <Copy className="w-4 h-4 mr-2" /> 複製行程
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Navigation */}
      <MobileNav 
        activeTab={mobileTab} 
        onTabChange={(tab) => {
          setMobileTab(tab);
          if (tab === "trips") setLocation("/dashboard");
        }} 
        onAddClick={() => {
          setEditingTrip(null);
          setForm({ title: "", destination: "", startDate: "", endDate: "", description: "", budget: "", currency: "TWD", status: "planning" });
          setShowNewTrip(true);
        }}
        onLogout={handleLogout}
      />

      {/* ===== New/Edit Trip Dialog ===== */}
      <Dialog open={showNewTrip || !!editingTrip} onOpenChange={(open) => { if(!open) { setShowNewTrip(false); setEditingTrip(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="font-['Playfair_Display'] text-2xl text-[oklch(0.22_0.08_220)]">
              {editingTrip ? "編輯行程" : "規劃新旅程"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">行程名稱 *</Label>
              <Input
                placeholder="例：東京賞楓之旅"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="border-[oklch(0.88_0.008_220)] focus:border-[oklch(0.62_0.12_220)] h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">目的地 *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.65_0.06_220)]" />
                <Input
                  placeholder="例：日本東京"
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  className="pl-10 border-[oklch(0.88_0.008_220)] focus:border-[oklch(0.62_0.12_220)] h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">出發日期 *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.65_0.06_220)]" />
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="pl-10 border-[oklch(0.88_0.008_220)] focus:border-[oklch(0.62_0.12_220)] h-11"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">回程日期 *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.65_0.06_220)]" />
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="pl-10 border-[oklch(0.88_0.008_220)] focus:border-[oklch(0.62_0.12_220)] h-11"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">行程狀態</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as NewTripForm["status"] })}>
                <SelectTrigger className="border-[oklch(0.88_0.008_220)] h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">規劃中</SelectItem>
                  <SelectItem value="ongoing">進行中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">預算（選填）</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  className="border-[oklch(0.88_0.008_220)] focus:border-[oklch(0.62_0.12_220)] h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">幣別</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger className="border-[oklch(0.88_0.008_220)] h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">備註（選填）</Label>
              <Textarea
                placeholder="行程簡介、注意事項..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="border-[oklch(0.88_0.008_220)] focus:border-[oklch(0.62_0.12_220)] resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => { setShowNewTrip(false); setEditingTrip(null); }}
                className="flex-1 border-[oklch(0.88_0.008_220)]"
              >
                取消
              </Button>
              <Button
                onClick={editingTrip ? handleUpdateTrip : handleCreateTrip}
                disabled={isCreating}
                className="flex-1 bg-[oklch(0.22_0.08_220)] hover:bg-[oklch(0.35_0.06_220)] text-white active:scale-[0.97]"
              >
                {isCreating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (editingTrip ? "更新行程" : "建立行程")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Copy Trip Confirmation ===== */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>複製此行程？</DialogTitle>
            <DialogDescription>
              將「{selectedTripToCopy?.trip.title}」複製到您的個人行程清單中，您可以自由修改內容。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyDialog(false)}>取消</Button>
            <Button onClick={handleCopyTrip} className="bg-[oklch(0.62_0.12_220)] text-white">確認複製</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Delete Confirm Dialog ===== */}
      <AlertDialog open={!!deletingTrip} onOpenChange={() => setDeletingTrip(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除這個行程？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deletingTrip?.title}」及其所有活動資料將被永久刪除，此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTrip}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              確定刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Trip Card Component
function TripCard({
  trip,
  fallbackImage,
  onOpen,
  onEdit,
  onDelete,
  onUploadCover,
}: {
  trip: Trip;
  fallbackImage: string;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUploadCover: (tripId: string, file: File) => Promise<void>;
}) {
  const status = statusConfig[trip.status.toUpperCase()] || statusConfig.planning;
  const StatusIcon = status.icon;
  const duration = trip.startDate && trip.endDate
    ? differenceInDays(parseISO(trip.endDate), parseISO(trip.startDate)) + 1
    : 0;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const coverSrc = trip.coverImage || fallbackImage;

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "yyyy.MM.dd");
    } catch {
      return dateStr;
    }
  };

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
      }}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-[oklch(0.92_0.008_220)] hover:shadow-lg transition-all duration-200 cursor-pointer"
    >
      <div className="relative h-44 overflow-hidden" onClick={onOpen}>
        <img
          src={coverSrc}
          alt={trip.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </div>
        
        {duration > 0 && (
          <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg font-['DM_Mono']">
            {duration} 天
          </div>
        )}
      </div>

      <div className="p-4 relative">
        <div onClick={onOpen}>
          <h3 className="font-['Playfair_Display'] font-bold text-[oklch(0.22_0.08_220)] text-lg leading-tight truncate pr-8">
            {trip.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin className="w-3.5 h-3.5 text-[oklch(0.62_0.12_220)] flex-shrink-0" />
            <span className="text-sm text-[oklch(0.52_0.05_220)] truncate">{trip.destination}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-[oklch(0.55_0.05_220)] font-['DM_Mono']">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(trip.startDate)} — {formatDate(trip.endDate)}</span>
          </div>
        </div>

        {/* Dropdown Menu for Actions */}
        <div className="absolute top-4 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-gray-100">
                <MoreHorizontal className="w-4 h-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit3 className="w-4 h-4 mr-2" /> 編輯行程
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Camera className="w-4 h-4 mr-2" /> 更換封面
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" /> 刪除行程
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              setIsUploading(true);
              await onUploadCover(trip.id, file);
              setIsUploading(false);
            }
          }}
        />
      </div>
    </motion.div>
  );
}
