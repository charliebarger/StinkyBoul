import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AutoFillerPage, reorderHuntCodes } from './AutoFillerPage';

describe('AutoFillerPage', () => {
  let storageValues: Record<string, unknown>;

  beforeEach(() => {
    storageValues = {};
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
        storage: {
          local: {
            get: vi.fn(async (key: string) => ({
              [key]: storageValues[key],
            })),
            set: vi.fn(async (nextValues: Record<string, unknown>) => {
              storageValues = {
                ...storageValues,
                ...nextValues,
              };
            }),
          },
        },
      },
    });
  });

  it('renders the branded main page content', () => {
    render(<AutoFillerPage />);

    expect(screen.getByText('StinkyBoul')).toBeInTheDocument();
    expect(screen.getByText('Hunt Codes')).toBeInTheDocument();
    expect(screen.getByText('Ready to run program.')).toBeInTheDocument();
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
    const executeScript = vi
      .fn()
      .mockResolvedValueOnce([{ result: 'complete' }])
      .mockResolvedValueOnce([{ result: { canceled: false, runId: 1 } }])
      .mockResolvedValueOnce([{ result: 'ready' }])
      .mockImplementation(
        () =>
          new Promise(() => {
            // Keep the autofill attempt in-flight so reset can cancel it.
          }),
      );

    Object.defineProperty(globalThis, 'chrome', {
      configurable: true,
      value: {
        scripting: {
          executeScript,
        },
        tabs: {
          query: vi.fn().mockResolvedValue([{ id: 123 }]),
        },
      },
    });

    render(<AutoFillerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Run Program' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Running...' }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reset program' }));

    await waitFor(() => {
      expect(screen.getByText('Ready to run program.')).toBeInTheDocument();
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

  it('restores stored hunt codes in their saved order', async () => {
    storageValues['stinkyboul.hunt-codes'] = [
      {
        desktopSegments: ['E', 'M', '012', 'O1', 'R'],
        id: 3,
        mobileCode: 'EM012O1R',
      },
      {
        desktopSegments: ['E', 'F', '042', 'O1', 'A'],
        id: 2,
        mobileCode: 'EF042O1A',
      },
    ];

    render(<AutoFillerPage />);

    await waitFor(() => {
      expect(
        storageValues['stinkyboul.hunt-codes'],
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 3 }),
          expect.objectContaining({ id: 2 }),
        ]),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Run Program' }));

    await waitFor(() => {
      expect(
        screen.getByText('Code EM012O1R succeeded. Submitting tag...'),
      ).toBeInTheDocument();
    });
  });

  it('saves reordered hunt codes to storage', async () => {
    render(<AutoFillerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit hunt codes' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Reorder hunt code 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add hunt code' }));

    await waitFor(() => {
      expect(
        storageValues['stinkyboul.hunt-codes'],
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 1 }),
          expect.objectContaining({ id: 2 }),
          expect.objectContaining({ id: 3 }),
          expect.objectContaining({ id: 4 }),
          expect.objectContaining({ id: 5 }),
        ]),
      );
    });
  });
});
