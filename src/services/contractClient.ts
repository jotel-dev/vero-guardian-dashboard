import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';

const server = new StellarSdk.Horizon.Server(HORIZON_URL);

/**
 * Authorized Guardian public keys.
 * In production, source this from an on-chain data entry or verified API.
 * Keys are read from NEXT_PUBLIC_GUARDIAN_ADDRESSES (comma-separated) with an
 * optional compile-time fallback list for development.
 */
function getAuthorizedGuardians(): Set<string> {
  const envList = process.env.NEXT_PUBLIC_GUARDIAN_ADDRESSES ?? '';
  const keys = envList
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  return new Set(keys);
}

/** Thrown when the signing address is not in the Guardian allow-list. */
export class UnauthorizedGuardianError extends Error {
  constructor(publicKey: string) {
    super(`Address ${publicKey} is not an authorized Guardian`);
    this.name = 'UnauthorizedGuardianError';
  }
}

/**
 * Validate that `publicKey` is in the authorized Guardian list.
 * @throws {UnauthorizedGuardianError} if the key is not authorized.
 */
export function assertAuthorizedGuardian(publicKey: string): void {
  const guardians = getAuthorizedGuardians();
  // When no list is configured (e.g., local dev), allow all connected wallets.
  if (guardians.size === 0) return;
  if (!guardians.has(publicKey)) throw new UnauthorizedGuardianError(publicKey);
}

/**
 * Build, Guardian-validate, Freighter-sign, and submit a vote transaction.
 *
 * @param prId      GitHub PR number registered by the Vero Relayer
 * @param publicKey Guardian's Stellar public key from WalletContext
 * @returns         Submitted transaction hash
 * @throws {UnauthorizedGuardianError} if `publicKey` is not authorized
 */
export async function castVote(prId: number, publicKey: string): Promise<string> {
  assertAuthorizedGuardian(publicKey);

  const account = await server.loadAccount(publicKey);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      StellarSdk.Operation.manageData({ name: `vote_${prId}`, value: 'approve' })
    )
    .setTimeout(30)
    .build();

  const { signedTxXdr } = await signTransaction(tx.toXDR(), {
    networkPassphrase: StellarSdk.Networks.TESTNET,
  });

  const signedTx = StellarSdk.TransactionBuilder.fromXDR(
    signedTxXdr,
    StellarSdk.Networks.TESTNET
  );

  const result = await server.submitTransaction(signedTx);
  return result.hash;
}
