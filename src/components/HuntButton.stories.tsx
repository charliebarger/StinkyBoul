import type { Meta, StoryObj } from '@storybook/react';

import { HuntButton } from './HuntButton';
import { HuntIcon } from './HuntIcon';

const meta = {
  title: 'Components/HuntButton',
  component: HuntButton,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof HuntButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PrimarySmall: Story = {
  render: () => (
    <HuntButton icon={<HuntIcon name='pause' />} size='small' tone='primary'>
      Button
    </HuntButton>
  ),
};

export const VariantGallery: Story = {
  render: () => (
    <div className='grid gap-6 md:grid-cols-2'>
      <div className='flex flex-col gap-3'>
        <HuntButton icon={<HuntIcon name='pause' />} size='small' tone='primary'>
          Button
        </HuntButton>
        <HuntButton icon={<HuntIcon name='pause' />} size='medium' tone='primary'>
          Button
        </HuntButton>
        <HuntButton icon={<HuntIcon name='pause' />} size='large' tone='primary'>
          Button
        </HuntButton>
        <HuntButton
          aria-label='Pause'
          icon={<HuntIcon name='pause' />}
          size='pill'
          tone='primary'
        />
      </div>
      <div className='flex flex-col gap-3'>
        <HuntButton icon={<HuntIcon name='pause' tone='secondary' />} size='small' tone='secondary'>
          Button
        </HuntButton>
        <HuntButton icon={<HuntIcon name='pause' tone='secondary' />} size='medium' tone='secondary'>
          Button
        </HuntButton>
        <HuntButton icon={<HuntIcon name='pause' tone='secondary' />} size='large' tone='secondary'>
          Button
        </HuntButton>
        <HuntButton
          aria-label='Pause'
          icon={<HuntIcon name='pause' tone='secondary' />}
          size='pill'
          tone='secondary'
        />
      </div>
      <div className='flex flex-col gap-3'>
        <HuntButton icon={<HuntIcon name='pause' />} size='small' tone='disabled'>
          Button
        </HuntButton>
        <HuntButton icon={<HuntIcon name='pause' />} size='medium' tone='disabled'>
          Button
        </HuntButton>
        <HuntButton icon={<HuntIcon name='pause' />} size='large' tone='disabled'>
          Button
        </HuntButton>
        <HuntButton
          aria-label='Pause'
          icon={<HuntIcon name='pause' />}
          size='pill'
          tone='disabled'
        />
      </div>
      <div className='flex flex-col gap-3'>
        <HuntButton icon={<HuntIcon name='pause' />} size='small' tone='destructive'>
          Button
        </HuntButton>
        <HuntButton icon={<HuntIcon name='pause' />} size='medium' tone='destructive'>
          Button
        </HuntButton>
        <HuntButton icon={<HuntIcon name='pause' />} size='large' tone='destructive'>
          Button
        </HuntButton>
        <HuntButton
          aria-label='Pause'
          icon={<HuntIcon name='pause' />}
          size='pill'
          tone='destructive'
        />
      </div>
    </div>
  ),
};

export const IconSet: Story = {
  render: () => (
    <div className='flex flex-wrap gap-3'>
      <HuntButton icon={<HuntIcon name='add' />} size='small' tone='primary'>
        Add
      </HuntButton>
      <HuntButton icon={<HuntIcon name='pause' />} size='small' tone='primary'>
        Pause
      </HuntButton>
      <HuntButton icon={<HuntIcon name='play' />} size='small' tone='primary'>
        Play
      </HuntButton>
      <HuntButton icon={<HuntIcon name='sync' />} size='small' tone='primary'>
        Sync
      </HuntButton>
      <HuntButton icon={<HuntIcon name='edit' />} size='small' tone='primary'>
        Edit
      </HuntButton>
    </div>
  ),
};
