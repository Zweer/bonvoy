import { describe, expect, it } from 'vitest';

import { buildTeamsCard } from '../src/types.js';

describe('buildTeamsCard', () => {
  const baseMessage = {
    title: '🚀 Released 1 package',
    isSuccess: true,
    timestamp: new Date(),
    packages: [{ name: '@test/pkg', version: '1.0.0' }],
  };

  it('should create card with title', () => {
    const card = buildTeamsCard(baseMessage);
    expect(card.sections[0].activityTitle).toBe('🚀 Released 1 package');
  });

  it('should use green color for success', () => {
    const card = buildTeamsCard(baseMessage);
    expect(card.themeColor).toBe('57F287');
  });

  it('should use red color for failure', () => {
    const card = buildTeamsCard({ ...baseMessage, isSuccess: false });
    expect(card.themeColor).toBe('ED4245');
  });

  it('should include package facts', () => {
    const card = buildTeamsCard(baseMessage);
    expect(card.sections[1].facts).toHaveLength(1);
    expect(card.sections[1].facts?.[0].name).toBe('@test/pkg@1.0.0');
  });

  it('should include links in facts', () => {
    const card = buildTeamsCard({
      ...baseMessage,
      packages: [
        {
          name: '@test/pkg',
          version: '1.0.0',
          npmUrl: 'https://npm.com',
          githubUrl: 'https://github.com',
        },
      ],
    });
    expect(card.sections[1].facts?.[0].value).toContain('[npm](https://npm.com)');
    expect(card.sections[1].facts?.[0].value).toContain('[release](https://github.com)');
  });

  it('should add changelog sections', () => {
    const card = buildTeamsCard({
      ...baseMessage,
      packages: [{ name: '@test/pkg', version: '1.0.0', changelog: '- feat: new' }],
    });
    expect(card.sections).toHaveLength(3);
    expect(card.sections[2].activityTitle).toBe('@test/pkg');
    expect(card.sections[2].text).toBe('- feat: new');
  });
});
