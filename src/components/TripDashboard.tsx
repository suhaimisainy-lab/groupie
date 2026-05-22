import React, { useState } from "react";
import { Trip, User } from "../types";
import { 
  Users, Calendar, Clock, AlertCircle, Copy, Check, Send, 
  Sparkles, ThumbsUp, HelpCircle, ThumbsDown, RefreshCw, MessageSquare 
} from "lucide-react";
import ItineraryViewer from "./ItineraryViewer";

interface TripDashboardProps {
  trip: Trip;
  currentUser: User;
  onRefresh: () => void;
  onLaunchQuiz: () => void;
}

export default function TripDashboard({ trip, currentUser, onRefresh, onLaunchQuiz }: TripDashboardProps) {
  const [newComment, setNewComment] = useState("");
  const [newChatVal, setNewChatVal] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);

  const [activeTab, setActiveTab] = useState<"itinerary" | "analytics" | "chat">("itinerary");

  // Fetch pending traveler emails
  const respondersList = trip.preferences.map((p) => p.email.toLowerCase());
  const pendingEmails = (trip.invites || []).filter(
    (email) => !respondersList.includes(email.toLowerCase())
  );

  const handleCopyInviteLink = () => {
    const link = `${window.location.origin}?invite=${encodeURIComponent(
      pendingEmails[0] || "explorer@example.com"
    )}&tripId=${trip.id}`;
    navigator.clipboard.writeText(link);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleInviteTraveler = async (e: React.FormEvent) => {
    e.preventDefault();
    const mail = inviteEmail.trim();
    if (!mail) return;

    setIsInviting(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mail })
      });
      if (res.ok) {
        setInviteEmail("");
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsInviting(false);
    }
  };

  const handleTriggerStatusReminder = () => {
    // Simulate mailing system activity securely
    setReminderSent(true);
    setTimeout(() => setReminderSent(false), 3000);
  };

  const handleRunConsensusEngine = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        onRefresh();
        setActiveTab("itinerary");
      }
    } catch (err) {
      console.error("Consensus generation error", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVoteAction = async (vote: 'approve' | 'edit') => {
    try {
      const res = await fetch(`/api/trips/${trip.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.uid, vote })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await fetch(`/api/trips/${trip.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.uid,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          text: newComment.trim()
        })
      });
      if (res.ok) {
        setNewComment("");
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatVal.trim()) return;

    try {
      const res = await fetch(`/api/trips/${trip.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.uid,
          userName: currentUser.name,
          text: newChatVal.trim()
        })
      });
      if (res.ok) {
        setNewChatVal("");
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFinalizeTrip = async () => {
    try {
      const res = await fetch(`/api/trips/${trip.id}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRerunManualSolver = async () => {
    try {
      const res = await fetch(`/api/trips/${trip.id}/rerun`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const userHasVibeCheck = trip.preferences.some(p => p.userId === currentUser.uid);

  // Status mapping
  const statusLabels = {
    setup: "Trip Setup Setup",
    gathering: "Gathering Traveler Preferences",
    analysis: "Analyzing Consensus (75% threshold)",
    review: "Group Reviews, Edits, and Votes",
    finalized: "Itinerary Finalized & Shared!"
  };

  // Color mappings
  const bgColors = {
    setup: "bg-slate-100 text-slate-800",
    gathering: "bg-amber-50 text-amber-800 border-amber-200/50",
    analysis: "bg-blue-50 text-blue-800 border-blue-200/50",
    review: "bg-indigo-50 text-indigo-800 border-indigo-200/50",
    finalized: "bg-emerald-50 text-emerald-800 border-emerald-200/50"
  };

  const stepProgressBarWidth = {
    setup: "w-1/5",
    gathering: "w-2/5",
    analysis: "w-3/5",
    review: "w-4/5",
    finalized: "w-full"
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. Header & Step Progress Bar */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-lg shadow-slate-100/50 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">{trip.name}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${bgColors[trip.status]}`}>
                ● {statusLabels[trip.status]}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-extrabold font-mono tracking-widest uppercase">{trip.destination}</p>
            <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">{trip.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCopyInviteLink}
              className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{isCopied ? "Link Copied!" : "Invite Link"}</span>
            </button>

            {!userHasVibeCheck && trip.status !== "finalized" && (
              <button
                onClick={onLaunchQuiz}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:opacity-90 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-rose-500/20 transition-all animate-pulse"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Launch Visual Quiz</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic step progression bar visual representation from flowchart */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 tracking-widest">
            <span className={trip.status === "setup" ? "text-brand-600 font-extrabold" : ""}>1. Setup</span>
            <span className={trip.status === "gathering" ? "text-brand-600 font-extrabold" : ""}>2. Quiz Preferences</span>
            <span className={trip.status === "analysis" ? "text-brand-600 font-extrabold" : ""}>3. Overlap Analysis</span>
            <span className={trip.status === "review" ? "text-brand-600 font-extrabold" : ""}>4. Review &amp; Edit Pivot</span>
            <span className={trip.status === "finalized" ? "text-brand-600 font-extrabold flex items-center gap-0.5" : ""}>5. Dated Itinerary</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div className={`h-full bg-brand-600 rounded-full transition-all duration-500 ${stepProgressBarWidth[trip.status]}`} />
          </div>
        </div>
      </div>      {/* 2. Collection status panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Gathering statistics & invitation triggers */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Track Collection Status card */}
          <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-lg shadow-slate-100/50 space-y-5" id="collection-tracking">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">
              Collection Status Tracker
            </h3>

            <div className="grid grid-cols-2 gap-3" id="tracking-counter-stats">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-0.5 shadow-sm">
                <span className="text-2xl font-black font-display text-slate-850">{trip.preferences.length}</span>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Submitted</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-0.5 shadow-sm">
                <span className="text-2xl font-black font-display text-slate-850">{pendingEmails.length}</span>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pending Quiz</p>
              </div>
            </div>

            {/* Quick list of participant submissions */}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-bold">Squad Status:</p>
              
              <ul className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                {trip.preferences.map((p) => (
                  <li key={p.userId} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs shadow-sm">
                    <div className="flex items-center gap-2">
                      <img src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${p.name}`} className="h-6 w-6 rounded-lg bg-orange-100" />
                      <div>
                        <strong className="text-slate-800 block font-bold">{p.name}</strong>
                        <span className="text-[10px] text-slate-400 italic font-mono">{p.email}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-150 font-bold px-2.5 py-1 rounded-full flex items-center gap-0.5">
                      ✓ Done
                    </span>
                  </li>
                ))}

                {pendingEmails.map((email) => (
                  <li key={email} className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-xs">
                    <div className="flex items-center gap-2 text-slate-400">
                      <div className="h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold">?</div>
                      <span className="block truncate max-w-[130px] italic font-semibold">{email}</span>
                    </div>
                    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-150 font-bold px-2.5 py-1 rounded-full">
                      🕒 Pending
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Reminders trigger button */}
            {pendingEmails.length > 0 && trip.status !== "finalized" && (
              <div className="pt-2 border-t border-slate-150">
                <button
                  onClick={handleTriggerStatusReminder}
                  className="w-full py-3 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none active:scale-95"
                >
                  <Clock className="h-3.5 w-3.5 text-brand-600 animate-pulse" />
                  <span>{reminderSent ? "Reminders sent successfully!" : "Send Reminders to pending travelers"}</span>
                </button>
              </div>
            )}

            {/* Invite traveler mini box */}
            <form onSubmit={handleInviteTraveler} className="flex gap-2 pt-2 border-t border-slate-150">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Join other travel friend..."
                className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none bg-slate-50/20"
              />
              <button
                type="submit"
                disabled={isInviting}
                className="bg-brand-600 hover:bg-brand-700 text-white rounded-2xl px-4 text-xs font-bold shadow-md shadow-brand-500/10 active:scale-95 transition-all"
              >
                Invite
              </button>
            </form>
          </div>

          {/* Group archetype matches */}
          {trip.preferences.length > 0 && (
            <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-lg shadow-slate-100/50 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="h-4.5 w-4.5 text-brand-600 animate-pulse" />
                Traveler Overlaps ({trip.consensusThreshold}% threshold)
              </h3>
              
              <div className="space-y-3.5">
                {Object.keys(trip.categoryScores || {}).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No consolidated data. Click "Process group preferences" to construct overlaps!</p>
                ) : (
                  Object.keys(trip.categoryScores || {})
                    .sort((a,b) => trip.categoryScores[b] - trip.categoryScores[a])
                    .slice(0, 5)
                    .map((cat) => {
                      const score = trip.categoryScores[cat];
                      const matchedThreshold = score >= (trip.consensusThreshold || 75);
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-700">{cat}</span>
                            <span className={`text-[10px] font-bold ${matchedThreshold ? "text-emerald-700" : "text-amber-705"}`}>
                              {score}% {matchedThreshold ? "(✓ Consensual)" : "(Fallback)"}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${matchedThreshold ? "bg-emerald-500" : "bg-amber-500"}`} 
                              style={{ width: `${score}%` }} 
                            />
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* Consensus analysis gate from flowchart */}
          {trip.preferences.length > 0 && trip.status === "gathering" && (
            <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 p-8 rounded-[32px] text-white shadow-2xl shadow-indigo-950/20 space-y-5">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold tracking-widest text-indigo-300 uppercase block font-mono">Consensus engine</span>
                <h4 className="text-lg font-bold font-display leading-tight tracking-tight">Analyze Overlaps &amp; Deploy AI Planner</h4>
                <p className="text-xs text-indigo-200 leading-relaxed">
                  Calculates preferences, visualizes overlaps, evaluates 75% consensus thresholds &amp; triggers Google Gemini AI models.
                </p>
              </div>

              <button
                id="analyse-consensus-btn"
                onClick={handleRunConsensusEngine}
                disabled={isGenerating}
                className="w-full bg-white hover:bg-slate-50 text-indigo-950 py-3.5 px-6 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-black/10 font-sans"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Processing consensus algorithms...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    <span>Process group preferences &amp; Itinerary</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right column: Main Workspace Tabs (Itinerary, Analytics, Discussion Chat) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("itinerary")}
              className={`px-6 py-4 text-xs font-extrabold transition-all border-b-2 uppercase tracking-widest ${
                activeTab === "itinerary" 
                  ? "border-brand-600 text-brand-600" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Itinerary Details
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-6 py-4 text-xs font-extrabold transition-all border-b-2 uppercase tracking-widest ${
                activeTab === "analytics" 
                  ? "border-brand-600 text-brand-600" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Group Discussion &amp; Vote
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-6 py-4 text-xs font-extrabold transition-all border-b-2 uppercase tracking-widest relative ${
                activeTab === "chat" 
                  ? "border-brand-600 text-brand-600" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Live Chat
              {trip.chatMessages.length > 0 && (
                <span className="absolute top-3 right-2 h-2.5 w-2.5 rounded-full bg-rose-500" />
              )}
            </button>
          </div>

          {activeTab === "itinerary" && (
            <div className="animate-fade-in bg-white p-8 rounded-[32px] border border-slate-200 shadow-lg shadow-slate-100/50">
              {trip.generatedItinerary ? (
                <ItineraryViewer 
                  itinerary={trip.generatedItinerary}
                  onPivot={onRefresh}
                  tripId={trip.id}
                  isOrganiser={currentUser.uid === trip.organiserId}
                />
              ) : (
                <div className="text-center py-16 space-y-4">
                  <HelpCircle className="h-12 w-12 text-slate-300 mx-auto animate-pulse" />
                  <h4 className="font-extrabold text-slate-800 tracking-tight">Itinerary Pending Overlaps</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    The coordination squad is currently gathering travel quiz results. Once we hit our target, the itinerary consensus engine will compile your dated scheduling suggestions.
                  </p>
                  
                  {!userHasVibeCheck && (
                    <button
                      onClick={onLaunchQuiz}
                      className="mt-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl py-3 px-6 text-xs font-extrabold transition-all shadow-lg shadow-brand-500/25 focus:outline-none active:scale-95"
                    >
                      Answer Preferences Quiz Now
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="animate-fade-in space-y-6">
              
              {/* Group reviews and voting system matching flowchart */}
              <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-lg shadow-slate-100/50 space-y-5" id="voting-room">
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Itinerary Review &amp; Vote Block</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">Every traveler can review current consensus plans, discuss edits, and vote to finalize or request manual re-generation.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Current votes statistics */}
                  <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Approval Poll</p>
                    
                    <div className="space-y-2.5">
                      <div className="flex justify-between text-xs text-slate-700">
                        <span className="font-medium">Approvals (Finalize Date)</span>
                        <strong className="font-extrabold text-emerald-700">{Object.values(trip.votes).filter(v => v === "approve").length}</strong>
                      </div>
                      <div className="flex justify-between text-xs text-slate-700">
                        <span className="font-medium">Requests Adjustment edits</span>
                        <strong className="font-extrabold text-rose-700">{Object.values(trip.votes).filter(v => v === "edit").length}</strong>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-slate-200">
                      <button
                        onClick={() => handleVoteAction("approve")}
                        className={`flex-1 py-2 px-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1 transition-all active:scale-95 ${
                          trip.votes[currentUser.uid] === "approve"
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/10"
                            : "bg-white hover:bg-slate-105 text-slate-700 border border-slate-250 hover:border-slate-300 shadow-sm"
                        }`}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" /> Approve
                      </button>

                      <button
                        onClick={() => handleVoteAction("edit")}
                        className={`flex-1 py-2 px-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1 transition-all active:scale-95 ${
                          trip.votes[currentUser.uid] === "edit"
                            ? "bg-rose-600 text-white shadow-md shadow-rose-500/10"
                            : "bg-white hover:bg-slate-105 text-slate-700 border border-slate-250 hover:border-slate-300 shadow-sm"
                        }`}
                      >
                        <ThumbsDown className="h-3.5 w-3.5" /> Request Edit
                      </button>
                    </div>
                  </div>

                  {/* Actions summary matching flowchart approval paths */}
                  <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Pencil Actions</span>
                    
                    <div className="space-y-3">
                      {trip.status === "review" && (
                        <div className="space-y-2.5">
                          <button
                            id="finalize-itinerary-btn"
                            onClick={handleFinalizeTrip}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-2xl text-xs font-extrabold shadow-lg shadow-emerald-500/10 transition-all active:scale-95"
                          >
                            Finalize &amp; Share Dated Itinerary
                          </button>

                          <button
                            id="rerun-solver-btn"
                            onClick={handleRerunManualSolver}
                            className="w-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 py-3 px-4 rounded-2xl text-[11px] font-extrabold transition-all active:scale-95"
                          >
                            Manual Solve or Re-run Algorithm
                          </button>
                        </div>
                      )}

                      {trip.status === "finalized" && (
                        <div className="p-3 bg-emerald-100/50 rounded-2xl flex items-center gap-2 border border-emerald-200">
                          <span className="text-emerald-800 text-xs font-extrabold">✓ Custom scheduler is fully finalized and ready for Day-of coordination!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Collaboration review message board */}
                <div className="pt-5 border-t border-slate-200 space-y-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <MessageSquare className="h-4.5 w-4.5 text-brand-600" />
                    <span>Group Comments / Review Suggestions</span>
                  </div>

                  {/* Board comments log lists */}
                  <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                    {trip.comments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-6 bg-slate-50/40 rounded-2xl border border-dashed border-slate-200">No consensus edits commented yet. Add your suggestions first!</p>
                    ) : (
                      trip.comments.map(com => (
                        <div key={com.id} className="p-4 bg-slate-50/50 border border-slate-200 rounded-2xl flex gap-3 text-xs shadow-sm">
                          <img src={com.userAvatar} className="h-8 w-8 rounded-lg bg-indigo-50 shrink-0" />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <strong className="text-slate-800 font-bold">{com.userName}</strong>
                              <span className="text-[10px] text-slate-400 font-mono">{new Date(com.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-slate-600 leading-relaxed">{com.text}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add feedback edit comment form */}
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Comment an edit, swap suggestions, or propose timings..."
                      className="flex-1 px-4 py-3.5 rounded-2xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/30 font-medium placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
                    >
                      <Send className="h-3 w-3" /> Post
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === "chat" && (
            <div className="animate-fade-in bg-white p-8 rounded-[32px] border border-slate-200 shadow-lg shadow-slate-100/50 space-y-5">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Trip squad live chat</h3>
                <p className="text-xs text-slate-400 mt-0.5">Quick realtime coordinations, chat notifications, and links.</p>
              </div>

              {/* Chat message listing */}
              <div className="space-y-4.5 min-h-[220px] max-h-[300px] overflow-y-auto bg-slate-50/50 p-5 rounded-2xl border border-slate-200">
                {trip.chatMessages.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-10">No live discussions started. Introduce yourself to the squad!</p>
                ) : (
                  trip.chatMessages.map(msg => {
                    const isSelf = msg.userId === currentUser.uid;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isSelf ? "items-end" : "items-start"} space-y-1`}>
                        <div className={`p-3 rounded-2xl text-xs max-w-[280px] leading-relaxed ${
                          isSelf 
                            ? "bg-brand-600 text-white rounded-tr-none shadow-md shadow-brand-500/10" 
                            : "bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm"
                        }`}>
                          <p className="font-extrabold text-[10px] mb-1 opacity-80 uppercase tracking-wider">{msg.userName}</p>
                          <p>{msg.text}</p>
                        </div>
                        <span className="text-[9px] text-slate-400 mt-0.5 px-1 font-mono">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Send */}
              <form onSubmit={handleAddChatMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newChatVal}
                  onChange={(e) => setNewChatVal(e.target.value)}
                  placeholder="Ask squad questions, set rally point..."
                  className="flex-1 px-4 py-3.5 text-xs rounded-2xl border border-slate-205 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/30 placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-700 text-white rounded-2xl px-5 py-3 text-xs font-extrabold transition-all shadow-md shadow-brand-500/10 active:scale-95"
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
