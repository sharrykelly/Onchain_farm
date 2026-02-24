"use client";

import { useState } from "react";
import { createForwardContract } from "@/lib/stacks";
import { stxToMicro } from "@/lib/utils";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  currentBlock: number;
}

export default function CreateContractModal({ onClose, onSuccess, currentBlock }: Props) {
  const [form, setForm] = useState({
    produceType: "",
    quantity: "",
    pricePerUnit: "",
    deliveryBlocks: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.produceType || !form.quantity || !form.pricePerUnit || !form.deliveryBlocks) {
      setError("All fields are required.");
      return;
    }
    const deliveryDate = currentBlock + Number(form.deliveryBlocks);
    const priceMicro = stxToMicro(Number(form.pricePerUnit));
    setLoading(true);
    try {
      await createForwardContract(
        form.produceType.slice(0, 50),
        Number(form.quantity),
        priceMicro,
        deliveryDate,
        () => { onSuccess(); onClose(); }
      );
    } catch (err) {
      setError("Transaction failed. Make sure your wallet is connected.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-[#1E1B4B] bg-[#111118] shadow-[0_0_60px_rgba(124,58,237,0.2)] animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1E1B4B]">
          <div>
            <h2 className="text-lg font-bold text-white">Create Forward Contract</h2>
            <p className="text-sm text-[#94A3B8] mt-0.5">List your future produce on-chain</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/5 transition-all">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-1.5">Produce Type</label>
            <input
              type="text"
              placeholder="e.g. Organic Tomatoes"
              maxLength={50}
              value={form.produceType}
              onChange={(e) => setForm({ ...form, produceType: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg bg-[#0A0A0F] border border-[#1E1B4B] text-white placeholder-[#4B5563] focus:border-[#7C3AED] focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-1.5">Quantity (kg)</label>
              <input
                type="number"
                min="1"
                placeholder="1000"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0A0A0F] border border-[#1E1B4B] text-white placeholder-[#4B5563] focus:border-[#7C3AED] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#94A3B8] mb-1.5">Price / unit (STX)</label>
              <input
                type="number"
                min="0.000001"
                step="0.01"
                placeholder="0.05"
                value={form.pricePerUnit}
                onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0A0A0F] border border-[#1E1B4B] text-white placeholder-[#4B5563] focus:border-[#7C3AED] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-1.5">
              Delivery Window (blocks from now)
            </label>
            <input
              type="number"
              min="10"
              placeholder="1440  (~10 days on mainnet)"
              value={form.deliveryBlocks}
              onChange={(e) => setForm({ ...form, deliveryBlocks: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg bg-[#0A0A0F] border border-[#1E1B4B] text-white placeholder-[#4B5563] focus:border-[#7C3AED] focus:outline-none transition-colors"
            />
            {form.deliveryBlocks && (
              <p className="text-xs text-[#94A3B8] mt-1">
                Delivery block: #{currentBlock + Number(form.deliveryBlocks)}
              </p>
            )}
          </div>

          {/* Summary */}
          {form.quantity && form.pricePerUnit && (
            <div className="rounded-lg bg-[#0A0A0F] border border-[#1E1B4B] p-4 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[#94A3B8]">Total value</span>
                <span className="text-[#A78BFA] font-semibold">
                  {(Number(form.quantity) * Number(form.pricePerUnit)).toLocaleString()} STX
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-[#1E1B4B] text-[#94A3B8] hover:text-white hover:border-[#7C3AED]/30 transition-all text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)]"
            >
              {loading ? "Submitting…" : "Create Contract"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
