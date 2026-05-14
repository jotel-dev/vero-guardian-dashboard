import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

/**
 * Build, sign with Freighter, and submit a vote transaction.
 * @param prId  GitHub PR number registered by the Vero Relayer
 * @param publicKey  Guardian's Stellar public key from WalletContext
 */
export async function castVote(prId: number, publicKey: string): Promise<string> {
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

  const signed = await signTransaction(tx.toXDR(), { network: 'TESTNET' });
  const result = await server.submitTransaction(
    StellarSdk.TransactionBuilder.fromXDR(signed, StellarSdk.Networks.TESTNET)
  );
  return result.hash;
}

/** Fetch Guardian reputation score from contract data entries. */
export async function getReputation(publicKey: string): Promise<number> {
  const account = await server.loadAccount(publicKey);
  const entry = (account.data_attr as Record<string, string>)['vero_reputation'];
  return entry ? parseInt(Buffer.from(entry, 'base64').toString(), 10) : 0;
}
