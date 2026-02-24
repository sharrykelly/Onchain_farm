"use client";

import { useState, useEffect } from "react";
import ContractCard from "@/components/ContractCard";
import PurchaseModal from "@/components/PurchaseModal";
import { getAllContracts, ForwardContract } from "@/lib/stacks";
import { useWallet } from "@/components/WalletProvider";
import { STATUS } from "@/lib/constants";
import { microToSTX } from "@/lib/utils";

const FILTERS = ["All", "Open", "Purchased", "Fulfilled", "Resolved"];

export default function MarketplacePage() {
  const { connected, connect } = useWallet();
  const [contracts, setContracts] = useState<ForwardContract[]>([]);
  const [filter, setFilter] = useState("Open");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<ForwardContract | null>(null);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const all = await getAllContracts();
      setContracts(all);
    } catch {
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadContracts(); }, []);

  const totalVolume = contracts.reduce((sum, c) => sum + c.totalPrice, 0);
  const openCount = contracts.filter((c) => c.status === STATUS.OPEN).length;

  const filtered = contracts.filter((c) => {
    const matchFilter =
      filter === "All" ||
      (filter === "Open" && c.status === STATUS.OPEN) ||
      (filter === "Purchased" && c.status === STATUS.PURCHASED) ||
      (filter === "Fulfilled" && c.status === STATUS.FULFILLED) ||
      (filter === "Resolved" && c.status === STATUS.RESOLVED);
    const matchSearch = !search || c.produceType.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <div className="relative mb-16 text-center overflow-hidden rounded-2xl border border-[#1E1B4B] bg-[#111118] px-8 py-16">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-[#06B6D4]/10 pointer-events-none" />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#7C3AED]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/30 mb-6">
            🌾 Live on Stacks Blockchain
          </span>
          <h1 className="text-5xl font-black text-white mb-4 tracking-tight leading-tight">
            Farm Forward<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#06B6D4]">
              Contracts
            </span>
          </h1>
          <p className="text-lg text-[#94A3B8] max-w-xl mx-auto mb-8">
            Lock future produce prices on-chain. Farmers get price certainty. Buyers get supply guarantees. Zero middlemen.
          </p>
          {!connected && (
            <button
              onClick={connect}
              className="px-8 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-lg transition-all shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:shadow-[0_0_50px_rgba(124,58,237,0.6)]"
            >
              Connect Wallet to Start
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: "Total Contracts", value: contracts.length.toString(), color: "text-[#A78BFA]" },
          { label: "Open Listings", value: openCount.toString(), color: "text-[#67E8F9]" },
          { label: "Total Volume", value: `${microToSTX(totalVolume)} STX`, color: "text-[#10B981]" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[#1E1B4B] bg-[#111118] p-5 text-center">
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-sm text-[#94A3B8] mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? "bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/30"
                  : "text-[#94A3B8] hover:text-white border border-transparent hover:border-[#1E1B4B]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search produce…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-lg bg-[#111118] border border-[#1E1B4B] text-white placeholder-[#4B5563] focus:border-[#7C3AED] focus:outline-none text-sm w-full sm:w-56 transition-colors"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-[#1E1B4B] bg-[#111118] p-5 h-64 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-5xl mb-4">🌱</p>
          <p className="text-[#94A3B8] text-lg">No contracts found</p>
          <p className="text-[#94A3B8] text-sm mt-1">
            {filter === "Open" ? "No open listings yet." : "Try a different filter."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c) => (
            <ContractCard
              key={c.id}
              contract={c}
              action={
                c.status === STATUS.OPEN && connected ? (
                  <button
                    onClick={() => setPurchasing(c)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-[#06B6D4]/20 text-[#67E8F9] border border-[#06B6D4]/30 hover:bg-[#06B6D4]/30 transition-all font-medium"
                  >
                    Buy
                  </button>
                ) : null
              }
            />
          ))}
        </div>
      )}

      {purchasing && (
        <PurchaseModal
          contract={purchasing}
          onClose={() => setPurchasing(null)}
          onSuccess={loadContracts}
        />
      )}
    </div>
  );
}
