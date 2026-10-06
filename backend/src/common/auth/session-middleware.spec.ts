import { readSessionSettings } from './session-middleware.js';

describe('readSessionSettings', () => {
  it('uses a dev secret and plain cookies outside production', () => {
    expect(readSessionSettings({})).toEqual({
      secret: 'pandanstreet-dev-secret',
      production: false,
    });
    expect(readSessionSettings({ SESSION_SECRET: 'local' })).toEqual({
      secret: 'local',
      production: false,
    });
  });

  it('uses the configured secret in production', () => {
    expect(
      readSessionSettings({
        NODE_ENV: 'production',
        SESSION_SECRET: 'a-long-random-value',
      }),
    ).toEqual({ secret: 'a-long-random-value', production: true });
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['the dev default', 'pandanstreet-dev-secret'],
    ['the .env.example value', 'change-me-in-production'],
  ])('refuses a %s secret in production', (_, secret) => {
    expect(() =>
      readSessionSettings({ NODE_ENV: 'production', SESSION_SECRET: secret }),
    ).toThrow(/SESSION_SECRET/);
  });
});
