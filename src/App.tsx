import React, { useState, useEffect } from "react";
import { User, Trip } from "./types";
import LoginView from "./components/LoginView";
import QuizModal from "./components/QuizModal";
import TripCreator from "./components/TripCreator";
import TripDashboard from "./components/TripDashboard";
import { 
  Compass, Plus, LogOut, Sparkles, MessageSquare, Flame, 
  MapPin, Calendar, Clock, ChevronRight, HelpCircle, UserCheck 
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client for client-side persistence and real-time.
// Reads variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  
  // Modals visibility toggles
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Invite parameters parser
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [inviteTripId, setInviteTripId] = useState<string | null>(null);

  // App-wide data fetching loader
  const [loading, setLoading] = useState(false);

  // Parse invite links or previous sessions from Supabase Postgres
  useEffect(() => {
    const loadSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const invite = params.get("invite");
      const trip = params.get("tripId");
      if (invite) setInviteEmail(invite);
      if (trip) setInviteTripId(trip);

      // We maintain the browser session identifier in sessionStorage
      let sessionKey = sessionStorage.getItem("groupie_session_id");
      if (!sessionKey) {
        sessionKey = "sess_" + Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem("groupie_session_id", sessionKey);
      }

      const wasLoggedOut = sessionStorage.getItem("logged_out");
      let storedUser: User | null = null;

      if (supabase) {
        try {
          const { data: entryData, error: entryError } = await supabase
            .from("entries")
            .select()
            .eq("id", `groupie_user_${sessionKey}`)
            .maybeSingle();

          if (!entryError && entryData) {
            const val = entryData.value !== undefined ? entryData.value : entryData.data;
            if (val) {
              storedUser = typeof val === "string" ? JSON.parse(val) : val;
            }
          }
        } catch (err) {
          console.error("Failed to restore user session from Supabase:", err);
        }
      }

      if (storedUser) {
        if (!storedUser.uid) {
          storedUser.uid = "user-" + (storedUser.name || "guest").split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
        }
        if (!storedUser.avatar) {
          storedUser.avatar = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(storedUser.email || "guest")}`;
        }
        setCurrentUser(storedUser);
      } else if (!wasLoggedOut) {
        // Auto-populate default Host session for a flawless instant experience on first view
        const defaultUser: User = {
          uid: "user-suhaimi",
          email: "SuhaimiSainy@gmail.com",
          name: "Suhaimi",
          provider: "guest",
          avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=suhaimi"
        };
        setCurrentUser(defaultUser);
      }
    };

    loadSession();
  }, []);

  const refreshTrips = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // 1. Fetch server records
      const res = await fetch(`/api/trips?email=${encodeURIComponent(currentUser.email)}&uid=${currentUser.uid}`);
      if (res.ok) {
        let serverTrips = await res.json();

        // 2. Load cached local trips backup from Supabase entries table
        const localKey = `groupie_local_trips_${currentUser.email.toLowerCase()}`;
        let localTrips: Trip[] = [];
        if (supabase) {
          try {
            const { data: entryData, error: entryError } = await supabase
              .from("entries")
              .select()
              .eq("id", localKey)
              .maybeSingle();

            if (!entryError && entryData) {
              const val = entryData.value !== undefined ? entryData.value : entryData.data;
              if (val) {
                const parsed = typeof val === "string" ? JSON.parse(val) : val;
                if (Array.isArray(parsed)) {
                  localTrips = parsed;
                }
              }
            }
          } catch (e) {
            console.error("Failed to load local cached trips from Supabase table 'entries':", e);
          }
        }

        // 3. Resync any locally cached trips missing from the server instance (e.g. server restarts)
        const missingOnServer = localTrips.filter((lt) => !serverTrips.some((st: any) => st.id === lt.id));
        if (missingOnServer.length > 0) {
          console.log("Resynced local backup trips to serverless host:", missingOnServer.map(m => m.id));
          try {
            await fetch("/api/trips/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ trips: localTrips })
            });
            // Update cache after sync
            const refetchRes = await fetch(`/api/trips?email=${encodeURIComponent(currentUser.email)}&uid=${currentUser.uid}`);
            if (refetchRes.ok) {
              serverTrips = await refetchRes.json();
            }
          } catch (syncErr) {
            console.error("Transparent sync failed:", syncErr);
          }
        }

        // 4. Update memory cache and list elements
        setTrips(serverTrips);
        if (supabase) {
          const payload = { id: localKey, key: localKey, value: serverTrips, data: serverTrips };
          supabase.from("entries")
            .upsert(payload)
            .then(
              ({ error }) => {
                if (error) {
                  console.error("Failed to sync backup trips to Supabase table 'entries':", error.message);
                } else {
                  console.log("Successfully backed up local trips to Supabase 'entries' table.");
                }
              },
              (err) => {
                console.error("Supabase backup error:", err);
              }
            );
        }

        // Update active selected trip in real-time if it matches
        if (selectedTrip) {
          const updated = serverTrips.find((t: Trip) => t.id === selectedTrip.id);
          if (updated) setSelectedTrip(updated);
        }
      }
    } catch (err) {
      console.error("Error loading groupie trips", err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time live synchronization using Supabase .channel().on()
  useEffect(() => {
    if (!supabase || !currentUser) return;

    console.log("Subscribing to real-time updates for table 'entries'...");
    const channel = supabase
      .channel("live_entries_sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "entries"
        },
        (payload) => {
          console.log("Real-time PostgreSQL change detected in entries Table:", payload);
          // When a change is detected, refresh UI instantly
          refreshTrips();
        }
      )
      .subscribe((status) => {
        console.log("Supabase subscription status:", status);
      });

    return () => {
      console.log("Unsubscribing from real-time updates...");
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // Fetch trips when user authenticates and save active session to Supabase Postgres
  useEffect(() => {
    if (currentUser) {
      let sessionKey = sessionStorage.getItem("groupie_session_id");
      if (!sessionKey) {
        sessionKey = "sess_" + Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem("groupie_session_id", sessionKey);
      }

      if (supabase) {
        const payload = {
          id: `groupie_user_${sessionKey}`,
          key: `groupie_user_${sessionKey}`,
          value: currentUser,
          data: currentUser
        };
        supabase.from("entries")
          .upsert(payload)
          .then(({ error }) => {
            if (error) {
              console.error("Failed to sync active user session to Supabase entries table:", error.message);
            }
          });
      }

      refreshTrips().then(() => {
        // If they had an invite link, open that specific trip automatically
        if (inviteTripId) {
          // Trigger invite join on server first
          fetch(`/api/trips/${inviteTripId}/invite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: currentUser.email })
          }).then(() => {
            // Refetch & auto open
            fetch(`/api/trips?email=${encodeURIComponent(currentUser.email)}&uid=${currentUser.uid}`)
              .then(r => r.json())
              .then(data => {
                setTrips(data);
                const matched = data.find((t: Trip) => t.id === inviteTripId);
                if (matched) setSelectedTrip(matched);
                // Clean browser URL query strings elegantly
                window.history.replaceState({}, document.title, "/");
              });
          });
        }
      });
    } else {
      setTrips([]);
      setSelectedTrip(null);
    }
  }, [currentUser]);

  const handleSignIn = (user: User) => {
    sessionStorage.removeItem("logged_out");
    setCurrentUser(user);
    setInviteEmail(null);
    setInviteTripId(null);
  };

  const handleSignOut = () => {
    const sessionKey = sessionStorage.getItem("groupie_session_id");
    if (sessionKey && supabase) {
      supabase.from("entries")
        .delete()
        .eq("id", `groupie_user_${sessionKey}`)
        .then(({ error }) => {
          if (error) {
            console.error("Failed to delete user session in Supabase:", error.message);
          }
        });
    }
    sessionStorage.setItem("logged_out", "true");
    setCurrentUser(null);
  };

  const handleQuizSubmit = async (responses: any) => {
    if (!currentUser || !selectedTrip) return;

    try {
      const res = await fetch(`/api/trips/${selectedTrip.id}/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.uid,
          email: currentUser.email,
          name: currentUser.name,
          responses
        })
      });

      if (res.ok) {
        setIsQuizOpen(false);
        refreshTrips();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick switch user to test parallel consensus preferences (Suhaimi -> Anna -> Marcus)
  const testUsers = [
    { name: "Suhaimi (Host)", email: "SuhaimiSainy@gmail.com", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=suhaimi" },
    { name: "Anna Jones", email: "anna.jones@example.com", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=anna" },
    { name: "Marcus King", email: "marcus.k@example.com", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=marcus" },
    { name: "Sarah Miller", email: "sarah.m@example.com", avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=sarah" }
  ];

  const handleQuickSwitchUser = (u: typeof testUsers[0]) => {
    const freshUser: User = {
      uid: "user-" + u.name.split(" ")[0].toLowerCase(),
      email: u.email,
      name: u.name,
      provider: "google",
      avatar: u.avatar
    };
    setCurrentUser(freshUser);
  };

  if (!currentUser) {
    return <LoginView onSignIn={handleSignIn} inviteEmail={inviteEmail} />;
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col font-sans">
      
      {/* Dynamic Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm shadow-slate-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div 
            onClick={() => setSelectedTrip(null)}
            className="flex items-center gap-3 cursor-pointer group hover:scale-[1.01] transition-all"
          >
            <div className="w-10 h-10 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:rotate-12 transition-all duration-300">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black font-display text-slate-900 leading-none tracking-tight">Groupie</h1>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Consensus Planner</span>
            </div>
          </div>

          {/* Quick debug switcher to test multi-user invites easily */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-1 shrink-0 shadow-inner">
            <span className="text-[9px] uppercase font-bold text-slate-400 px-2 flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-brand-600" /> Switch:
            </span>
            {testUsers.map((u) => {
              const active = currentUser.email.toLowerCase() === u.email.toLowerCase();
              return (
                <button
                  key={u.email}
                  onClick={() => handleQuickSwitchUser(u)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all ${
                    active 
                      ? "bg-brand-600 text-white shadow-md shadow-brand-500/20" 
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                  }`}
                >
                  {u.name.split(" ")[0]}
                </button>
              );
            })}
          </div>

          {/* Current Auth user profile controls */}
          <div className="flex items-center gap-3">
            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-slate-800">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 font-mono">{currentUser.email}</p>
            </div>
            <img 
              src={currentUser.avatar} 
              alt={currentUser.name} 
              className="h-8 w-8 rounded-full border border-slate-200 bg-brand-50"
            />
            <button
              onClick={handleSignOut}
              id="sign-out-btn"
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="Sign Out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {!selectedTrip ? (
          /* ALL TRIPS DASHBOARD DASHBOARD */
          <div className="space-y-8 animate-fade-in" id="all-trips-explorer">
            
            {/* Introductory Vibe banner */}
            <div className="bg-gradient-to-br from-brand-900 to-slate-900 p-10 rounded-[32px] text-white shadow-2xl shadow-indigo-950/20 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none scale-150">
                <Compass className="w-96 h-96" />
              </div>
              <div className="max-w-xl space-y-4 relative z-10">
                <span className="text-[10px] tracking-widest font-mono font-bold bg-white/10 border border-white/5 px-3 py-1 rounded-full uppercase">
                  ✓ Multimodal Group Coordinator
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold font-display leading-tight tracking-tight">
                  Agree, Plan, &amp; Wander Together.
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Groupie handles divergent budgets, dates, and interest profiles. Travelers answer interactive preference prompts, we analyze threshold consensus layers and render suggested itineraries via Google Gemini.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    id="new-groupie-trip-setup-btn"
                    className="bg-white hover:bg-slate-55 text-slate-900 font-extrabold px-6 py-3 rounded-2xl text-xs shadow-lg shadow-white/5 transition-all flex items-center gap-2 active:scale-95"
                  >
                    <Plus className="h-4 w-4 text-brand-600" />
                    <span>Setup New Groupie Trip</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Trips List section */}
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Active Group escaping lists</h3>
                {loading && <span className="text-xs text-brand-600 font-mono animate-pulse font-bold">Refining records...</span>}
              </div>

              {trips.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-[32px] border border-dashed border-slate-200 shadow-md">
                  <Flame className="h-12 w-12 text-slate-300 mx-auto animate-bounce mb-3" />
                  <h4 className="font-bold text-slate-700">No active trips yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4 leading-relaxed">You aren't invited to any travel rosters yet. Complete your login and setup your own group escape to kickstart preferences!</p>
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="bg-brand-600 hover:bg-brand-700 text-white rounded-2xl py-3 px-6 text-xs font-bold transition-all shadow-lg shadow-brand-500/20 active:scale-95"
                  >
                    Start Amalfi or Tokyo Trip
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="trips-card-grid">
                  {trips.map((trip) => {
                    const submissionsCount = trip.preferences.length;
                    const invitedCount = trip.invites ? trip.invites.length : 1;
                    
                    return (
                      <div
                        key={trip.id}
                        onClick={() => setSelectedTrip(trip)}
                        className="bg-white border border-slate-200 rounded-[32px] p-6 hover:border-brand-500 hover:shadow-2xl hover:shadow-slate-300/50 transition-all duration-300 cursor-pointer flex flex-col justify-between text-left relative group shadow-lg shadow-slate-100/50"
                        id={`trip-card-${trip.id}`}
                      >
                        <div className="space-y-4">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[10px] font-bold text-brand-600 bg-brand-50/80 border border-brand-100 font-mono tracking-widest px-3 py-1 rounded-full uppercase">
                              {trip.destination.split(",")[0]}
                            </span>
                            
                            <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full font-mono ${
                              trip.status === "finalized" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                : trip.status === "review" 
                                ? "bg-purple-50 text-purple-700 border border-purple-200" 
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}>
                              {trip.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-lg font-bold text-slate-800 leading-snug group-hover:text-brand-600 transition-colors">
                              {trip.name}
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{trip.description}</p>
                          </div>
                        </div>

                        {/* Card metadata stats footer */}
                        <div className="pt-4 border-t border-slate-100 mt-5 flex items-center justify-between text-xs text-slate-400 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span>By {new Date(trip.deadline).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                          </span>

                          <span className="text-right bg-slate-100 px-2.5 py-1 rounded-full font-bold text-slate-600 flex items-center gap-1 shrink-0 text-[10px] border border-slate-250">
                            {submissionsCount}/{invitedCount} roster
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* DYNAMIC MULTI-STEP SINGLE TRIP DETAILS VIEW & WORKSPACE BOARD */
          <div className="animate-fade-in space-y-6">
            <button
              onClick={() => setSelectedTrip(null)}
              className="text-xs text-slate-600 hover:text-slate-800 font-bold bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2.5 rounded-2xl shadow-sm transition-all flex items-center gap-1.5 focus:outline-none active:scale-95"
            >
              ← Back to All Group Escapes
            </button>

            <TripDashboard 
              trip={selectedTrip} 
              currentUser={currentUser} 
              onRefresh={refreshTrips}
              onLaunchQuiz={() => setIsQuizOpen(true)}
            />
          </div>
        )}

      </main>

      {/* MODALS GATEWAY */}
      <QuizModal 
        isOpen={isQuizOpen} 
        onClose={() => setIsQuizOpen(false)}
        onSubmit={handleQuizSubmit}
      />

      <TripCreator
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        organiserId={currentUser.uid}
        organiserName={currentUser.name}
        onTripCreated={refreshTrips}
      />
    </div>
  );
}
