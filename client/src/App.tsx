/**
 * App.tsx — Root application with routing and auth
 * Design: Coastal Morning — Voyager travel planner
 * Routes:
 *   /        → Redirect to /auth or /dashboard
 *   /auth    → Login/Register page
 *   /dashboard → Trip management
 *   /trip/:id  → Trip detail with day-by-day itinerary
 */

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import TripDetail from "./pages/TripDetail";
import NotFound from "./pages/NotFound";

// Redirect root to appropriate page based on auth state
function RootRedirect() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      setLocation(user ? "/dashboard" : "/auth");
    }
  }, [user, loading, setLocation]);

  return (
    <div className="min-h-screen bg-[oklch(0.97_0.015_80)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[oklch(0.62_0.12_220)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[oklch(0.55_0.05_220)] text-sm">載入中...</p>
      </div>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/auth");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[oklch(0.97_0.015_80)] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[oklch(0.62_0.12_220)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;
  return <Component />;
}

// Auth route — redirect to dashboard if already logged in
function AuthRoute() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      setLocation("/dashboard");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[oklch(0.97_0.015_80)] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[oklch(0.62_0.12_220)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <Auth />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/auth" component={AuthRoute} />
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/trip/:id">
        {() => <ProtectedRoute component={TripDetail} />}
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  fontFamily: "'Noto Sans TC', sans-serif",
                  borderRadius: "12px",
                },
              }}
            />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
