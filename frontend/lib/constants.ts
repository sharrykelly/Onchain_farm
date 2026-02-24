export const CONTRACT_ADDRESS = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
export const CONTRACT_NAME = "farm";
export const NETWORK: "devnet" | "testnet" | "mainnet" = "devnet"; // change to "testnet" or "mainnet" for deployment

export const STATUS = {
  OPEN: 1,
  PURCHASED: 2,
  FULFILLED: 3,
  CANCELLED: 4,
  DISPUTED: 5,
  RESOLVED: 6,
} as const;

export const STATUS_LABEL: Record<number, string> = {
  1: "Open",
  2: "Purchased",
  3: "Fulfilled",
  4: "Cancelled",
  5: "Disputed",
  6: "Resolved",
};

export const STATUS_COLOR: Record<number, string> = {
  1: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  2: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  3: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  4: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
  5: "bg-red-500/20 text-red-300 border border-red-500/30",
  6: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
};

export const PLATFORM_FEE_BPS = 50; // 0.5%
export const DISPUTE_WINDOW_BLOCKS = 1008;
export const MICRO_PER_STX = 1_000_000;

// Stacks API endpoints per network
export const API_URL: Record<string, string> = {
  devnet: "http://localhost:3999",
  testnet: "https://api.testnet.hiro.so",
  mainnet: "https://api.hiro.so",
};

export const PRODUCE_ICONS: Record<string, string> = {
  tomatoes: "🍅",
  maize: "🌽",
  wheat: "🌾",
  rice: "🍚",
  coffee: "☕",
  cassava: "🥔",
  yam: "🍠",
  corn: "🌽",
  pepper: "🌶️",
  soy: "🫘",
  millet: "🌾",
  default: "🌱",
};

export function getProduceIcon(produceType: string): string {
  const key = produceType.toLowerCase();
  for (const [k, v] of Object.entries(PRODUCE_ICONS)) {
    if (key.includes(k)) return v;
  }
  return PRODUCE_ICONS.default;
}
