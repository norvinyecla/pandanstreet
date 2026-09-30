import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext.tsx';
import { ProfileEditPage } from './ProfileEditPage.tsx';

const me = {
  id: 'u1',
  name: 'Ada',
  photoUrl: '',
  bio: 'Old bio.',
  followerCount: 0,
  followingCount: 0,
};

function renderEditPage() {
  return render(
    <MemoryRouter initialEntries={['/profile/edit']}>
      <AuthProvider>
        <Routes>
          <Route path="/profile/edit" element={<ProfileEditPage />} />
          <Route path="/" element={<p>Home</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ProfileEditPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pre-fills the current bio, saves an updated bio, and navigates home', async () => {
    const patchCalls: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        const path = new URL(url).pathname;
        if (path === '/auth/me') {
          return Promise.resolve(
            new Response(JSON.stringify(me), { status: 200 }),
          );
        }
        if (path === '/users/u1/bio' && init?.method === 'PATCH') {
          patchCalls.push(init.body);
          return Promise.resolve(
            new Response(JSON.stringify({ ...me, bio: 'New bio.' }), {
              status: 200,
            }),
          );
        }
        return Promise.reject(new Error(`Unexpected fetch to ${url}`));
      }),
    );

    const user = userEvent.setup();
    renderEditPage();

    const bioField = await screen.findByLabelText(/bio/i);
    await waitFor(() => expect(bioField).toHaveValue('Old bio.'));

    await user.clear(bioField);
    await user.type(bioField, 'New bio.');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText('Home')).toBeInTheDocument();
    expect(patchCalls).toEqual([JSON.stringify({ bio: 'New bio.' })]);
  });
});
