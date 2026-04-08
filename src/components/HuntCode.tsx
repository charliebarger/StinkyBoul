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

type HuntCodeLayout = 'compact' | 'condensed' | 'regular';

export type HuntCodeProps = HTMLAttributes<HTMLDivElement> & {
  state?: HuntCodeState;
  indexLabel?: string;
  desktopSegments?: readonly string[];
  mobileCode?: string;
  onDelete?: () => void;
};

const DEFAULT_SEGMENTS = ['E', 'M', '012', 'O1', 'R'] as const;
const DEFAULT_SEGMENT_LENGTHS = DEFAULT_SEGMENTS.map(
  (segment) => segment.length,
);
const DEFAULT_MOBILE_CODE_LENGTH = DEFAULT_SEGMENT_LENGTHS.reduce(
  (total, length) => total + length,
  0,
);
const DESKTOP_REGULAR_GAP = 8;
const DESKTOP_CONDENSED_GAP = 6;

function getDesktopSegmentWidth(maxLength: number, condensed = false) {
  if (condensed) {
    return maxLength >= 3 ? 50 : maxLength === 2 ? 42 : 34;
  }

  return maxLength >= 3 ? 60 : maxLength === 2 ? 48 : 40;
}

const DESKTOP_REGULAR_ROW_WIDTH =
  DEFAULT_SEGMENT_LENGTHS.reduce(
    (total, length) => total + getDesktopSegmentWidth(length),
    0,
  ) +
  DESKTOP_REGULAR_GAP * (DEFAULT_SEGMENT_LENGTHS.length - 1);
const DESKTOP_CONDENSED_ROW_WIDTH =
  DEFAULT_SEGMENT_LENGTHS.reduce(
    (total, length) => total + getDesktopSegmentWidth(length, true),
    0,
  ) +
  DESKTOP_CONDENSED_GAP * (DEFAULT_SEGMENT_LENGTHS.length - 1);

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

function resolveDesktopSegmentValues(segments?: readonly string[]) {
  return DEFAULT_SEGMENT_LENGTHS.map((segmentLength, index) =>
    (segments?.[index] ?? '').slice(0, segmentLength),
  );
}

function flattenDesktopSegmentValues(segments: readonly string[]) {
  return segments.join('');
}

function resolveDesktopValuesFromCode(code: string) {
  let cursor = 0;

  return DEFAULT_SEGMENT_LENGTHS.map((segmentLength) => {
    const nextSegment = code.slice(cursor, cursor + segmentLength);
    cursor += segmentLength;
    return nextSegment;
  });
}

function resolveCodeValues(
  desktopSegments?: readonly string[],
  mobileCode?: string,
) {
  const desktopValues = desktopSegments
    ? resolveDesktopSegmentValues(desktopSegments)
    : resolveDesktopValuesFromCode(mobileCode ?? '');

  return {
    desktopValues,
    mobileValue: mobileCode ?? flattenDesktopSegmentValues(desktopValues),
  };
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
  compact?: boolean;
  condensed?: boolean;
  maxLength: number;
  onChange?: (value: string) => void;
  inputRef?: (node: HTMLInputElement | null) => void;
  onPaste?: (event: ClipboardEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
  value: string;
}

function InputBox({
  ariaLabel,
  compact = false,
  condensed = false,
  inputRef,
  maxLength,
  onChange,
  onPaste,
  readOnly = false,
  value,
}: InputBoxProps) {
  const compactWidth = `${Math.max(maxLength + 2.2, 8)}ch`;
  const widthStyle = compact
    ? { width: compactWidth }
    : { width: getDesktopSegmentWidth(maxLength, condensed) };

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
      style={widthStyle}
      className={cx(
        'rounded-[6px] border border-hunt-border bg-hunt-panel text-center font-medium text-hunt-text outline-none appearance-none',
        compact
          ? 'h-[40px] px-[10px] text-[14px] leading-none'
          : condensed
            ? 'h-[34px] px-0 text-[13px] leading-[1.1]'
            : 'h-[34px] px-0 text-[14px] leading-[1.1]',
        !readOnly &&
          'focus:border-hunt-blueInk focus:ring-2 focus:ring-hunt-blue/70',
        readOnly && 'pointer-events-none cursor-default select-none',
        compact ? 'min-w-0' : 'shrink-0',
      )}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      onPaste={onPaste}
    />
  );
}

export function HuntCode({
  className,
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
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const desktopInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [layoutMode, setLayoutMode] = useState<HuntCodeLayout>('regular');
  const [desktopValues, setDesktopValues] = useState(
    () => resolveCodeValues(desktopSegments, mobileCode).desktopValues,
  );
  const [mobileValue, setMobileValue] = useState(
    () => resolveCodeValues(desktopSegments, mobileCode).mobileValue,
  );

  useEffect(() => {
    const nextValues = resolveCodeValues(desktopSegments, mobileCode);
    setDesktopValues(nextValues.desktopValues);
    setMobileValue(nextValues.mobileValue);
  }, [desktopSegments, mobileCode]);

  useEffect(() => {
    const node = layoutRef.current;

    if (!node) {
      return;
    }

    const measure = () => {
      if (node.clientWidth === 0) {
        return;
      }

      if (node.clientWidth >= DESKTOP_REGULAR_ROW_WIDTH) {
        setLayoutMode('regular');
        return;
      }

      if (node.clientWidth >= DESKTOP_CONDENSED_ROW_WIDTH) {
        setLayoutMode('condensed');
        return;
      }

      setLayoutMode('compact');
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [showsDeleteAction]);

  function handleDesktopSegmentChange(index: number, nextValue: string) {
    const maxLength = DEFAULT_SEGMENT_LENGTHS[index];
    const trimmedValue = nextValue.slice(0, maxLength);

    setDesktopValues((currentValues) => {
      const nextDesktopValues = currentValues.map((value, valueIndex) =>
        valueIndex === index ? trimmedValue : value,
      );

      setMobileValue(flattenDesktopSegmentValues(nextDesktopValues));
      return nextDesktopValues;
    });

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

    setDesktopValues((currentValues) => {
      const nextDesktopValues = currentValues.map((currentValue, valueIndex) => {
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
      });

      setMobileValue(flattenDesktopSegmentValues(nextDesktopValues));
      return nextDesktopValues;
    });

    const nextInputIndex = Math.min(
      lastFilledIndex + 1,
      DEFAULT_SEGMENT_LENGTHS.length - 1,
    );
    const focusIndex =
      cursor >= pastedText.length ? lastFilledIndex : nextInputIndex;

    requestAnimationFrame(() => {
      desktopInputRefs.current[focusIndex]?.focus();
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
            <div className='flex items-center justify-center'>
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
            <div ref={layoutRef} className='min-w-0 flex-1'>
              {layoutMode === 'compact' ? (
                <InputBox
                  ariaLabel='Mobile hunt code'
                  compact
                  maxLength={DEFAULT_MOBILE_CODE_LENGTH}
                  onChange={
                    isEditable
                      ? (nextValue) => {
                          const trimmedValue = nextValue.slice(
                            0,
                            DEFAULT_MOBILE_CODE_LENGTH,
                          );

                          setMobileValue(trimmedValue);
                          setDesktopValues(
                            resolveDesktopValuesFromCode(trimmedValue),
                          );
                        }
                      : undefined
                  }
                  readOnly={!isEditable}
                  value={mobileValue}
                />
              ) : (
                <div
                  className={cx(
                    'flex w-full min-w-0 items-center',
                    layoutMode === 'condensed' ? 'gap-[6px]' : 'gap-[8px]',
                  )}
                >
                  {desktopValues.map((segment, index) => (
                    <InputBox
                      key={`${index}-${DEFAULT_SEGMENT_LENGTHS[index]}`}
                      ariaLabel={`Code segment ${index + 1}`}
                      condensed={layoutMode === 'condensed'}
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
              )}
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
