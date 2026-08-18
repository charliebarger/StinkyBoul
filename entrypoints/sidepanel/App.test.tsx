import { render, screen } from '@testing-library/react';

import { App } from './App';

describe('App', () => {
  beforeEach(() => {
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

  it('opens the autofiller without requiring an access token', () => {
    render(<App />);

    expect(screen.getByText('Hunt Codes')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Enter Access Token')).toBeNull();
  });
});
