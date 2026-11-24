"use client";

import React, { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Video,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    if (errorParam === "deactivated") {
      return "আপনার অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে। মিডিয়া প্রধানের সাথে যোগাযোগ করুন। (Account deactivated)";
    }
    if (errorParam === "unauthorized") {
      return "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে উপযুক্ত অ্যাকাউন্টে লগইন করুন। (Unauthorized access)";
    }
    return null;
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleQuickFill = (testEmail: string) => {
    setEmail(testEmail);
    setPassword("assdi123");
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Basic client validation
    if (!email.trim()) {
      setErrorMessage("ইমেইল অ্যাড্রেস প্রদান করুন (Email is required)");
      return;
    }
    if (!password) {
      setErrorMessage("পাসওয়ার্ড প্রদান করুন (Password is required)");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setErrorMessage(
            data.error || "লগইন ব্যর্থ হয়েছে। ক্রেডেনশিয়াল সঠিক কিনা যাচাই করুন।"
          );
          return;
        }

        setSuccessMessage("লগইন সফল হয়েছে! ড্যাশবোর্ডে প্রবেশ করা হচ্ছে...");

        // Determine destination: prioritize next param if authorized, else data.redirectTo
        const destination = nextParam && nextParam.startsWith("/") ? nextParam : data.redirectTo;

        // Redirect after brief visual feedback
        setTimeout(() => {
          router.push(destination);
          router.refresh();
        }, 400);
      } catch {
        setErrorMessage(
          "সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি। পুনরায় চেষ্টা করুন।"
        );
      }
    });
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-3 sm:p-6 w-full max-w-full">
      <div className="w-full max-w-md mx-auto space-y-5">
        {/* Main Login Card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-emerald-600/20 shadow-md bg-white/90 backdrop-blur-md">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center space-y-2.5 pb-4 border-b border-slate-200/80">
            <div className="w-12 h-12 rounded-2xl bg-[#0F766E] text-white flex items-center justify-center shadow-md shadow-emerald-900/15">
              <Video className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#0F766E] text-[11px] font-semibold">
                <Sparkles className="w-3 h-3" />
                <span>ASSDI Media Portal • Restricted Access</span>
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-[#0F172A] tracking-tight">
                আছ-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট
              </h1>
              <p className="text-xs text-[#0F766E] font-semibold">
                সেন্ট্রাল মিডিয়া ম্যানেজমেন্ট পোর্টাল
              </p>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div
              id="login-error-alert"
              className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{successMessage}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-700"
              >
                ইমেইল অ্যাড্রেস <span className="text-slate-400 font-normal">/ Email</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@assdi.org"
                  required
                  autoComplete="email"
                  disabled={isPending}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent transition-all bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700"
              >
                পাসওয়ার্ড <span className="text-slate-400 font-normal">/ Password</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={isPending}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-transparent transition-all bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                  aria-label={showPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              id="login-submit-button"
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0F766E] hover:bg-[#115E59] active:bg-[#134E4A] text-white font-semibold text-xs sm:text-sm shadow-sm transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>যাচাই করা হচ্ছে...</span>
                </>
              ) : (
                <span>লগইন করুন (Sign In)</span>
              )}
            </button>
          </form>

          {/* Strict Security Notice: Self-Signup Disabled */}
          <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-slate-600 text-[11px] leading-relaxed flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800">
                নিরাপত্তা নীতি (Security Policy):
              </span>{" "}
              পাবলিক রেজিস্ট্রেশন সম্পূর্ণ নিষ্ক্রিয়। শুধুমাত্র মিডিয়া প্রধান /
              অ্যাডমিন দ্বারা অনুমোদিত ব্যবহারকারীরা এই পোর্টালে প্রবেশ করতে
              পারবেন।
            </div>
          </div>
        </div>

        {/* Quick Demo Logins Helper */}
        <div className="glass-panel rounded-xl p-3.5 border border-slate-200/80 bg-white/70 text-center space-y-2">
          <div className="text-[11px] font-semibold text-slate-600">
            টেস্ট লগইন বিকল্প (Quick Test Accounts • Pass: assdi123):
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickFill("admin@assdi.org")}
              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#0F766E] border border-emerald-200/80 text-[10px] font-medium transition-colors"
            >
              Admin (মিডিয়া প্রধান)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("coordinator@assdi.org")}
              className="px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/80 text-[10px] font-medium transition-colors"
            >
              Coordinator (RAC)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("staff@assdi.org")}
              className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-[10px] font-medium transition-colors"
            >
              Permanent Staff
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("intern@assdi.org")}
              className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 text-[10px] font-medium transition-colors"
            >
              Intern (ট্রেইনি)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-6 text-slate-500 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-[#0F766E]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
