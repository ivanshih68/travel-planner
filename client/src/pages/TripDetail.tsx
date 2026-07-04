/**
 * TripDetail — Per-day itinerary management
 */

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudSnow,
  Wind,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO, addDays, differenceInDays } from "date-fns";
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

// --- Helper Components ---

function WeatherIcon({ main, className }: { main: string; className?: string }) {
  switch (main?.toUpperCase()) {
    case 'CLEAR': return <Sun className={className} />;
    case 'CLOUDS': return <Cloud className={className} />;
    case 'RAIN': return <CloudRain className={className} />;
    case 'THUNDERSTORM': return <CloudLightning className={className} />;
    case 'SNOW': return <CloudSnow className={className} />;
    default: return <Wind className={className} />;
  }
}

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

            {activity.notes && (
              <div className="space-y-3">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">備註</div>
                <div className="bg-[oklch(0.98_0.005_220)] p-5 rounded-2xl border border-[oklch(0.95_0.005_220)] italic text-[oklch(0.35_0.06_220)] whitespace-pre-wrap leading-relaxed">
                  "{activity.notes}"
                </div>
              </div>
            )}

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
    <div className="group relative flex gap-4 items-start w-full min-w-0">
      <div className="w-12 pt-1 flex flex-col items-center">
        <span className="text-xs font-bold text-[oklch(0.45_0.05_220)]">
          {activity.time || "--:--"}
        </span>
        <div className={`mt-2 w-2.5 h-2.5 rounded-full border-2 border-white ring-2 ring-offset-1 ${config.dot}`} />
      </div>

      <div 
        onClick={() => setShowDetail(true)}
        className="flex-1 min-w-0 bg-white rounded-2xl p-4 shadow-sm border border-[oklch(0.92_0.01_220)] hover:shadow-md transition-shadow flex gap-4 cursor-pointer"
      >
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${config.color}`}>
                {config.label}
              </span>
              {hasConflict && (
                <div className="flex items-center gap-1 text-[oklch(0.65_0.18_35)] bg-orange-50 px-2 py-0.5 rounded-full flex-shrink-0">
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

          <h3 className="text-base font-bold text-[oklch(0.22_0.08_220)] mb-1 truncate">{activity.title}</h3>
          
          <div className="space-y-1.5">
            {activity.location && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 w-full overflow-hidden">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate block flex-1 min-w-0" style={{ maxWidth: 'calc(100% - 20px)' }}>
                  {activity.location}
                </span>
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

        <div className="flex flex-col justify-center gap-1 border-l pl-4 border-[oklch(0.95_0.005_220)] flex-shrink-0 w-10">
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

// --- Main Page Component ---

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
  const [weather, setWeather] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // 1. Load trip data first
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

  // 2. Generate days based on trip
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

  // 3. Load weather data (depends on days)
  useEffect(() => {
    if (!trip?.destination || !days[selectedDay - 1]) return;
    
    const dateStr = format(days[selectedDay - 1].date, "yyyy-MM-dd");
    setWeatherLoading(true);
    
    fetch(`${import.meta.env.VITE_API_URL || ""}/api/weather?destination=${encodeURIComponent(trip.destination)}&date=${dateStr}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) setWeather(null);
        else setWeather(data);
      })
      .catch(() => setWeather(null))
      .finally(() => setWeatherLoading(false));
  }, [trip?.destination, selectedDay, days]);

  const currentDayActivities = useMemo(
    () => activitiesByDay[selectedDay] || [],
    [activitiesByDay, selectedDay]
  );

  const sortedItems = useMemo(() => {
    return [...currentDayActivities].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [currentDayActivities]);

  const totalCost = activities.reduce((sum, a) => sum + Number(a.cost || 0), 0);
  const dayTotalCost = currentDayActivities.reduce((sum, a) => sum + Number(a.cost || 0), 0);

  const costByCategory = useMemo(() => {
    const stats: Record<string, number> = {};
    activities.forEach(a => {
      stats[a.category] = (stats[a.category] || 0) + Number(a.cost || 0);
    });

    // Define explicit colors for the chart to match the category theme
    const categoryColors: Record<string, string> = {
      ATTRACTION: "#3b82f6", // blue-500
      RESTAURANT: "#f97316", // orange-500
      HOTEL: "#a855f7",      // purple-500
      TRANSPORT: "#22c55e",   // green-500
      OTHER: "#94a3b8",      // gray-400
    };

    return Object.entries(stats).map(([cat, val]) => ({
      name: categoryConfig[cat]?.label || cat,
      value: val,
      color: categoryColors[cat] || "#94a3b8"
    })).filter(s => s.value > 0);
  }, [activities, activitiesByDay]);

  const handleMoveActivity = async (index: number, direction: 'up' | 'down') => {
    if (!tripId) return;
    const newItems = [...sortedItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    const orders = newItems.map((item, idx) => ({
      id: item.id!,
      sortOrder: idx
    }));

    try {
      await reorderActivities(orders);
      toast.success("順序已更新");
    } catch (err) {
      toast.error("更新順序失敗");
    }
  };

  const conflictingIds = useMemo(() => {
    const ids = new Set<string>();
    const times: Record<string, string[]> = {};
    activities.forEach(a => {
      if (a.time) {
        if (!times[a.time]) times[a.time] = [];
        times[a.time].push(a.id!);
      }
    });
    Object.values(times).forEach(group => {
      if (group.length > 1) group.forEach(id => ids.add(id));
    });
    return ids;
  }, [activities]);

  const openAddActivity = () => {
    setEditingActivity(null);
    setForm({ ...defaultActivityForm, time: "10:00" });
    setShowAddActivity(true);
  };

  const handleCreateActivity = async () => {
    if (!tripId || !form.title) return;
    setIsSaving(true);
    try {
      await createActivity({
        ...form,
        day: selectedDay,
        cost: Number(form.cost) || 0,
        duration: Number(form.duration) || 0,
        sortOrder: sortedItems.length
      });
      setShowAddActivity(false);
      toast.success("活動已新增");
    } catch (err) {
      toast.error("新增失敗");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateActivity = async () => {
    if (!editingActivity || !form.title) return;
    setIsSaving(true);
    try {
      await updateActivity(editingActivity.id!, {
        ...form,
        cost: Number(form.cost) || 0,
        duration: Number(form.duration) || 0,
      });
      setShowAddActivity(false);
      toast.success("活動已更新");
    } catch (err) {
      toast.error("更新失敗");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteActivity = async () => {
    if (!deletingActivity) return;
    try {
      await deleteActivity(deletingActivity.id!);
      setDeletingActivity(null);
      toast.success("活動已刪除");
    } catch (err) {
      toast.error("刪除失敗");
    }
  };

  const handleExportPdf = async () => {
    if (!trip) return;
    setIsExporting(true);
    try {
      await exportTripToPdf(trip, activities);
      toast.success("PDF 匯出成功");
    } catch (err) {
      toast.error("匯出失敗");
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareTrip = async () => {
    setShowShareDialog(true);
    setSharesLoading(true);
    try {
      const { data } = await tripSharingApi.list(tripId!);
      setExistingShares(data.shares);
    } catch (err) {
      console.error(err);
    } finally {
      setSharesLoading(false);
    }
  };

  const handleCreateShare = async () => {
    if (!shareEmail) return;
    setShareLoading(true);
    try {
      await tripSharingApi.create(tripId!, shareEmail);
      setShareEmail("");
      const { data } = await tripSharingApi.list(tripId!);
      setExistingShares(data.shares);
      toast.success("分享成功");
    } catch (err) {
      toast.error("分享失敗");
    } finally {
      setShareLoading(false);
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
          <Button onClick={() => setLocation("/dashboard")} className="rounded-full w-full">回到儀表板</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[oklch(0.97_0.015_80)] lg:flex">
      <aside className="hidden lg:flex w-80 flex-col bg-white border-r border-[oklch(0.92_0.01_220)] h-screen sticky top-0">
        <div className="p-6 border-b border-[oklch(0.95_0.005_220)]">
          <button onClick={() => setLocation("/dashboard")} className="flex items-center gap-2 text-[oklch(0.45_0.05_220)] hover:text-[oklch(0.22_0.08_220)] transition-colors mb-6 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold">返回儀表板</span>
          </button>
          <div className="flex items-center gap-3 mb-1">
            <img src={LOGO_URL} alt="Logo" className="w-6 h-6" />
            <h1 className="text-2xl font-['Playfair_Display'] font-black text-[oklch(0.22_0.08_220)] truncate">{trip.title}</h1>
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
            <button key={d.day} onClick={() => setSelectedDay(d.day)} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-200 ${selectedDay === d.day ? "bg-[oklch(0.22_0.08_220)] text-white shadow-md scale-[1.02]" : "hover:bg-[oklch(0.95_0.005_220)] text-[oklch(0.35_0.06_220)]"}`}>
              <div className="text-left">
                <div className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${selectedDay === d.day ? "text-white/60" : "text-[oklch(0.55_0.03_220)]"}`}>{d.label}</div>
                <div className="font-bold">{d.dateStr} {d.weekday}</div>
              </div>
              <div className={`text-xs font-bold px-2 py-1 rounded-lg ${selectedDay === d.day ? "bg-white/20" : "bg-gray-100"}`}>{activitiesByDay[d.day]?.length || 0}</div>
            </button>
          ))}
        </div>
        <div className="p-6 bg-[oklch(0.98_0.005_220)] border-t border-[oklch(0.95_0.005_220)]">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-bold text-[oklch(0.45_0.05_220)]">預算概況</span>
            <span className="text-xs font-bold text-[oklch(0.45_0.05_220)]">{totalCost.toLocaleString()} / {trip.budget?.toLocaleString() || 0} {trip.currency}</span>
          </div>
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-6">
            <div className="h-full bg-[oklch(0.62_0.12_220)] transition-all duration-500" style={{ width: `${Math.min(100, (totalCost / (trip.budget || 1)) * 100)}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={handleExportPdf} disabled={isExporting} variant="outline" className="rounded-xl h-10 border-[oklch(0.9_0.02_220)] text-[oklch(0.35_0.06_220)] hover:bg-gray-50"><Download className="w-4 h-4 mr-2" /> 匯出</Button>
            <Button onClick={handleShareTrip} variant="outline" className="rounded-xl h-10 border-[oklch(0.9_0.02_220)] text-[oklch(0.35_0.06_220)] hover:bg-gray-50"><Share2 className="w-4 h-4 mr-2" /> 分享</Button>
          </div>
        </div>
      </aside>

      <header className="lg:hidden bg-white border-b border-[oklch(0.92_0.01_220)] sticky top-0 z-20">
        <div className="p-4 flex items-center justify-between">
          <button onClick={() => setLocation("/dashboard")} className="p-2 -ml-2"><ArrowLeft className="w-5 h-5 text-[oklch(0.22_0.08_220)]" /></button>
          <div className="text-center flex-1 px-4">
            <h1 className="text-lg font-black text-[oklch(0.22_0.08_220)] truncate">{trip.title}</h1>
            <p className="text-[10px] font-bold text-[oklch(0.55_0.03_220)] uppercase tracking-widest">{trip.destination} • {days.length} 天</p>
          </div>
          <button onClick={handleShareTrip} className="p-2"><Share2 className="w-5 h-5 text-[oklch(0.22_0.08_220)]" /></button>
        </div>
        <div className="flex overflow-x-auto px-4 pb-3 no-scrollbar gap-2">
          {days.map((d) => (
            <button key={d.day} onClick={() => setSelectedDay(d.day)} className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${selectedDay === d.day ? "bg-[oklch(0.22_0.08_220)] text-white shadow-md scale-105" : "bg-[oklch(0.95_0.005_220)] text-[oklch(0.35_0.06_220)]"}`}>
              <span className={`text-[10px] font-bold uppercase mb-0.5 ${selectedDay === d.day ? "text-white/60" : "text-[oklch(0.55_0.03_220)]"}`}>Day {d.day}</span>
              <span className="text-sm font-bold">{d.dateStr}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:h-screen lg:overflow-hidden">
        <div className="hidden lg:grid grid-cols-3 gap-6 p-8 bg-[oklch(0.98_0.005_220)] border-b border-[oklch(0.95_0.005_220)]">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-[oklch(0.92_0.01_220)]">
            <div className="text-xs font-bold text-[oklch(0.55_0.03_220)] uppercase tracking-widest mb-1">今日預算</div>
            <div className="text-2xl font-black text-[oklch(0.22_0.08_220)]">{dayTotalCost.toLocaleString()} <span className="text-sm font-bold text-gray-400">{trip.currency}</span></div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-[oklch(0.92_0.01_220)]">
            <div className="text-xs font-bold text-[oklch(0.55_0.03_220)] uppercase tracking-widest mb-1">今日活動</div>
            <div className="text-2xl font-black text-[oklch(0.22_0.08_220)]">{currentDayActivities.length} <span className="text-sm font-bold text-gray-400">個項目</span></div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-[oklch(0.92_0.01_220)] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[oklch(0.55_0.03_220)] uppercase tracking-widest mb-1">預算分佈</div>
              <div className="text-xs text-gray-400 font-medium">依類別統計</div>
            </div>
            <div className="h-20 w-36 -mr-4"> 
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={costByCategory.length > 0 ? costByCategory : [{ name: 'Empty', value: 1, color: '#f3f4f6' }]} innerRadius={15} outerRadius={24} paddingAngle={2} dataKey="value" labelLine={false} label={({ cx, cy, midAngle, outerRadius, name }) => { if (name === 'Empty') return null; const radius = outerRadius + 12; const x = cx + radius * Math.cos(-midAngle * Math.PI / 180); const y = cy + radius * Math.sin(-midAngle * Math.PI / 180); return <text x={x} y={y} fill="#64748b" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight="bold">{name}</text>; }}>
                    {(costByCategory.length > 0 ? costByCategory : [{ color: '#f3f4f6' }]).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value.toLocaleString()} ${trip?.currency || ''}`, '總計']} contentStyle={{ borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="text-sm font-bold text-[oklch(0.55_0.03_220)] uppercase tracking-widest mb-1">{days[selectedDay - 1]?.label}</div>
                <h2 className="text-3xl font-black text-[oklch(0.22_0.08_220)] flex items-center gap-4 flex-wrap">
                  <span>
                    {days[selectedDay - 1] ? format(days[selectedDay - 1].date, "M月d日", { locale: zhTW }) : ""}
                    <span className="ml-3 text-xl font-bold text-[oklch(0.45_0.05_220)]">{days[selectedDay - 1]?.weekday}</span>
                  </span>
                  {weather && (
                    <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-2xl border border-white/50 shadow-sm animate-in fade-in slide-in-from-left-2">
                      <WeatherIcon main={weather.main} className="w-6 h-6 text-[oklch(0.62_0.12_220)]" />
                      <div className="flex flex-col leading-none">
                        <span className="text-sm font-black text-[oklch(0.22_0.08_220)]">{weather.temp}°C</span>
                        <span className="text-[10px] font-bold text-blue-500">{Math.round(weather.pop * 100)}% 降雨</span>
                      </div>
                    </div>
                  )}
                  {weatherLoading && <Skeleton className="h-10 w-24 rounded-2xl" />}
                </h2>
              </div>
              <div className="hidden lg:flex flex-col gap-2">
                <Button variant="outline" onClick={() => toast.info("備案功能開發中...")} className="rounded-full border-[oklch(0.22_0.08_220)] text-[oklch(0.22_0.08_220)] hover:bg-gray-50"><Plus className="w-4 h-4 mr-2" /> 新增備案</Button>
                <Button onClick={openAddActivity} className="rounded-full bg-[oklch(0.22_0.08_220)] hover:bg-[oklch(0.35_0.06_220)] px-6"><Plus className="w-4 h-4 mr-2" /> 新增活動</Button>
              </div>
            </div>

            <div className="space-y-6 relative before:absolute before:left-[23px] before:top-2 before:bottom-2 before:w-0.5 before:bg-[oklch(0.92_0.01_220)] before:rounded-full">
              {sortedItems.length > 0 ? sortedItems.map((activity, idx) => (
                <ActivityCard key={activity.id} activity={activity} index={idx} isFirst={idx === 0} isLast={idx === sortedItems.length - 1} currency={trip.currency} hasConflict={conflictingIds.has(activity.id!)} onEdit={() => { setEditingActivity(activity); setForm({ title: activity.title, category: activity.category, time: activity.time || "", location: activity.location || "", address: activity.address || "", notes: activity.notes || "", cost: activity.cost?.toString() || "", duration: activity.duration?.toString() || "", lat: (activity as any).lat, lng: (activity as any).lng, images: activity.images || [] }); setShowAddActivity(true); }} onDelete={() => setDeletingActivity(activity)} onMoveUp={() => handleMoveActivity(idx, 'up')} onMoveDown={() => handleMoveActivity(idx, 'down')} />
              )) : <DayEmptyState onAdd={openAddActivity} />}
            </div>
          </div>
        </main>

        <div className="lg:hidden fixed bottom-6 right-6 z-30">
          <Button onClick={openAddActivity} className="w-14 h-14 rounded-full bg-[oklch(0.22_0.08_220)] hover:bg-[oklch(0.35_0.06_220)] shadow-2xl flex items-center justify-center p-0"><Plus className="w-6 h-6 text-white" /></Button>
        </div>
      </div>

      <Dialog open={showAddActivity} onOpenChange={setShowAddActivity}>
        <DialogContent className="bg-white sm:max-w-lg rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 pb-0"><DialogTitle className="text-2xl font-black text-[oklch(0.22_0.08_220)]">{editingActivity ? "編輯活動" : "新增活動"}</DialogTitle></DialogHeader>
          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-1.5"><Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">活動名稱</Label><Input placeholder="要去哪裡？" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-12 rounded-xl border-[oklch(0.88_0.008_220)] focus:border-[oklch(0.62_0.12_220)]" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">類別</Label><Select value={form.category} onValueChange={(val: any) => setForm({ ...form, category: val })}><SelectTrigger className="h-12 rounded-xl border-[oklch(0.88_0.008_220)]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(categoryConfig).map(([key, cfg]) => <SelectItem key={key} value={key}>{cfg.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">時間</Label><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="h-12 rounded-xl border-[oklch(0.88_0.008_220)]" /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">地點搜尋</Label><PlaceSearch onSelect={(place) => setForm({ ...form, location: place.name, address: place.address, lat: place.lat, lng: place.lng })} placeholder="搜尋 Google 地點..." initialValue={form.location} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">預計時長 (分鐘)</Label><Input type="number" placeholder="60" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="h-12 rounded-xl border-[oklch(0.88_0.008_220)]" /></div>
              <div className="space-y-1.5"><Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">預估花費 ({trip.currency})</Label><Input type="number" placeholder="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="h-12 rounded-xl border-[oklch(0.88_0.008_220)]" /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">照片</Label><CloudinaryImageUpload images={form.images} onChange={(images) => setForm({ ...form, images })} /></div>
            <div className="space-y-1.5"><Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">備註</Label><Textarea placeholder="有什麼要注意的嗎？" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl border-[oklch(0.88_0.008_220)]" rows={3} /></div>
          </div>
          <div className="p-8 pt-0 flex gap-3"><Button variant="outline" onClick={() => setShowAddActivity(false)} className="flex-1 h-12 rounded-xl border-[oklch(0.88_0.008_220)]">取消</Button><Button onClick={editingActivity ? handleUpdateActivity : handleCreateActivity} disabled={isSaving || !form.title} className="flex-1 h-12 rounded-xl bg-[oklch(0.22_0.08_220)] hover:bg-[oklch(0.35_0.06_220)] text-white">{isSaving ? "儲存中..." : (editingActivity ? "更新活動" : "新增活動")}</Button></div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingActivity} onOpenChange={() => setDeletingActivity(null)}><AlertDialogContent className="rounded-[32px] bg-white border-none p-8"><AlertDialogHeader><AlertDialogTitle className="text-2xl font-black text-[oklch(0.22_0.08_220)]">確定要刪除？</AlertDialogTitle><AlertDialogDescription className="text-gray-500">「{deletingActivity?.title}」將被永久移除。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="mt-6 gap-3"><AlertDialogCancel className="flex-1 h-12 rounded-xl border-[oklch(0.88_0.008_220)]">取消</AlertDialogCancel><AlertDialogAction onClick={handleDeleteActivity} className="flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white border-none">確定刪除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
