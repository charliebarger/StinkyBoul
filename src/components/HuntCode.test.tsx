import { fireEvent, render, screen } from '@testing-library/react';

import { HuntCode } from './HuntCode';

describe('HuntCode', () => {
  it('renders blank editable segmented inputs in the default state', () => {
    render(<HuntCode />);

    const inputs = screen.getAllByRole('textbox');

    expect(inputs).toHaveLength(5);
    expect(inputs.map((input) => input.getAttribute('maxlength'))).toEqual([
      '1',
      '1',
      '3',
      '2',
      '1',
    ]);
    expect(
      inputs.every((input) => (input as HTMLInputElement).value === ''),
    ).toBe(true);
    expect(
      inputs.every((input) => !(input as HTMLInputElement).readOnly),
    ).toBe(true);
  });

  it('allows entering a code into the segmented inputs', () => {
    render(<HuntCode state="editing" />);

    const fullInput = screen.getByLabelText('Hunt code');

    fireEvent.change(fullInput, { target: { value: 'EM012O1R' } });

    expect(fullInput).toHaveValue('EM012O1R');
  });

  it('renders a single full-width input in edit mode', () => {
    render(<HuntCode state="editing" />);

    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.getByLabelText('Hunt code')).toBeInTheDocument();
  });

  it('renders segmented inputs outside edit mode', () => {
    render(<HuntCode state="default" />);

    expect(screen.getAllByRole('textbox')).toHaveLength(5);
    expect(screen.queryByLabelText('Hunt code')).not.toBeInTheDocument();
  });

  it('shows a dedicated drag handle in edit mode', () => {
    render(<HuntCode state="editing" indexLabel="3" />);

    expect(screen.getByLabelText('Drag handle')).toBeInTheDocument();
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('fills the single edit input from a full code and trims overflow', () => {
    render(<HuntCode state="editing" />);

    const fullInput = screen.getByLabelText('Hunt code');

    fireEvent.change(fullInput, { target: { value: 'EF012O1AXYZ' } });

    expect(fullInput).toHaveValue('EF012O1A');
  });

  it('shows the delete action in editing and dragging states', () => {
    const { rerender } = render(<HuntCode state="editing" />);

    expect(
      screen.getByRole('button', { name: 'Delete hunt code' }),
    ).toBeInTheDocument();

    rerender(<HuntCode state="dragging" />);

    expect(
      screen.getByRole('button', { name: 'Delete hunt code' }),
    ).toBeInTheDocument();
  });

  it('calls onDelete when the delete action is pressed', () => {
    const onDelete = vi.fn();

    render(<HuntCode state="editing" onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete hunt code' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('keeps inputs read-only in non-editable states', () => {
    render(<HuntCode state="success" />);

    const firstSegment = screen.getByLabelText('Code segment 1');

    fireEvent.change(firstSegment, { target: { value: 'E' } });

    expect(firstSegment).toHaveValue('');
    expect(firstSegment).toHaveAttribute('readonly');
    expect(firstSegment).toHaveAttribute('tabindex', '-1');
  });

  it('shows a success glyph for the success state', () => {
    render(<HuntCode state="success" />);

    expect(screen.getByLabelText('Success status')).toBeInTheDocument();
  });

  it('shows a failure glyph for the failure state', () => {
    render(<HuntCode state="failure" />);

    expect(screen.getByLabelText('Failure status')).toBeInTheDocument();
  });

  it('shows a spinner glyph for the trying state', () => {
    render(<HuntCode state="trying" />);

    expect(screen.getByLabelText('Trying status')).toBeInTheDocument();
  });

  it('marks the root element with the active state', () => {
    render(<HuntCode state="dragging" />);

    expect(screen.getByLabelText('Dragging hunt code')).toHaveAttribute(
      'data-state',
      'dragging',
    );
  });
});
