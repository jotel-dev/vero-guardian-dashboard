import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertProvider, useAlerts } from '@/context/AlertContext';
import { AlertBanner } from '@/components/AlertBanner';

function Trigger({ type = 'warning', title = 'Test alert', source = 'test' }) {
  const { addAlert } = useAlerts();
  return (
    <button
      data-testid="trigger"
      onClick={() =>
        addAlert({ type: type as 'critical' | 'warning' | 'info', title, message: 'Message', source, dismissable: true })
      }
    >
      Trigger
    </button>
  );
}

function renderBanner() {
  return render(
    <AlertProvider>
      <AlertBanner />
      <Trigger />
    </AlertProvider>,
  );
}

describe('AlertBanner', () => {
  it('renders nothing when no alerts exist', () => {
    const { container } = render(
      <AlertProvider>
        <AlertBanner />
      </AlertProvider>,
    );
    expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument();
  });

  it('shows alert banner when an alert is triggered', () => {
    renderBanner();
    fireEvent.click(screen.getByTestId('trigger'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Test alert')).toBeInTheDocument();
    expect(screen.getByText('Message')).toBeInTheDocument();
  });

  it('shows critical alert over warning when both exist', () => {
    function MultiTrigger() {
      const { addAlert } = useAlerts();
      return (
        <div>
          <button
            data-testid="add-critical"
            onClick={() =>
              addAlert({ type: 'critical', title: 'Critical problem', message: '', source: 'src2', dismissable: true })
            }
          >
            Add crit
          </button>
          <button
            data-testid="add-warning"
            onClick={() =>
              addAlert({ type: 'warning', title: 'Warning problem', message: '', source: 'src1', dismissable: true })
            }
          >
            Add warn
          </button>
        </div>
      );
    }
    render(
      <AlertProvider>
        <AlertBanner />
        <MultiTrigger />
      </AlertProvider>,
    );
    fireEvent.click(screen.getByTestId('add-warning'));
    fireEvent.click(screen.getByTestId('add-critical'));
    expect(screen.getByText('Critical problem')).toBeInTheDocument();
    expect(screen.queryByText('Warning problem')).not.toBeInTheDocument();
  });

  it('dismisses alert when close button is clicked', () => {
    renderBanner();
    fireEvent.click(screen.getByTestId('trigger'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Dismiss alert'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows info alert with correct icon', () => {
    function InfoTrigger() {
      const { addAlert } = useAlerts();
      return (
        <button
          data-testid="info-trigger"
          onClick={() =>
            addAlert({ type: 'info', title: 'Info alert', message: 'Info message', source: 'test', dismissable: true })
          }
        >
          Info
        </button>
      );
    }
    render(
      <AlertProvider>
        <AlertBanner />
        <InfoTrigger />
      </AlertProvider>,
    );
    fireEvent.click(screen.getByTestId('info-trigger'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Info alert')).toBeInTheDocument();
  });
});
