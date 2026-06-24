/**
 * Auth Page — Login & Register
 * Design: Coastal Morning — Asymmetric split layout
 * Left: Hero image with brand messaging
 * Right: Auth form with smooth tab switching
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Waves } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("請輸入有效的電子郵件"),
  password: z.string().min(6, "密碼至少需要 6 個字元"),
});

const registerSchema = z.object({
  displayName: z.string().min(2, "名稱至少需要 2 個字元"),
  email: z.string().email("請輸入有效的電子郵件"),
  password: z.string().min(6, "密碼至少需要 6 個字元"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "兩次密碼輸入不一致",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

const HERO_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663760105877/FKWg7QY89BMBENe4mCAPfG/hero-travel-fcqx36i6AkJoWerUJTQQw4.webp";
const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663760105877/FKWg7QY89BMBENe4mCAPfG/logo-icon-nDuQzmKqhkrEYACEszfx6u.webp";

export default function Auth() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", email: "", password: "", confirmPassword: "" },
  });

  const { login, register } = useAuth();

  const handleLogin = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast.success("登入成功！歡迎回來 ✈️");
      setLocation("/dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "電子郵件或密碼錯誤");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      await register(data.displayName, data.email, data.password);
      toast.success("帳號建立成功！開始規劃你的旅程 🌏");
      setLocation("/dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "註冊失敗，請稍後再試");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Hero Panel */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <img
          src={HERO_IMAGE}
          alt="Travel hero"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.25_0.08_220)]/80 via-[oklch(0.25_0.08_220)]/40 to-transparent" />

        {/* Brand content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Voyager logo" className="w-10 h-10 brightness-0 invert" />
            <span className="text-white font-['Playfair_Display'] text-2xl font-bold tracking-wide">
              Voyager
            </span>
          </div>

          {/* Hero text */}
          <div className="max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            >
              <p className="text-[oklch(0.85_0.08_220)] font-['DM_Mono'] text-sm tracking-widest uppercase mb-4">
                你的旅行規劃夥伴
              </p>
              <h1 className="text-white font-['Playfair_Display'] text-5xl font-bold leading-tight mb-6">
                把每一次旅行，<br />
                變成值得珍藏<br />
                的故事
              </h1>
              <p className="text-white/70 text-lg leading-relaxed">
                從靈感到出發，用最優雅的方式規劃你的每一段旅程。
              </p>
            </motion.div>

            {/* Feature highlights */}
            <motion.div
              className="mt-10 flex flex-col gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              {[
                "雲端同步，多裝置隨時存取",
                "按日安排景點、餐廳、住宿",
                "即時協作，與旅伴共同規劃",
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[oklch(0.72_0.14_35)]" />
                  <span className="text-white/80 text-sm">{feature}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Wave decoration */}
          <div className="flex items-center gap-2 text-white/40">
            <Waves className="w-4 h-4" />
            <span className="text-xs font-['DM_Mono']">COASTAL MORNING</span>
          </div>
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-[oklch(0.97_0.015_80)]">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <img src={LOGO_URL} alt="Voyager" className="w-8 h-8" />
            <span className="font-['Playfair_Display'] text-xl font-bold text-[oklch(0.25_0.08_220)]">
              Voyager
            </span>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-white rounded-xl p-1 mb-8 shadow-sm border border-[oklch(0.92_0.008_220)]">
            {(["login", "register"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMode(tab)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === tab
                    ? "bg-[oklch(0.62_0.12_220)] text-white shadow-sm"
                    : "text-[oklch(0.45_0.06_220)] hover:text-[oklch(0.25_0.08_220)]"
                }`}
              >
                {tab === "login" ? "登入" : "建立帳號"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {mode === "login" ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="mb-6">
                  <h2 className="font-['Playfair_Display'] text-3xl font-bold text-[oklch(0.25_0.08_220)]">
                    歡迎回來
                  </h2>
                  <p className="text-[oklch(0.52_0.05_220)] mt-1 text-sm">
                    登入後繼續規劃你的旅程
                  </p>
                </div>

                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-[oklch(0.35_0.06_220)] text-sm font-medium">
                      電子郵件
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.65_0.06_220)]" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10 bg-white border-[oklch(0.88_0.008_220)] focus:border-[oklch(0.62_0.12_220)] focus:ring-[oklch(0.62_0.12_220)]/20 h-11"
                        {...loginForm.register("email")}
                      />
                    </div>
                    {loginForm.formState.errors.email && (
                      <p className="text-red-500 text-xs">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className="text-[oklch(0.35_0.06_220)] text-sm font-medium">
                      密碼
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.65_0.06_220)]" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10 bg-white border-[oklch(0.88_0.008_220)] focus:border-[oklch(0.62_0.12_220)] h-11"
                        {...loginForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[oklch(0.65_0.06_220)] hover:text-[oklch(0.35_0.06_220)] transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-red-500 text-xs">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-[oklch(0.62_0.12_220)] hover:bg-[oklch(0.55_0.12_220)] text-white font-medium rounded-lg transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        登入
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>


              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="mb-6">
                  <h2 className="font-['Playfair_Display'] text-3xl font-bold text-[oklch(0.25_0.08_220)]">
                    開始你的旅程
                  </h2>
                  <p className="text-[oklch(0.52_0.05_220)] mt-1 text-sm">
                    建立帳號，讓每次旅行都成為故事
                  </p>
                </div>

                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[oklch(0.35_0.06_220)] text-sm font-medium">暱稱</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.65_0.06_220)]" />
                      <Input
                        type="text"
                        placeholder="你的旅行者名稱"
                        className="pl-10 bg-white border-[oklch(0.88_0.008_220)] focus:border-[oklch(0.62_0.12_220)] h-11"
                        {...registerForm.register("displayName")}
                      />
                    </div>
                    {registerForm.formState.errors.displayName && (
                      <p className="text-red-500 text-xs">{registerForm.formState.errors.displayName.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[oklch(0.35_0.06_220)] text-sm font-medium">電子郵件</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.65_0.06_220)]" />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10 bg-white border-[oklch(0.88_0.008_220)] focus:border-[oklch(0.62_0.12_220)] h-11"
                        {...registerForm.register("email")}
                      />
                    </div>
                    {registerForm.formState.errors.email && (
                      <p className="text-red-500 text-xs">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[oklch(0.35_0.06_220)] text-sm font-medium">密碼</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.65_0.06_220)]" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="至少 6 個字元"
                        className="pl-10 pr-10 bg-white border-[oklch(0.88_0.008_220)] focus:border-[oklch(0.62_0.12_220)] h-11"
                        {...registerForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[oklch(0.65_0.06_220)] hover:text-[oklch(0.35_0.06_220)]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className="text-red-500 text-xs">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[oklch(0.35_0.06_220)] text-sm font-medium">確認密碼</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.65_0.06_220)]" />
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="再次輸入密碼"
                        className="pl-10 pr-10 bg-white border-[oklch(0.88_0.008_220)] focus:border-[oklch(0.62_0.12_220)] h-11"
                        {...registerForm.register("confirmPassword")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[oklch(0.65_0.06_220)] hover:text-[oklch(0.35_0.06_220)]"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-red-500 text-xs">{registerForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-[oklch(0.62_0.12_220)] hover:bg-[oklch(0.55_0.12_220)] text-white font-medium rounded-lg transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        建立帳號
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Divider */}

              </motion.div>
            )}
          </AnimatePresence>


        </div>
      </div>
    </div>
  );
}
