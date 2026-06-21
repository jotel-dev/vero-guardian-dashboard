import { render, screen } from '@testing-library/react';

import TaskCard, { type TaskCardTask } from '@/components/TaskCard';

function createTask(overrides: Partial<TaskCardTask> = {}): TaskCardTask {
  return {
    id: 'task-1',
    title: 'Review validator evidence',
    status: 'pending',
    is_done: false,
    reward: '25 VERO',
    priority: 'high',
    ...overrides,
  };
}

describe('TaskCard', () => {
  it('renders a pending task title and action button from payload data', () => {
    render(<TaskCard tasks={[createTask()]} />);

    expect(screen.getByText('Review validator evidence')).toBeInTheDocument();
    expect(screen.getByText('25 VERO')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /vote for review validator evidence/i })
    ).toBeInTheDocument();
  });

  it('removes the Vote action when the task is already done', () => {
    render(
      <TaskCard
        tasks={[
          createTask({
            status: 'pending',
            is_done: true,
            title: 'Completed validator review',
          }),
        ]}
      />
    );

    expect(screen.getByText('Completed validator review')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /vote/i })).not.toBeInTheDocument();
  });
});
