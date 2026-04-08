import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { App } from './App';

const accessTokenMocks = vi.hoisted(() => ({
  activateAccessToken: vi.fn(),
  clearStoredAccessToken: vi.fn(),
  getOrCreateBrowserId: vi.fn(),
  getStoredAccessToken: vi.fn(),
  setStoredAccessToken: vi.fn(),
  verifyStoredAccess: vi.fn(),
}));

vi.mock('../../src/lib/accessToken', () => accessTokenMocks);

describe('App access gate', () => {
  beforeEach(() => {
    accessTokenMocks.getStoredAccessToken.mockReset();
    accessTokenMocks.getOrCreateBrowserId.mockReset();
    accessTokenMocks.verifyStoredAccess.mockReset();
    accessTokenMocks.activateAccessToken.mockReset();
    accessTokenMocks.setStoredAccessToken.mockReset();
    accessTokenMocks.clearStoredAccessToken.mockReset();

    accessTokenMocks.getOrCreateBrowserId.mockResolvedValue('browser-123');

    Object.defineProperty(globalThis, 'chrome', {
      configurable: true,
      value: {
        scripting: {
          executeScript: vi.fn(),
        },
        tabs: {
          query: vi.fn(),
        },
      },
    });
  });

  it('shows the activation screen when there is no saved token', async () => {
    accessTokenMocks.getStoredAccessToken.mockResolvedValue(null);

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Enter Access Token'),
      ).toBeInTheDocument();
    });
  });

  it('opens the autofiller when the saved token is valid', async () => {
    accessTokenMocks.getStoredAccessToken.mockResolvedValue(
      'STINKYBOUL-ACCESS-2026',
    );
    accessTokenMocks.verifyStoredAccess.mockResolvedValue(true);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Hunt Codes')).toBeInTheDocument();
    });
  });

  it('clears a saved token when it no longer verifies', async () => {
    accessTokenMocks.getStoredAccessToken.mockResolvedValue(
      'STINKYBOUL-ACCESS-2026',
    );
    accessTokenMocks.verifyStoredAccess.mockResolvedValue(false);

    render(<App />);

    await waitFor(() => {
      expect(accessTokenMocks.clearStoredAccessToken).toHaveBeenCalledTimes(1);
      expect(
        screen.getByPlaceholderText('Enter Access Token'),
      ).toBeInTheDocument();
    });
  });

  it('saves a valid token and unlocks the app', async () => {
    accessTokenMocks.getStoredAccessToken.mockResolvedValue(null);
    accessTokenMocks.activateAccessToken.mockResolvedValue({ success: true });

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Enter Access Token'),
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Enter Access Token'), {
      target: { value: 'stinkyboul-access-2026' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Activate' }));

    await waitFor(() => {
      expect(accessTokenMocks.activateAccessToken).toHaveBeenCalledWith(
        'browser-123',
        'STINKYBOUL-ACCESS-2026',
      );
      expect(accessTokenMocks.setStoredAccessToken).toHaveBeenCalledWith(
        'STINKYBOUL-ACCESS-2026',
      );
      expect(screen.getByText('Hunt Codes')).toBeInTheDocument();
    });
  });
});
