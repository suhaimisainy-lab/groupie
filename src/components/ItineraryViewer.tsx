import React, { useState } from "react";
import { ItineraryDay, ItineraryItem, Review } from "../types";
import { 
  Clock, MapPin, Star, Sparkles, TrendingUp, TrendingDown,
  Info, Filter, Plus, Check, RefreshCw, Trash2, SlidersHorizontal, Archive, Bookmark
} from "lucide-react";

interface ItineraryViewerProps {
  itinerary: ItineraryDay[];
  onPivot: (activityId: string, decision: "keep" | "replace" | "later", replacementId?: string) => void;
  tripId: string;
  isOrganiser: boolean;
}

export default function ItineraryViewer({ itinerary, onPivot, tripId, isOrganiser }: ItineraryViewerProps) {
  const [selectedActivity, setSelectedActivity] = useState<ItineraryItem | null>(null);
  const [activeKeywordFilter, setActiveKeywordFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"time" | "rating" | "velocity">("time");
  const [isPivoting, setIsPivoting] = useState(false);

  // Expanded activity details or action pivots
  const handleOpenDetail = (activity: ItineraryItem) => {
    setSelectedActivity(selectedActivity?.id === activity.id ? null : activity);
    setActiveKeywordFilter(null);
  };

  const handlePivotAction = async (activityId: string, decision: "keep" | "replace" | "later", replacementId?: string) => {
    setIsPivoting(true);
    // Persist pivot decision on database
    try {
      const res = await fetch(`/api/trips/${tripId}/pivot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId, decision, replacementId })
      });
      if (res.ok) {
        onPivot(activityId, decision, replacementId);
        setSelectedActivity(null);
      }
    } catch (err) {
      console.error("Error executing pivot action", err);
    } finally {
      setIsPivoting(false);
    }
  };

  // Pre-compiled keyword extraction triggers from flowchart
  const FILTER_KEYWORDS = ["scenic", "crowd", "luxury", "vibe", "budget", "authentic"];

  // Helper to check if a review matches active keyword filter
  const matchesKeyword = (review: Review, kw: string | null) => {
    if (!kw) return true;
    const body = review.comment.toLowerCase();
    const mapKeywords: { [key: string]: string[] } = {
      scenic: ["view", "scenic", "panoramic", "gorgeous", "sight", "beautiful", "lookout"],
      crowd: ["crowd", "busy", "tourist", "pack", "people"],
      luxury: ["fine", "luxurious", "expensive", "premium", "splurge"],
      vibe: ["cozy", "spirit", "vibe", "atmosphere", "friendly"],
      budget: ["cheap", "price", "budget", "street", "value"],
      authentic: ["traditional", "authentic", "heritage", "history"]
    };
    const words = mapKeywords[kw] || [kw];
    return words.some(word => body.includes(word));
  };

  return (
    <div className="space-y-6" id="itinerary-grid-room">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-205 pb-5">
        <div>
          <h3 className="text-lg font-extrabold font-display text-slate-900 flex items-center gap-2 tracking-tight">
            <Sparkles className="h-5 w-5 text-brand-600 animate-pulse" />
            Consensus-Driven Live Itinerary
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Click on any itinerary activity card below to open full reviews, review velocity filters, or evaluate replacement pivots.
          </p>
        </div>

        {/* Global Sorter controls matching flowchart "Apply sort/time range" */}
        <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-2xl border border-slate-200 shadow-inner shrink-0 self-start sm:self-auto">
          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 flex items-center gap-1"><SlidersHorizontal className="h-3 w-3" /> Sort</span>
          <button
            onClick={() => setSortBy("time")}
            className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all active:scale-95 ${
              sortBy === "time" ? "bg-white text-slate-950 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Time
          </button>
          <button
            onClick={() => setSortBy("rating")}
            className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all active:scale-95 ${
              sortBy === "rating" ? "bg-white text-slate-950 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Rating
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main List Column */}
        <div className={`space-y-5 lg:col-span-${selectedActivity ? "7" : "12"}`}>
          {itinerary.map((dayPlan) => (
            <div key={dayPlan.day} className="space-y-4.5 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-brand-700 bg-brand-50 border border-brand-100 px-4 py-1.5 rounded-full shadow-sm">
                  {dayPlan.date}
                </span>
              </div>

              <div className="space-y-3.5">
                {dayPlan.activities
                  .filter(act => !act.isFlaggedLater)
                  .sort((a, b) => {
                    if (sortBy === "rating") return b.rating - a.rating;
                    return a.time.localeCompare(b.time); // default time sort
                  })
                  .map((activity) => {
                    const isSelected = selectedActivity?.id === activity.id;
                    return (
                      <div
                        key={activity.id}
                        onClick={() => handleOpenDetail(activity)}
                        className={`p-5 rounded-[24px] border transition-all cursor-pointer text-left bg-white relative group ${
                          isSelected
                            ? "ring-2 ring-brand-500 border-transparent shadow-lg shadow-brand-100/30 font-medium"
                            : "border-slate-200 hover:border-slate-350 shadow-sm shadow-slate-100/40 hover:-translate-y-0.5 duration-200"
                        }`}
                        id={`itinerary-act-card-${activity.id}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-750 px-2.5 py-0.5 bg-brand-50 border border-brand-100 rounded-full">
                              {activity.category}
                            </span>
                            <h4 className="text-sm font-extrabold text-slate-950 group-hover:text-brand-600 transition-colors tracking-tight">
                              {activity.title}
                            </h4>
                            <p className="text-xs text-slate-500 line-clamp-1 leading-relaxed">{activity.description}</p>
                          </div>
                          
                          <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                            <span className="text-xs font-mono text-slate-500 font-extrabold flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              {activity.time}
                            </span>
                            <div className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
                              <span className="text-xs font-bold text-slate-900">{activity.rating}</span>
                              <span className="text-[10px] text-slate-400 font-medium">({activity.reviewsCount})</span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive prompt delta badge from flowchart */}
                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1.5 font-medium"><MapPin className="h-3.5 w-3.5 text-slate-400" /> {activity.location}</span>
                          
                          <div className="flex items-center gap-2">
                            {activity.recentRatingTrend === "up" ? (
                              <span className="font-mono text-[10px] text-emerald-700 font-black bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <TrendingUp className="h-3.5 w-3.5" /> +{activity.ratingDelta} Delta
                              </span>
                            ) : activity.recentRatingTrend === "down" ? (
                              <span className="font-mono text-[10px] text-red-500 font-bold bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <TrendingDown className="h-3.5 w-3.5" /> -{activity.ratingDelta} Delta
                              </span>
                            ) : (
                              <span className="font-mono text-[10px] text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full font-bold">Stable</span>
                            )}

                            {activity.fallbackOptions && activity.fallbackOptions.length > 0 && (
                              <span className="text-[10px] bg-brand-50 border border-brand-100 text-brand-700 px-2.5 py-0.5 rounded-full font-extrabold">
                                {activity.fallbackOptions.length} Swap Options
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Sheet (Pivot Decisions, Reviews & Recency Weight gauge) */}
        {selectedActivity && (
          <div className="lg:col-span-12 xl:col-span-5 bg-white border border-slate-200 rounded-[32px] p-6.5 shadow-xl shadow-slate-100/60 relative animate-fade-in space-y-6 self-start max-h-[85vh] overflow-y-auto" id="pivot-action-panel">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2 text-slate-900">
                <Info className="h-4.5 w-4.5 text-brand-600 animate-pulse" />
                <h3 className="font-extrabold font-display text-sm tracking-tight">Pivot &amp; Recency</h3>
              </div>
              <button 
                onClick={() => setSelectedActivity(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold hover:bg-slate-50 p-1.5 rounded-full transition-all focus:outline-none"
              >
                ✕ Close
              </button>
            </div>

            {/* Current Activity Highlight */}
            <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-200 space-y-2.5 shadow-sm">
              <span className="text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-100 px-2.5 py-0.5 rounded-full uppercase tracking-widest inline-block">
                {selectedActivity.category} Core Vibe
              </span>
              <h4 className="text-sm font-extrabold text-slate-950 tracking-tight">{selectedActivity.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{selectedActivity.description}</p>
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                <span className="flex items-baseline gap-1 font-bold">
                  <Star className="h-3 w-3 fill-current text-yellow-500" /> 
                  <strong className="text-slate-800 font-extrabold">{selectedActivity.rating}</strong> ({selectedActivity.reviewsCount} reviews)
                </span>
                
                {/* Gauge weighting feedback */}
                <span className="font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full text-[10px]">
                  {selectedActivity.recentRatingTrend === "up" ? "High Recency Weight (1.5x)" : "Standard Weight (1.0x)"}
                </span>
              </div>
            </div>

            {/* Reviews & Velocity Filter */}
            <div id="gauge-weight-velocity-block" className="space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-extrabold text-slate-850 uppercase tracking-widest flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  Review Velocity &amp; Tags
                </h5>
                <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2.0 py-0.5 rounded-full border border-slate-200">Gauge Active</span>
              </div>

              {/* Dynamic gauge weight indicator bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[9px] text-slate-400 font-bold tracking-widest uppercase px-1">
                  <span>Older logs (0.8x)</span>
                  <span className="text-brand-600 font-black">Trending Now (1.5x)</span>
                </div>
                <div className="w-full bg-slate-100 h-4 rounded-full p-0.5 overflow-hidden border border-slate-200">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-300 via-brand-500 to-rose-500 rounded-full relative transition-all duration-500"
                    style={{ width: selectedActivity.recentRatingTrend === "up" ? "90%" : selectedActivity.recentRatingTrend === "down" ? "35%" : "65%" }}
                  >
                    <div className="absolute right-2 top-0.5 leading-none text-[7px] text-white font-mono font-black tracking-widest">★ VALUE WEIGHT</div>
                  </div>
                </div>
              </div>

              {/* Keyword Filters Tag Row */}
              <div className="flex flex-wrap gap-1 border-t border-slate-100 pt-3">
                <button
                  onClick={() => setActiveKeywordFilter(null)}
                  className={`px-2 py-1 text-[10px] font-bold rounded-xl transition-all shadow-sm ${
                    !activeKeywordFilter ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-200"
                  }`}
                >
                  All reviews
                </button>
                {FILTER_KEYWORDS.map(kw => (
                  <button
                    key={kw}
                    onClick={() => setActiveKeywordFilter(kw)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-xl transition-all uppercase shadow-sm ${
                      activeKeywordFilter === kw ? "bg-brand-600 text-white" : "bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-200 font-semibold"
                    }`}
                  >
                    #{kw}
                  </button>
                ))}
              </div>

              {/* Reviews Feed items with dynamic weighted ratings */}
              <div className="space-y-2.5 max-h-[140px] overflow-y-auto pr-1">
                {selectedActivity.reviews && selectedActivity.reviews.length > 0 ? (
                  selectedActivity.reviews
                    .filter(rev => matchesKeyword(rev, activeKeywordFilter))
                    .map(rev => {
                      const finalWeight = rev.recentWeight || 1.1;
                      return (
                        <div key={rev.id} className="p-3 bg-slate-50/50 rounded-2xl border border-slate-200 space-y-1.5 shadow-sm">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                            <strong className="text-slate-700 font-extrabold">{rev.author}</strong>
                            <span className="font-mono">{rev.date}</span>
                          </div>
                          <p className="text-xs text-slate-600 italic">" {rev.comment} "</p>
                          <div className="flex justify-between items-center text-[9px] font-mono border-t border-slate-200/55 pt-1.5 mt-1.5 text-slate-400 font-bold">
                            <span>Score: {rev.rating} ★</span>
                            <span className="text-emerald-700 font-extrabold">Velocity Weight: {finalWeight}x</span>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <span className="text-xs text-slate-400 italic block text-center py-4">No reviews matching active parameters found.</span>
                )}
              </div>
            </div>

            {/* Pivot Options block from flowchart */}
            <div className="space-y-3.5 pt-4 border-t border-slate-200">
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-widest">
                Group Resolution: Keep, Replace or Later?
              </h5>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  id="pivot-keep-btn"
                  onClick={() => handlePivotAction(selectedActivity.id, "keep")}
                  disabled={isPivoting}
                  className="p-3 bg-slate-950 text-white hover:bg-slate-850 disabled:opacity-40 rounded-2xl text-xs font-extrabold shadow-md transition-all text-center flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer"
                >
                  <Bookmark className="h-4 w-4" />
                  <span>KEEP &amp; SORT</span>
                </button>

                <button
                  id="pivot-later-btn"
                  onClick={() => handlePivotAction(selectedActivity.id, "later")}
                  disabled={isPivoting}
                  className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-250 disabled:opacity-40 rounded-2xl text-xs font-extrabold transition-all text-center flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer"
                >
                  <Archive className="h-4 w-4 text-slate-404" />
                  <span>FLAG FOR LATER</span>
                </button>
              </div>

              {/* Replace block with Alternative Reference from consensus */}
              {selectedActivity.fallbackOptions && selectedActivity.fallbackOptions.length > 0 ? (
                <div className="space-y-3.5 pt-3.5 border-t border-slate-200" id="fallback-reference-options">
                  <p className="text-[11px] font-bold text-brand-700 uppercase tracking-widest flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin text-brand-600" /> Replace with Alternative Proposal
                  </p>
                  
                  {selectedActivity.fallbackOptions.map(fallback => (
                    <div 
                      key={fallback.id}
                      className="p-4 bg-brand-50/40 border border-brand-100 rounded-[20px] flex justify-between items-start gap-4 hover:bg-brand-50 transition-all text-left"
                    >
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold bg-brand-100 border border-brand-200 text-brand-800 px-2 py-0.5 rounded-full inline-block uppercase select-none">
                          {fallback.category} Alternative proposal
                        </span>
                        <h6 className="text-xs font-extrabold text-slate-905 tracking-tight">{fallback.title}</h6>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{fallback.description}</p>
                        <span className="text-[10px] text-slate-400 italic block font-mono">Location: {fallback.location}</span>
                      </div>
                      
                      <button
                        type="button"
                        id={`select-pivot-fallback-btn-${fallback.id}`}
                        onClick={() => handlePivotAction(selectedActivity.id, "replace", fallback.id)}
                        disabled={isPivoting}
                        className="py-2 px-3.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white rounded-xl text-[10px] font-extrabold shrink-0 shadow-md shadow-brand-500/15 transition-all active:scale-95 cursor-pointer"
                      >
                        Swap
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-[11px] text-slate-400 italic text-center">No structural alternate reference available to swap.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
