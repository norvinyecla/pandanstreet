import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, setUnauthorizedHandler } from './client.ts';

function stubFetchStatus(status: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ message: 'Not logged in' }), { status }),
      ),
    ),
  );
}

describe('api client', () => {
  afterEach(() => {
    setUnauthorizedHandler(null);
    vi.unstubAllGlobals();
  });

  it('calls the unauthorized handler when a request returns 401', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    stubFetchStatus(401);

    await expect(api.get('/users/u1')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it.each(['/auth/login', '/auth/signup'])(
    'does not call the unauthorized handler for a 401 from %s',
    async (path) => {
      const onUnauthorized = vi.fn();
      setUnauthorizedHandler(onUnauthorized);
      stubFetchStatus(401);

      await expect(api.post(path, {})).rejects.toThrow('Not logged in');
      expect(onUnauthorized).not.toHaveBeenCalled();
    },
  );

  it('does not call the unauthorized handler for other errors', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    stubFetchStatus(403);

    await expect(api.get('/users/u1')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
