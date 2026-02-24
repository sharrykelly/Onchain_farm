"use client";

import { useState } from "react";
import { raiseDispute } from "@/lib/stacks";

interface Props {
  contractId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DisputeModal({ contractId, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) { setError("Please provide a reason."); return; }
    setLoading(true);
    setError("");
    try {
      await raiseDispute(contractId, reason.slice(0, 500), () => { onSuccess(); onClose(); });
    } catch {
      setError("Transaction failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-[#111118] shadow-[0_0_60px_rgba(239,68,68,0.15)] animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-[#1E1B4B]">
          <div>
            <h2 className="text-lg font-bold text-white">Raise Dispute</h2>
            <p className="text-sm text-[#94A3B8] mt-0.5">Contract #{contractId}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/5 transition-all">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
            <p className="text-sm text-red-300">
              ⚠ This will freeze the contract and escalate to admin arbitration. Only use if the delivery was not fulfilled as agreed.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-1.5">Reason for dispute</label>
            <textarea
              rows={4}
              maxLength={500}
              placeholder="Describe the issue clearly (e.g. wrong produce type, quantity short, quality below standard)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-[#0A0A0F] border border-[#1E1B4B] text-white placeholder-[#4B5563] focus:border-red-500/50 focus:outline-none transition-colors resize-none text-sm"
            />
            <p className="text-xs text-[#94A3B8] mt-1 text-right">{reason.length}/500</p>
          </div>
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#1E1B4B] text-[#94A3B8] hover:text-white transition-all text-sm font-medium">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold transition-all">
              {loading ? "Submitting…" : "Raise Dispute"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
