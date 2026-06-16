/**
 * contractClient unit tests.
 *
 * The Horizon Server singleton in contractClient.ts is created at module-load
 * time, so we mock @stellar/stellar-sdk to return a stable server object whose
 * methods we can reconfigure between tests.
 */

jest.mock('@stellar/stellar-sdk', () => {
  const original = jest.requireActual('@stellar/stellar-sdk');
  const server = {
    loadAccount: jest.fn(),
    submitTransaction: jest.fn(),
  };
  (jest.mock as any).__stellarServerMock = server;

  // Chainable TransactionBuilder mock
  const txMock = {
    addOperation: jest.fn().mockReturnThis(),
    setTimeout: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({ toXDR: jest.fn().mockReturnValue('xdr') }),
  };
  const TransactionBuilder = jest.fn(() => txMock);
  (TransactionBuilder as any).fromXDR = jest.fn(() => ({}));

  return {
    ...original,
    Horizon: { Server: jest.fn(() => server) },
    TransactionBuilder,
  };
});

jest.mock('@stellar/freighter-api', () => ({
  signTransaction: jest.fn(),
}));

import { assertAuthorizedGuardian, castVote, UnauthorizedGuardianError } from '@/services/contractClient';
import { signTransaction } from '@stellar/freighter-api';
import * as StellarSdk from '@stellar/stellar-sdk';

// Access the stable mock server created inside the factory
const mockServer = (StellarSdk.Horizon.Server as jest.Mock).mock.results[0].value as {
  loadAccount: jest.Mock;
  submitTransaction: jest.Mock;
};

const freighterSignTx = signTransaction as jest.MockedFunction<typeof signTransaction>;

// ---------------------------------------------------------------------------
// assertAuthorizedGuardian
// ---------------------------------------------------------------------------

describe('assertAuthorizedGuardian', () => {
  const GUARDIAN = 'GABC1234AUTHORIZED';

  afterEach(() => { delete process.env.NEXT_PUBLIC_GUARDIAN_ADDRESSES; });

  it('allows any address when no guardian list is configured', () => {
    expect(() => assertAuthorizedGuardian('GRANYONE')).not.toThrow();
  });

  it('allows an authorized guardian', () => {
    process.env.NEXT_PUBLIC_GUARDIAN_ADDRESSES = GUARDIAN;
    expect(() => assertAuthorizedGuardian(GUARDIAN)).not.toThrow();
  });

  it('throws UnauthorizedGuardianError for unknown address', () => {
    process.env.NEXT_PUBLIC_GUARDIAN_ADDRESSES = GUARDIAN;
    expect(() => assertAuthorizedGuardian('GUNKNOWN')).toThrow(UnauthorizedGuardianError);
  });

  it('supports comma-separated guardian list', () => {
    process.env.NEXT_PUBLIC_GUARDIAN_ADDRESSES = `${GUARDIAN},GOTHER`;
    expect(() => assertAuthorizedGuardian('GOTHER')).not.toThrow();
    expect(() => assertAuthorizedGuardian('GNOTLISTED')).toThrow(UnauthorizedGuardianError);
  });
});

// ---------------------------------------------------------------------------
// castVote
// ---------------------------------------------------------------------------

describe('castVote', () => {
  const PUBLIC_KEY = 'GABC1234';
  const TX_HASH = 'abc123hash';

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_GUARDIAN_ADDRESSES;

    mockServer.loadAccount.mockResolvedValue({
      accountId: () => PUBLIC_KEY,
      sequenceNumber: () => '1',
      incrementSequenceNumber: jest.fn(),
      sequence: '1',
      id: PUBLIC_KEY,
    });
    mockServer.submitTransaction.mockResolvedValue({ hash: TX_HASH });
    freighterSignTx.mockResolvedValue({ signedTxXdr: 'signedXDR', signerAddress: PUBLIC_KEY } as any);
  });

  afterEach(() => {
    mockServer.loadAccount.mockReset();
    mockServer.submitTransaction.mockReset();
    freighterSignTx.mockReset();
    delete process.env.NEXT_PUBLIC_GUARDIAN_ADDRESSES;
  });

  it('rejects unauthorized guardian before hitting Horizon', async () => {
    process.env.NEXT_PUBLIC_GUARDIAN_ADDRESSES = 'GAUTHORIZED';
    await expect(castVote(42, 'GUNKNOWN')).rejects.toThrow(UnauthorizedGuardianError);
    expect(mockServer.loadAccount).not.toHaveBeenCalled();
  });

  it('returns transaction hash on success', async () => {
    const hash = await castVote(42, PUBLIC_KEY);
    expect(hash).toBe(TX_HASH);
    expect(freighterSignTx).toHaveBeenCalledWith(
      expect.any(String),
      { networkPassphrase: expect.any(String) }
    );
    expect(mockServer.submitTransaction).toHaveBeenCalled();
  });

  it('propagates Horizon submission errors', async () => {
    mockServer.submitTransaction.mockRejectedValue(new Error('Horizon error'));
    await expect(castVote(42, PUBLIC_KEY)).rejects.toThrow('Horizon error');
  });

  it('propagates Freighter signing errors', async () => {
    freighterSignTx.mockRejectedValue(new Error('User rejected'));
    await expect(castVote(42, PUBLIC_KEY)).rejects.toThrow('User rejected');
  });
});
