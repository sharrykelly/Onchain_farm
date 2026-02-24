"use client";

import {
  fetchCallReadOnlyFunction,
  cvToJSON,
  uintCV,
  stringAsciiCV,
  boolCV,
  principalCV,
  type ClarityValue,
} from "@stacks/transactions";
import { STACKS_DEVNET, STACKS_TESTNET, STACKS_MAINNET } from "@stacks/network";
import { CONTRACT_ADDRESS, CONTRACT_NAME, NETWORK } from "./constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function openContractCall(options: any) {
  const { openContractCall: _open } = await import("@stacks/connect");
  return _open(options);
}

function getNetwork() {
  if (NETWORK === "testnet") return STACKS_TESTNET;
  if (NETWORK === "mainnet") return STACKS_MAINNET;
  return STACKS_DEVNET;
}

export interface ForwardContract {
  id: number;
  farmer: string;
  buyer: string | null;
  produceType: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  deliveryDate: number;
  createdAt: number;
  fulfilledAt: number | null;
  status: number;
  disputeReason: string | null;
  resolutionNotes: string | null;
}

// ─── Read-only helpers ──────────────────────────────────────────────────────

async function readOnly(fnName: string, args: ClarityValue[], senderAddress?: string) {
  const network = getNetwork();
  const result = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: fnName,
    functionArgs: args,
    network,
    senderAddress: senderAddress ?? CONTRACT_ADDRESS,
  });
  return cvToJSON(result);
}

function parseContract(raw: Record<string, unknown>, id: number): ForwardContract {
  const v = raw.value as Record<string, { value: unknown }>;
  return {
    id,
    farmer: (v["farmer"]?.value as string) ?? "",
    buyer: (v["buyer"]?.value as { value: string } | null)?.value ?? null,
    produceType: (v["produce-type"]?.value as string) ?? "",
    quantity: Number(v["quantity"]?.value ?? 0),
    pricePerUnit: Number(v["price-per-unit"]?.value ?? 0),
    totalPrice: Number(v["total-price"]?.value ?? 0),
    deliveryDate: Number(v["delivery-date"]?.value ?? 0),
    createdAt: Number(v["created-at"]?.value ?? 0),
    fulfilledAt: v["fulfilled-at"]?.value
      ? Number((v["fulfilled-at"].value as { value: unknown }).value)
      : null,
    status: Number(v["status"]?.value ?? 1),
    disputeReason: v["dispute-reason"]?.value
      ? String((v["dispute-reason"].value as { value: unknown }).value)
      : null,
    resolutionNotes: v["resolution-notes"]?.value
      ? String((v["resolution-notes"].value as { value: unknown }).value)
      : null,
  };
}

export async function getTotalContracts(): Promise<number> {
  const r = await readOnly("get-total-contracts", []);
  return Number(r.value ?? 0);
}

export async function getContract(id: number): Promise<ForwardContract | null> {
  const r = await readOnly("get-contract", [uintCV(id)]);
  if (!r.value) return null;
  return parseContract(r.value as Record<string, unknown>, id);
}

export async function getAllContracts(): Promise<ForwardContract[]> {
  const total = await getTotalContracts();
  const results = await Promise.all(
    Array.from({ length: total }, (_, i) => getContract(i + 1))
  );
  return results.filter(Boolean) as ForwardContract[];
}

export async function getFarmerContracts(address: string): Promise<ForwardContract[]> {
  const r = await readOnly("get-farmer-contracts", [principalCV(address)], address);
  const ids: number[] = (r.value ?? []).map((cv: { value: unknown }) => Number(cv.value));
  const results = await Promise.all(ids.map((id) => getContract(id)));
  return results.filter(Boolean) as ForwardContract[];
}

export async function getBuyerContracts(address: string): Promise<ForwardContract[]> {
  const r = await readOnly("get-buyer-contracts", [principalCV(address)], address);
  const ids: number[] = (r.value ?? []).map((cv: { value: unknown }) => Number(cv.value));
  const results = await Promise.all(ids.map((id) => getContract(id)));
  return results.filter(Boolean) as ForwardContract[];
}

export async function getPlatformFees(): Promise<number> {
  const r = await readOnly("get-platform-fees", []);
  return Number(r.value ?? 0);
}

// ─── Transaction helpers (via Hiro Wallet) ──────────────────────────────────

function txOptions(fnName: string, args: ClarityValue[], onSuccess?: () => void) {
  return {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: fnName,
    functionArgs: args,
    network: getNetwork(),
    onFinish: onSuccess,
  };
}

export async function createForwardContract(
  produceType: string,
  quantity: number,
  pricePerUnit: number,
  deliveryDate: number,
  onSuccess?: () => void
) {
  return openContractCall(
    txOptions(
      "create-forward-contract",
      [stringAsciiCV(produceType), uintCV(quantity), uintCV(pricePerUnit), uintCV(deliveryDate)],
      onSuccess
    )
  );
}

export async function purchaseContract(contractId: number, onSuccess?: () => void) {
  return openContractCall(txOptions("purchase-contract", [uintCV(contractId)], onSuccess));
}

export async function fulfillContract(contractId: number, onSuccess?: () => void) {
  return openContractCall(txOptions("fulfill-contract", [uintCV(contractId)], onSuccess));
}

export async function confirmDelivery(contractId: number, onSuccess?: () => void) {
  return openContractCall(txOptions("confirm-delivery", [uintCV(contractId)], onSuccess));
}

export async function raiseDispute(contractId: number, reason: string, onSuccess?: () => void) {
  return openContractCall(
    txOptions("raise-dispute", [uintCV(contractId), stringAsciiCV(reason)], onSuccess)
  );
}

export async function autoReleaseFunds(contractId: number, onSuccess?: () => void) {
  return openContractCall(txOptions("auto-release-funds", [uintCV(contractId)], onSuccess));
}

export async function cancelContract(contractId: number, onSuccess?: () => void) {
  return openContractCall(txOptions("cancel-contract", [uintCV(contractId)], onSuccess));
}

export async function resolveDispute(
  contractId: number,
  releaseToFarmer: boolean,
  notes: string,
  onSuccess?: () => void
) {
  return openContractCall(
    txOptions(
      "resolve-dispute",
      [uintCV(contractId), boolCV(releaseToFarmer), stringAsciiCV(notes)],
      onSuccess
    )
  );
}
