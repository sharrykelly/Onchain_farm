import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "OnChain Farm — Agricultural Forward Contracts on Stacks",
  description: "Lock future produce prices on-chain. Protect farmers from price crashes. Guarantee supply for buyers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0A0A0F] text-[#F1F5F9] antialiased">
        <WalletProvider>
          <Navbar />
          <main>{children}</main>
          <footer className="mt-24 border-t border-[#1E1B4B] py-8 text-center text-sm text-[#94A3B8]">
            <p>OnChain Farm · Built on Stacks · Powered by Clarity Smart Contracts</p>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
