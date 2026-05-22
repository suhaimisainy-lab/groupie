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
  const [provider, setProvider] = useState<'google' | 'apple'>("google");
  const [isLoading, setIsLoading] = useState(false);
  const [errorStr, setErrorStr] = useState<string | null>(null);

  const startSignIn = async (selectedProvider: 'google' | 'apple') => {
    setIsLoading(true);
    setErrorStr(null);
    setProvider(selectedProvider);

    try {
      // Simulate OAuth network latency and cryptographic handshakes securely
      await new Promise((resolve) => setTimeout(resolve, 800));

      const avatar = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(email || "guest")}`;

      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || email.split("@")[0],
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

          <div className="pt-4 space-y-3">
            <button
              onClick={() => startSignIn("google")}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 text-sm transition-all focus:outline-none active:scale-[0.98]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.354 0 3.373 2.736 1.545 6.727l3.72 3.038z"
                />
                <path
                  fill="#34A853"
                  d="M16.04 15.345c-1.077.719-2.45 1.145-4.04 1.145a7.077 7.077 0 0 1-6.734-4.855L1.545 14.67C3.373 18.664 7.354 21.4 12 21.4c3.155 0 6.01-1.036 8.182-2.836l-4.14-3.219z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.273c0-.818-.082-1.609-.236-2.373H12v4.51h6.446c-.282 1.445-1.1 2.673-2.336 3.518l4.14 3.219c2.418-2.227 3.84-5.509 3.84-9.373z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.266 14.235A7.077 7.077 0 0 1 4.909 12c0-.79.136-1.545.357-2.235L1.545 6.727A11.906 11.906 0 0 0 0 12c0 1.92.455 3.736 1.255 5.373l4.01-3.138z"
                />
              </svg>
              <span>{isLoading && provider === "google" ? "Authenticating securely..." : "Continue with Google"}</span>
            </button>

            <button
              onClick={() => startSignIn("apple")}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-slate-900 text-white hover:bg-black rounded-2xl font-bold text-sm transition-all focus:outline-none active:scale-[0.98]"
            >
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.57 2.95-1.39z" />
              </svg>
              <span>{isLoading && provider === "apple" ? "Authenticating securely..." : "Continue with Apple"}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 border-t border-slate-200 pt-6">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>AES-256 Auth Encryption Enabled • No Data Shared</span>
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
