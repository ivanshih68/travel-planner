/**
 * Dashboard — Trip Management Main Page
 * Design: Coastal Morning — Left sidebar + main content area
 * Desktop: Fixed sidebar with nav + trip cards grid
 * Mobile: Bottom nav + full-screen cards
 *
 * Features added:
 * - Cover image upload per trip card (base64 stored in Firestore)
 */

import { useState, useRef, useCallback } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, parseISO } from "date-fns";
import { zhTW } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/contexts/AuthContext";
import { useTrips } from "@/hooks/useTrips";
import { createTrip, updateTrip, deleteTrip, logout, type Trip } from "@/lib/firebase";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663760105877/FKWg7QY89BMBENe4mCAPfG/logo-icon-nDuQzmKqhkrEYACEszfx6u.webp";
const CARD_IMG_1 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663760105877/FKWg7QY89BMBENe4mCAPfG/travel-card-1-5S2pMWQ95V9wp6iGv7j3yH.webp";
const CARD_IMG_2 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663760105877/FKWg7QY89BMBENe4mCAPfG/travel-card-2-6bszyXBiNQ9zQQmFK3CWui.webp";
const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663760105877/FKWg7QY89BMBENe4mCAPfG/hero-travel-fcqx36i6AkJoWerUJTQQw4.webp";

// Cycle through card images for visual variety (fallback when no custom cover)
const CARD_IMAGES = [CARD_IMG_1, CARD_IMG_2, HERO_IMG];

const statusConfig = {
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

/** Compress image to JPEG data-URL under ~200 KB */
function compressImage(file: File, maxPx = 800, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Dashboard() {
  const { user } = useAuth();
  const { trips, loading } = useTrips();
  const [, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState<"all" | "planning" | "ongoing" | "completed">("all");
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [mobileTab, setMobileTab] = useState<"trips" | "profile">("trips");

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
    (t) => activeFilter === "all" || t.status === activeFilter
  );

  const stats = {
    total: trips.length,
    planning: trips.filter((t) => t.status === "planning").length,
    ongoing: trips.filter((t) => t.status === "ongoing").length,
    completed: trips.filter((t) => t.status === "completed").length,
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
        userId: user.uid,
        title: form.title,
        destination: form.destination,
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description,
        budget: form.budget ? parseFloat(form.budget) : undefined,
        currency: form.currency,
        status: form.status,
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

  const handleLogout = async () => {
    await logout();
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
      {/* ===== Desktop Sidebar ===== */}
      <aside className="hidden lg:flex flex-col w-64 bg-[oklch(0.22_0.08_220)] text-white fixed h-full z-20">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Voyager" className="w-8 h-8 brightness-0 invert" />
            <span className="font-['Playfair_Display'] text-xl font-bold">Voyager</span>
          </div>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[oklch(0.62_0.12_220)] flex items-center justify-center text-white text-sm font-bold">
              {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.displayName || "旅行者"}</p>
              <p className="text-xs text-white/50 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
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

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setShowNewTrip(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[oklch(0.72_0.14_35)] hover:bg-[oklch(0.65_0.14_35)] text-white font-medium text-sm transition-all duration-150 active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" />
            新增行程
          </button>

          <div className="mt-4 space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/10 text-white text-sm">
              <LayoutGrid className="w-4 h-4" />
              我的行程
            </button>
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white text-sm transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
            登出
          </button>
        </div>
      </aside>

      {/* ===== Main Content ===== */}
      <main className="flex-1 lg:ml-64 min-h-screen">
        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between px-8 py-5 bg-white/80 backdrop-blur-sm border-b border-[oklch(0.92_0.008_220)] sticky top-0 z-10">
          <div>
            <h1 className="font-['Playfair_Display'] text-2xl font-bold text-[oklch(0.22_0.08_220)]">
              {activeFilter === "all" ? "所有行程" :
               activeFilter === "planning" ? "規劃中的行程" :
               activeFilter === "ongoing" ? "進行中的行程" : "已完成的行程"}
            </h1>
            <p className="text-sm text-[oklch(0.52_0.05_220)] mt-0.5">
              共 {filteredTrips.length} 個行程
            </p>
          </div>
          <Button
            onClick={() => setShowNewTrip(true)}
            className="bg-[oklch(0.62_0.12_220)] hover:bg-[oklch(0.55_0.12_220)] text-white gap-2 active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" />
            新增行程
          </Button>
        </header>

        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-4 bg-[oklch(0.22_0.08_220)] sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="Voyager" className="w-7 h-7 brightness-0 invert" />
            <span className="font-['Playfair_Display'] text-lg font-bold text-white">Voyager</span>
          </div>
          <button
            onClick={() => setShowNewTrip(true)}
            className="w-9 h-9 rounded-full bg-[oklch(0.72_0.14_35)] flex items-center justify-center text-white active:scale-[0.95]"
          >
            <Plus className="w-5 h-5" />
          </button>
        </header>

        {/* Mobile filter tabs */}
        <div className="lg:hidden flex gap-2 px-4 py-3 bg-white border-b border-[oklch(0.92_0.008_220)] overflow-x-auto">
          {[
            { label: "全部", value: "all" as const },
            { label: "規劃中", value: "planning" as const },
            { label: "進行中", value: "ongoing" as const },
            { label: "已完成", value: "completed" as const },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all duration-150 ${
                activeFilter === tab.value
                  ? "bg-[oklch(0.62_0.12_220)] text-white"
                  : "bg-[oklch(0.94_0.008_220)] text-[oklch(0.45_0.06_220)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Trip Grid */}
        <div className="p-4 lg:p-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-72 rounded-2xl" />
              ))}
            </div>
          ) : filteredTrips.length === 0 ? (
            <EmptyState onAdd={() => setShowNewTrip(true)} />
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6"
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.06 } },
                hidden: {},
              }}
            >
              {filteredTrips.map((trip, index) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  fallbackImage={CARD_IMAGES[index % CARD_IMAGES.length]}
                  onOpen={() => setLocation(`/trip/${trip.id}`)}
                  onDelete={() => setDeletingTrip(trip)}
                />
              ))}
            </motion.div>
          )}
        </div>
      </main>

      {/* ===== Mobile Bottom Nav ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[oklch(0.92_0.008_220)] z-20 flex">
        <button
          onClick={() => setMobileTab("trips")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
            mobileTab === "trips" ? "text-[oklch(0.62_0.12_220)]" : "text-[oklch(0.65_0.05_220)]"
          }`}
        >
          <Compass className="w-5 h-5" />
          行程
        </button>
        <button
          onClick={() => setMobileTab("profile")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
            mobileTab === "profile" ? "text-[oklch(0.62_0.12_220)]" : "text-[oklch(0.65_0.05_220)]"
          }`}
        >
          <User className="w-5 h-5" />
          個人
        </button>
      </nav>

      {/* Mobile Profile Panel */}
      <AnimatePresence>
        {mobileTab === "profile" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="lg:hidden fixed inset-0 bg-[oklch(0.97_0.015_80)] z-10 pb-16"
          >
            <div className="p-6">
              <h2 className="font-['Playfair_Display'] text-2xl font-bold text-[oklch(0.22_0.08_220)] mb-6">個人資料</h2>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-[oklch(0.92_0.008_220)]">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-[oklch(0.62_0.12_220)] flex items-center justify-center text-white text-xl font-bold">
                    {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="font-semibold text-[oklch(0.22_0.08_220)]">{user?.displayName || "旅行者"}</p>
                    <p className="text-sm text-[oklch(0.55_0.05_220)]">{user?.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: "全部行程", value: stats.total },
                    { label: "規劃中", value: stats.planning },
                    { label: "進行中", value: stats.ongoing },
                    { label: "已完成", value: stats.completed },
                  ].map((s) => (
                    <div key={s.label} className="bg-[oklch(0.97_0.015_80)] rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold font-['DM_Mono'] text-[oklch(0.22_0.08_220)]">{s.value}</p>
                      <p className="text-xs text-[oklch(0.55_0.05_220)] mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  登出
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== New Trip Dialog ===== */}
      <Dialog open={showNewTrip} onOpenChange={setShowNewTrip}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="font-['Playfair_Display'] text-2xl text-[oklch(0.22_0.08_220)]">
              規劃新旅程
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
                onClick={() => setShowNewTrip(false)}
                className="flex-1 border-[oklch(0.88_0.008_220)]"
              >
                取消
              </Button>
              <Button
                onClick={handleCreateTrip}
                disabled={isCreating}
                className="flex-1 bg-[oklch(0.62_0.12_220)] hover:bg-[oklch(0.55_0.12_220)] text-white active:scale-[0.97]"
              >
                {isCreating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : "建立行程"}
              </Button>
            </div>
          </div>
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

// Trip Card Component — supports custom cover image upload
function TripCard({
  trip,
  fallbackImage,
  onOpen,
  onDelete,
}: {
  trip: Trip;
  fallbackImage: string;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const status = statusConfig[trip.status];
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

  const handleCoverUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !trip.id) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      toast.error("請選擇圖片檔案");
      return;
    }

    setIsUploading(true);
    try {
      const dataUrl = await compressImage(file, 900, 0.78);
      await updateTrip(trip.id, { coverImage: dataUrl });
      toast.success("封面圖已更新");
    } catch (err) {
      console.error(err);
      toast.error("上傳失敗，請稍後再試");
    } finally {
      setIsUploading(false);
      // Reset so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [trip.id]);

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
      }}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-[oklch(0.92_0.008_220)] hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
      onClick={onOpen}
    >
      {/* Cover image */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={coverSrc}
          alt={trip.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Status badge */}
        <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </div>

        {/* Action buttons (top-right) */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-150">
          {/* Upload cover button */}
          <button
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            disabled={isUploading}
            title="更換封面圖"
            className="w-7 h-7 rounded-full bg-black/40 hover:bg-[oklch(0.62_0.12_220)] flex items-center justify-center text-white transition-all duration-150 active:scale-[0.9]"
          >
            {isUploading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
          </button>
          {/* Delete button */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="刪除行程"
            className="w-7 h-7 rounded-full bg-black/30 hover:bg-red-500 flex items-center justify-center text-white transition-all duration-150 active:scale-[0.9]"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverUpload}
        />

        {/* Duration badge */}
        {duration > 0 && (
          <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg font-['DM_Mono']">
            {duration} 天
          </div>
        )}

        {/* Custom cover indicator */}
        {trip.coverImage && (
          <div className="absolute bottom-3 left-3 bg-black/30 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1">
            <ImagePlus className="w-3 h-3" />
            自訂封面
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-['Playfair_Display'] font-bold text-[oklch(0.22_0.08_220)] text-lg leading-tight truncate">
              {trip.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-[oklch(0.62_0.12_220)] flex-shrink-0" />
              <span className="text-sm text-[oklch(0.52_0.05_220)] truncate">{trip.destination}</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[oklch(0.72_0.05_220)] flex-shrink-0 mt-1 group-hover:translate-x-1 transition-transform duration-150" />
        </div>

        <div className="flex items-center gap-1.5 mt-3 text-xs text-[oklch(0.55_0.05_220)] font-['DM_Mono']">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(trip.startDate)} — {formatDate(trip.endDate)}</span>
        </div>

        {trip.budget && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[oklch(0.55_0.05_220)]">
            <Globe className="w-3.5 h-3.5" />
            <span>預算 {trip.budget.toLocaleString()} {trip.currency}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Empty state component
function EmptyState({ onAdd }: { onAdd: () => void }) {
  const MAP_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663760105877/FKWg7QY89BMBENe4mCAPfG/travel-map-bg-36UeRLwmawK4edXy2ywVkd.webp";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-48 h-32 rounded-2xl overflow-hidden mb-6 opacity-60">
        <img src={MAP_BG} alt="map" className="w-full h-full object-cover" />
      </div>
      <h3 className="font-['Playfair_Display'] text-2xl font-bold text-[oklch(0.35_0.06_220)] mb-2">
        還沒有行程
      </h3>
      <p className="text-[oklch(0.55_0.05_220)] mb-6 max-w-xs">
        規劃你的第一段旅程，把夢想變成現實
      </p>
      <Button
        onClick={onAdd}
        className="bg-[oklch(0.62_0.12_220)] hover:bg-[oklch(0.55_0.12_220)] text-white gap-2 active:scale-[0.97]"
      >
        <Plus className="w-4 h-4" />
        規劃這趟旅行
      </Button>
    </motion.div>
  );
}
