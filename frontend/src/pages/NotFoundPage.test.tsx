import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { NotFoundPage } from './NotFoundPage.tsx';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<p>Home</p>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NotFoundPage', () => {
  it('shows a not found message for an unknown URL', () => {
    renderAt('/no/such/page');

    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument();
  });

  it('links back to the home page', async () => {
    renderAt('/no/such/page');

    await userEvent.click(
      screen.getByRole('link', { name: 'Go to the home page' }),
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});
