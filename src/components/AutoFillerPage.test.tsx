import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AutoFillerPage, reorderHuntCodes } from './AutoFillerPage';

describe('AutoFillerPage', () => {
  beforeEach(() => {
    const executeScript = vi
      .fn()
      .mockResolvedValueOnce([{ result: 'complete' }])
      .mockResolvedValueOnce([{ result: { canceled: false, runId: 1 } }])
      .mockResolvedValueOnce([{ result: 'ready' }])
      .mockResolvedValue([
        {
          result: { reason: 'success', success: true },
        },
      ]);
    const query = vi.fn().mockResolvedValue([{ id: 123 }]);

    Object.defineProperty(globalThis, 'chrome', {
      configurable: true,
      value: {
        scripting: {
          executeScript,
        },
        tabs: {
          query,
        },
      },
    });
  });

  it('renders the branded main page content', () => {
    render(<AutoFillerPage />);

    expect(screen.getByText('StinkyBoul')).toBeInTheDocument();
    expect(screen.getByText('Hunt Codes')).toBeInTheDocument();
    expect(screen.getByText('Idle')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Run Program' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Caleb McDaniel')).toBeInTheDocument();
  });

  it('enters edit mode, adds a card, and deletes it', () => {
    render(<AutoFillerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit hunt codes' }));

    return waitFor(() => {
      expect(screen.getByLabelText('Reorder hunt code 1')).toBeInTheDocument();
      expect(
        screen.getAllByRole('button', { name: 'Delete hunt code' }),
      ).toHaveLength(4);
    }).then(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Add hunt code' }));

      expect(
        screen.getAllByRole('button', { name: 'Delete hunt code' }),
      ).toHaveLength(5);

      fireEvent.click(
        screen.getAllByRole('button', { name: 'Delete hunt code' })[4],
      );

      expect(
        screen.getAllByRole('button', { name: 'Delete hunt code' }),
      ).toHaveLength(4);
    });
  });

  it('updates the status text after running the program', async () => {
    render(<AutoFillerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Run Program' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Running...' }),
      ).toHaveAttribute('aria-pressed', 'true');
    });

    await waitFor(() => {
      expect(
        screen.getByText('Code EM012O1A succeeded. Submitting tag...'),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText('Code EM012O1A succeeded. Submitting tag...'),
    ).toHaveClass('text-[#12804a]');
  });

  it('disables run and reset while editing', async () => {
    render(<AutoFillerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit hunt codes' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Run Program' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Reset program' })).toBeDisabled();
    });
  });

  it('disables edit and add while the program is running', async () => {
    render(<AutoFillerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Run Program' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit hunt codes' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Add hunt code' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Reset program' })).not.toBeDisabled();
    });
  });

  it('returns to idle after resetting the program', async () => {
    render(<AutoFillerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Run Program' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Running...' }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reset program' }));

    await waitFor(() => {
      expect(screen.getByText('Idle')).toBeInTheDocument();
    });
  });

  it('reorders the hunt codes by id', () => {
    const reordered = reorderHuntCodes(
      [
        { id: 1, desktopSegments: ['E', 'M', '012', 'O1', 'A'], mobileCode: 'EM012O1A' },
        { id: 2, desktopSegments: ['E', 'F', '042', 'O1', 'A'], mobileCode: 'EF042O1A' },
        { id: 3, desktopSegments: ['E', 'M', '012', 'O1', 'R'], mobileCode: 'EM012O1R' },
      ],
      3,
      1,
    );

    expect(reordered.map((code) => code.id)).toEqual([3, 1, 2]);
  });
});
