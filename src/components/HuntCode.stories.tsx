import type { Meta, StoryObj } from '@storybook/react';

import { HuntCode } from './HuntCode';

const meta = {
  title: 'Components/HuntCode',
  component: HuntCode,
  parameters: {
    layout: 'centered',
  },
  args: {
    state: 'default',
  },
  argTypes: {
    state: {
      control: 'inline-radio',
      options: ['default', 'editing', 'dragging', 'success', 'failure', 'trying'],
    },
  },
} satisfies Meta<typeof HuntCode>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const StateGallery: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <HuntCode state="default" />
      <HuntCode state="editing" />
      <HuntCode state="dragging" />
      <HuntCode state="success" />
      <HuntCode state="failure" />
      <HuntCode state="trying" />
    </div>
  ),
};
