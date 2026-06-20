import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import * as StellarSdk from '@stellar/stellar-sdk';
import BatchTxBuilder, { type BatchBroadcaster } from '@/components/BatchTxBuilder';
import { useWallet } from '@/context/WalletContext';

jest.mock('@/context/WalletContext', () => ({
  useWallet: jest.fn(),
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const PUBLIC_KEY = StellarSdk.Keypair.random().publicKey();
const DESTINATION = StellarSdk.Keypair.random().publicKey();

type WalletState = ReturnType<typeof useWallet>;

function setWallet(overrides: Partial<WalletState> = {}): void {
  mockUseWallet.mockReturnValue({
    publicKey: PUBLIC_KEY,
    isConnected: true,
    isLoading: false,
    error: null,
    reputation: 0,
    activeProvider: null,
    availableProviders: [],
    connect: jest.fn(),
    disconnect: jest.fn(),
    ...overrides,
  } as WalletState);
}

function makeBroadcaster(): jest.Mocked<BatchBroadcaster> {
  return {
    signAndBroadcastBatchTransaction: jest.fn(async (request) => ({
      hash: 'f'.repeat(64),
      response: {} as never,
      sourceAccount: request.sourceAccount,
      networkPassphrase: StellarSdk.Networks.TESTNET,
      operationCount: request.operations.length,
      sequenceNumber: '2',
      unsignedEnvelopeXdr: 'unsigned',
      signedEnvelopeXdr: 'signed',
    })),
  };
}

function addVoteOperation(prId: string): void {
  fireEvent.change(screen.getByTestId('operation-type'), { target: { value: 'vote' } });
  fireEvent.change(screen.getByTestId('vote-pr'), { target: { value: prId } });
  fireEvent.click(screen.getByTestId('add-operation'));
}

beforeEach(() => {
  setWallet();
});

afterEach(() => jest.clearAllMocks());

describe('BatchTxBuilder', () => {
  test('queues multiple operations in local state', () => {
    render(<BatchTxBuilder broadcaster={makeBroadcaster()} />);

    addVoteOperation('1');
    addVoteOperation('2');

    const queued = screen.getAllByTestId('queued-operation');
    expect(queued).toHaveLength(2);
    expect(queued[0]).toHaveTextContent('Vote approve on PR #1');
    expect(queued[1]).toHaveTextContent('Vote approve on PR #2');
  });

  test('disables Add until the draft is valid and shows why', () => {
    render(<BatchTxBuilder broadcaster={makeBroadcaster()} />);

    expect(screen.getByTestId('add-operation')).toBeDisabled();
    expect(screen.getByText('Enter the PR number to vote on.')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('vote-pr'), { target: { value: '5' } });
    expect(screen.getByTestId('add-operation')).toBeEnabled();
  });

  test('removes a queued operation', () => {
    render(<BatchTxBuilder broadcaster={makeBroadcaster()} />);

    addVoteOperation('1');
    addVoteOperation('2');

    const first = screen.getAllByTestId('queued-operation')[0];
    fireEvent.click(within(first).getByLabelText('Remove operation'));

    const remaining = screen.getAllByTestId('queued-operation');
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toHaveTextContent('Vote approve on PR #2');
  });

  test('reorders operations with the move controls', () => {
    render(<BatchTxBuilder broadcaster={makeBroadcaster()} />);

    addVoteOperation('1');
    addVoteOperation('2');

    const second = screen.getAllByTestId('queued-operation')[1];
    fireEvent.click(within(second).getByLabelText('Move operation up'));

    const reordered = screen.getAllByTestId('queued-operation');
    expect(reordered[0]).toHaveTextContent('Vote approve on PR #2');
    expect(reordered[1]).toHaveTextContent('Vote approve on PR #1');
  });

  test('builds and broadcasts the queue as one transaction', async () => {
    const broadcaster = makeBroadcaster();
    render(<BatchTxBuilder broadcaster={broadcaster} />);

    addVoteOperation('1');
    fireEvent.change(screen.getByTestId('operation-type'), { target: { value: 'payment' } });
    fireEvent.change(screen.getByTestId('payment-destination'), { target: { value: DESTINATION } });
    fireEvent.change(screen.getByTestId('payment-amount'), { target: { value: '10' } });
    fireEvent.click(screen.getByTestId('add-operation'));

    fireEvent.click(screen.getByTestId('broadcast-batch'));

    await waitFor(() =>
      expect(broadcaster.signAndBroadcastBatchTransaction).toHaveBeenCalledTimes(1),
    );
    const request = broadcaster.signAndBroadcastBatchTransaction.mock.calls[0][0];
    expect(request.sourceAccount).toBe(PUBLIC_KEY);
    expect(request.operations).toHaveLength(2);

    await screen.findByTestId('broadcast-success');
    expect(screen.getByTestId('broadcast-success')).toHaveTextContent('Broadcast 2 operations');
    // Queue is cleared after a successful broadcast.
    expect(screen.queryAllByTestId('queued-operation')).toHaveLength(0);
  });

  test('surfaces broadcast failures and keeps the queue intact', async () => {
    const broadcaster = makeBroadcaster();
    broadcaster.signAndBroadcastBatchTransaction.mockRejectedValueOnce(
      new Error('Stellar account sequence is stale.'),
    );
    render(<BatchTxBuilder broadcaster={broadcaster} />);

    addVoteOperation('1');
    fireEvent.click(screen.getByTestId('broadcast-batch'));

    await screen.findByTestId('broadcast-error');
    expect(screen.getByTestId('broadcast-error')).toHaveTextContent('Stellar account sequence is stale.');
    expect(screen.getAllByTestId('queued-operation')).toHaveLength(1);
  });

  test('disables broadcasting when the wallet is disconnected', () => {
    setWallet({ publicKey: null, isConnected: false });
    render(<BatchTxBuilder broadcaster={makeBroadcaster()} />);

    addVoteOperation('1');
    expect(screen.getByTestId('broadcast-batch')).toBeDisabled();
    expect(screen.getByText('Connect your wallet to broadcast the batch.')).toBeInTheDocument();
  });
});
