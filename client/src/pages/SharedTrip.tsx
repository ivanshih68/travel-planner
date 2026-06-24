/**
 * SharedTrip — Read-only shared trip view
 * Design: Coastal Morning — Timeline layout
 * Allows viewing trips without authentication
 * Uses REST API: GET /api/trips/shared/:token
 */

import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Utensils,
  Hotel,
  Camera,
  Bus,
  Calendar,
  DollarSign,
  AlertCircle,
  FileText,
} from "lucide-react";
import { format, parseISO, addDays } from "date-fns";
import { zhTW } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { tripsApi, type Trip, type Activity } from "@/lib/api";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663760105877/FKWg7QY89BMBENe4mCAPfG/logo-icon-nDuQzmKqhkrEYACEszfx6u.webp";

const categoryConfig: Record<string, { label: string; icon: typeof Camera; color: string }> = {
  ATTRACTION: { label: "景點", icon: Camera, color: "bg-blue-100 text-blue-700" },
  RESTAURANT: { label: "餐廳", icon: Utensils, color: "bg-orange-100 text-orange-700" },
  HOTEL: { label: "住宿", icon: Hotel, color: "bg-purple-100 text-purple-700" },
  TRANSPORT: { label: "交通", icon: Bus, color: "bg-green-100 text-green-700" },
  OTHER: { label: "其他", icon: FileText, color: "bg-gray-100 text-gray-700" },
  // lowercase fallbacks
  attraction: { label: "景點", icon: Camera, color: "bg-blue-100 text-blue-700" },
  restaurant: { label: "餐廳", icon: Utensils, color: "bg-orange-100 text-orange-700" },
  hotel: { label: "住宿", icon: Hotel, color: "bg-purple-100 text-purple-700" },
  transport: { label: "交通", icon: Bus, color: "bg-green-100 text-green-700" },
  other: { label: "其他", icon: FileText, color: "bg-gray-100 text-gray-700" },
};

export default function SharedTrip() {
  const params = useParams<{ token: string }>();
  const shareToken = params.token;
  const [, setLocation] = useLocation();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);

  // Load shared trip via REST API
  useEffect(() => {
    if (!shareToken) return;
    setLoading(true);
    tripsApi.getShared(shareToken)
      .then(({ data }) => {
        const { activities: acts, ...tripData } = data.trip;
        setTrip(tripData as Trip);
        setActivities(acts || []);
      })
      .catch((err) => {
        console.error("Failed to load shared trip:", err);
        setError("分享連結已過期或無效");
      })
      .finally(() => setLoading(false));
  }, [shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || "找不到行程"}</AlertDescription>
          </Alert>
          <Button onClick={() => setLocation("/")} className="w-full mt-4">
            返回首頁
          </Button>
        </Card>
      </div>
    );
  }

  const startDate = parseISO(trip.startDate);
  const endDate = parseISO(trip.endDate);
  const dayCount = Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  const days = Array.from({ length: dayCount }, (_, i) => ({
    day: i + 1,
    date: addDays(startDate, i),
    label: `Day ${i + 1}`,
    dateStr: format(addDays(startDate, i), "M/d", { locale: zhTW }),
  }));

  const currentDayActivities = activities
    .filter((a) => a.day === selectedDay)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const totalCost = activities.reduce((sum, a) => sum + (a.cost ?? 0), 0);
  const dayTotalCost = currentDayActivities.reduce((sum, a) => sum + (a.cost ?? 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Voyager" className="w-8 h-8" />
            <h1 className="text-lg font-bold text-foreground">分享行程</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Trip Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">{trip.title}</h2>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {trip.destination}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {format(startDate, "M月 d日", { locale: zhTW })} - {format(endDate, "M月 d日", { locale: zhTW })}
            </div>
            {trip.budget != null && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                預算: {trip.budget.toLocaleString()} {trip.currency || "TWD"}
              </div>
            )}
          </div>
        </motion.div>

        {/* Day Selector */}
        <div className="mb-8 overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">
            {days.map((day) => (
              <button
                key={day.day}
                onClick={() => setSelectedDay(day.day)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedDay === day.day
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white text-foreground border border-border hover:border-blue-300"
                }`}
              >
                <div className="text-xs">{day.label}</div>
                <div className="text-sm">{day.dateStr}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Activities Timeline */}
        <div className="space-y-4">
          {currentDayActivities.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">此日無安排活動</p>
            </Card>
          ) : (
            currentDayActivities.map((activity, index) => {
              const config = categoryConfig[activity.category] || categoryConfig.OTHER;
              const Icon = config.icon;

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex gap-4">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center gap-2">
                        <div className={`p-2 rounded-lg ${config.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        {index < currentDayActivities.length - 1 && (
                          <div className="w-0.5 h-12 bg-border" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="font-semibold text-foreground">{activity.title}</h3>
                            <span className={`inline-block text-xs px-2 py-1 rounded mt-1 ${config.color}`}>
                              {config.label}
                            </span>
                          </div>
                          {activity.cost != null && activity.cost > 0 && (
                            <div className="text-right whitespace-nowrap">
                              <p className="text-sm font-semibold text-blue-600">
                                {activity.cost.toLocaleString()} {trip.currency || "TWD"}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-muted-foreground">
                          {activity.time && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {activity.time}
                              {activity.duration && <span>（{activity.duration} 分鐘）</span>}
                            </div>
                          )}
                          {activity.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {activity.location}
                            </div>
                          )}
                        </div>

                        {activity.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{activity.notes}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Day Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 p-4 bg-white rounded-lg border border-border"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">此日活動</p>
              <p className="text-2xl font-bold text-foreground">{currentDayActivities.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">此日費用</p>
              <p className="text-2xl font-bold text-blue-600">{dayTotalCost.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">總活動數</p>
              <p className="text-2xl font-bold text-foreground">{activities.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">總費用</p>
              <p className="text-2xl font-bold text-blue-600">{totalCost.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
