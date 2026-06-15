/**
 * TripDetail — Per-day itinerary management
 * Design: Coastal Morning — Timeline layout with day tabs
 * Desktop: Day selector sidebar + activity timeline
 * Mobile: Horizontal day tabs + scrollable timeline
 * Simplified: No drag-sort, basic activity list
 */

import { useState, useMemo } from "react";
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
  ChevronDown,
  ChevronUp,
  Download,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, addDays } from "date-fns";
import { zhTW } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { useAuth } from "@/contexts/AuthContext";
import { useActivities } from "@/hooks/useActivities";
import { useIsMobile } from "@/hooks/useMobile";
import { PlaceSearch } from "@/components/PlaceSearch";
import { MapPreview } from "@/components/MapPreview";
import {
  createActivity,
  updateActivity,
  deleteActivity,
  getTrip,
  type Trip,
  type Activity,
} from "@/lib/firebase";
import { useEffect } from "react";
import { useCallback } from "react";
import { exportTripToPdf } from "@/lib/exportPdf";
import { createShareLink, copyShareUrlToClipboard } from "@/lib/shareTrip";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663760105877/FKWg7QY89BMBENe4mCAPfG/logo-icon-nDuQzmKqhkrEYACEszfx6u.webp";

const categoryConfig = {
  attraction: { label: "景點", icon: Camera, color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  restaurant: { label: "餐廳", icon: Utensils, color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  hotel: { label: "住宿", icon: Hotel, color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  transport: { label: "交通", icon: Bus, color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  other: { label: "其他", icon: FileText, color: "bg-gray-100 text-gray-700", dot: "bg-gray-400" },
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
}

const defaultActivityForm: ActivityForm = {
  title: "",
  category: "attraction",
  time: "",
  location: "",
  address: "",
  notes: "",
  cost: "",
  duration: "",
  lat: undefined,
  lng: undefined,
};

const DayEmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="w-12 h-12 rounded-full bg-[oklch(0.88_0.008_220)] flex items-center justify-center mb-3">
      <Plus className="w-6 h-6 text-[oklch(0.62_0.12_220)]" />
    </div>
    <p className="text-sm text-[oklch(0.55_0.05_220)] mb-4">還沒有活動安排</p>
    <Button
      onClick={onAdd}
      size="sm"
      className="bg-[oklch(0.62_0.12_220)] hover:bg-[oklch(0.55_0.12_220)] text-white"
    >
      新增第一個活動
    </Button>
  </div>
);

export default function TripDetail() {
  const { tripId } = useParams<{ tripId: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [form, setForm] = useState<ActivityForm>(defaultActivityForm);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);

  const { activities, activitiesByDay, loading: activitiesLoading } = useActivities(tripId || null);

  // Load trip data
  useEffect(() => {
    if (!tripId || !user) return;

    const loadTrip = async () => {
      try {
        const tripData = await getTrip(tripId);
        if (tripData) {
          setTrip(tripData);
        } else {
          toast.error("行程不存在");
          navigate("/dashboard");
        }
      } catch (error) {
        toast.error("載入行程失敗");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadTrip();
  }, [tripId, user, navigate]);

  // Calculate days
  const days = useMemo(() => {
    if (!trip) return [];
    const startDate = parseISO(trip.startDate);
    const endDate = parseISO(trip.endDate);
    const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Array.from({ length: dayCount }, (_, i) => ({
      day: i + 1,
      date: addDays(startDate, i),
    }));
  }, [trip]);

  // Get activities for selected day
  const currentDayActivities = useMemo(() => {
    const dayActivities = activitiesByDay[selectedDay] || [];
    return dayActivities.sort((a, b) => {
      if (!a.time || !b.time) return 0;
      return a.time.localeCompare(b.time);
    });
  }, [activitiesByDay, selectedDay]);

  // Calculate costs
  const dayTotalCost = useMemo(() => {
    return currentDayActivities.reduce((sum, activity) => sum + (Number(activity.cost) || 0), 0);
  }, [currentDayActivities]);

  const totalCost = useMemo(() => {
    return activities.reduce((sum, activity) => sum + (Number(activity.cost) || 0), 0);
  }, [activities]);

  // Handlers
  const openAddActivity = useCallback(() => {
    setEditingActivity(null);
    setForm(defaultActivityForm);
    setShowAddActivity(true);
  }, []);

  const openEditActivity = useCallback((activity: Activity) => {
    setEditingActivity(activity);
    setForm({
      title: activity.title,
      category: activity.category,
      time: activity.time || "",
      location: activity.location || "",
      address: activity.address || "",
      notes: activity.notes || "",
      cost: activity.cost?.toString() || "",
      duration: activity.duration?.toString() || "",
      lat: activity.lat,
      lng: activity.lng,
    });
    setShowAddActivity(true);
  }, []);

  const handleSaveActivity = useCallback(async () => {
    if (!form.title.trim()) {
      toast.error("請輸入活動名稱");
      return;
    }

    if (!tripId) return;

    setIsSaving(true);
    try {
      if (!user) return;
      
      const dayDate = days[selectedDay - 1]?.date;
      const activityData = {
        tripId,
        userId: user.uid,
        title: form.title,
        category: form.category,
        time: form.time,
        location: form.location,
        address: form.address,
        notes: form.notes,
        cost: form.cost ? Number(form.cost) : 0,
        duration: form.duration ? Number(form.duration) : 0,
        lat: form.lat,
        lng: form.lng,
        day: selectedDay,
        date: dayDate ? dayDate.toISOString().split('T')[0] : '',
        order: currentDayActivities.length,
      };

      if (editingActivity) {
        if (!editingActivity.id) throw new Error("Activity ID is missing");
        await updateActivity(editingActivity.id, activityData);
        toast.success("活動已更新");
      } else {
        await createActivity(activityData);
        toast.success("活動已新延");
      }

      setShowAddActivity(false);
      setForm(defaultActivityForm);
      setEditingActivity(null);
    } catch (error) {
      toast.error(`保存失敗: ${error instanceof Error ? error.message : "未知錯誤"}`);
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }, [form, tripId, selectedDay, editingActivity]);

  const handleDeleteActivity = useCallback(async () => {
    if (!deletingActivity || !deletingActivity.id) return;

    try {
      await deleteActivity(deletingActivity.id);
      toast.success("活動已刪除");
      setDeletingActivity(null);
    } catch (error) {
      toast.error("刪除失敗");
      console.error(error);
    }
  }, [deletingActivity]);

  const handleExportPdf = useCallback(async () => {
    if (!trip) return;
    try {
      await exportTripToPdf(trip, activitiesByDay);
      toast.success("PDF 已下載");
    } catch (error) {
      toast.error("匯出失敗");
      console.error(error);
    }
  }, [trip, activitiesByDay]);

  const handleShareTrip = useCallback(async () => {
    if (!tripId || !user) return;
    try {
      const shareLink = await createShareLink(tripId, user.uid);
      await copyShareUrlToClipboard(shareLink.shareToken);
      toast.success("分享連結已複製到剪貼板");
    } catch (error) {
      toast.error("分享失敗");
      console.error(error);
    }
  }, [tripId, user]);

  if (loading || !trip) {
    return (
      <div className="min-h-screen bg-white p-4 lg:p-8">
        <Skeleton className="h-12 w-32 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-[oklch(0.94_0.008_220)] px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate("/dashboard")}
          className="p-2 hover:bg-[oklch(0.94_0.008_220)] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[oklch(0.22_0.08_220)]" />
        </button>
        <div className="flex-1 ml-3">
          <h1 className="font-['Playfair_Display'] text-lg font-bold text-[oklch(0.22_0.08_220)]">
            {trip.destination}
          </h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportPdf}>
              <Download className="w-4 h-4 mr-2" />
              匯出 PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShareTrip}>
              <Share2 className="w-4 h-4 mr-2" />
              分享行程
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-80 border-r border-[oklch(0.94_0.008_220)] bg-[oklch(0.98_0.001_286)]">
        {/* Header */}
        <div className="p-6 border-b border-[oklch(0.94_0.008_220)]">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-[oklch(0.62_0.12_220)] hover:text-[oklch(0.55_0.12_220)] mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">返回</span>
          </button>
          <h1 className="font-['Playfair_Display'] text-2xl font-bold text-[oklch(0.22_0.08_220)] mb-1">
            {trip.destination}
          </h1>
          <p className="text-xs text-[oklch(0.55_0.05_220)] font-['DM_Mono']">
            {format(parseISO(trip.startDate), "M月d日", { locale: zhTW })} —{" "}
            {format(parseISO(trip.endDate), "M月d日", { locale: zhTW })}
          </p>
        </div>

        {/* Day selector */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {days.map((day) => (
            <button
              key={day.day}
              onClick={() => setSelectedDay(day.day)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-150 ${
                selectedDay === day.day
                  ? "bg-[oklch(0.62_0.12_220)] text-white"
                  : "hover:bg-[oklch(0.94_0.008_220)] text-[oklch(0.22_0.08_220)]"
              }`}
            >
              <p className="text-xs font-['DM_Mono'] opacity-75 mb-1">Day {day.day}</p>
              <p className="text-sm font-medium">
                {format(day.date, "M月d日 EEEE", { locale: zhTW })}
              </p>
            </button>
          ))}
        </div>

        {/* Stats */}
        {currentDayActivities.length > 0 && (
          <div className="p-4 border-t border-[oklch(0.94_0.008_220)] space-y-3">
            <div>
              <p className="text-xs text-[oklch(0.55_0.05_220)] uppercase tracking-widest font-['DM_Mono'] mb-2">
                當日活動
              </p>
              <p className="text-lg font-bold text-[oklch(0.22_0.08_220)]">
                {currentDayActivities.length} 個
              </p>
            </div>

            {dayTotalCost > 0 && (
              <div>
                <p className="text-xs text-[oklch(0.55_0.05_220)] uppercase tracking-widest font-['DM_Mono'] mb-2">
                  當日費用
                </p>
                <p className="text-lg font-bold text-[oklch(0.62_0.12_220)] font-['DM_Mono']">
                  {dayTotalCost.toLocaleString()} {trip.currency || "TWD"}
                </p>
              </div>
            )}

            {totalCost > 0 && (
              <div>
                <p className="text-xs text-[oklch(0.55_0.05_220)] uppercase tracking-widest font-['DM_Mono'] mb-2">
                  總計費用
                </p>
                <p className="text-lg font-bold text-[oklch(0.62_0.12_220)] font-['DM_Mono']">
                  {totalCost.toLocaleString()} {trip.currency || "TWD"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="p-4 border-t border-[oklch(0.94_0.008_220)] space-y-2">
          <Button
            onClick={handleExportPdf}
            variant="outline"
            className="w-full border-[oklch(0.88_0.008_220)] gap-2"
            size="sm"
          >
            <Download className="w-4 h-4" />
            匯出 PDF
          </Button>
          <Button
            onClick={handleShareTrip}
            className="w-full bg-[oklch(0.62_0.12_220)] hover:bg-[oklch(0.55_0.12_220)] text-white gap-2"
            size="sm"
          >
            <Share2 className="w-4 h-4" />
            分享行程
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8">
        {/* Day header (mobile) */}
        <div className="lg:hidden mb-4">
          {days[selectedDay - 1] && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[oklch(0.55_0.05_220)] font-['DM_Mono'] uppercase tracking-widest">
                  Day {selectedDay}
                </p>
                <h2 className="font-['Playfair_Display'] text-xl font-bold text-[oklch(0.22_0.08_220)]">
                  {format(days[selectedDay - 1].date, "M月d日 EEEE", { locale: zhTW })}
                </h2>
              </div>
              {currentDayActivities.length > 0 && dayTotalCost > 0 && (
                <div className="text-right">
                  <p className="text-xs text-[oklch(0.55_0.05_220)]">當日費用</p>
                  <p className="font-['DM_Mono'] font-bold text-[oklch(0.62_0.12_220)]">
                    {dayTotalCost.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add activity button */}
        <Button
          onClick={openAddActivity}
          className="w-full mb-6 h-11 border-2 border-dashed border-[oklch(0.82_0.06_220)] bg-transparent hover:bg-[oklch(0.62_0.12_220)]/5 text-[oklch(0.62_0.12_220)] hover:text-[oklch(0.55_0.12_220)] gap-2 transition-all duration-150"
          variant="outline"
        >
          <Plus className="w-4 h-4" />
          新增活動
        </Button>

        {/* Activity list */}
        {activitiesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : currentDayActivities.length === 0 ? (
          <DayEmptyState onAdd={openAddActivity} />
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {currentDayActivities.map((activity) => {
                const config = categoryConfig[activity.category];
                const Icon = config.icon;
                const isExpanded = expandedActivityId === activity.id;

                return (
                  <motion.div
                    key={activity.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="border border-[oklch(0.94_0.008_220)] rounded-xl overflow-hidden hover:border-[oklch(0.82_0.06_220)] transition-all duration-150"
                  >
                    {/* Activity card header */}
                    <button
                      onClick={() =>
                        setExpandedActivityId(isExpanded ? null : (activity.id || null))
                      }
                      className="w-full p-4 flex items-start gap-3 hover:bg-[oklch(0.98_0.001_286)] transition-colors text-left"
                    >
                      <div className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[oklch(0.22_0.08_220)] truncate">
                          {activity.title}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-[oklch(0.55_0.05_220)]">
                          {activity.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {activity.time}
                            </span>
                          )}
                          {activity.cost && (
                            <span className="flex items-center gap-1 font-['DM_Mono']">
                              <DollarSign className="w-3 h-3" />
                              {activity.cost}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[oklch(0.55_0.05_220)]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[oklch(0.55_0.05_220)]" />
                        )}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="border-t border-[oklch(0.94_0.008_220)] p-4 bg-[oklch(0.98_0.001_286)] space-y-3">
                        {activity.address && (
                          <div>
                            <p className="text-xs text-[oklch(0.55_0.05_220)] mb-1">地址</p>
                            <p className="text-sm text-[oklch(0.22_0.08_220)]">{activity.address}</p>
                          </div>
                        )}

                        {activity.duration && (
                          <div>
                            <p className="text-xs text-[oklch(0.55_0.05_220)] mb-1">時長</p>
                            <p className="text-sm text-[oklch(0.22_0.08_220)]">{activity.duration} 分鐘</p>
                          </div>
                        )}

                        {activity.notes && (
                          <div>
                            <p className="text-xs text-[oklch(0.55_0.05_220)] mb-1">備註</p>
                            <p className="text-sm text-[oklch(0.22_0.08_220)]">{activity.notes}</p>
                          </div>
                        )}

                        {activity.lat && activity.lng && (
                          <MapPreview lat={activity.lat} lng={activity.lng} />
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => openEditActivity(activity)}
                            size="sm"
                            variant="outline"
                            className="flex-1 border-[oklch(0.88_0.008_220)] gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            編輯
                          </Button>
                          <Button
                            onClick={() => setDeletingActivity(activity)}
                            size="sm"
                            variant="outline"
                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            刪除
                          </Button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </main>

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
                          ? config.color + " font-medium"
                          : "bg-[oklch(0.94_0.008_220)] text-[oklch(0.52_0.05_220)] hover:bg-[oklch(0.90_0.008_220)]"
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
              <Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">活動名稱 *</Label>
              <Input
                placeholder="例：淺草寺參拜"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="border-[oklch(0.88_0.008_220)] focus:border-[oklch(0.62_0.12_220)] h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">時間</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.65_0.06_220)]" />
                  <Input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
                    className="pl-10 border-[oklch(0.88_0.008_220)] focus:border-[oklch(0.62_0.12_220)] h-11"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">時長（分鐘）</Label>
                <Input
                  type="number"
                  placeholder="60"
                  value={form.duration}
                  onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))}
                  className="border-[oklch(0.88_0.008_220)] focus:border-[oklch(0.62_0.12_220)] h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">地點搜尋</Label>
              <PlaceSearch
                value={form.location}
                onSelect={(place) =>
                  setForm((prev) => ({
                    ...prev,
                    location: place.name,
                    address: place.formattedAddress,
                    lat: place.lat,
                    lng: place.lng,
                  }))
                }
                placeholder="搜尋景點、餐廳..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">地址</Label>
              <Input
                placeholder="例：東京都台東區淺草2-3-1"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                className="border-[oklch(0.88_0.008_220)] focus:border-[oklch(0.62_0.12_220)] h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">費用</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.65_0.06_220)]" />
                <Input
                  type="number"
                  placeholder="0"
                  value={form.cost}
                  onChange={(e) => setForm((prev) => ({ ...prev, cost: e.target.value }))}
                  className="pl-10 border-[oklch(0.88_0.008_220)] focus:border-[oklch(0.62_0.12_220)] h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">備註</Label>
              <Textarea
                placeholder="注意事項、預訂資訊..."
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="border-[oklch(0.88_0.008_220)] focus:border-[oklch(0.62_0.12_220)] resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowAddActivity(false)}
                className="flex-1 border-[oklch(0.88_0.008_220)]"
              >
                取消
              </Button>
              <Button
                onClick={handleSaveActivity}
                disabled={isSaving}
                className="flex-1 bg-[oklch(0.62_0.12_220)] hover:bg-[oklch(0.55_0.12_220)] text-white active:scale-[0.97]"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : editingActivity ? "儲存變更" : "新增活動"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deletingActivity} onOpenChange={() => setDeletingActivity(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除「{deletingActivity?.title}」嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteActivity}
              className="bg-red-600 hover:bg-red-700"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
