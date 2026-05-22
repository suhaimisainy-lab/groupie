import React, { useState, useEffect } from "react";
import { QuizQuestion, PreferenceResponse, InterestProfile } from "../types";
import { Check, ArrowRight, Compass, Sparkles, AlertCircle } from "lucide-react";

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (responses: PreferenceResponse) => void;
}

export default function QuizModal({ isOpen, onClose, onSubmit }: React.PropsWithChildren<QuizModalProps>) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<PreferenceResponse>({});
  const [isFinished, setIsFinished] = useState(false);
  const [calculatedProfile, setCalculatedProfile] = useState<InterestProfile>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch quiz questions from server
    fetch("/api/quiz-questions")
      .then((res) => res.json())
      .then((data) => setQuestions(data))
      .catch((err) => console.error("Error loading quiz questions", err));
  }, []);

  if (!isOpen || questions.length === 0) return null;

  const currentQuestion = questions[currentIndex];

  const handleAnswer = (choice: 'yes' | 'no') => {
    const updatedResponses = { ...responses, [currentQuestion.id]: choice };
    setResponses(updatedResponses);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Calculate temporary interest profile
      const tempProfile: { [category: string]: number } = {};
      const addCategory = (cat: string) => {
        tempProfile[cat] = (tempProfile[cat] || 0) + 1;
      };

      questions.forEach((q) => {
        const value = updatedResponses[q.id];
        if (value === "yes") {
          addCategory(q.yesCategory);
        } else {
          addCategory(q.noCategory);
        }
      });

      // Normalize percentages
      const finalProfile: InterestProfile = {};
      Object.keys(tempProfile).forEach((cat) => {
        finalProfile[cat] = Math.round((tempProfile[cat] / 2) * 100);
      });

      setCalculatedProfile(finalProfile);
      setIsFinished(true);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleFinalSubmit = async () => {
    setIsLoading(true);
    // Add small timeout for suspense and premium feel
    await new Promise((resolve) => setTimeout(resolve, 1000));
    onSubmit(responses);
    setIsLoading(false);
    setIsFinished(false);
    setCurrentIndex(0);
    setResponses({});
  };

  // List of interesting category descriptors
  const categoryDetails: { [key: string]: { desc: string, color: string } } = {
    Beach: { desc: "Warm sands, turquoise swims & coastal leisure", color: "bg-blue-500" },
    Mountain: { desc: "Crisp altitudes, epic ridges & alpine sights", color: "bg-emerald-600" },
    Urban: { desc: "Bustling subways, skyscraper skyline & neon strolls", color: "bg-indigo-600" },
    Nature: { desc: "Ancient forests, dynamic waterfalls & hiking trails", color: "bg-green-600" },
    Luxury: { desc: "Fine dining, elegant hospitality & designer boutiques", color: "bg-amber-500" },
    Budget: { desc: "Local food stalls, flea market finds & public pacing", color: "bg-teal-500" },
    Adventure: { desc: "High adrenaline loops, ATV excursions & swings", color: "bg-rose-500" },
    Relaxation: { desc: "Mineral thermal pools, canopy yoga & wellness massages", color: "bg-cyan-500" },
    Culture: { desc: "Invaluable ancient temples, structures & ruins tours", color: "bg-violet-500" },
    Entertainment: { desc: "Live bands, dynamic music clubs, bars & night exploration", color: "bg-purple-500" },
    Structured: { desc: "Perfect hour-by-hour pacing & premium tours", color: "bg-slate-700" },
    Spontaneous: { desc: "Unplanned dirt roads & local surprises", color: "bg-orange-500" }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div 
        id="quiz-modal-container"
        className="bg-white rounded-[32px] overflow-hidden shadow-2xl shadow-slate-950/20 max-w-lg w-full border border-slate-200 flex flex-col min-h-[520px] max-h-[90vh] animate-fade-in"
      >
        {!isFinished ? (
          <>
            {/* Visual Header */}
            <div className="relative h-64 bg-slate-900 overflow-hidden">
              <img 
                src={currentQuestion.imageSrc} 
                alt="travel theme" 
                className="w-full h-full object-cover opacity-80 scale-105 transition-all duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/45 to-transparent" />
              
              {/* Top info */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white">
                <span className="text-xs font-bold tracking-widest uppercase bg-black/40 px-3.5 py-1.5 rounded-full backdrop-blur-md">
                  Vibe check • {currentIndex + 1} of {questions.length}
                </span>
                <button 
                  onClick={onClose}
                  className="bg-black/40 hover:bg-black/60 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all focus:outline-none"
                >
                  ✕
                </button>
              </div>

              {/* Quiz question overlay */}
              <div className="absolute bottom-5 left-6 right-6">
                <h3 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-white drop-shadow-md leading-snug">
                  {currentQuestion.question}
                </h3>
              </div>
            </div>

            {/* Micro Progress Bar */}
            <div className="w-full bg-slate-100 h-1.5">
              <div 
                className="bg-brand-600 h-1.5 transition-all duration-300" 
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Binary Choices */}
            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <p className="text-xs text-slate-400 uppercase tracking-widest text-center font-bold">
                Tap your instinct
              </p>

              <div className="grid grid-cols-1 gap-3">
                <button
                  id={`quiz-option-yes-${currentQuestion.id}`}
                  onClick={() => handleAnswer("yes")}
                  className="w-full text-left p-4.5 rounded-2xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 transition-all font-semibold text-sm flex items-center justify-between group active:scale-[0.99] focus:outline-none shadow-sm"
                >
                  <span className="text-slate-800 leading-relaxed">{currentQuestion.optionYes}</span>
                  <span className="text-brand-500 bg-brand-50 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>

                <button
                  id={`quiz-option-no-${currentQuestion.id}`}
                  onClick={() => handleAnswer("no")}
                  className="w-full text-left p-4.5 rounded-2xl border border-slate-200 hover:border-accent-500 hover:bg-rose-50/30 transition-all font-semibold text-sm flex items-center justify-between group active:scale-[0.99] focus:outline-none shadow-sm"
                >
                  <span className="text-slate-800 leading-relaxed">{currentQuestion.optionNo}</span>
                  <span className="text-accent-500 bg-rose-50 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              </div>

              {/* Navigation Back */}
              <div className="flex justify-between items-center text-xs text-slate-400 border-t border-slate-100 pt-4 mt-2 font-semibold">
                <button 
                  onClick={handleBack}
                  disabled={currentIndex === 0}
                  className="hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-400 py-1 transition-all"
                >
                  ← Go back
                </button>
                <span>Instinct score: {Object.keys(responses).length} recorded</span>
              </div>
            </div>
          </>
        ) : (
          /* Finished Screen: Review calculated scores before final commit */
          <div className="p-8 flex flex-col justify-between flex-1 space-y-6">
            <div className="text-center">
              <div className="bg-emerald-50 p-3.5 rounded-2xl inline-block mb-3 border border-emerald-100">
                <Check className="h-8 w-8 text-emerald-600 animate-bounce" />
              </div>
              <h3 className="text-2xl font-black font-display text-slate-900 tracking-tight">
                Instinct Profile Matched!
              </h3>
              <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                Based on your binary visual responses, we've parsed your travel archetype percentages. Check if this looks like you!
              </p>
            </div>

            {/* Calculated Profiles List */}
            <div className="space-y-4 bg-slate-55 p-4 rounded-2xl border border-slate-200 max-h-[260px] overflow-y-auto">
              {Object.keys(calculatedProfile).map((cat) => {
                const pct = calculatedProfile[cat];
                const detail = categoryDetails[cat] || { desc: "Travel preference score", color: "bg-brand-500" };
                return (
                  <div key={cat} className="space-y-1.5" id={`archetype-bar-${cat}`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700 flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${detail.color}`} />
                        {cat}
                      </span>
                      <span className="text-slate-900 font-mono text-[11px]">{pct}% match</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${detail.color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 italic font-semibold leading-normal">
                      {detail.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <button
                id="submit-interest-profile-btn"
                onClick={handleFinalSubmit}
                disabled={isLoading}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white py-3.5 px-6 rounded-2xl font-bold text-sm shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 active:scale-[0.99] transition-all focus:outline-none"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving Profile encrypted...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Submit Interest Profile</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsFinished(false)}
                disabled={isLoading}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-2xl font-extrabold text-xs transition-all focus:outline-none"
              >
                Retake Quiz
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
