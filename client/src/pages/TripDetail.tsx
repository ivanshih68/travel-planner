/**
 * TripDetail — Per-day itinerary management
 * Design: Coastal Morning — Timeline layout with day tabs
 * Desktop: Day selector sidebar + activity timeline
 * Mobile: Horizontal day tabs + scrollable timeline
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  MapPin,
  Clock,
  Utensils,
  Hotel,
  Camera,
  Bus,
  MoreHorizontal,
  Trash2,
  Edit3,
  Calendar,
  DollarSign,
  FileText,
  Download,
  Share2,
  ChevronUp,
  ChevronDown,
  X,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle } from "lucide-react";
import { format, parseISO, addDays } from "date-fns";
import { zhTW } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { useAuth } from "@/contexts/AuthContext";
import { CloudinaryImageUpload } from "@/components/CloudinaryImageUpload";
import { useActivities } from "@/hooks/useActivities";
import { useIsMobile } from "@/hooks/useMobile";
import { PlaceSearch } from "@/components/PlaceSearch";
import { MapPreview } from "@/components/MapPreview";
import { tripsApi, tripSharingApi, type Trip, type Activity, type TripShare } from "@/lib/api";
import { exportTripToPdf } from "@/lib/exportPdf";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663760105877/FKWg7QY89BMBENe4mCAPfG/logo-icon-nDuQzmKqhkrEYACEszfx6u.webp";

const categoryConfig: Record<string, { label: string; icon: typeof Camera; color: string; dot: string }> = {
  ATTRACTION: { label: "景點", icon: Camera, color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  RESTAURANT: { label: "餐廳", icon: Utensils, color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  HOTEL: { label: "住宿", icon: Hotel, color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  TRANSPORT: { label: "交通", icon: Bus, color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  OTHER: { label: "其他", icon: FileText, color: "bg-gray-100 text-gray-700", dot: "bg-gray-400" },
};

interface ActivityForm {
  title: string;
  category: Activity["category"];
  time: string;
  location: string;
  address: string;
  notes: string;
  cost: string;
  duration: string;
  lat?: number;
  lng?: number;
  images: string[];
}

const defaultActivityForm: ActivityForm = {
  title: "",
  category: "ATTRACTION",
  time: "",
  location: "",
  address: "",
  notes: "",
  cost: "",
  duration: "",
  lat: undefined,
  lng: undefined,
  images: [],
};

// ActivityDetail Component (Sheet/Dialog for viewing)
function ActivityDetailSheet({ 
  activity, 
  currency, 
  open, 
  onClose,
  onEdit,
  onDelete
}: { 
  activity: Activity; 
  currency?: string; 
  open: boolean; 
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const config = categoryConfig[activity.category] || categoryConfig.OTHER;
  
  const handleOpenInGoogleMaps = () => {
    const query = activity.address || activity.location || activity.title;
    if (!query) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-[90dvh] sm:max-w-md mx-auto rounded-t-[32px] bg-white overflow-hidden p-0 border-none flex flex-col [&>button]:hidden"
      >
        {/* Drag Handle Area with Motion */}
        <motion.div 
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 100) onClose();
          }}
          className="w-full flex justify-center pt-3 pb-4 cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-12 h-1.5 rounded-full bg-gray-200" />
        </motion.div>

        <div className="flex-1 overflow-y-auto px-6 pb-32">
          <SheetHeader className="mb-6">
            <div className="flex items-center mb-4">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
                {config.label}
              </span>
            </div>
            <SheetTitle className="text-3xl font-black text-[oklch(0.22_0.08_220)] text-left leading-tight">
              {activity.title}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-8">
            {/* Time and Stats */}
            <div className="flex flex-wrap gap-8">
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">時間</div>
                <div className="flex items-center gap-2 font-bold text-[oklch(0.22_0.08_220)]">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {activity.time || "未設定"}
                </div>
              </div>
              {activity.duration && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">時長</div>
                  <div className="font-bold text-[oklch(0.22_0.08_220)]">{activity.duration} 分鐘</div>
                </div>
              )}
              {activity.cost && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">花費</div>
                  <div className="flex items-center gap-1 font-bold text-[oklch(0.22_0.08_220)]">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    {activity.cost.toLocaleString()} {currency}
                  </div>
                </div>
              )}
            </div>

            {/* Location Link */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">地點</div>
              <button 
                onClick={handleOpenInGoogleMaps}
                className="w-full text-left group bg-gray-50 hover:bg-[oklch(0.95_0.02_220)] rounded-2xl p-4 transition-all border border-transparent hover:border-[oklch(0.8_0.05_220)]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <MapPin className="w-5 h-5 text-[oklch(0.62_0.12_220)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[oklch(0.22_0.08_220)] flex items-center gap-1.5">
                      {activity.location || "開啟地圖搜尋"}
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </div>
                    {activity.address && <div className="text-xs text-gray-500 mt-0.5 truncate">{activity.address}</div>}
                  </div>
                </div>
              </button>
              {(activity as any).lat && (activity as any).lng && (
                <div className="h-48 rounded-2xl overflow-hidden shadow-inner border border-gray-100">
                  <MapPreview lat={(activity as any).lat} lng={(activity as any).lng} title={activity.location} />
                </div>
              )}
            </div>

            {/* Notes */}
            {activity.notes && (
              <div className="space-y-3">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">備註</div>
                <div className="bg-[oklch(0.98_0.005_220)] p-5 rounded-2xl border border-[oklch(0.95_0.005_220)] italic text-[oklch(0.35_0.06_220)] whitespace-pre-wrap leading-relaxed">
                  "{activity.notes}"
                </div>
              </div>
            )}

            {/* Images */}
            {activity.images && activity.images.length > 0 && (
              <div className="space-y-3">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">照片</div>
                <div className="grid grid-cols-2 gap-3">
                  {activity.images.map((img, idx) => (
                    <div key={idx} className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 shadow-sm">
                      <img src={img} alt={`${activity.title} - ${idx}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Toolbar */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-100 flex gap-4">
          <Button 
            onClick={onEdit}
            className="flex-1 h-12 rounded-xl bg-[oklch(0.62_0.12_220)] hover:bg-[oklch(0.55_0.12_220)] text-white font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
          >
            <Edit3 className="w-5 h-5" />
            編輯
          </Button>
          <Button 
            variant="outline"
            onClick={onDelete}
            className="flex-1 h-12 rounded-xl border-2 border-red-100 text-red-500 hover:bg-red-50 font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <Trash2 className="w-5 h-5" />
            刪除
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ActivityCard Component
function ActivityCard({ 
  activity, 
  index, 
  isFirst,
  isLast,
  currency, 
  hasConflict, 
  onEdit, 
  onDelete,
  onMoveUp,
  onMoveDown
}: { 
  activity: Activity; 
  index: number; 
  isFirst: boolean;
  isLast: boolean;
  currency?: string; 
  hasConflict?: boolean; 
  onEdit: () => void; 
  onDelete: () => void; 
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const config = categoryConfig[activity.category] || categoryConfig.OTHER;

  return (
    <>
    <div className="group relative flex gap-4 items-start">
      {/* Time column */}
      <div className="w-12 pt-1 flex flex-col items-center">
        <span className="text-xs font-bold text-[oklch(0.45_0.05_220)]">
          {activity.time || "--:--"}
        </span>
        <div className={`mt-2 w-2.5 h-2.5 rounded-full border-2 border-white ring-2 ring-offset-1 ${config.dot}`} />
      </div>

      {/* Content card */}
      <div 
        onClick={() => setShowDetail(true)}
        className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-[oklch(0.92_0.01_220)] hover:shadow-md transition-shadow flex gap-4 cursor-pointer"
      >
        <div className="flex-1">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
                {config.label}
              </span>
              {hasConflict && (
                <div className="flex items-center gap-1 text-[oklch(0.65_0.18_35)] bg-orange-50 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-[10px] font-bold">時間衝突</span>
                </div>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="gap-2">
                  <Edit3 className="w-4 h-4" /> 編輯
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-600 gap-2">
                  <Trash2 className="w-4 h-4" /> 刪除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <h3 className="text-base font-bold text-[oklch(0.22_0.08_220)] mb-1">{activity.title}</h3>
          
          <div className="space-y-1.5">
            {activity.location && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{activity.location}</span>
              </div>
            )}
            
            <div className="flex flex-wrap gap-3">
              {activity.duration && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{activity.duration} 分鐘</span>
                </div>
              )}
              {activity.cost && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>{activity.cost.toLocaleString()} {currency}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reorder arrows */}
        <div className="flex flex-col justify-center gap-1 border-l pl-4 border-[oklch(0.95_0.005_220)]">
          <button 
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={isFirst}
            className={`p-1.5 rounded-lg transition-colors ${isFirst ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:bg-gray-100 hover:text-[oklch(0.22_0.08_220)]'}`}
            title="上移"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={isLast}
            className={`p-1.5 rounded-lg transition-colors ${isLast ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:bg-gray-100 hover:text-[oklch(0.22_0.08_220)]'}`}
            title="下移"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>

    {/* Detail Sheet */}
    <ActivityDetailSheet 
      activity={activity}
      currency={currency}
      open={showDetail}
      onClose={() => setShowDetail(false)}
      onEdit={onEdit}
      onDelete={onDelete}
    />
    </>
  );
}

function DayEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-[oklch(0.9_0.02_220)] rounded-3xl bg-[oklch(0.98_0.005_220)]">
      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
        <Calendar className="w-8 h-8 text-[oklch(0.8_0.05_220)]" />
      </div>
      <h3 className="text-lg font-bold text-[oklch(0.35_0.06_220)] mb-2">這天還沒有安排</h3>
      <p className="text-sm text-gray-400 text-center max-w-[240px] mb-6">
        新增景點、餐廳或住宿，開始規劃這天的行程
      </p>
      <Button 
        onClick={onAdd}
        variant="outline"
        className="rounded-full border-[oklch(0.8_0.05_220)] text-[oklch(0.35_0.06_220)] hover:bg-[oklch(0.62_0.12_220)] hover:text-white transition-all"
      >
        <Plus className="w-4 h-4 mr-2" /> 新增第一個活動
      </Button>
    </div>
  );
}

export default function TripDetail() {
  const params = useParams<{ id: string }>();
  const tripId = params.id;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { activities, activitiesByDay, loading, createActivity, updateActivity, deleteActivity, reorderActivities } = useActivities(tripId);
  const isMobile = useIsMobile();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [tripLoading, setTripLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);
  const [form, setForm] = useState<ActivityForm>(defaultActivityForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [existingShares, setExistingShares] = useState<TripShare[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);

  // Load trip data
  useEffect(() => {
    if (!tripId) return;
    setTripLoading(true);
    tripsApi.get(tripId)
      .then(({ data }) => {
        setTrip(data.trip);
      })
      .catch(() => {
        setTrip(null);
      })
      .finally(() => setTripLoading(false));
  }, [tripId]);

  // Generate day list
  const days = useMemo(() => {
    if (!trip?.startDate || !trip?.endDate) return [];
    const start = parseISO(trip.startDate);
    const end = parseISO(trip.endDate);
    const dayCount = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    return Array.from({ length: dayCount }, (_, i) => ({
      day: i + 1,
      date: addDays(start, i),
      label: `Day ${i + 1}`,
      dateStr: format(addDays(start, i), "M/d", { locale: zhTW }),
      weekday: format(addDays(start, i), "EEE", { locale: zhTW }),
    }));
  }, [trip]);

  const currentDayActivities = useMemo(
    () => activitiesByDay[selectedDay] || [],
    [activitiesByDay, selectedDay]
  );

  // Sorting
  const sortedItems = useMemo(() => {
    return [...currentDayActivities].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [currentDayActivities]);

  const totalCost = activities.reduce((sum, a) => sum + Number(a.cost || 0), 0);
  const dayTotalCost = currentDayActivities.reduce((sum, a) => sum + Number(a.cost || 0), 0);
  // Move Activity Up/Down
  const handleMoveActivity = async (index: number, direction: 'up' | 'down') => {
    if (!tripId) return;
    const newItems = [...sortedItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    // Swap items
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Prepare orders for API
    const orders = newItems.map((item, idx) => ({
      id: item.id!,
      sortOrder: idx
    }));

    try {
      await reorderActivities(orders);
      toast.success("順序已更新");
    } catch (err) {
      console.error("Reorder failed:", err);
      toast.error("更新順序失敗");
    }
  };

  // ── Time conflict detection ──────────────────────────────────────────────
  const conflictingIds = useMemo(() => {
    const withTime = currentDayActivities.filter((a) => a.time && a.duration);
    const conflicted = new Set<string>();
    for (let i = 0; i < withTime.length; i++) {
      for (let j = i + 1; j < withTime.length; j++) {
        const a = withTime[i];
        const b = withTime[j];
        const toMinutes = (t: string) => {
          const [h, m] = t.split(":").map(Number);
          return h * 60 + m;
        };
        const aStart = toMinutes(a.time!);
        const aEnd = aStart + (a.duration || 0);
        const bStart = toMinutes(b.time!);
        const bEnd = bStart + (b.duration || 0);
        if (aStart < bEnd && aEnd > bStart) {
          if (a.id) conflicted.add(a.id);
          if (b.id) conflicted.add(b.id);
        }
      }
    }
    return conflicted;
  }, [currentDayActivities]);

  // ── Cost breakdown by category (all days) ───────────────────────────────
  const costByCategory = useMemo(() => {
    // 定義各類別的專屬顏色
    const PIE_COLORS: Record<string, string> = {
      ATTRACTION: "#3b82f6", // 藍色
      RESTAURANT: "#f97316", // 橘色
      HOTEL: "#a855f7",      // 紫色
      TRANSPORT: "#22c55e",  // 綠色
      OTHER: "#94a3b8",      // 灰色
    };

    return Object.entries(categoryConfig)
      .map(([key, cfg]) => {
        // 【關鍵修復】將所有 cost 強制轉為 Number，確保運算正確
        const total = activities
          .filter((a) => a.category === key)
          .reduce((sum, a) => sum + Number(a.cost || 0), 0);
        
        return {
          name: cfg.label,
          value: total,
          color: PIE_COLORS[key] || "#94a3b8", // 對應上面定義的顏色
        };
      })
      .filter((d) => d.value > 0); // 只顯示有花費的類別
  }, [activities]);

  const openAddActivity = () => {
    setEditingActivity(null);
    setForm(defaultActivityForm);
    setShowAddActivity(true);
  };

  const openEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setForm({
      title: activity.title,
      category: activity.category as Activity['category'],
      time: activity.time || "",
      location: activity.location || "",
      address: activity.address || "",
      notes: activity.notes || "",
      cost: activity.cost?.toString() || "",
      duration: activity.duration?.toString() || "",
      lat: (activity as any).lat,
      lng: (activity as any).lng,
      images: activity.images || [],
    });
    setShowAddActivity(true);
  };

  const handleSaveActivity = async () => {
    if (!form.title.trim()) {
      toast.error("請輸入活動名稱");
      return;
    }
    if (!user || !tripId) return;

    setIsSaving(true);
    try {
      const activityData = {
        title: form.title.trim(),
        category: form.category,
        time: form.time || undefined,
        location: form.location || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
        cost: form.cost ? parseFloat(form.cost) : undefined,
        duration: form.duration ? parseInt(form.duration) : undefined,
        lat: form.lat,
        lng: form.lng,
        images: form.images,
      };

      if (editingActivity?.id) {
        await updateActivity(editingActivity.id, activityData);
        toast.success("活動已更新");
      } else {
        await createActivity({
          ...activityData,
          day: selectedDay,
          date: days[selectedDay - 1]?.date
            ? format(days[selectedDay - 1].date, "yyyy-MM-dd")
            : undefined,
          sortOrder: currentDayActivities.length,
        });
        toast.success("活動已新增");
      }
      setShowAddActivity(false);
      setForm(defaultActivityForm);
    } catch {
      toast.error("儲存失敗，請稍後再試");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteActivity = async () => {
    if (!deletingActivity?.id) return;
    try {
      await deleteActivity(deletingActivity.id);
      toast.success("活動已刪除");
      setDeletingActivity(null);
    } catch {
      toast.error("刪除失敗");
    }
  };

  // ── Share trip ──────────────────────────────────────────────────────────
  const handleShareTrip = async () => {
    if (!tripId) return;
    setShowShareDialog(true);
    setShareEmail("");
    setSharesLoading(true);
    try {
      const { data } = await tripSharingApi.getShares(tripId);
      setExistingShares(data.shares);
    } catch {
      setExistingShares([]);
    } finally {
      setSharesLoading(false);
    }
  };

  const handleShareWithEmail = async () => {
    if (!tripId || !shareEmail.trim()) return;
    setShareLoading(true);
    try {
      await tripSharingApi.shareWith(tripId, shareEmail.trim());
      toast.success(`已分享給 ${shareEmail}`);
      setShareEmail("");
      const { data } = await tripSharingApi.getShares(tripId);
      setExistingShares(data.shares);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "分享失敗，請確認對方帳號已註冊";
      toast.error(msg);
    } finally {
      setShareLoading(false);
    }
  };

  const handleUnshare = async (email: string) => {
    if (!tripId) return;
    try {
      await tripSharingApi.unshareWith(tripId, email);
      setExistingShares((prev) => prev.filter((s) => s.sharedWith !== email));
      toast.success(`已取消分享`);
    } catch {
      toast.error("取消分享失敗");
    }
  };

  // ── Export PDF ───────────────────────────────────────────────────────────
  const handleExportPdf = async () => {
    if (!trip) return;
    setIsExporting(true);
    try {
      await exportTripToPdf(trip, activitiesByDay);
      toast.success("PDF 匯出成功！");
    } catch {
      toast.error("PDF 匯出失敗");
    } finally {
      setIsExporting(false);
    }
  };

  if (tripLoading) {
    return (
      <div className="min-h-screen bg-[oklch(0.97_0.015_80)] p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-32 w-full rounded-2xl mb-4" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[oklch(0.97_0.015_80)]">
        <div className="bg-white p-8 rounded-3xl shadow-sm text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-[oklch(0.22_0.08_220)] mb-2">找不到此行程</h2>
          <p className="text-gray-500 mb-6">此行程可能已被刪除，或您沒有權限查看。</p>
          <Button onClick={() => setLocation("/dashboard")} className="rounded-full w-full">
            回到儀表板
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[oklch(0.97_0.015_80)] lg:flex">
      {/* ===== Desktop Sidebar ===== */}
      <aside className="hidden lg:flex w-80 flex-col bg-white border-r border-[oklch(0.92_0.01_220)] h-screen sticky top-0">
        <div className="p-6 border-b border-[oklch(0.95_0.005_220)]">
          <button 
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-2 text-[oklch(0.45_0.05_220)] hover:text-[oklch(0.22_0.08_220)] transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold">返回儀表板</span>
          </button>
          
          <div className="flex items-center gap-3 mb-1">
            <img src={LOGO_URL} alt="Logo" className="w-6 h-6" />
            <h1 className="text-2xl font-['Playfair_Display'] font-black text-[oklch(0.22_0.08_220)] truncate">
              {trip.title}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-[oklch(0.45_0.05_220)] text-sm">
            <MapPin className="w-3.5 h-3.5" />
            <span>{trip.destination}</span>
            <span className="mx-1">•</span>
            <span>{days.length} 天</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {days.map((d) => (
            <button
              key={d.day}
              onClick={() => setSelectedDay(d.day)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-200 ${
                selectedDay === d.day
                  ? "bg-[oklch(0.22_0.08_220)] text-white shadow-md scale-[1.02]"
                  : "hover:bg-[oklch(0.95_0.005_220)] text-[oklch(0.35_0.06_220)]"
              }`}
            >
              <div className="text-left">
                <div className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${selectedDay === d.day ? "text-white/60" : "text-[oklch(0.55_0.03_220)]"}`}>
                  {d.label}
                </div>
                <div className="font-bold">{d.dateStr} {d.weekday}</div>
              </div>
              <div className={`text-xs font-bold px-2 py-1 rounded-lg ${selectedDay === d.day ? "bg-white/20" : "bg-gray-100"}`}>
                {activitiesByDay[d.day]?.length || 0}
              </div>
            </button>
          ))}
        </div>

        <div className="p-6 bg-[oklch(0.98_0.005_220)] border-t border-[oklch(0.95_0.005_220)]">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-bold text-[oklch(0.45_0.05_220)]">預算概況</span>
            <span className="text-xs font-bold text-[oklch(0.45_0.05_220)]">
              {totalCost.toLocaleString()} / {trip.budget?.toLocaleString() || 0} {trip.currency}
            </span>
          </div>
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-6">
            <div 
              className="h-full bg-[oklch(0.62_0.12_220)] transition-all duration-500"
              style={{ width: `${Math.min(100, (totalCost / (trip.budget || 1)) * 100)}%` }}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={handleExportPdf}
              disabled={isExporting}
              variant="outline" 
              className="rounded-xl h-10 border-[oklch(0.9_0.02_220)] text-[oklch(0.35_0.06_220)] hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" /> 匯出
            </Button>
            <Button 
              onClick={handleShareTrip}
              variant="outline" 
              className="rounded-xl h-10 border-[oklch(0.9_0.02_220)] text-[oklch(0.35_0.06_220)] hover:bg-gray-50"
            >
              <Share2 className="w-4 h-4 mr-2" /> 分享
            </Button>
          </div>
        </div>
      </aside>

      {/* ===== Mobile Header ===== */}
      <header className="lg:hidden bg-white border-b border-[oklch(0.92_0.01_220)] sticky top-0 z-20">
        <div className="p-4 flex items-center justify-between">
          <button onClick={() => setLocation("/dashboard")} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-[oklch(0.22_0.08_220)]" />
          </button>
          <div className="text-center flex-1 px-4">
            <h1 className="text-lg font-black text-[oklch(0.22_0.08_220)] truncate">{trip.title}</h1>
            <p className="text-[10px] font-bold text-[oklch(0.55_0.03_220)] uppercase tracking-widest">
              {trip.destination} • {days.length} 天
            </p>
          </div>
          <div className="flex gap-1">
            <button onClick={handleShareTrip} className="p-2">
              <Share2 className="w-5 h-5 text-[oklch(0.22_0.08_220)]" />
            </button>
          </div>
        </div>
        
        <div className="flex overflow-x-auto px-4 pb-3 no-scrollbar gap-2">
          {days.map((d) => (
            <button
              key={d.day}
              onClick={() => setSelectedDay(d.day)}
              className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${
                selectedDay === d.day
                  ? "bg-[oklch(0.22_0.08_220)] text-white shadow-md scale-105"
                  : "bg-[oklch(0.95_0.005_220)] text-[oklch(0.35_0.06_220)]"
              }`}
            >
              <span className={`text-[10px] font-bold uppercase mb-0.5 ${selectedDay === d.day ? "text-white/60" : "text-[oklch(0.55_0.03_220)]"}`}>
                Day {d.day}
              </span>
              <span className="text-sm font-bold">{d.dateStr}</span>
            </button>
          ))}
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <div className="flex-1 flex flex-col lg:h-screen lg:overflow-hidden">
        {/* Statistics Banner (Desktop Only) */}
        <div className="hidden lg:grid grid-cols-3 gap-6 p-8 bg-[oklch(0.98_0.005_220)] border-b border-[oklch(0.95_0.005_220)]">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-[oklch(0.92_0.01_220)]">
            <div className="text-xs font-bold text-[oklch(0.55_0.03_220)] uppercase tracking-widest mb-1">今日預算</div>
            <div className="text-2xl font-black text-[oklch(0.22_0.08_220)]">
              {dayTotalCost.toLocaleString()} <span className="text-sm font-bold text-gray-400">{trip.currency}</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-[oklch(0.92_0.01_220)]">
            <div className="text-xs font-bold text-[oklch(0.55_0.03_220)] uppercase tracking-widest mb-1">今日活動</div>
            <div className="text-2xl font-black text-[oklch(0.22_0.08_220)]">
              {currentDayActivities.length} <span className="text-sm font-bold text-gray-400">個項目</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-[oklch(0.92_0.01_220)] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[oklch(0.55_0.03_220)] uppercase tracking-widest mb-1">預算分佈</div>
              <div className="text-xs text-gray-400 font-medium">依類別統計</div>
            </div>
           <div className="h-20 w-36 -mr-4"> 
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costByCategory.length > 0 ? costByCategory : [{ name: 'Empty', value: 1, color: '#f3f4f6' }]}
                    innerRadius={15}
                    outerRadius={24}
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={false} // 隱藏預設的長引線
                    label={({ cx, cy, midAngle, outerRadius, name }) => {
                      if (name === 'Empty') return null; // 空資料時不顯示文字
                      
                      // 計算文字在外側的位置 (外半徑 + 12px)
                      const radius = outerRadius + 12;
                      const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                      const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                      
                      return (
                        <text 
                          x={x} 
                          y={y} 
                          fill="#64748b" 
                          textAnchor={x > cx ? 'start' : 'end'} // 自動根據左右側對齊
                          dominantBaseline="central" 
                          fontSize={11} 
                          fontWeight="bold"
                        >
                          {name}
                        </text>
                      );
                    }}
                  >
                    {(costByCategory.length > 0 ? costByCategory : [{ color: '#f3f4f6' }]).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value.toLocaleString()} ${trip?.currency || ''}`, '總計']}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Timeline Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="text-sm font-bold text-[oklch(0.55_0.03_220)] uppercase tracking-widest mb-1">
                  {days[selectedDay - 1]?.label}
                </div>
                <h2 className="text-3xl font-black text-[oklch(0.22_0.08_220)]">
                  {days[selectedDay - 1] ? format(days[selectedDay - 1].date, "M月d日", { locale: zhTW }) : ""}
                  <span className="ml-3 text-xl font-bold text-[oklch(0.45_0.05_220)]">
                    {days[selectedDay - 1]?.weekday}
                  </span>
                </h2>
              </div>
              {/* 修改處：將原本的一個按鈕改為 flex-col 容器，並加入備案按鈕 */}
              <div className="hidden lg:flex flex-col gap-2">
                <Button 
                  variant="outline"
                  onClick={() => toast.info("備案功能開發中...")} // 先暫時不實作功能
                  className="rounded-full border-[oklch(0.22_0.08_220)] text-[oklch(0.22_0.08_220)] hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4 mr-2" /> 新增備案
                </Button>
                <Button 
                  onClick={openAddActivity}
                  className="rounded-full bg-[oklch(0.22_0.08_220)] hover:bg-[oklch(0.35_0.06_220)] px-6"
                >
                  <Plus className="w-4 h-4 mr-2" /> 新增活動
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-3xl" />)}
              </div>
            ) : currentDayActivities.length === 0 ? (
              <DayEmptyState onAdd={openAddActivity} />
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-[oklch(0.88_0.008_220)]" />

                <div className="space-y-3">
                  {sortedItems.map((item, index) => (
                    <div key={item.id}>
                      <ActivityCard
                        activity={item}
                        index={index}
                        isFirst={index === 0}
                        isLast={index === sortedItems.length - 1}
                        currency={trip?.currency}
                        hasConflict={conflictingIds.has(item.id!)}
                        onEdit={() => openEditActivity(item)}
                        onDelete={() => setDeletingActivity(item)}
                        onMoveUp={() => handleMoveActivity(index, 'up')}
                        onMoveDown={() => handleMoveActivity(index, 'down')}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={openAddActivity}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[oklch(0.62_0.12_220)] text-white shadow-lg flex items-center justify-center active:scale-[0.9] transition-transform z-10"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* ===== Add/Edit Activity Dialog ===== */}
      <Dialog open={showAddActivity} onOpenChange={setShowAddActivity}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="font-['Playfair_Display'] text-xl text-[oklch(0.22_0.08_220)]">
              {editingActivity ? "編輯活動" : `新增活動 — Day ${selectedDay}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Category selector */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">活動類型</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(categoryConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setForm((prev) => ({ ...prev, category: key as Activity["category"] }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-150 ${
                        form.category === key
                          ? "bg-[oklch(0.22_0.08_220)] text-white shadow-md"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title">活動名稱 *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="例如：東京鐵塔、築地市場..."
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="time">開始時間</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="time"
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
                    className="pl-10 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duration">預計時長 (分鐘)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={form.duration}
                  onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))}
                  placeholder="60"
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>地點搜尋</Label>
              {/* 【修正】傳入 defaultValue */}
              <PlaceSearch 
                defaultValue={form.location}
                onPlaceSelect={(place) => {
                  setForm(prev => ({
                    ...prev,
                    location: place.name,
                    address: place.address || "",
                    lat: place.lat,
                    lng: place.lng
                  }));
                }}
              />
            </div>

            {(form.lat && form.lng) && (
              <div className="h-40 rounded-xl overflow-hidden border border-gray-200">
                <MapPreview lat={form.lat} lng={form.lng} title={form.location} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="cost">預估花費 ({trip?.currency})</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="cost"
                  type="number"
                  value={form.cost}
                  onChange={(e) => setForm((prev) => ({ ...prev, cost: e.target.value }))}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">備註</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="有什麼需要注意的地方嗎？"
                className="rounded-xl min-h-[100px] resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label>活動照片</Label>
              <CloudinaryImageUpload 
                images={form.images}
                onChange={(images) => setForm(prev => ({ ...prev, images }))}
                maxImages={5}
              />
            </div>

            <div className="pt-2 flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowAddActivity(false)} 
                className="flex-1 rounded-xl h-12"
              >
                取消
              </Button>
              <Button 
                onClick={handleSaveActivity} 
                disabled={isSaving}
                className="flex-1 rounded-xl h-12 bg-[oklch(0.22_0.08_220)] hover:bg-[oklch(0.35_0.06_220)]"
              >
                {isSaving ? "儲存中..." : "儲存活動"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Share Dialog ===== */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-['Playfair_Display'] text-xl text-[oklch(0.22_0.08_220)]">
              分享行程
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            <p className="text-sm text-gray-500">
              輸入對方的註冊 Email，對方登入後就能在「分享行程」看到此行程。
            </p>
            
            <div className="flex gap-2">
              <Input
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="輸入 Email 地址"
                className="rounded-xl"
              />
              <Button 
                onClick={handleShareWithEmail}
                disabled={shareLoading || !shareEmail.trim()}
                className="rounded-xl bg-[oklch(0.62_0.12_220)] hover:bg-[oklch(0.55_0.14_145)]"
              >
                分享
              </Button>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-[oklch(0.45_0.05_220)] flex items-center gap-2">
                <Share2 className="w-3.5 h-3.5" /> 已分享對象
              </h4>
              <div className="space-y-2">
                {sharesLoading ? (
                  <Skeleton className="h-12 w-full rounded-xl" />
                ) : existingShares.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-4 text-center bg-gray-50 rounded-2xl">
                    尚未分享給任何人
                  </p>
                ) : (
                  existingShares.map((share) => (
                    <div key={share.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[oklch(0.62_0.12_220)] flex items-center justify-center text-white text-xs font-bold">
                          {share.sharedWith[0].toUpperCase()}
                        </div>
                        <span className="text-sm text-[oklch(0.22_0.08_220)]">{share.sharedWith}</span>
                      </div>
                      <button 
                        onClick={() => handleUnshare(share.sharedWith)}
                        className="text-xs text-red-500 font-bold hover:underline"
                      >
                        取消
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Delete Confirmation ===== */}
      <AlertDialog open={!!deletingActivity} onOpenChange={(open) => !open && setDeletingActivity(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除此活動嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作無法復原，該活動將從行程中永久移除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteActivity}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              刪除活動
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
