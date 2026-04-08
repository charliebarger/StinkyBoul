import type { Preview } from '@storybook/react';

import '../src/styles/tailwind.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'mist',
      values: [
        { name: 'mist', value: '#f6f7fb' },
        { name: 'white', value: '#ffffff' },
      ],
    },
  },
};

export default preview;
