"use client";

import Link from "next/link";
import StatusBadge from "./StatusBadge";
import { ForwardContract } from "@/lib/stacks";
import { microToSTX, truncateAddress, blockToEstimatedDate } from "@/lib/utils";
import { getProduceIcon } from "@/lib/constants";

interface ContractCardProps {
  contract: ForwardContract;
  currentBlock?: number;
  action?: React.ReactNode;
}

export default function ContractCard({ contract, currentBlock = 0, action }: ContractCardProps) {
  const icon = getProduceIcon(contract.produceType);
  const deliveryLabel = blockToEstimatedDate(contract.deliveryDate, currentBlock);
  const totalSTX = microToSTX(contract.totalPrice);
  const priceSTX = microToSTX(contract.pricePerUnit);

  return (
    <div className="group relative rounded-xl border border-[#1E1B4B] bg-[#111118] p-5 hover:border-[#7C3AED]/50 transition-all duration-200 shadow-[0_4px_24px_rgba(0,0,0,0.4)] hover:shadow-[0_4px_32px_rgba(124,58,237,0.15)] animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1E1B4B] flex items-center justify-center text-xl">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-white capitalize">{contract.produceType}</h3>
            <p className="text-xs text-[#94A3B8]">Contract #{contract.id}</p>
          </div>
        </div>
        <StatusBadge status={contract.status} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-[#0A0A0F] p-3">
          <p className="text-xs text-[#94A3B8] mb-0.5">Quantity</p>
          <p className="font-semibold text-white text-sm">{contract.quantity.toLocaleString()} kg</p>
        </div>
        <div className="rounded-lg bg-[#0A0A0F] p-3">
          <p className="text-xs text-[#94A3B8] mb-0.5">Price / unit</p>
          <p className="font-semibold text-[#06B6D4] text-sm">{priceSTX} STX</p>
        </div>
        <div className="rounded-lg bg-[#0A0A0F] p-3">
          <p className="text-xs text-[#94A3B8] mb-0.5">Total Value</p>
          <p className="font-semibold text-[#A78BFA] text-sm">{totalSTX} STX</p>
        </div>
        <div className="rounded-lg bg-[#0A0A0F] p-3">
          <p className="text-xs text-[#94A3B8] mb-0.5">Delivery Date</p>
          <p className="font-semibold text-white text-sm text-ellipsis overflow-hidden whitespace-nowrap">{deliveryLabel}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[#1E1B4B]">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-[#94A3B8]">
            Farmer: <span className="font-mono text-[#F1F5F9]">{truncateAddress(contract.farmer)}</span>
          </p>
          {contract.buyer && (
            <p className="text-xs text-[#94A3B8]">
              Buyer: <span className="font-mono text-[#F1F5F9]">{truncateAddress(contract.buyer)}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {action}
          <Link
            href={`/contract/${contract.id}`}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#1E1B4B] text-[#94A3B8] hover:text-white hover:border-[#7C3AED]/50 transition-all"
          >
            Details →
          </Link>
        </div>
      </div>
    </div>
  );
}
