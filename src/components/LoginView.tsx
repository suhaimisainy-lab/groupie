import React, { useState } from "react";
import { User } from "../types";
import { Sparkles, Mail, Lock, ShieldCheck, Compass, Heart } from "lucide-react";

interface LoginViewProps {
  onSignIn: (user: User) => void;
  inviteEmail?: string | null;
}

export default function LoginView({ onSignIn, inviteEmail }: LoginViewProps) {
  const [email, setEmail] = useState(inviteEmail || "SuhaimiSainy@gmail.com");
  const [name, setName] = useState(inviteEmail ? "Guest Traveler" : "Suhaimi");
  const [provider, setProvider] = useState<'google' | 'apple' | 'guest'>("guest");
  const [isLoading, setIsLoading] = useState(false);
  const [errorStr, setErrorStr] = useState<string | null>(null);

  const startSignIn = async (selectedProvider: 'google' | 'apple' | 'guest') => {
    setIsLoading(true);
    setErrorStr(null);
    setProvider(selectedProvider);

    try {
      // Simulate quick secure signin preparation
      await new Promise((resolve) => setTimeout(resolve, 600));

      const finalEmail = email.trim() || `${(name || "traveler").toLowerCase().replace(/\s+/g, "")}@example.com`;
      const finalName = name.trim() || finalEmail.split("@")[0];
      const avatar = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(finalEmail)}`;

      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: finalEmail,
          name: finalName,
          provider: selectedProvider,
          avatar
        })
      });

      if (!res.ok) {
        throw new Error("Authentication handshake failed on server.");
      }

      const userData: User = await res.json();
      onSignIn(userData);
    } catch (err: any) {
      setErrorStr(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 font-sans" id="groupie-login-screen">
      <div className="max-w-md w-full mx-auto space-y-8 bg-white p-10 rounded-[32px] shadow-2xl shadow-slate-300/50 border border-slate-200 mt-8 mb-4 animate-fade-in">
        <div>
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
              <Compass className="h-8 w-8 text-brand-600 animate-pulse" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-4xl font-extrabold font-display tracking-tight text-slate-900">
            Groupie
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500 leading-relaxed">
            Collaborative group travel organizer &amp; consensus itinerary planner
          </p>
        </div>

        {inviteEmail && (
          <div className="p-4 bg-brand-50 border border-brand-200 rounded-2xl">
            <p className="text-xs text-brand-900 font-bold flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-brand-600" />
              Invitation Detected
            </p>
            <p className="text-xs text-brand-700 mt-1 leading-relaxed">
              You've been invited to join details for an upcoming group trip as <strong className="text-brand-900">{inviteEmail}</strong>! Please authenticate below to access the preferences board.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Your Email Address
            </label>
            <div className="relative rounded-2xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (e.target.value && !inviteEmail) {
                    setName(e.target.value.split("@")[0]);
                  }
                }}
                disabled={!!inviteEmail}
                className="block w-full pl-10 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-slate-50/50 disabled:opacity-75 disabled:cursor-not-allowed transition-all"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          {!inviteEmail && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Your Screen Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm bg-slate-50/50 transition-all"
                placeholder="Joe"
                required
              />
            </div>
          )}

          {errorStr && (
            <p className="text-xs text-red-500 font-bold text-center">
              {errorStr}
            </p>
          )}

          <div className="pt-4 space-y-3.5">
            <button
              onClick={() => startSignIn("guest")}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-brand-500/20 hover:shadow-xl focus:outline-none active:scale-[0.98] cursor-pointer"
            >
              <Compass className="h-5 w-5 text-white animate-pulse" />
              <span>{isLoading && provider === "guest" ? "Preparing Sandbox..." : "Enter Travel Dashboard"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail("SuhaimiSainy@gmail.com");
                setName("Suhaimi");
                setTimeout(() => startSignIn("guest"), 50);
              }}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-2xl font-bold text-xs transition-all focus:outline-none active:scale-[0.98] cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-brand-600" />
              <span>Load Host Demo Session</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 border-t border-slate-200 pt-6">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Frictionless Access Enabled • No Google or Apple Login Required</span>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-400">
        <p className="flex items-center justify-center gap-1">
          Made for travel groups with <Heart className="h-3 w-3 text-red-400 fill-current" /> by Groupie Inc.
        </p>
      </footer>
    </div>
  );
}
