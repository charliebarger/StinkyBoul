import { useEffect, useRef, useState } from 'react';
import type { ClipboardEvent, HTMLAttributes } from 'react';

import { HuntIcon } from './HuntIcon';

type HuntCodeState =
  | 'default'
  | 'editing'
  | 'dragging'
  | 'success'
  | 'failure'
  | 'trying';

export type HuntCodeProps = HTMLAttributes<HTMLDivElement> & {
  state?: HuntCodeState;
  dragHandleProps?: HTMLAttributes<HTMLDivElement>;
  indexLabel?: string;
  desktopSegments?: readonly string[];
  mobileCode?: string;
  onDelete?: () => void;
};

const DEFAULT_SEGMENTS = ['E', 'M', '012', 'O1', 'R'] as const;
const DEFAULT_SEGMENT_LENGTHS = DEFAULT_SEGMENTS.map(
  (segment) => segment.length,
);

function getDesktopSegmentWidth(maxLength: number) {
  return `calc(${maxLength}ch + 18px)`;
}

const STATE_LABELS: Record<HuntCodeState, string> = {
  default: 'Default',
  editing: 'Editing',
  dragging: 'Dragging',
  success: 'Success',
  failure: 'Failure',
  trying: 'Trying',
};

const SURFACE_VARIANTS: Record<HuntCodeState, string> = {
  default: 'shadow-none',
  editing: 'shadow-hunt',
  dragging: 'shadow-hunt',
  success: 'shadow-none',
  failure: 'shadow-none',
  trying: 'shadow-hunt',
};

const LEFT_PANEL_VARIANTS: Record<HuntCodeState, string> = {
  default: 'bg-white',
  editing: 'bg-hunt-blue',
  dragging: 'bg-hunt-blue',
  success: 'bg-hunt-success',
  failure: 'bg-hunt-failure',
  trying: 'bg-hunt-blue',
};

const BODY_VARIANTS: Record<HuntCodeState, string> = {
  default: 'bg-white',
  editing: 'bg-white',
  dragging: 'bg-hunt-blue',
  success: 'bg-white',
  failure: 'bg-white',
  trying: 'bg-white',
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function resolveDesktopSegmentValues(
  desktopSegments?: readonly string[],
  mobileCode?: string,
) {
  if (desktopSegments) {
    return DEFAULT_SEGMENT_LENGTHS.map((segmentLength, index) =>
      (desktopSegments[index] ?? '').slice(0, segmentLength),
    );
  }

  let cursor = 0;
  const source = mobileCode ?? '';

  return DEFAULT_SEGMENT_LENGTHS.map((segmentLength) => {
    const nextSegment = source.slice(cursor, cursor + segmentLength);
    cursor += segmentLength;
    return nextSegment;
  });
}

function flattenDesktopSegmentValues(segments: readonly string[]) {
  return segments.join('');
}

function InfoChip({
  label,
  raised = false,
}: {
  label: string;
  raised?: boolean;
}) {
  return (
    <span
      aria-hidden='true'
      className={cx(
        'flex h-[25px] w-[25px] items-center justify-center rounded-full border border-hunt-blueInk bg-hunt-blueStrong text-[12px] font-bold leading-none text-hunt-blueInk',
        raised && 'border-dashed shadow-hunt-place',
      )}
    >
      {label}
    </span>
  );
}

function StatusGlyph({
  indexLabel,
  state,
}: {
  indexLabel: string;
  state: HuntCodeState;
}) {
  if (state === 'success') {
    return (
      <span
        aria-label='Success status'
        className='inline-flex h-[25px] w-[25px] items-center justify-center rounded-full bg-hunt-successInk text-white'
      >
        <svg
          aria-hidden='true'
          viewBox='0 0 20 20'
          className='h-4 w-4 fill-none stroke-current stroke-[2.75]'
        >
          <path
            d='M4.5 10.5 8 14l7.5-8'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </span>
    );
  }

  if (state === 'failure') {
    return (
      <span
        aria-label='Failure status'
        className='inline-flex h-[25px] w-[25px] items-center justify-center rounded-full bg-hunt-failureInk text-white'
      >
        <svg
          aria-hidden='true'
          viewBox='0 0 20 20'
          className='h-4 w-4 fill-none stroke-current stroke-[2.75]'
        >
          <path d='m5.5 5.5 9 9m0-9-9 9' strokeLinecap='round' />
        </svg>
      </span>
    );
  }

  if (state === 'trying') {
    return (
      <span
        aria-label='Trying status'
        className='inline-flex h-[25px] w-[25px] items-center justify-center'
      >
        <span
          aria-hidden='true'
          className='h-[17px] w-[17px] rounded-full border-2 border-hunt-border border-r-hunt-blueInk border-t-hunt-blueInk animate-hunt-spin'
        />
      </span>
    );
  }

  return (
    <InfoChip
      label={indexLabel}
      raised={state === 'editing' || state === 'dragging'}
    />
  );
}

function DeleteButton({
  onDelete,
  dragging = false,
}: {
  onDelete?: () => void;
  dragging?: boolean;
}) {
  return (
    <button
      type='button'
      aria-label='Delete hunt code'
      onClick={onDelete}
      className={cx(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center text-hunt-border transition-colors duration-150',
        'hover:text-hunt-failureInk focus:text-hunt-failureInk',
        'focus:outline-none focus:ring-2 focus:ring-hunt-failureInk/20',
        dragging && 'text-slate-500',
      )}
    >
      <HuntIcon className='text-current' name='trash' size={22} />
    </button>
  );
}

interface InputBoxProps {
  ariaLabel: string;
  maxLength: number;
  onChange?: (value: string) => void;
  inputRef?: (node: HTMLInputElement | null) => void;
  onPaste?: (event: ClipboardEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
  value: string;
}

function InputBox({
  ariaLabel,
  inputRef,
  maxLength,
  onChange,
  onPaste,
  readOnly = false,
  value,
}: InputBoxProps) {
  return (
    <input
      ref={inputRef}
      type='text'
      maxLength={maxLength}
      aria-label={ariaLabel}
      autoComplete='off'
      readOnly={readOnly}
      spellCheck={false}
      tabIndex={readOnly ? -1 : undefined}
      style={{ width: getDesktopSegmentWidth(maxLength) }}
      className={cx(
        'h-[34px] shrink-0 appearance-none rounded-[6px] border border-hunt-border bg-hunt-panel px-[4px] text-center text-[14px] font-medium leading-[1.1] text-hunt-text outline-none',
        !readOnly &&
          'focus:border-hunt-blueInk focus:ring-2 focus:ring-hunt-blue/70',
        readOnly && 'pointer-events-none cursor-default select-none',
      )}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      onPaste={onPaste}
    />
  );
}

export function HuntCode({
  className,
  dragHandleProps,
  state = 'default',
  indexLabel = '1',
  desktopSegments,
  mobileCode,
  onDelete,
  ...props
}: HuntCodeProps) {
  const isDragging = state === 'dragging';
  const isEditable = state === 'default' || state === 'editing';
  const showsDeleteAction = state === 'editing' || state === 'dragging';
  const a11yLabel = `${STATE_LABELS[state]} hunt code`;
  const desktopInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [desktopValues, setDesktopValues] = useState(() =>
    resolveDesktopSegmentValues(desktopSegments, mobileCode),
  );
  const { className: dragHandleClassName, ...restDragHandleProps } =
    dragHandleProps ?? {};

  useEffect(() => {
    setDesktopValues(resolveDesktopSegmentValues(desktopSegments, mobileCode));
  }, [desktopSegments, mobileCode]);

  function handleDesktopSegmentChange(index: number, nextValue: string) {
    const maxLength = DEFAULT_SEGMENT_LENGTHS[index];
    const trimmedValue = nextValue.slice(0, maxLength);

    setDesktopValues((currentValues) =>
      currentValues.map((value, valueIndex) =>
        valueIndex === index ? trimmedValue : value,
      ),
    );

    if (trimmedValue.length === maxLength) {
      desktopInputRefs.current[index + 1]?.focus();
    }
  }

  function handleDesktopPaste(
    index: number,
    event: ClipboardEvent<HTMLInputElement>,
  ) {
    const pastedText = event.clipboardData.getData('text').replace(/\s+/g, '');

    if (!pastedText) {
      return;
    }

    event.preventDefault();

    let cursor = 0;
    let lastFilledIndex = index;

    setDesktopValues((currentValues) =>
      currentValues.map((currentValue, valueIndex) => {
        if (valueIndex < index) {
          return currentValue;
        }

        const segmentLength = DEFAULT_SEGMENT_LENGTHS[valueIndex];
        const nextSegmentValue = pastedText.slice(
          cursor,
          cursor + segmentLength,
        );

        if (!nextSegmentValue) {
          return currentValue;
        }

        cursor += segmentLength;
        lastFilledIndex = valueIndex;
        return nextSegmentValue;
      }),
    );

    requestAnimationFrame(() => {
      desktopInputRefs.current[lastFilledIndex]?.focus();
    });
  }

  return (
    <div
      aria-label={a11yLabel}
      className={cx(isDragging && 'py-1', 'w-fit', className)}
      data-state={state}
      {...props}
    >
      <div
        className={cx(
          'flex items-center justify-start',
          isDragging && 'rotate-[2deg]',
        )}
      >
        <div
          className={cx(
            'flex w-full items-stretch overflow-hidden rounded-[10px] border-2 border-hunt-border bg-hunt-shell',
            SURFACE_VARIANTS[state],
          )}
        >
          <div
            className={cx(
              'flex w-[50px] shrink-0 items-center justify-center border-r-2 border-hunt-border',
              LEFT_PANEL_VARIANTS[state],
              isDragging && 'shadow-[-19px_0_4px_rgba(0,0,0,0.12)]',
            )}
          >
            <div
              className={cx(
                'flex h-full w-full items-center justify-center',
                dragHandleProps && 'touch-none cursor-grab active:cursor-grabbing',
                dragHandleClassName,
              )}
              {...restDragHandleProps}
            >
              <span className='sr-only'>Priority {indexLabel}</span>
              <StatusGlyph indexLabel={indexLabel} state={state} />
            </div>
          </div>

          <div
            className={cx(
              'flex flex-1 items-center gap-3 p-[14px]',
              BODY_VARIANTS[state],
            )}
          >
            <div className='flex min-w-0 flex-1 items-center gap-[8px]'>
              {desktopValues.map((segment, index) => (
                <InputBox
                  key={`${index}-${DEFAULT_SEGMENT_LENGTHS[index]}`}
                  ariaLabel={`Code segment ${index + 1}`}
                  inputRef={(node) => {
                    desktopInputRefs.current[index] = node;
                  }}
                  maxLength={DEFAULT_SEGMENT_LENGTHS[index]}
                  onChange={
                    isEditable
                      ? (nextValue) =>
                          handleDesktopSegmentChange(index, nextValue)
                      : undefined
                  }
                  onPaste={
                    isEditable
                      ? (event) => handleDesktopPaste(index, event)
                      : undefined
                  }
                  readOnly={!isEditable}
                  value={segment}
                />
              ))}
            </div>

            {showsDeleteAction ? (
              <DeleteButton dragging={isDragging} onDelete={onDelete} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
