import { MICRO_PER_STX, PLATFORM_FEE_BPS } from "./constants";

export function microToSTX(micro: number | bigint): string {
  const n = typeof micro === "bigint" ? Number(micro) : micro;
  return (n / MICRO_PER_STX).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}

export function stxToMicro(stx: number): number {
  return Math.round(stx * MICRO_PER_STX);
}

export function truncateAddress(address: string, chars = 6): string {
  if (!address) return "";
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
}

/** Rough estimate: Stacks mainnet ~10 min/block, devnet ~1-2 sec */
export function blockToEstimatedDate(
  targetBlock: number,
  currentBlock: number,
  network = "devnet"
): string {
  const secondsPerBlock = network === "devnet" ? 2 : 600;
  const blocksRemaining = targetBlock - currentBlock;
  if (blocksRemaining <= 0) return "Delivery date passed";
  const secondsRemaining = blocksRemaining * secondsPerBlock;
  const now = new Date();
  const target = new Date(now.getTime() + secondsRemaining * 1000);
  return target.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function calcPlatformFee(totalMicro: number): number {
  return Math.floor((totalMicro * PLATFORM_FEE_BPS) / 10_000);
}

export function calcTotalWithFee(totalMicro: number): number {
  return totalMicro + calcPlatformFee(totalMicro);
}

export function formatBlocksToTime(blocks: number): string {
  if (blocks <= 0) return "Expired";
  const minutes = blocks * 10;
  if (minutes < 60) return `~${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `~${hours}h`;
  const days = Math.floor(hours / 24);
  return `~${days}d`;
}

export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
