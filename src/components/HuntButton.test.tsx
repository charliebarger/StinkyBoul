import { fireEvent, render, screen } from '@testing-library/react';

import { HuntButton } from './HuntButton';
import { HuntIcon } from './HuntIcon';

describe('HuntButton', () => {
  it('renders a label with a trailing icon', () => {
    render(
      <HuntButton icon={<HuntIcon name='pause' />} tone='primary'>
        Button
      </HuntButton>,
    );

    expect(
      screen.getByRole('button', { name: 'Button' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Button')).toBeInTheDocument();
  });

  it('supports icon-only pill buttons', () => {
    render(
      <HuntButton
        aria-label='Pause'
        icon={<HuntIcon name='pause' />}
        size='pill'
        tone='primary'
      />,
    );

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('calls onClick when enabled', () => {
    const onClick = vi.fn();

    render(
      <HuntButton
        icon={<HuntIcon name='play' />}
        onClick={onClick}
        tone='secondary'
      >
        Play
      </HuntButton>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disables the button for the disabled tone', () => {
    render(
      <HuntButton icon={<HuntIcon name='pause' />} tone='disabled'>
        Button
      </HuntButton>,
    );

    expect(screen.getByRole('button', { name: 'Button' })).toBeDisabled();
  });
});
