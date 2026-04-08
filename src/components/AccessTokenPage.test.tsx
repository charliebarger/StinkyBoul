import { fireEvent, render, screen } from '@testing-library/react';

import { AccessTokenPage } from './AccessTokenPage';

describe('AccessTokenPage', () => {
  it('renders the branded access token screen', () => {
    render(
      <AccessTokenPage
        token=''
        onActivate={() => undefined}
        onTokenChange={() => undefined}
      />,
    );

    expect(screen.getByText('StinkyBoul')).toBeInTheDocument();
    expect(screen.getByText('Never Miss A Tag')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter Access Token')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activate' })).toBeEnabled();
  });

  it('calls through when the token changes and activates on submit', () => {
    const onActivate = vi.fn();
    const onTokenChange = vi.fn();

    render(
      <AccessTokenPage
        token='ABC-123'
        onActivate={onActivate}
        onTokenChange={onTokenChange}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Enter Access Token'), {
      target: { value: 'ABC-1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Activate' }));

    expect(onTokenChange).toHaveBeenCalledWith('ABC-1234');
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('shows the activating state and the error message', () => {
    render(
      <AccessTokenPage
        errorMessage='Access token already activated. Please contact admin for assistance'
        token='already-activated'
        onActivate={() => undefined}
        onTokenChange={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: 'Activate' })).toBeEnabled();
    expect(
      screen.getByText(
        'Access token already activated. Please contact admin for assistance',
      ),
    ).toBeInTheDocument();
  });

  it('disables the button only while activation is in progress', () => {
    render(
      <AccessTokenPage
        isActivating
        token='CHARLIE'
        onActivate={() => undefined}
        onTokenChange={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: 'Activating' })).toBeDisabled();
  });
});
