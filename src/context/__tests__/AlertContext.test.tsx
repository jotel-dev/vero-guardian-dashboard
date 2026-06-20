import { render, screen, fireEvent } from '@testing-library/react';
import { AlertProvider, useAlerts } from '@/context/AlertContext';

function TestConsumer() {
  const { alerts, addAlert, dismissAlert, dismissSource } = useAlerts();
  return (
    <div>
      <div data-testid="count">{alerts.length}</div>
      <ul data-testid="list">
        {alerts.map((a) => (
          <li key={a.id} data-testid={`alert-${a.id}`}>
            {a.title} / {a.source} / {a.type}
          </li>
        ))}
      </ul>
      <button
        data-testid="add-critical"
        onClick={() =>
          addAlert({
            type: 'critical',
            title: 'Critical alert',
            message: 'Something critical happened',
            source: 'test',
            dismissable: true,
          })
        }
      >
        Add critical
      </button>
      <button
        data-testid="add-warning"
        onClick={() =>
          addAlert({
            type: 'warning',
            title: 'Warning alert',
            message: 'Something warning happened',
            source: 'test',
            dismissable: true,
          })
        }
      >
        Add warning
      </button>
      <button
        data-testid="dismiss-first"
        onClick={() => {
          if (alerts[0]) dismissAlert(alerts[0].id);
        }}
      >
        Dismiss first
      </button>
      <button
        data-testid="dismiss-source"
        onClick={() => dismissSource('test')}
      >
        Dismiss source
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AlertProvider>
      <TestConsumer />
    </AlertProvider>,
  );
}

describe('AlertContext', () => {
  it('starts with no alerts', () => {
    renderWithProvider();
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('adds an alert on addAlert call', () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId('add-critical'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId(/^alert-/)).toBeInTheDocument();
  });

  it('deduplicates alerts by source and type', () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId('add-critical'));
    fireEvent.click(screen.getByTestId('add-critical'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('allows different types from same source', () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId('add-critical'));
    fireEvent.click(screen.getByTestId('add-warning'));
    expect(screen.getByTestId('count')).toHaveTextContent('2');
  });

  it('dismisses an alert by id', () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId('add-critical'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    fireEvent.click(screen.getByTestId('dismiss-first'));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('dismisses all alerts from a source', () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId('add-critical'));
    fireEvent.click(screen.getByTestId('add-warning'));
    expect(screen.getByTestId('count')).toHaveTextContent('2');
    fireEvent.click(screen.getByTestId('dismiss-source'));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('throws when useAlerts is used outside AlertProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    function Orphan() {
      useAlerts();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(
      'useAlerts must be used within an AlertProvider',
    );
    spy.mockRestore();
  });
});
