import React, { useState } from "react";
import { Plus, X, Calendar, MapPin, Users, Mail, Sparkles } from "lucide-react";

interface TripCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  organiserId: string;
  organiserName: string;
  onTripCreated: () => void;
}

export default function TripCreator({ isOpen, onClose, organiserId, organiserName, onTripCreated }: TripCreatorProps) {
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 16) // Default 5 days deadline
  );
  
  // Dynamic list of invite emails
  const [emailInput, setEmailInput] = useState("");
  const [emailsList, setEmailsList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorStr, setErrorStr] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMail = emailInput.trim();
    if (cleanMail && !emailsList.includes(cleanMail)) {
      if (cleanMail.includes("@")) {
        setEmailsList([...emailsList, cleanMail]);
        setEmailInput("");
      } else {
        alert("Please enter a valid email address.");
      }
    }
  };

  const handleRemoveEmail = (idx: number) => {
    setEmailsList(emailsList.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !destination.trim()) {
      setErrorStr("Trip Name and Destination are required!");
      return;
    }

    setIsLoading(true);
    setErrorStr(null);

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          destination: destination.trim(),
          description: description.trim(),
          organiserId,
          organiserName,
          invites: emailsList,
          deadline
        })
      });

      if (!res.ok) {
        let errorMsg = "Could not create dynamic group.";
        try {
          const errData = await res.json();
          if (errData.error) errorMsg = errData.error;
        } catch (e) {
          try {
            const rawText = await res.text();
            if (rawText) errorMsg = rawText;
          } catch (e2) {}
        }
        throw new Error(errorMsg);
      }
      
      onTripCreated();
      onClose();
      // Reset
      setName("");
      setDestination("");
      setDescription("");
      setEmailsList([]);
    } catch (err: any) {
      setErrorStr(err.message || "Failed to submit.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div 
        id="trip-creator-container"
        className="bg-white rounded-[32px] overflow-hidden shadow-2xl shadow-slate-950/20 max-w-lg w-full border border-slate-200 flex flex-col max-h-[90vh] animate-fade-in"
      >
        <div className="p-8 border-b border-slate-250 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-brand-600" />
            <h2 className="text-xl font-bold font-display text-slate-900 tracking-tight">
              New Trip Collection Setup
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-all"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 flex-1 overflow-y-auto space-y-5">
          {errorStr && (
            <p className="text-xs text-red-500 font-semibold bg-red-50 p-3 rounded-2xl border border-red-100">
              {errorStr}
            </p>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Trip Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Amalfi Summer Escape 🍋"
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-slate-50/50 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400" /> Destination
              </label>
              <input
                type="text"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Positano, Italy"
                className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-slate-50/50 transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-400" /> Deadline Date
              </label>
              <input
                type="datetime-local"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-slate-50/50 text-slate-700 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Trip Vision &amp; Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="e.g. Splitting pizzas, beach loungers &amp; sunset terraces. Seeking a chill, gorgeous retreat."
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-slate-50/50 resize-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Invitation setup */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-slate-400" /> Invite Friends (Add Invitees)
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="friend@example.com"
                className="flex-1 px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-slate-50/30 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={handleAddEmail}
                className="bg-slate-100 hover:bg-slate-200 text-slate-750 px-5 py-3.5 rounded-2xl text-xs font-bold transition-all border border-slate-200 focus:outline-none"
              >
                Add Link
              </button>
            </div>

            {/* Invited email list bubbles */}
            <div className="flex flex-wrap gap-1.5 mt-3 min-h-[44px] p-2.5 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              {emailsList.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic p-1">No separate friends invited yet. We'll pre-add your organizer email.</span>
              ) : (
                emailsList.map((mail, idx) => (
                  <span 
                    key={mail} 
                    className="inline-flex items-center gap-1 py-1 pl-3 pr-2 bg-brand-50 border border-brand-100 text-[11px] text-brand-900 rounded-full font-bold"
                  >
                    <Mail className="h-3 w-3 text-brand-600" />
                    {mail}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveEmail(idx)}
                      className="hover:bg-brand-200 hover:text-brand-950 rounded-full p-0.5 transition-all text-brand-600 text-xs"
                    >
                      ✕
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="pt-5 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-2xl text-xs font-extrabold transition-all focus:outline-none active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-create-group-btn"
              disabled={isLoading}
              className="bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white px-6 py-3 rounded-2xl text-xs font-extrabold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2 focus:outline-none active:scale-95"
            >
              {isLoading ? "Creating..." : "Launch Preferences Board"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
