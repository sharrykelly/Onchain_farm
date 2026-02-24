"use client";

import { useState } from "react";
import { purchaseContract, ForwardContract } from "@/lib/stacks";
import { microToSTX, calcPlatformFee, calcTotalWithFee } from "@/lib/utils";
import { getProduceIcon } from "@/lib/constants";
import StatusBadge from "./StatusBadge";

interface Props {
  contract: ForwardContract;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PurchaseModal({ contract, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fee = calcPlatformFee(contract.totalPrice);
  const totalRequired = calcTotalWithFee(contract.totalPrice);

  const handlePurchase = async () => {
    setError("");
    setLoading(true);
    try {
      await purchaseContract(contract.id, () => { onSuccess(); onClose(); });
    } catch {
      setError("Transaction failed. Make sure your wallet is connected and has sufficient STX.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-[#1E1B4B] bg-[#111118] shadow-[0_0_60px_rgba(6,182,212,0.15)] animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-[#1E1B4B]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getProduceIcon(contract.produceType)}</span>
            <div>
              <h2 className="text-lg font-bold text-white capitalize">{contract.produceType}</h2>
              <p className="text-sm text-[#94A3B8]">Contract #{contract.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/5 transition-all">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Details */}
          <div className="rounded-lg bg-[#0A0A0F] border border-[#1E1B4B] p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#94A3B8]">Quantity</span>
              <span className="text-white font-medium">{contract.quantity.toLocaleString()} kg</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#94A3B8]">Price / unit</span>
              <span className="text-white font-medium">{microToSTX(contract.pricePerUnit)} STX</span>
            </div>
            <div className="h-px bg-[#1E1B4B]" />
            <div className="flex justify-between text-sm">
              <span className="text-[#94A3B8]">Contract value</span>
              <span className="text-[#A78BFA] font-semibold">{microToSTX(contract.totalPrice)} STX</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#94A3B8]">Platform fee (0.5%)</span>
              <span className="text-[#94A3B8]">{microToSTX(fee)} STX</span>
            </div>
            <div className="h-px bg-[#1E1B4B]" />
            <div className="flex justify-between text-sm font-bold">
              <span className="text-white">Total you pay</span>
              <span className="text-[#06B6D4]">{microToSTX(totalRequired)} STX</span>
            </div>
          </div>

          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Your STX will be held in escrow until delivery is confirmed. You have a 7-day dispute window after the farmer marks delivery as complete.
          </p>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-[#1E1B4B] text-[#94A3B8] hover:text-white transition-all text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handlePurchase}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#06B6D4] hover:bg-[#0891B2] disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
              {loading ? "Submitting…" : `Lock ${microToSTX(totalRequired)} STX`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
