# OnChain Farm

A decentralized marketplace on the Stacks blockchain for agricultural forward contracts. Farmers lock in future produce prices; buyers get supply guarantees — no middlemen, no price crashes.

## What's Built

### Smart Contract (`farm_project/contracts/farm.clar`)
Clarity 3 contract handling the full contract lifecycle:

| Status | Meaning |
|--------|---------|
| OPEN | Listed and available to buy |
| PURCHASED | Buyer locked STX in escrow |
| FULFILLED | Farmer marked delivery complete |
| CANCELLED | Farmer cancelled before purchase |
| DISPUTED | Buyer raised an issue (within 7-day window) |
| RESOLVED | Payment released or dispute settled |

**Key mechanics:**
- Buyer pays `total price + 0.5% platform fee` into escrow at purchase
- Farmer receives funds when buyer confirms delivery, or after 1008-block dispute window
- Owner can arbitrate disputed contracts
- All time constraints enforced on-chain via `stacks-block-height`

### Tests (`farm_project/tests/farm.test.ts`)
47 Vitest tests covering every public function, edge case, and error path using the Clarinet SDK.

### Frontend (`frontend/`)
Next.js 14 app with a dark Web3 UI (violet/cyan on near-black).

| Page | Route | Description |
|------|-------|-------------|
| Marketplace | `/` | Browse and buy open contracts |
| Farmer Dashboard | `/farmer` | Create, fulfill, and cancel contracts |
| Buyer Dashboard | `/buyer` | Track purchases, confirm delivery, raise disputes |
| Contract Detail | `/contract/[id]` | Full contract info with role-aware actions |

**Stack:** Next.js 14 · Tailwind CSS · `@stacks/connect` · `@stacks/transactions`

## Project Structure

```
Onchain_farm/
├── farm_project/
│   ├── contracts/farm.clar       # Clarity smart contract
│   ├── tests/farm.test.ts        # 47 unit tests
│   └── settings/                 # Devnet / Testnet / Mainnet configs
└── frontend/
    ├── app/                      # Next.js pages
    ├── components/               # Navbar, modals, cards
    └── lib/                      # stacks.ts, constants.ts, utils.ts
```

## Getting Started

### Contract

```bash
cd farm_project
npm install
npm test            # run all 47 tests
clarinet check      # verify contract syntax
clarinet integrate  # spin up local devnet
```

### Frontend

```bash
cd frontend
npm install
npm run dev         # http://localhost:3000
```

Connect a Stacks wallet (Leather / Xverse) to interact with a running devnet.

## Contract Economics

- **Platform fee:** 0.5% of total contract value, paid by buyer
- **Dispute window:** 1008 blocks (~7 days at 10 min/block)
- **Auto-release:** Funds release automatically after dispute window expires

## Deployment

Update `CONTRACT_ADDRESS` and `NETWORK` in `frontend/lib/constants.ts`, then:

```bash
# Testnet
clarinet deployments apply -p testnet

# Mainnet
clarinet deployments apply -p mainnet
```
