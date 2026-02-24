import { describe, expect, it, beforeEach } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const farmer = accounts.get("wallet_1")!;
const buyer = accounts.get("wallet_2")!;
const stranger = accounts.get("wallet_3")!;

const CONTRACT_NAME = "farm";

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Call create-forward-contract and return the new contract-id as a bigint.
 * Returns (ok contract-id) → result.value (UIntCV) → result.value.value (bigint)
 */
const createContract = (
  produceType = "Organic Tomatoes",
  quantity = 1000,
  pricePerUnit = 50000,
  deliveryOffset = 200
): bigint => {
  const deliveryDate = simnet.blockHeight + deliveryOffset;
  const { result } = simnet.callPublicFn(
    CONTRACT_NAME,
    "create-forward-contract",
    [
      Cl.stringAscii(produceType),
      Cl.uint(quantity),
      Cl.uint(pricePerUnit),
      Cl.uint(deliveryDate),
    ],
    farmer
  );
  if (result.type !== ClarityType.ResponseOk) {
    throw new Error(`create-forward-contract failed: ${JSON.stringify(result)}`);
  }
  // result.value is UIntCV; result.value.value is bigint
  return (result as any).value.value as bigint;
};

/**
 * Purchase contract as buyer.
 */
const purchaseContract = (contractId: bigint | number) =>
  simnet.callPublicFn(
    CONTRACT_NAME,
    "purchase-contract",
    [Cl.uint(contractId)],
    buyer
  );

/**
 * Create a contract with a near delivery date, then purchase it.
 * Uses offset=10 so purchase cannot fail on delivery date,
 * then mine 15 blocks before fulfillment.
 */
const setupPurchased = (): bigint => {
  const id = createContract("Wheat", 100, 10000, 10);
  const { result } = purchaseContract(id);
  if (result.type !== ClarityType.ResponseOk) {
    throw new Error(`purchase-contract failed: ${JSON.stringify(result)}`);
  }
  return id;
};

/**
 * Create + purchase + mine past delivery date + fulfill.
 */
const setupFulfilled = (): bigint => {
  const id = setupPurchased();
  simnet.mineEmptyBlocks(15); // mine well past delivery date (offset was 10)
  const { result } = simnet.callPublicFn(
    CONTRACT_NAME,
    "fulfill-contract",
    [Cl.uint(id)],
    farmer
  );
  if (result.type !== ClarityType.ResponseOk) {
    throw new Error(`fulfill-contract failed: ${JSON.stringify(result)}`);
  }
  return id;
};

/**
 * Create + purchase + mine + fulfill + raise dispute.
 */
const setupDisputed = (): bigint => {
  const id = setupFulfilled();
  const { result } = simnet.callPublicFn(
    CONTRACT_NAME,
    "raise-dispute",
    [Cl.uint(id), Cl.stringAscii("Quality issue")],
    buyer
  );
  if (result.type !== ClarityType.ResponseOk) {
    throw new Error(`raise-dispute failed: ${JSON.stringify(result)}`);
  }
  return id;
};

// ─── 1. INITIALIZATION ────────────────────────────────────────────────────────

describe("simnet initialization", () => {
  it("ensures simnet is well initialized", () => {
    expect(simnet.blockHeight).toBeDefined();
  });

  it("starts with zero contracts", () => {
    const { result } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-total-contracts",
      [],
      deployer
    );
    expect(result).toBeOk(Cl.uint(0));
  });

  it("starts with zero platform fees", () => {
    const { result } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-platform-fees",
      [],
      deployer
    );
    expect(result).toBeOk(Cl.uint(0));
  });
});

// ─── 2. CREATE FORWARD CONTRACT ───────────────────────────────────────────────

describe("create-forward-contract", () => {
  it("farmer can create a forward contract and returns contract id u1", () => {
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "create-forward-contract",
      [
        Cl.stringAscii("Organic Tomatoes"),
        Cl.uint(1000),
        Cl.uint(50000),
        Cl.uint(simnet.blockHeight + 200),
      ],
      farmer
    );
    expect(result).toBeOk(Cl.uint(1));
  });

  it("increments contract id on each creation", () => {
    // First call in this test (globally second after the above)
    const id1 = createContract();
    const id2 = createContract();
    // The second id must be exactly one more than the first
    expect(id2).toBe(id1 + 1n);
  });

  it("stores correct contract details", () => {
    const id = createContract("Maize", 500, 20000, 100);
    const { result } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-contract",
      [Cl.uint(id)],
      deployer
    );
    // Read back created-at and delivery-date from the stored contract
    const stored = (result as any).value.value.value;
    expect(result).toBeOk(
      Cl.some(
        Cl.tuple({
          farmer: Cl.principal(farmer),
          buyer: Cl.none(),
          "produce-type": Cl.stringAscii("Maize"),
          quantity: Cl.uint(500),
          "price-per-unit": Cl.uint(20000),
          "total-price": Cl.uint(500 * 20000),
          "delivery-date": stored["delivery-date"],
          "created-at": stored["created-at"],
          "fulfilled-at": Cl.none(),
          status: Cl.uint(1), // STATUS-OPEN
          "dispute-reason": Cl.none(),
          "resolution-notes": Cl.none(),
        })
      )
    );
  });

  it("fails with zero quantity", () => {
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "create-forward-contract",
      [
        Cl.stringAscii("Tomatoes"),
        Cl.uint(0),
        Cl.uint(50000),
        Cl.uint(simnet.blockHeight + 100),
      ],
      farmer
    );
    expect(result).toBeErr(Cl.uint(109)); // ERR-INVALID-QUANTITY
  });

  it("fails with zero price per unit", () => {
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "create-forward-contract",
      [
        Cl.stringAscii("Tomatoes"),
        Cl.uint(100),
        Cl.uint(0),
        Cl.uint(simnet.blockHeight + 100),
      ],
      farmer
    );
    expect(result).toBeErr(Cl.uint(110)); // ERR-INVALID-PRICE
  });

  it("fails when delivery date is in the past", () => {
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "create-forward-contract",
      [
        Cl.stringAscii("Tomatoes"),
        Cl.uint(100),
        Cl.uint(50000),
        Cl.uint(simnet.blockHeight - 1),
      ],
      farmer
    );
    expect(result).toBeErr(Cl.uint(107)); // ERR-DELIVERY-DATE-PASSED
  });

  it("adds contract to farmer contract list", () => {
    const id = createContract();
    const { result } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-farmer-contracts",
      [Cl.principal(farmer)],
      deployer
    );
    // The list holds all IDs created so far; verify id is present
    const list = (result as any).value.value as Array<any>;
    const ids = list.map((cv: any) => cv.value as bigint);
    expect(ids).toContain(id);
  });
});

// ─── 3. PURCHASE CONTRACT ─────────────────────────────────────────────────────

describe("purchase-contract", () => {
  let contractId: bigint;

  beforeEach(() => {
    contractId = createContract();
  });

  it("buyer can purchase an open contract", () => {
    const { result } = purchaseContract(contractId);
    expect(result).toBeOk(Cl.bool(true));
  });

  it("contract status changes to PURCHASED (u2)", () => {
    purchaseContract(contractId);
    const { result } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-contract-status",
      [Cl.uint(contractId)],
      deployer
    );
    expect(result).toBeOk(Cl.uint(2)); // STATUS-PURCHASED
  });

  it("escrow is funded after purchase", () => {
    purchaseContract(contractId);
    const { result } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-escrow",
      [Cl.uint(contractId)],
      deployer
    );
    const stored = (result as any).value.value.value;
    expect(result).toBeOk(
      Cl.some(
        Cl.tuple({
          "locked-amount": Cl.uint(1000 * 50000),
          "locked-at": stored["locked-at"],
        })
      )
    );
  });

  it("platform fees are tracked after purchase", () => {
    purchaseContract(contractId);
    const { result } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-platform-fees",
      [],
      deployer
    );
    // 0.5% of 50,000,000 = 250,000; fees accumulate so just verify >= 250000
    const fees = (result as any).value.value as bigint;
    expect(fees).toBeGreaterThanOrEqual(250000n);
  });

  it("adds contract to buyer contract list", () => {
    purchaseContract(contractId);
    const { result } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-buyer-contracts",
      [Cl.principal(buyer)],
      deployer
    );
    const list = (result as any).value.value as Array<any>;
    const ids = list.map((cv: any) => cv.value as bigint);
    expect(ids).toContain(contractId);
  });

  it("fails if contract does not exist", () => {
    const { result } = purchaseContract(999999);
    expect(result).toBeErr(Cl.uint(101)); // ERR-CONTRACT-NOT-FOUND
  });

  it("fails if contract is already purchased", () => {
    purchaseContract(contractId);
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "purchase-contract",
      [Cl.uint(contractId)],
      stranger
    );
    expect(result).toBeErr(Cl.uint(111)); // ERR-ALREADY-PURCHASED
  });

  it("fails if farmer tries to buy their own contract", () => {
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "purchase-contract",
      [Cl.uint(contractId)],
      farmer
    );
    expect(result).toBeErr(Cl.uint(100)); // ERR-NOT-AUTHORIZED
  });
});

// ─── 4. CANCEL CONTRACT ───────────────────────────────────────────────────────

describe("cancel-contract", () => {
  let contractId: bigint;

  beforeEach(() => {
    contractId = createContract();
  });

  it("farmer can cancel an open contract", () => {
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "cancel-contract",
      [Cl.uint(contractId)],
      farmer
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("contract status changes to CANCELLED (u4)", () => {
    simnet.callPublicFn(
      CONTRACT_NAME,
      "cancel-contract",
      [Cl.uint(contractId)],
      farmer
    );
    const { result } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-contract-status",
      [Cl.uint(contractId)],
      deployer
    );
    expect(result).toBeOk(Cl.uint(4)); // STATUS-CANCELLED
  });

  it("fails if stranger tries to cancel", () => {
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "cancel-contract",
      [Cl.uint(contractId)],
      stranger
    );
    expect(result).toBeErr(Cl.uint(105)); // ERR-NOT-FARMER
  });

  it("fails if contract is already purchased", () => {
    purchaseContract(contractId);
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "cancel-contract",
      [Cl.uint(contractId)],
      farmer
    );
    expect(result).toBeErr(Cl.uint(111)); // ERR-ALREADY-PURCHASED
  });
});

// ─── 5. FULFILL CONTRACT ──────────────────────────────────────────────────────

describe("fulfill-contract", () => {
  it("farmer can fulfill contract after delivery date", () => {
    const id = setupPurchased();
    simnet.mineEmptyBlocks(15);
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "fulfill-contract",
      [Cl.uint(id)],
      farmer
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("status changes to FULFILLED (u3) after fulfillment", () => {
    const id = setupPurchased();
    simnet.mineEmptyBlocks(15);
    simnet.callPublicFn(
      CONTRACT_NAME,
      "fulfill-contract",
      [Cl.uint(id)],
      farmer
    );
    const { result } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-contract-status",
      [Cl.uint(id)],
      deployer
    );
    expect(result).toBeOk(Cl.uint(3)); // STATUS-FULFILLED
  });

  it("fails if delivery date not reached yet", () => {
    // Large offset → delivery date is far in the future
    const id = createContract("Corn", 100, 10000, 200);
    purchaseContract(id);
    // Do NOT mine blocks — delivery date not reached
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "fulfill-contract",
      [Cl.uint(id)],
      farmer
    );
    expect(result).toBeErr(Cl.uint(108)); // ERR-DELIVERY-DATE-NOT-REACHED
  });

  it("fails if stranger tries to fulfill", () => {
    const id = setupPurchased();
    simnet.mineEmptyBlocks(15);
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "fulfill-contract",
      [Cl.uint(id)],
      stranger
    );
    expect(result).toBeErr(Cl.uint(105)); // ERR-NOT-FARMER
  });
});

// ─── 6. CONFIRM DELIVERY ──────────────────────────────────────────────────────

describe("confirm-delivery", () => {
  it("buyer can confirm delivery and release payment", () => {
    const id = setupFulfilled();
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "confirm-delivery",
      [Cl.uint(id)],
      buyer
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("status changes to RESOLVED (u6) after confirmation", () => {
    const id = setupFulfilled();
    simnet.callPublicFn(
      CONTRACT_NAME,
      "confirm-delivery",
      [Cl.uint(id)],
      buyer
    );
    const { result } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-contract-status",
      [Cl.uint(id)],
      deployer
    );
    expect(result).toBeOk(Cl.uint(6)); // STATUS-RESOLVED
  });

  it("escrow is cleared after confirmation", () => {
    const id = setupFulfilled();
    simnet.callPublicFn(
      CONTRACT_NAME,
      "confirm-delivery",
      [Cl.uint(id)],
      buyer
    );
    const { result } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-escrow",
      [Cl.uint(id)],
      deployer
    );
    expect(result).toBeOk(Cl.none());
  });

  it("fails if stranger tries to confirm delivery", () => {
    const id = setupFulfilled();
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "confirm-delivery",
      [Cl.uint(id)],
      stranger
    );
    expect(result).toBeErr(Cl.uint(104)); // ERR-NOT-BUYER
  });

  it("fails if contract is not yet fulfilled", () => {
    // Create a purchased but not fulfilled contract
    const id = setupPurchased();
    // Do NOT mine or fulfill
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "confirm-delivery",
      [Cl.uint(id)],
      buyer
    );
    expect(result).toBeErr(Cl.uint(116)); // ERR-INVALID-STATUS
  });
});

// ─── 7. RAISE DISPUTE ──────────��──────────────────────────────────────────────

describe("raise-dispute", () => {
  it("buyer can raise a dispute within the dispute window", () => {
    const id = setupFulfilled();
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "raise-dispute",
      [Cl.uint(id), Cl.stringAscii("Produce quality below agreed standards")],
      buyer
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("status changes to DISPUTED (u5) after dispute raised", () => {
    const id = setupFulfilled();
    simnet.callPublicFn(
      CONTRACT_NAME,
      "raise-dispute",
      [Cl.uint(id), Cl.stringAscii("Wrong produce delivered")],
      buyer
    );
    const { result } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-contract-status",
      [Cl.uint(id)],
      deployer
    );
    expect(result).toBeOk(Cl.uint(5)); // STATUS-DISPUTED
  });

  it("fails if stranger tries to raise dispute", () => {
    const id = setupFulfilled();
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "raise-dispute",
      [Cl.uint(id), Cl.stringAscii("Wrong produce")],
      stranger
    );
    expect(result).toBeErr(Cl.uint(104)); // ERR-NOT-BUYER
  });

  it("fails if dispute window has closed", () => {
    const id = setupFulfilled();
    simnet.mineEmptyBlocks(1010); // past DISPUTE-WINDOW-BLOCKS (1008)
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "raise-dispute",
      [Cl.uint(id), Cl.stringAscii("Too late dispute")],
      buyer
    );
    expect(result).toBeErr(Cl.uint(113)); // ERR-DISPUTE-WINDOW-CLOSED
  });
});

// ─── 8. RESOLVE DISPUTE ───────────────────────────────────────────────────────

describe("resolve-dispute", () => {
  it("owner can resolve dispute in favour of farmer", () => {
    const id = setupDisputed();
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "resolve-dispute",
      [Cl.uint(id), Cl.bool(true), Cl.stringAscii("Farmer delivered as agreed")],
      deployer
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("owner can resolve dispute in favour of buyer", () => {
    const id = setupDisputed();
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "resolve-dispute",
      [Cl.uint(id), Cl.bool(false), Cl.stringAscii("Buyer claim upheld")],
      deployer
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("status is RESOLVED (u6) after resolution", () => {
    const id = setupDisputed();
    simnet.callPublicFn(
      CONTRACT_NAME,
      "resolve-dispute",
      [Cl.uint(id), Cl.bool(true), Cl.stringAscii("Resolved")],
      deployer
    );
    const { result } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-contract-status",
      [Cl.uint(id)],
      deployer
    );
    expect(result).toBeOk(Cl.uint(6)); // STATUS-RESOLVED
  });

  it("fails if non-owner tries to resolve", () => {
    const id = setupDisputed();
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "resolve-dispute",
      [Cl.uint(id), Cl.bool(true), Cl.stringAscii("Unauthorized")],
      stranger
    );
    expect(result).toBeErr(Cl.uint(100)); // ERR-NOT-AUTHORIZED
  });

  it("fails if contract is not in disputed state", () => {
    // Only purchased, not disputed
    const id = setupPurchased();
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "resolve-dispute",
      [Cl.uint(id), Cl.bool(true), Cl.stringAscii("No dispute exists")],
      deployer
    );
    expect(result).toBeErr(Cl.uint(115)); // ERR-NO-DISPUTE
  });
});

// ─── 9. AUTO RELEASE FUNDS ────────────────────────────────────────────────────

describe("auto-release-funds", () => {
  it("releases funds to farmer after dispute window expires", () => {
    const id = setupFulfilled();
    simnet.mineEmptyBlocks(1010); // past DISPUTE-WINDOW-BLOCKS (1008)
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "auto-release-funds",
      [Cl.uint(id)],
      stranger // anyone can trigger this
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("status is RESOLVED (u6) after auto-release", () => {
    const id = setupFulfilled();
    simnet.mineEmptyBlocks(1010);
    simnet.callPublicFn(
      CONTRACT_NAME,
      "auto-release-funds",
      [Cl.uint(id)],
      stranger
    );
    const { result } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-contract-status",
      [Cl.uint(id)],
      deployer
    );
    expect(result).toBeOk(Cl.uint(6)); // STATUS-RESOLVED
  });

  it("fails if dispute window has not expired yet", () => {
    const id = setupFulfilled();
    // Do NOT mine past the dispute window
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "auto-release-funds",
      [Cl.uint(id)],
      stranger
    );
    expect(result).toBeErr(Cl.uint(113)); // ERR-DISPUTE-WINDOW-CLOSED
  });
});

// ─── 10. PLATFORM FEES ────────────────────────────────────────────────────────

describe("withdraw-platform-fees", () => {
  it("owner can withdraw accumulated platform fees", () => {
    // Create and purchase to ensure fees exist
    const id = createContract("Pepper", 1000, 50000, 200);
    purchaseContract(id);
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "withdraw-platform-fees",
      [],
      deployer
    );
    // (ok fees) where fees is the accumulated total (> 0)
    expect(result.type).toBe(ClarityType.ResponseOk);
    const fees = (result as any).value.value as bigint;
    expect(fees).toBeGreaterThan(0n);
  });

  it("platform fees reset to zero after withdrawal", () => {
    const id = createContract("Soy", 1000, 50000, 200);
    purchaseContract(id);
    simnet.callPublicFn(CONTRACT_NAME, "withdraw-platform-fees", [], deployer);
    const { result } = simnet.callReadOnlyFn(
      CONTRACT_NAME,
      "get-platform-fees",
      [],
      deployer
    );
    expect(result).toBeOk(Cl.uint(0));
  });

  it("fails if non-owner tries to withdraw fees", () => {
    // Make sure there are fees
    const id = createContract("Millet", 1000, 50000, 200);
    purchaseContract(id);
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "withdraw-platform-fees",
      [],
      stranger
    );
    expect(result).toBeErr(Cl.uint(100)); // ERR-NOT-AUTHORIZED
  });

  it("fails if there are no fees to withdraw", () => {
    // Drain any remaining fees first
    simnet.callPublicFn(CONTRACT_NAME, "withdraw-platform-fees", [], deployer);
    // Now the balance is zero — next withdrawal must fail
    const { result } = simnet.callPublicFn(
      CONTRACT_NAME,
      "withdraw-platform-fees",
      [],
      deployer
    );
    expect(result).toBeErr(Cl.uint(106)); // ERR-INSUFFICIENT-FUNDS
  });
});
