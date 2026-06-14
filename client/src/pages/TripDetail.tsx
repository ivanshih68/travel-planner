/**
 * TripDetail — Per-day itinerary management
 * Design: Coastal Morning — Timeline layout with day tabs
 * Desktop: Day selector sidebar + activity timeline
 * Mobile: Horizontal day tabs + scrollable timeline
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
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, addDays } from "date-fns";
import { zhTW } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { useAuth } from "@/contexts/AuthContext";
import { useActivities } from "@/hooks/useActivities";
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

export default function TripDetail() {
  const params = useParams<{ id: string }>();
  const tripId = params.id;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { activities, activitiesByDay, loading } = useActivities(tripId);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [tripLoading, setTripLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);
  const [form, setForm] = useState<ActivityForm>(defaultActivityForm);
  const [isSaving, setIsSaving] = useState(false);

  // Load trip data
  useEffect(() => {
    if (!tripId) return;
    setTripLoading(true);
    getTrip(tripId).then((t) => {
      setTrip(t);
      setTripLoading(false);
    });
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

  const currentDayActivities = activitiesByDay[selectedDay] || [];

  const totalCost = activities.reduce((sum, a) => sum + (a.cost || 0), 0);
  const dayTotalCost = currentDayActivities.reduce((sum, a) => sum + (a.cost || 0), 0);

  const openAddActivity = () => {
    setEditingActivity(null);
    setForm(defaultActivityForm);
    setShowAddActivity(true);
  };

  const openEditActivity = (activity: Activity) => {
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
      };

      if (editingActivity?.id) {
        await updateActivity(editingActivity.id, activityData);
        toast.success("活動已更新");
      } else {
        await createActivity({
          ...activityData,
          tripId,
          userId: user.uid,
          day: selectedDay,
          date: days[selectedDay - 1]?.date
            ? format(days[selectedDay - 1].date, "yyyy-MM-dd")
            : "",
          order: currentDayActivities.length,
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
      <div className="min-h-screen bg-[oklch(0.97_0.015_80)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[oklch(0.52_0.05_220)] mb-4">找不到此行程</p>
          <Button onClick={() => setLocation("/dashboard")}>返回行程列表</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[oklch(0.97_0.015_80)] flex flex-col">
      {/* ===== Header ===== */}
      <header className="bg-[oklch(0.22_0.08_220)] text-white sticky top-0 z-20">
        <div className="px-4 lg:px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => setLocation("/dashboard")}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors active:scale-[0.9]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img src={LOGO_URL} alt="Voyager" className="w-6 h-6 brightness-0 invert hidden sm:block" />
            <div className="min-w-0">
              <h1 className="font-['Playfair_Display'] text-lg font-bold truncate">{trip.title}</h1>
              <div className="flex items-center gap-2 text-white/60 text-xs">
                <MapPin className="w-3 h-3" />
                <span>{trip.destination}</span>
                <span>·</span>
                <span className="font-['DM_Mono']">{days.length} 天</span>
              </div>
            </div>
          </div>

          {/* Trip stats */}
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <div className="text-right">
              <p className="text-white/50 text-xs">活動數</p>
              <p className="font-['DM_Mono'] font-bold">{activities.length}</p>
            </div>
            {trip.budget && (
              <div className="text-right">
                <p className="text-white/50 text-xs">總預算</p>
                <p className="font-['DM_Mono'] font-bold">{trip.budget.toLocaleString()} {trip.currency}</p>
              </div>
            )}
          </div>
        </div>

        {/* Day tabs — horizontal scroll */}
        <div className="flex gap-1 px-4 lg:px-8 pb-3 overflow-x-auto scrollbar-hide">
          {days.map((day) => {
            const dayActivities = activitiesByDay[day.day] || [];
            return (
              <button
                key={day.day}
                onClick={() => setSelectedDay(day.day)}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl transition-all duration-150 min-w-[60px] ${
                  selectedDay === day.day
                    ? "bg-[oklch(0.62_0.12_220)] text-white"
                    : "hover:bg-white/10 text-white/60"
                }`}
              >
                <span className="text-xs font-['DM_Mono'] font-bold">{day.label}</span>
                <span className="text-xs mt-0.5">{day.dateStr}</span>
                {dayActivities.length > 0 && (
                  <div className="w-1 h-1 rounded-full bg-[oklch(0.72_0.14_35)] mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <div className="flex-1 flex">
        {/* Desktop: Day info sidebar */}
        <aside className="hidden lg:block w-72 bg-white border-r border-[oklch(0.92_0.008_220)] p-6">
          {days[selectedDay - 1] && (
            <div>
              <div className="mb-6">
                <p className="text-xs text-[oklch(0.55_0.05_220)] font-['DM_Mono'] uppercase tracking-widest mb-1">
                  Day {selectedDay}
                </p>
                <h2 className="font-['Playfair_Display'] text-2xl font-bold text-[oklch(0.22_0.08_220)]">
                  {format(days[selectedDay - 1].date, "M月d日", { locale: zhTW })}
                </h2>
                <p className="text-[oklch(0.55_0.05_220)] text-sm">
                  {format(days[selectedDay - 1].date, "EEEE", { locale: zhTW })}
                </p>
              </div>

              {/* Day stats */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between py-2 border-b border-[oklch(0.94_0.008_220)]">
                  <span className="text-sm text-[oklch(0.55_0.05_220)]">活動數量</span>
                  <span className="font-['DM_Mono'] font-bold text-[oklch(0.22_0.08_220)]">
                    {currentDayActivities.length}
                  </span>
                </div>
                {dayTotalCost > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-[oklch(0.94_0.008_220)]">
                    <span className="text-sm text-[oklch(0.55_0.05_220)]">當日費用</span>
                    <span className="font-['DM_Mono'] font-bold text-[oklch(0.22_0.08_220)]">
                      {dayTotalCost.toLocaleString()} {trip.currency || "TWD"}
                    </span>
                  </div>
                )}
                {totalCost > 0 && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-[oklch(0.55_0.05_220)]">總計費用</span>
                    <span className="font-['DM_Mono'] font-bold text-[oklch(0.62_0.12_220)]">
                      {totalCost.toLocaleString()} {trip.currency || "TWD"}
                    </span>
                  </div>
                )}
              </div>

              {/* Category breakdown */}
              <div>
                <p className="text-xs text-[oklch(0.55_0.05_220)] uppercase tracking-widest mb-3 font-['DM_Mono']">
                  活動分類
                </p>
                <div className="space-y-2">
                  {Object.entries(categoryConfig).map(([key, config]) => {
                    const count = currentDayActivities.filter((a) => a.category === key).length;
                    if (count === 0) return null;
                    const Icon = config.icon;
                    return (
                      <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">{config.label}</span>
                        <span className="ml-auto text-xs font-['DM_Mono'] font-bold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Activity timeline */}
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

          {/* Timeline */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : currentDayActivities.length === 0 ? (
            <DayEmptyState onAdd={openAddActivity} />
          ) : (
            <AnimatePresence>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-[oklch(0.88_0.008_220)]" />

                <div className="space-y-3">
                  {currentDayActivities.map((activity, index) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      index={index}
                      currency={trip.currency}
                      onEdit={() => openEditActivity(activity)}
                      onDelete={() => setDeletingActivity(activity)}
                    />
                  ))}
                </div>
              </div>
            </AnimatePresence>
          )}
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
                      onClick={() => setForm({ ...form, category: key as Activity["category"] })}
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
                onChange={(e) => setForm({ ...form, title: e.target.value })}
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
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  className="border-[oklch(0.88_0.008_220)] focus:border-[oklch(0.62_0.12_220)] h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">地點搜尋</Label>
              <PlaceSearch
                value={form.location}
                onSelect={(place) =>
                  setForm({
                    ...form,
                    location: place.name,
                    address: place.formattedAddress,
                    lat: place.lat,
                    lng: place.lng,
                  })
                }
                placeholder="搜尋景點、餐廳..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">地址</Label>
              <Input
                placeholder="例：東京都台東區淺草2-3-1"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  className="pl-10 border-[oklch(0.88_0.008_220)] focus:border-[oklch(0.62_0.12_220)] h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-[oklch(0.35_0.06_220)]">備註</Label>
              <Textarea
                placeholder="注意事項、預訂資訊..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
            <AlertDialogTitle>確定要刪除此活動？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deletingActivity?.title}」將被永久刪除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteActivity}
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

// Activity Card Component
function ActivityCard({
  activity,
  index,
  currency,
  onEdit,
  onDelete,
}: {
  activity: Activity;
  index: number;
  currency?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = categoryConfig[activity.category];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="flex gap-4"
    >
      {/* Timeline dot */}
      <div className="flex flex-col items-center flex-shrink-0 pt-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center z-10 ${config.color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 bg-white rounded-xl border border-[oklch(0.92_0.008_220)] overflow-hidden hover:shadow-md transition-shadow duration-200 mb-2">
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-[oklch(0.22_0.08_220)]">{activity.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}>
                  {config.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[oklch(0.55_0.05_220)]">
                {activity.time && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span className="font-['DM_Mono']">{activity.time}</span>
                    {activity.duration && (
                      <span className="text-[oklch(0.72_0.05_220)]">({activity.duration} 分鐘)</span>
                    )}
                  </div>
                )}
                {activity.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{activity.location}</span>
                  </div>
                )}
                {activity.cost !== undefined && activity.cost > 0 && (
                  <div className="flex items-center gap-1 text-[oklch(0.62_0.12_220)] font-medium">
                    <DollarSign className="w-3 h-3" />
                    <span className="font-['DM_Mono']">{activity.cost.toLocaleString()} {currency || "TWD"}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {(activity.notes || activity.address || (activity as any).lat) && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="w-7 h-7 rounded-lg hover:bg-[oklch(0.94_0.008_220)] flex items-center justify-center text-[oklch(0.65_0.05_220)] transition-colors"
                >
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-7 h-7 rounded-lg hover:bg-[oklch(0.94_0.008_220)] flex items-center justify-center text-[oklch(0.65_0.05_220)] transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit} className="gap-2">
                    <Edit3 className="w-4 h-4" />
                    編輯
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete} className="gap-2 text-red-600">
                    <Trash2 className="w-4 h-4" />
                    刪除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Expandable details */}
          <AnimatePresence>
            {expanded && (activity.notes || activity.address || (activity as any).lat) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-[oklch(0.94_0.008_220)] space-y-3">
                  {(activity as any).lat && (activity as any).lng && (
                    <MapPreview
                      lat={(activity as any).lat}
                      lng={(activity as any).lng}
                      title={activity.location}
                      address={activity.address}
                      compact
                    />
                  )}
                  {activity.address && !(activity as any).lat && (
                    <div className="flex items-start gap-2 text-xs text-[oklch(0.55_0.05_220)]">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>{activity.address}</span>
                    </div>
                  )}
                  {activity.notes && (
                    <div className="flex items-start gap-2 text-xs text-[oklch(0.55_0.05_220)]">
                      <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>{activity.notes}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// Day empty state
function DayEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-[oklch(0.94_0.008_220)] flex items-center justify-center mb-4">
        <Calendar className="w-8 h-8 text-[oklch(0.72_0.06_220)]" />
      </div>
      <h3 className="font-['Playfair_Display'] text-lg font-bold text-[oklch(0.35_0.06_220)] mb-2">
        這天還沒有安排
      </h3>
      <p className="text-[oklch(0.55_0.05_220)] text-sm mb-5">
        新增景點、餐廳或住宿，開始規劃這天的行程
      </p>
      <Button
        onClick={onAdd}
        variant="outline"
        className="border-[oklch(0.82_0.06_220)] text-[oklch(0.62_0.12_220)] gap-2"
      >
        <Plus className="w-4 h-4" />
        新增第一個活動
      </Button>
    </motion.div>
  );
}
