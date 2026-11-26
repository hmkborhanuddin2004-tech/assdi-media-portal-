"use client";

import React, { useState, useTransition, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { isSafeRedirectPath, isPathAllowedForRole } from "@/lib/types/auth";

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

        // Determine destination: prioritize safe authorized next param, else data.redirectTo
        let destination = data.redirectTo;
        if (
          nextParam &&
          isSafeRedirectPath(nextParam) &&
          isPathAllowedForRole(data.role, nextParam)
        ) {
          destination = nextParam;
        }

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
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-3 sm:p-6 w-full max-w-full">
      <div className="w-full max-w-[400px] mx-auto space-y-4">
        {/* Main Login Card */}
        <div className="bg-white border border-[#E4E4E7] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 sm:p-7">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center space-y-2 pb-4 border-b border-[#E4E4E7]">
            <div className="w-11 h-11 rounded-lg bg-[#FAFAFA] p-1.5 border border-[#E4E4E7] flex items-center justify-center">
              <Image
                src="/images/assdi-logo.png"
                alt="ASSDI Logo"
                width={36}
                height={36}
                className="w-full h-full object-contain"
                priority
              />
            </div>

            <div className="space-y-0.5">
              <h1 className="text-base font-semibold text-[#09090B] tracking-tight">
                আছ-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট
              </h1>
              <p className="text-xs text-[#52525B]">
                সেন্ট্রাল মিডিয়া ম্যানেজমেন্ট পোর্টাল
              </p>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div
              id="login-error-alert"
              className="mt-4 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2 text-xs text-[#991B1B]"
            >
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 p-3 rounded-lg bg-[#F4F4F5] border border-[#E4E4E7] flex items-start gap-2 text-xs text-[#09090B]">
              <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{successMessage}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            <div className="space-y-1">
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-[#09090B]"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71717A]">
                  <Mail className="w-3.5 h-3.5" />
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
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#E4E4E7] text-xs sm:text-[13px] text-[#09090B] placeholder:text-[#71717A] focus:outline-none focus:border-[#0F766E] bg-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-[#09090B]"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71717A]">
                  <Lock className="w-3.5 h-3.5" />
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
                  className="w-full h-9 pl-9 pr-9 rounded-lg border border-[#E4E4E7] text-xs sm:text-[13px] text-[#09090B] placeholder:text-[#71717A] focus:outline-none focus:border-[#0F766E] bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#71717A] hover:text-[#09090B]"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <button
              id="login-submit-button"
              type="submit"
              disabled={isPending}
              className="w-full h-9 px-4 rounded-lg bg-[#0F766E] hover:bg-[#0D645D] text-white font-medium text-xs sm:text-[13px] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <p className="mt-4 pt-3 border-t border-[#E4E4E7] text-[11px] text-[#71717A] text-center">
            Admin-managed accounts only. Public sign-up is disabled.
          </p>
        </div>

        {/* Quick Demo Logins Helper */}
        <div className="bg-white border border-[#E4E4E7] rounded-lg p-3 text-center space-y-2">
          <div className="text-[11px] font-medium text-[#71717A]">
            Quick Demo Accounts (Pass: <span className="font-mono text-[#09090B]">assdi123</span>)
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickFill("admin@assdi.org")}
              className="px-2.5 py-1 rounded-md bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#27272A] border border-[#E4E4E7] text-[11px] font-medium"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("coordinator@assdi.org")}
              className="px-2.5 py-1 rounded-md bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#27272A] border border-[#E4E4E7] text-[11px] font-medium"
            >
              Coordinator
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("staff@assdi.org")}
              className="px-2.5 py-1 rounded-md bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#27272A] border border-[#E4E4E7] text-[11px] font-medium"
            >
              Staff
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("intern@assdi.org")}
              className="px-2.5 py-1 rounded-md bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#27272A] border border-[#E4E4E7] text-[11px] font-medium"
            >
              Intern
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
