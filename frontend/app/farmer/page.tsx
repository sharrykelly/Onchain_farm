"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/components/WalletProvider";
import ContractCard from "@/components/ContractCard";
import CreateContractModal from "@/components/CreateContractModal";
import { getFarmerContracts, fulfillContract, cancelContract, ForwardContract } from "@/lib/stacks";
import { STATUS } from "@/lib/constants";

const TABS = ["Active", "Fulfilled", "Cancelled"] as const;
type Tab = typeof TABS[number];

export default function FarmerPage() {
  const { connected, address, connect } = useWallet();
  const [contracts, setContracts] = useState<ForwardContract[]>([]);
  const [tab, setTab] = useState<Tab>("Active");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [currentBlock] = useState(0);

  const load = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const data = await getFarmerContracts(address);
      setContracts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (connected) load(); }, [connected, address]);

  const filtered = contracts.filter((c) => {
    if (tab === "Active") return c.status === STATUS.OPEN || c.status === STATUS.PURCHASED || c.status === STATUS.FULFILLED || c.status === STATUS.DISPUTED;
    if (tab === "Fulfilled") return c.status === STATUS.RESOLVED;
    if (tab === "Cancelled") return c.status === STATUS.CANCELLED;
    return true;
  });

  const handleFulfill = async (id: number) => {
    setActionLoading(id);
    try {
      await fulfillContract(id, load);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: number) => {
    setActionLoading(id);
    try {
      await cancelContract(id, load);
    } finally {
      setActionLoading(null);
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <span className="text-6xl">👨‍🌾</span>
        <h2 className="text-2xl font-bold text-white">Farmer Dashboard</h2>
        <p className="text-[#94A3B8] text-center max-w-sm">Connect your wallet to create and manage your agricultural forward contracts.</p>
        <button onClick={connect} className="px-6 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)]">
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-black text-white">Farmer Dashboard</h1>
          <p className="text-[#94A3B8] mt-1">Manage your forward contracts and track deliveries</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] flex items-center gap-2"
        >
          <span>+</span> Create Contract
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        {[
          { label: "Total Listed", value: contracts.length, color: "text-[#A78BFA]" },
          { label: "Open", value: contracts.filter(c => c.status === STATUS.OPEN).length, color: "text-[#67E8F9]" },
          { label: "Purchased", value: contracts.filter(c => c.status === STATUS.PURCHASED).length, color: "text-[#F59E0B]" },
          { label: "Resolved", value: contracts.filter(c => c.status === STATUS.RESOLVED).length, color: "text-[#10B981]" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#1E1B4B] bg-[#111118] p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-[#94A3B8] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#1E1B4B]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium transition-all -mb-px ${
              tab === t
                ? "border-b-2 border-[#7C3AED] text-[#A78BFA]"
                : "text-[#94A3B8] hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <div key={i} className="rounded-xl border border-[#1E1B4B] bg-[#111118] h-64 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-[#94A3B8]">No contracts in this category yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c) => (
            <ContractCard
              key={c.id}
              contract={c}
              currentBlock={currentBlock}
              action={
                <div className="flex gap-2">
                  {c.status === STATUS.PURCHASED && (
                    <button
                      onClick={() => handleFulfill(c.id)}
                      disabled={actionLoading === c.id}
                      className="px-3 py-1.5 text-xs rounded-lg bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 hover:bg-[#10B981]/30 transition-all font-medium disabled:opacity-50"
                    >
                      {actionLoading === c.id ? "…" : "Fulfill"}
                    </button>
                  )}
                  {c.status === STATUS.OPEN && (
                    <button
                      onClick={() => handleCancel(c.id)}
                      disabled={actionLoading === c.id}
                      className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all font-medium disabled:opacity-50"
                    >
                      {actionLoading === c.id ? "…" : "Cancel"}
                    </button>
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}

      {creating && (
        <CreateContractModal
          currentBlock={currentBlock}
          onClose={() => setCreating(false)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
