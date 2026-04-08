import type { Meta, StoryObj } from '@storybook/react';

import { AutoFillerPage } from './AutoFillerPage';

const meta = {
  title: 'Pages/AutoFillerPage',
  component: AutoFillerPage,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof AutoFillerPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
