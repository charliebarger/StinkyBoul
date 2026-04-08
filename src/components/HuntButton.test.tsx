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

  it('uses disabled styling when disabled by prop', () => {
    render(
      <HuntButton disabled icon={<HuntIcon name='pause' />} tone='secondary'>
        Button
      </HuntButton>,
    );

    const button = screen.getByRole('button', { name: 'Button' });

    expect(button).toBeDisabled();
    expect(button.className).toContain('bg-hunt-shell');
    expect(button.className).toContain('text-hunt-border');
  });

  it('supports a persistent pressed style for toggle buttons', () => {
    render(
      <HuntButton
        aria-label='Edit'
        aria-pressed='true'
        icon={<HuntIcon name='edit' />}
        size='pill'
        tone='secondary'
      />,
    );

    const button = screen.getByRole('button', { name: 'Edit' });

    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button.className).toContain('aria-pressed:translate-y-[1px]');
  });
});
