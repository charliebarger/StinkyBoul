import type { Meta, StoryObj } from '@storybook/react';

import { AccessTokenPage } from './AccessTokenPage';

const meta = {
  title: 'Pages/AccessTokenPage',
  component: AccessTokenPage,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    token: '',
    isActivating: false,
    errorMessage: '',
    onActivate: () => undefined,
    onTokenChange: () => undefined,
  },
} satisfies Meta<typeof AccessTokenPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    token: '',
  },
};

export const Filled: Story = {
  args: {
    token: 'SB-ACCESS-2026',
  },
};

export const ActivatingWithError: Story = {
  args: {
    token: 'already-activated',
    isActivating: true,
    errorMessage:
      'Access token already activated. Please contact admin for assistance',
  },
};
