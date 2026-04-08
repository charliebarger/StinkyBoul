import { useRef, useState } from 'react';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { HuntButton } from './HuntButton';
import { HuntCode } from './HuntCode';
import { HuntIcon } from './HuntIcon';

type HuntCodeSeed = {
  desktopSegments: readonly string[];
  id: number;
  mobileCode: string;
};

const LOGO_URL =
  'https://www.figma.com/api/mcp/asset/8172062c-88a5-4100-9194-275d1cc4d327';
const BACKGROUND_ART_URL =
  'https://www.figma.com/api/mcp/asset/a7ef81f0-2b60-4429-80c6-7a43dd61e6ff';
const INITIAL_CODES: HuntCodeSeed[] = [
  {
    id: 1,
    desktopSegments: ['E', 'M', '012', 'O1', 'A'],
    mobileCode: 'EM012O1A',
  },
  {
    id: 2,
    desktopSegments: ['E', 'F', '042', 'O1', 'A'],
    mobileCode: 'EF042O1A',
  },
  {
    id: 3,
    desktopSegments: ['E', 'M', '012', 'O1', 'R'],
    mobileCode: 'EM012O1R',
  },
  {
    id: 4,
    desktopSegments: ['E', 'M', '012', 'O1', 'R'],
    mobileCode: 'EM012O1R',
  },
];
const EMPTY_CODE: Omit<HuntCodeSeed, 'id'> = {
  desktopSegments: ['', '', '', '', ''],
  mobileCode: '',
};

export function reorderHuntCodes(
  codes: HuntCodeSeed[],
  activeId: number,
  overId?: number,
) {
  if (!overId || activeId === overId) {
    return codes;
  }

  const oldIndex = codes.findIndex((code) => code.id === activeId);
  const newIndex = codes.findIndex((code) => code.id === overId);

  if (oldIndex === -1 || newIndex === -1) {
    return codes;
  }

  return arrayMove(codes, oldIndex, newIndex);
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function SortableCodeCard({
  code,
  index,
  isEditing,
  onDelete,
}: {
  code: HuntCodeSeed;
  index: number;
  isEditing: boolean;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: code.id,
    disabled: !isEditing,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cx(isDragging && 'z-10')}
    >
      <HuntCode
        desktopSegments={code.desktopSegments}
        dragHandleProps={
          isEditing
            ? {
                ...attributes,
                ...listeners,
                'aria-label': `Reorder hunt code ${index + 1}`,
              }
            : undefined
        }
        indexLabel={String(index + 1)}
        mobileCode={code.mobileCode}
        onDelete={onDelete}
        state={isDragging ? 'dragging' : isEditing ? 'editing' : 'default'}
      />
    </div>
  );
}

export function AutoFillerPage() {
  const nextCodeIdRef = useRef(INITIAL_CODES.length + 1);
  const [codes, setCodes] = useState(INITIAL_CODES);
  const [isEditing, setIsEditing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleAddCode() {
    setCodes((currentCodes) => [
      ...currentCodes,
      {
        ...EMPTY_CODE,
        id: nextCodeIdRef.current++,
      },
    ]);
  }

  function handleDeleteCode(id: number) {
    setCodes((currentCodes) => currentCodes.filter((code) => code.id !== id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = Number(event.active.id);
    const overId = event.over ? Number(event.over.id) : undefined;

    setCodes((currentCodes) => reorderHuntCodes(currentCodes, activeId, overId));
  }

  return (
    <main className='relative min-h-screen overflow-hidden bg-[#f9fafb] text-hunt-text'>
      <div className='pointer-events-none absolute inset-0 overflow-hidden opacity-60'>
        <img
          alt=''
          aria-hidden='true'
          className='absolute inset-0 h-full w-full object-cover'
          src={BACKGROUND_ART_URL}
        />
      </div>

      <div className='relative flex min-h-screen flex-col'>
        <header className='px-4 py-6'>
          <div className='mx-auto flex max-w-[328px] items-center justify-center gap-4'>
            <img
              alt='StinkyBoul logo'
              className='h-[51px] w-[60px] shrink-0 object-contain'
              src={LOGO_URL}
            />
            <div className='space-y-2 text-center'>
              <h1 className='text-[32px] font-bold leading-none tracking-[0.01em] text-[#162456]'>
                StinkyBoul
              </h1>
              <p className='text-[14px] font-medium leading-none text-hunt-text'>
                Never Miss A Tag
              </p>
            </div>
          </div>
        </header>

        <section className='flex-1 px-4'>
          <div className='mx-auto flex w-full max-w-[328px] flex-col pb-12 pt-4'>
            <div className='space-y-2 pb-4'>
              <h2 className='text-[20px] font-bold leading-[1.2] text-hunt-text'>
                Hunt Codes
              </h2>
              <p className='max-w-[316px] text-[12px] font-medium leading-[1.45] text-[#6a7282]'>
                Enter codes in priority order. Codes are tried from top to
                bottom until one succeeds or the list ends.
              </p>
            </div>

            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              sensors={sensors}
            >
              <SortableContext
                items={codes.map((code) => code.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className='flex flex-col items-start gap-4'>
                  {codes.map((code, index) => (
                    <SortableCodeCard
                      key={code.id}
                      code={code}
                      index={index}
                      isEditing={isEditing}
                      onDelete={() => handleDeleteCode(code.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className='flex items-center justify-between pb-6 pt-8'>
              <div className='flex items-center gap-[10px]'>
                <HuntButton
                  icon={<HuntIcon name='play' />}
                  size='medium'
                  tone='primary'
                  onClick={() => setIsRunning(true)}
                >
                  Run Program
                </HuntButton>
                <HuntButton
                  aria-label='Pause program'
                  icon={
                    <HuntIcon
                      className={
                        isRunning ? 'brightness-0 saturate-100' : undefined
                      }
                      name='pause'
                    />
                  }
                  size='pill'
                  tone={isRunning ? 'secondary' : 'disabled'}
                  onClick={() => setIsRunning(false)}
                />
              </div>

              <div className='flex items-center gap-[10px]'>
                <HuntButton
                  aria-label='Edit hunt codes'
                  aria-pressed={isEditing}
                  icon={
                    <HuntIcon
                      className='brightness-0 saturate-100'
                      name='edit'
                    />
                  }
                  size='pill'
                  tone='secondary'
                  onClick={() => setIsEditing((currentState) => !currentState)}
                />
                <HuntButton
                  aria-label='Add hunt code'
                  icon={
                    <HuntIcon
                      className='brightness-0 saturate-100'
                      name='add'
                    />
                  }
                  size='pill'
                  tone='secondary'
                  onClick={handleAddCode}
                />
              </div>
            </div>

            <p className='min-h-[14px] text-[14px] font-semibold leading-none text-[#6a7282] underline underline-offset-[3px]'>
              {isRunning ? 'Running code {1}...' : 'Running code {x}...'}
            </p>
          </div>
        </section>

        <footer className='mt-auto bg-white px-4 py-4'>
          <p className='mx-auto max-w-[328px] text-[12px] leading-4 text-hunt-text'>
            <span className='italic font-light'>
              “You’re going to learn this real quick out here. If you want
              something, you better bring it.”
            </span>{' '}
            <span className='font-light not-italic'>- </span>
            <span className='font-medium not-italic'>Caleb McDaniel</span>
          </p>
        </footer>
      </div>
    </main>
  );
}
