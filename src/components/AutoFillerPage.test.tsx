import { fireEvent, render, screen } from '@testing-library/react';

import { AutoFillerPage } from './AutoFillerPage';

describe('AutoFillerPage', () => {
  it('renders the branded main page content', () => {
    render(<AutoFillerPage />);

    expect(screen.getByText('StinkyBoul')).toBeInTheDocument();
    expect(screen.getByText('Hunt Codes')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Run Program' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Caleb McDaniel')).toBeInTheDocument();
  });

  it('enters edit mode, adds a card, and deletes it', () => {
    render(<AutoFillerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit hunt codes' }));

    expect(
      screen.getAllByRole('button', { name: 'Delete hunt code' }),
    ).toHaveLength(4);

    fireEvent.click(screen.getByRole('button', { name: 'Add hunt code' }));

    expect(
      screen.getAllByRole('button', { name: 'Delete hunt code' }),
    ).toHaveLength(5);

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Delete hunt code' })[4],
    );

    expect(
      screen.getAllByRole('button', { name: 'Delete hunt code' }),
    ).toHaveLength(4);
  });

  it('updates the status text after running the program', () => {
    render(<AutoFillerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Run Program' }));

    expect(screen.getByText('Running code {1}...')).toBeInTheDocument();
  });
});
