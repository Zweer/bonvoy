import { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { detectPackages } from '../src/utils/detect-packages.js';

vi.mock('node:fs');
vi.mock('node:fs/promises');
vi.mock('execa');

describe('detectPackages', () => {
  beforeEach(() => {
    vol.reset();
    vi.clearAllMocks();
  });

  it('should detect single package', async () => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          name: 'test-pkg',
          version: '1.0.0',
          private: false,
        }),
      },
      '/test',
    );

    const packages = await detectPackages('/test');

    expect(packages).toHaveLength(1);
    expect(packages[0]).toMatchObject({
      name: 'test-pkg',
      version: '1.0.0',
      path: '/test',
      private: false,
    });
  });

  it('should detect workspace packages', async () => {
    const { execa } = await import('execa');

    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          name: 'root',
          version: '0.0.0',
          workspaces: ['packages/*'],
        }),
      },
      '/test',
    );

    vi.mocked(execa).mockResolvedValueOnce({
      stdout: JSON.stringify([
        {
          name: 'pkg-a',
          version: '1.0.0',
          location: 'packages/pkg-a',
          private: false,
          dependencies: { lodash: '^4.0.0' },
          devDependencies: { vitest: '^4.0.0' },
        },
        {
          name: 'pkg-b',
          version: '2.0.0',
          location: 'packages/pkg-b',
          private: true,
        },
      ]),
    } as never);

    const packages = await detectPackages('/test');

    expect(packages).toHaveLength(2);
    expect(packages[0]).toMatchObject({
      name: 'pkg-a',
      version: '1.0.0',
      path: '/test/packages/pkg-a',
      private: false,
      dependencies: { lodash: '^4.0.0' },
      devDependencies: { vitest: '^4.0.0' },
    });
    expect(packages[1]).toMatchObject({
      name: 'pkg-b',
      version: '2.0.0',
      path: '/test/packages/pkg-b',
      private: true,
    });
    expect(execa).toHaveBeenCalledWith('npm', ['query', '.workspace'], { cwd: '/test' });
  });
});
