# Reddit Post for r/node

**Publish date**: Tuesday, February 11 or 18, 2026 (8-10 AM EST / 14-16 CET)

---

## Title

```
Why I Built Yet Another Release Tool for npm
```

## Body

```
I spent years fighting with auto + lerna, semantic-release, release-it, release-please, and changesets. They all had the same problems: phantom releases, no monorepo support, or mandatory workflows I didn't want.

So I built bonvoy — a plugin-based release tool that:
- Works out-of-the-box for npm monorepos
- Uses conventional commits (no change files)
- Supports both direct release and PR workflows
- Has automatic rollback on failure
- Zero config for the common case

Example:
```bash
npm install -D bonvoy
npx bonvoy shipit
```

That's it. It reads your git history, calculates version bumps from conventional commits, generates changelogs, publishes to npm, and creates GitHub releases.

I wrote about the journey and why existing tools didn't work for me:
https://dev.to/zweer/why-i-built-yet-another-release-tool-for-npm-3m4m

GitHub: https://github.com/Zweer/bonvoy
Docs: https://zweer.github.io/bonvoy

If you've ever been frustrated by monorepo releases, I'd love to hear your story. And if you try it, let me know what breaks — I'm using it to release itself.
```

## Flair

Select: **"Article"** or **"Show & Tell"**

---

## Notes

- Best timing: Tuesday/Wednesday/Thursday morning (8-10 AM EST)
- Don't cross-post to r/javascript immediately — wait 24h and only if r/node goes well (>50 upvotes)
- Respond to technical questions with details
- Accept constructive criticism
- Don't reply "thanks!" to every comment
