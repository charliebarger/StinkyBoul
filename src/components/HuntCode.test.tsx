import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { HuntCode } from './HuntCode';

function mockClientWidth(width: number) {
  const originalClientWidth = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'clientWidth',
  );

  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => width,
  });

  return () => {
    if (originalClientWidth) {
      Object.defineProperty(
        HTMLElement.prototype,
        'clientWidth',
        originalClientWidth,
      );
      return;
    }

    Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
  };
}

describe('HuntCode', () => {
  it('renders blank editable segmented inputs in the default state', async () => {
    const restoreClientWidth = mockClientWidth(280);

    render(<HuntCode />);

    await waitFor(() => {
      expect(screen.getAllByRole('textbox')).toHaveLength(5);
    });

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

    restoreClientWidth();
  });

  it('allows entering a code into the segmented inputs', async () => {
    const restoreClientWidth = mockClientWidth(280);

    render(<HuntCode state="editing" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Code segment 3')).toBeInTheDocument();
    });

    const segmentInput = screen.getByLabelText('Code segment 3');

    fireEvent.change(segmentInput, { target: { value: '012' } });

    expect(segmentInput).toHaveValue('012');
    restoreClientWidth();
  });

  it('uses the compact single input only when space is too small', async () => {
    const restoreClientWidth = mockClientWidth(180);

    render(<HuntCode state="editing" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Mobile hunt code')).toBeInTheDocument();
    });

    const mobileInput = screen.getByLabelText('Mobile hunt code');

    fireEvent.change(mobileInput, { target: { value: 'EF012O1A' } });

    expect(mobileInput).toHaveValue('EF012O1A');
    restoreClientWidth();
  });

  it('moves focus to the next segment after reaching max length', async () => {
    const restoreClientWidth = mockClientWidth(280);

    render(<HuntCode state="editing" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Code segment 1')).toBeInTheDocument();
    });

    const firstSegment = screen.getByLabelText('Code segment 1');
    const secondSegment = screen.getByLabelText('Code segment 2');

    firstSegment.focus();
    fireEvent.change(firstSegment, { target: { value: 'E' } });

    expect(firstSegment).toHaveValue('E');
    expect(secondSegment).toHaveFocus();
    restoreClientWidth();
  });

  it('fills segmented inputs from a pasted code and trims overflow', async () => {
    const restoreClientWidth = mockClientWidth(280);

    render(<HuntCode state="editing" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Code segment 1')).toBeInTheDocument();
    });

    const firstSegment = screen.getByLabelText('Code segment 1');
    const secondSegment = screen.getByLabelText('Code segment 2');
    const thirdSegment = screen.getByLabelText('Code segment 3');
    const fourthSegment = screen.getByLabelText('Code segment 4');
    const fifthSegment = screen.getByLabelText('Code segment 5');

    fireEvent.paste(firstSegment, {
      clipboardData: {
        getData: () => 'EF012O1AXYZ',
      },
    });

    expect(firstSegment).toHaveValue('E');
    expect(secondSegment).toHaveValue('F');
    expect(thirdSegment).toHaveValue('012');
    expect(fourthSegment).toHaveValue('O1');
    expect(fifthSegment).toHaveValue('A');
    restoreClientWidth();
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

  it('keeps inputs read-only in non-editable states', async () => {
    const restoreClientWidth = mockClientWidth(280);

    render(<HuntCode state="success" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Code segment 1')).toBeInTheDocument();
    });

    const firstSegment = screen.getByLabelText('Code segment 1');

    fireEvent.change(firstSegment, { target: { value: 'E' } });

    expect(firstSegment).toHaveValue('');
    expect(firstSegment).toHaveAttribute('readonly');
    expect(firstSegment).toHaveAttribute('tabindex', '-1');
    restoreClientWidth();
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
