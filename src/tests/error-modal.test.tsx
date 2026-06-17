import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ErrorProvider, useError } from '@/components/ErrorModal';

function TestTrigger({
  message = 'Network request failed',
  title,
  actionLabel,
  onAction,
}: {
  message?: string;
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { showError } = useError();
  return (
    <button onClick={() => showError({ message, title, actionLabel, onAction })}>
      trigger
    </button>
  );
}

function renderWithProvider(ui: React.ReactNode) {
  return render(<ErrorProvider>{ui}</ErrorProvider>);
}

describe('ErrorModal', () => {
  it('does not render the modal until an error is shown', () => {
    renderWithProvider(<TestTrigger />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('shows the modal with the provided message when showError is called', () => {
    renderWithProvider(<TestTrigger message="Network request failed" />);
    fireEvent.click(screen.getByText('trigger'));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Network request failed')).toBeInTheDocument();
  });

  it('falls back to a default title and uses a custom one when given', () => {
    const { rerender } = renderWithProvider(<TestTrigger />);
    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    rerender(
      <ErrorProvider>
        <TestTrigger title="Transaction rejected" />
      </ErrorProvider>,
    );
    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByText('Transaction rejected')).toBeInTheDocument();
  });

  it('closes when the dismiss button is clicked', () => {
    renderWithProvider(<TestTrigger />);
    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Dismiss'));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('closes when the close (X) button is clicked', () => {
    renderWithProvider(<TestTrigger />);
    fireEvent.click(screen.getByText('trigger'));

    fireEvent.click(screen.getByLabelText('Close error dialog'));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('closes when the Escape key is pressed', () => {
    renderWithProvider(<TestTrigger />);
    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('renders an action button and invokes the handler, then closes', () => {
    const onAction = jest.fn();
    renderWithProvider(
      <TestTrigger actionLabel="Try again" onAction={onAction} />,
    );
    fireEvent.click(screen.getByText('trigger'));

    fireEvent.click(screen.getByText('Try again'));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('throws when useError is used outside an ErrorProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    function Orphan() {
      useError();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(
      'useError must be used within an ErrorProvider',
    );
    spy.mockRestore();
  });
});
