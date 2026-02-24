"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "./WalletProvider";
import { truncateAddress } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Marketplace" },
  { href: "/farmer", label: "Farmer" },
  { href: "/buyer", label: "Buyer" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { connected, address, connect, disconnect } = useWallet();

  return (
    <nav className="sticky top-0 z-50 border-b border-[#1E1B4B] bg-[#0A0A0F]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl">🌾</span>
            <span className="font-bold text-lg tracking-tight text-white group-hover:text-[#A78BFA] transition-colors">
              OnChain<span className="text-[#7C3AED]">Farm</span>
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/30"
                      : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Wallet */}
          <div className="flex items-center gap-3">
            {connected && address ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111118] border border-[#1E1B4B]">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                  <span className="text-sm font-mono text-[#94A3B8]">
                    {truncateAddress(address)}
                  </span>
                </div>
                <button
                  onClick={disconnect}
                  className="px-3 py-1.5 text-sm rounded-lg border border-[#1E1B4B] text-[#94A3B8] hover:text-[#EF4444] hover:border-[#EF4444]/30 transition-all"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)]"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
