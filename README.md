# On-Chain Farm Produce Forward Contracts

A decentralized marketplace built on Stacks blockchain enabling farmers to create forward contracts for future produce delivery, protecting them from price crashes while guaranteeing supply for buyers.

## Overview

This smart contract platform allows:
- **Farmers** to lock in prices for future produce, protecting against market volatility
- **Buyers** to secure guaranteed supply at predetermined prices
- **Trustless escrow** with automated payment release and dispute resolution

## Features

### For Farmers
- Create forward contracts specifying produce type, quantity, price, and delivery date
- Lock in prices to protect against market crashes
- Mark deliveries as fulfilled when completed
- Cancel unpurchased contracts if needed
- Track all contracts in one place

### For Buyers
- Browse and purchase available forward contracts
- STX funds held securely in escrow until delivery
- 7-day dispute window after delivery confirmation
- Automatic payment release after dispute period
- Guaranteed supply at locked prices

### Platform Features
- Secure STX escrow system
- 0.5% platform fee for sustainable operations
- Automated dispute window (1008 blocks ≈ 7 days)
- Contract owner arbitration for disputes
- Complete contract lifecycle tracking

## Contract Architecture

### Contract Statuses
1. **OPEN** - Available for purchase
2. **PURCHASED** - Buyer locked funds in escrow
3. **FULFILLED** - Farmer marked delivery complete
4. **CANCELLED** - Farmer cancelled before purchase
5. **DISPUTED** - Buyer raised quality/delivery issue
6. **RESOLVED** - Payment released or dispute settled

### Key Functions

#### Public Functions
- `create-forward-contract` - Farmer creates new contract
- `purchase-contract` - Buyer locks STX for contract
- `fulfill-contract` - Farmer marks delivery complete
- `confirm-delivery` - Buyer confirms and releases payment
- `raise-dispute` - Buyer disputes delivery (within 7 days)
- `auto-release-funds` - Auto-release after dispute window
- `cancel-contract` - Farmer cancels unpurchased contract
- `resolve-dispute` - Owner arbitrates disputes
- `withdraw-platform-fees` - Owner withdraws accumulated fees

#### Read-Only Functions
- `get-contract` - Get contract details by ID
- `get-escrow` - Get escrow details for contract
- `get-farmer-contracts` - List all farmer's contracts
- `get-buyer-contracts` - List all buyer's contracts
- `get-total-contracts` - Get total contracts created
- `get-platform-fees` - Get accumulated platform fees
- `get-contract-status` - Get current contract status
- `is-in-dispute-window` - Check if dispute window active

## Project Structure

```
Onchain_farm/
├── README.md
└── farm_project/
    ├── Clarinet.toml              # Project configuration
    ├── package.json                # Test dependencies
    ├── vitest.config.js           # Test configuration
    ├── tsconfig.json              # TypeScript config
    ├── contracts/
    │   └── farm.clar              # Main smart contract
    ├── tests/
    │   └── farm.test.ts           # Unit tests
    └── settings/
        ├── Devnet.toml            # Local development config
        ├── Testnet.toml           # Testnet deployment config
        └── Mainnet.toml           # Mainnet deployment config
```

## Getting Started

### Prerequisites
- [Clarinet](https://github.com/hirosystems/clarinet) - Clarity smart contract development tool
- Node.js and npm - For running tests

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd Onchain_farm
```

2. Install dependencies:
```bash
cd farm_project
npm install
```

### Development

#### Verify Contract Syntax
```bash
clarinet check
```

#### Run Tests
```bash
npm test
```

#### Run Tests with Coverage
```bash
npm run test:report
```

#### Watch Mode (auto-run tests on changes)
```bash
npm run test:watch
```

#### Launch Local Devnet
```bash
clarinet integrate
```

## Usage Examples

### Creating a Forward Contract (Farmer)
```clarity
(contract-call? .farm create-forward-contract
  "Organic Tomatoes"  ;; produce-type
  u1000               ;; quantity (1000 kg)
  u50000              ;; price-per-unit (50,000 microSTX/kg)
  u150000)            ;; delivery-date (block height)
```

### Purchasing a Contract (Buyer)
```clarity
(contract-call? .farm purchase-contract u1)
;; Locks STX in escrow + 0.5% platform fee
```

### Fulfilling Delivery (Farmer)
```clarity
(contract-call? .farm fulfill-contract u1)
;; Mark delivery complete after delivery-date reached
```

### Confirming Delivery (Buyer)
```clarity
(contract-call? .farm confirm-delivery u1)
;; Release payment to farmer immediately
```

### Raising a Dispute (Buyer)
```clarity
(contract-call? .farm raise-dispute u1 "Produce quality below agreed standards")
;; Must be within 7-day dispute window
```

## Contract Economics

### Platform Fee
- **0.5%** (50 basis points) charged on total contract value
- Paid by buyer at time of purchase
- Funds held separately and withdrawable by contract owner

### Example Transaction
- Contract Value: 50,000,000 microSTX (50 STX)
- Platform Fee: 250,000 microSTX (0.25 STX)
- Total Buyer Payment: 50,250,000 microSTX (50.25 STX)
- Farmer Receives: 50,000,000 microSTX (50 STX)

## Security Features

- **Escrow Protection**: Buyer funds locked in contract until delivery
- **Time-based Validation**: Delivery dates enforced on-chain
- **Dispute Resolution**: 7-day window for quality issues
- **Access Control**: Role-based permissions (farmer/buyer/owner)
- **Input Validation**: All parameters validated before execution
- **Reentrancy Protection**: Built-in Clarity safety guarantees

## Deployment

### Testnet Deployment
1. Update `settings/Testnet.toml` with your mnemonic
2. Deploy:
```bash
clarinet deployments apply -p testnet
```

### Mainnet Deployment
1. Update `settings/Mainnet.toml` with your mnemonic
2. Thoroughly test on testnet first
3. Deploy:
```bash
clarinet deployments apply -p mainnet
```

## Testing

The project includes comprehensive unit tests covering:
- Contract creation and validation
- Purchase flow and escrow locking
- Delivery fulfillment process
- Payment release mechanisms
- Dispute handling
- Edge cases and error conditions

Run tests:
```bash
npm test
```

## Future Enhancements

- [ ] DAO-based dispute resolution (replace owner arbitration)
- [ ] Multi-signature contract support
- [ ] Partial fulfillment for large orders
- [ ] Rating system for farmers and buyers
- [ ] Integration with oracle for weather/crop data
- [ ] NFT receipts for contract ownership
- [ ] Secondary market for contract trading
- [ ] Insurance options for crop failures

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For questions, issues, or feature requests, please open an issue on GitHub.

## Acknowledgments

Built with [Clarinet](https://github.com/hirosystems/clarinet) and the Stacks blockchain ecosystem.

---

**Perfect for agricultural economies seeking price stability and supply guarantees.**
