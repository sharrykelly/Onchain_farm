"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getContract, ForwardContract,
  fulfillContract, confirmDelivery, cancelContract, autoReleaseFunds, resolveDispute,
} from "@/lib/stacks";
import { useWallet } from "@/components/WalletProvider";
import StatusBadge from "@/components/StatusBadge";
import DisputeModal from "@/components/DisputeModal";
import { microToSTX, truncateAddress, blockToEstimatedDate, calcPlatformFee } from "@/lib/utils";
import { getProduceIcon, STATUS } from "@/lib/constants";

const STEPS = [
  { status: STATUS.OPEN, label: "Listed" },
  { status: STATUS.PURCHASED, label: "Purchased" },
  { status: STATUS.FULFILLED, label: "Delivered" },
  { status: STATUS.RESOLVED, label: "Resolved" },
];

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useWallet();
  const [contract, setContract] = useState<ForwardContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [currentBlock] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const c = await getContract(Number(id));
      setContract(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-2xl border border-[#1E1B4B] bg-[#111118] h-96 animate-pulse" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-5xl">❓</p>
        <p className="text-xl text-white">Contract not found</p>
        <Link href="/" className="text-[#7C3AED] hover:underline">← Back to Marketplace</Link>
      </div>
    );
  }

  const isFarmer = address === contract.farmer;
  const isBuyer = address === contract.buyer;
  const currentStepIndex = contract.status === STATUS.CANCELLED || contract.status === STATUS.DISPUTED
    ? -1
    : STEPS.findIndex((s) => s.status === contract.status);

  const doAction = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    try { await fn(); } finally { setActionLoading(false); }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      {/* Back */}
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-[#94A3B8] hover:text-white mb-8 transition-colors">
        ← Back to Marketplace
      </Link>

      {/* Header card */}
      <div className="rounded-2xl border border-[#1E1B4B] bg-[#111118] p-8 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/5 via-transparent to-[#06B6D4]/5 pointer-events-none" />
        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#1E1B4B] flex items-center justify-center text-3xl">
                {getProduceIcon(contract.produceType)}
              </div>
              <div>
                <h1 className="text-2xl font-black text-white capitalize">{contract.produceType}</h1>
                <p className="text-[#94A3B8] text-sm mt-0.5">Contract #{contract.id}</p>
              </div>
            </div>
            <StatusBadge status={contract.status} />
          </div>

          {/* Status timeline */}
          {contract.status !== STATUS.CANCELLED && contract.status !== STATUS.DISPUTED && (
            <div className="flex items-center gap-0 mb-6">
              {STEPS.map((step, i) => {
                const done = i <= currentStepIndex;
                const active = i === currentStepIndex;
                return (
                  <div key={step.label} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                        done ? "bg-[#7C3AED] border-[#7C3AED] text-white" : "border-[#1E1B4B] text-[#94A3B8]"
                      } ${active ? "shadow-[0_0_12px_rgba(124,58,237,0.6)]" : ""}`}>
                        {done ? "✓" : i + 1}
                      </div>
                      <span className={`text-xs font-medium ${done ? "text-[#A78BFA]" : "text-[#94A3B8]"}`}>{step.label}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mb-5 mx-1 transition-all ${i < currentStepIndex ? "bg-[#7C3AED]" : "bg-[#1E1B4B]"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Main grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "Quantity", value: `${contract.quantity.toLocaleString()} kg` },
              { label: "Price / unit", value: `${microToSTX(contract.pricePerUnit)} STX`, highlight: true },
              { label: "Total Value", value: `${microToSTX(contract.totalPrice)} STX`, accent: true },
              { label: "Platform Fee", value: `${microToSTX(calcPlatformFee(contract.totalPrice))} STX` },
              { label: "Delivery Date", value: blockToEstimatedDate(contract.deliveryDate, currentBlock) },
              { label: "Block Height", value: `#${contract.deliveryDate}` },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-[#0A0A0F] border border-[#1E1B4B] p-4">
                <p className="text-xs text-[#94A3B8] mb-1">{item.label}</p>
                <p className={`font-bold text-sm ${item.accent ? "text-[#A78BFA]" : item.highlight ? "text-[#67E8F9]" : "text-white"}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Parties card */}
      <div className="rounded-2xl border border-[#1E1B4B] bg-[#111118] p-6 mb-6">
        <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">Parties</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-[#1E1B4B]">
            <div className="flex items-center gap-2">
              <span className="text-lg">👨‍🌾</span>
              <span className="text-sm text-[#94A3B8]">Farmer</span>
              {isFarmer && <span className="text-xs px-2 py-0.5 rounded-full bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/30">You</span>}
            </div>
            <span className="font-mono text-sm text-white">{truncateAddress(contract.farmer, 10)}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛒</span>
              <span className="text-sm text-[#94A3B8]">Buyer</span>
              {isBuyer && <span className="text-xs px-2 py-0.5 rounded-full bg-[#06B6D4]/20 text-[#67E8F9] border border-[#06B6D4]/30">You</span>}
            </div>
            <span className="font-mono text-sm text-white">
              {contract.buyer ? truncateAddress(contract.buyer, 10) : <span className="text-[#4B5563] italic">Not yet purchased</span>}
            </span>
          </div>
        </div>
      </div>

      {/* Dispute / Resolution notes */}
      {contract.disputeReason && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 mb-6">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">Dispute Reason</h2>
          <p className="text-[#F1F5F9] text-sm">{contract.disputeReason}</p>
        </div>
      )}
      {contract.resolutionNotes && (
        <div className="rounded-2xl border border-[#10B981]/20 bg-[#10B981]/5 p-6 mb-6">
          <h2 className="text-sm font-semibold text-[#10B981] uppercase tracking-wider mb-2">Resolution Notes</h2>
          <p className="text-[#F1F5F9] text-sm">{contract.resolutionNotes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="rounded-2xl border border-[#1E1B4B] bg-[#111118] p-6">
        <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          {isFarmer && contract.status === STATUS.PURCHASED && (
            <button
              onClick={() => doAction(() => fulfillContract(contract.id, load))}
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white font-semibold text-sm transition-all"
            >
              {actionLoading ? "Submitting…" : "Mark as Fulfilled"}
            </button>
          )}
          {isFarmer && contract.status === STATUS.OPEN && (
            <button
              onClick={() => doAction(() => cancelContract(contract.id, load))}
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/20 disabled:opacity-50 text-red-400 font-semibold text-sm transition-all"
            >
              {actionLoading ? "Submitting…" : "Cancel Contract"}
            </button>
          )}
          {isBuyer && contract.status === STATUS.FULFILLED && (
            <>
              <button
                onClick={() => doAction(() => confirmDelivery(contract.id, load))}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-[#06B6D4] hover:bg-[#0891B2] disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                {actionLoading ? "Submitting…" : "Confirm Delivery"}
              </button>
              <button
                onClick={() => setDisputing(true)}
                className="px-5 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/20 text-red-400 font-semibold text-sm transition-all"
              >
                Raise Dispute
              </button>
            </>
          )}
          {contract.status === STATUS.FULFILLED && (
            <button
              onClick={() => doAction(() => autoReleaseFunds(contract.id, load))}
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-xl border border-[#1E1B4B] text-[#94A3B8] hover:text-white hover:border-[#7C3AED]/30 disabled:opacity-50 font-semibold text-sm transition-all"
            >
              {actionLoading ? "…" : "Auto-Release Funds"}
            </button>
          )}
          {!isFarmer && !isBuyer && contract.status === STATUS.DISPUTED && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => doAction(() => resolveDispute(contract.id, true, "Admin resolved in favour of farmer.", load))}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white font-semibold text-sm transition-all"
              >
                Release to Farmer
              </button>
              <button
                onClick={() => doAction(() => resolveDispute(contract.id, false, "Admin resolved in favour of buyer.", load))}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-[#06B6D4] hover:bg-[#0891B2] disabled:opacity-50 text-white font-semibold text-sm transition-all"
              >
                Refund Buyer
              </button>
            </div>
          )}
          {contract.status === STATUS.RESOLVED && (
            <div className="flex items-center gap-2 text-[#10B981]">
              <span>✓</span>
              <span className="text-sm font-medium">This contract has been resolved</span>
            </div>
          )}
          {contract.status === STATUS.CANCELLED && (
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <span>✕</span>
              <span className="text-sm">This contract was cancelled</span>
            </div>
          )}
        </div>
      </div>

      {disputing && (
        <DisputeModal
          contractId={contract.id}
          onClose={() => setDisputing(false)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
