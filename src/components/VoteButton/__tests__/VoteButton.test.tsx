import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VoteButton from '@/components/VoteButton';
import { castVote, UnauthorizedGuardianError } from '@/services/contractClient';
import { useToast } from '@/components/Toast';

jest.mock('@/services/contractClient');
jest.mock('@/components/Toast');

const mockCastVote = castVote as jest.MockedFunction<typeof castVote>;
const mockShowToast = jest.fn();

beforeEach(() => {
  (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  mockCastVote.mockResolvedValue('deafhash');
});

afterEach(() => jest.clearAllMocks());

describe('VoteButton', () => {
  it('renders Vote button when wallet is connected', () => {
    render(<VoteButton prId={42} publicKey="GPUBKEY" />);
    expect(screen.getByRole('button', { name: /vote for pr #42/i })).toBeInTheDocument();
  });

  it('is disabled when no wallet connected', () => {
    render(<VoteButton prId={42} publicKey={null} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows success toast and changes to Voted after successful vote', async () => {
    render(<VoteButton prId={42} publicKey="GPUBKEY" />);
    fireEvent.click(screen.getByRole('button', { name: /vote for pr #42/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /voted for pr #42/i })).toBeInTheDocument()
    );
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('Vote recorded'),
      'success'
    );
  });

  it('disables button after voting', async () => {
    render(<VoteButton prId={42} publicKey="GPUBKEY" />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('button')).toBeDisabled());
  });

  it('shows unauthorized toast for UnauthorizedGuardianError', async () => {
    mockCastVote.mockRejectedValue(new UnauthorizedGuardianError('GPUBKEY'));
    render(<VoteButton prId={42} publicKey="GPUBKEY" />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith('Not an authorized Guardian', 'error')
    );
    expect(screen.queryByText('✓ Voted')).not.toBeInTheDocument();
  });

  it('shows generic error toast for other failures', async () => {
    mockCastVote.mockRejectedValue(new Error('Horizon error'));
    render(<VoteButton prId={42} publicKey="GPUBKEY" />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith('Horizon error', 'error')
    );
  });

  it('shows Signing… label while vote is in-flight', async () => {
    let resolve!: (v: string) => void;
    mockCastVote.mockReturnValue(new Promise((r) => (resolve = r)));

    render(<VoteButton prId={42} publicKey="GPUBKEY" />);
    fireEvent.click(screen.getByRole('button'));

    expect(await screen.findByText('Signing…')).toBeInTheDocument();
    resolve('hash');
  });
});
