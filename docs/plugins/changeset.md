# plugin-changeset

> `@bonvoy/plugin-changeset` — Optional plugin

Provides a [changesets](https://github.com/changesets/changesets)-compatible workflow. Track changes via markdown files instead of (or in addition to) conventional commits.

## Installation

```bash
npm install -D @bonvoy/plugin-changeset
```

## Usage

### 1. Create a changeset file

```bash
mkdir -p .changeset  # or .bonvoy
```

```markdown
<!-- .changeset/add-auth.md -->
---
"@scope/core": minor
"@scope/utils": patch
---

Added user authentication to the core package.
Fixed utility helpers for token validation.
```

### 2. Release

```bash
npx bonvoy shipit
```

The plugin reads the changeset files, applies the bumps, uses the markdown body as changelog notes, and deletes the files after release.

## File Format

YAML frontmatter with package-to-bump mapping, followed by markdown description:

```markdown
---
"@scope/core": minor
"@scope/utils": patch
---

Description that goes into the changelog.
Can be multi-line.
```

### Explicit Versions

Unlike standard changesets, bonvoy supports explicit versions:

```markdown
---
"@scope/core": "2.0.0"
"@scope/utils": minor
---

Breaking release with explicit version for core.
```

## File Locations

The plugin reads from both directories (for migration compatibility):

- `.changeset/*.md`
- `.bonvoy/*.md`

## Multiple Files

When multiple files reference the same package:

- **Bump**: the highest wins (`major` > `minor` > `patch`)
- **Notes**: all descriptions are concatenated

```markdown
<!-- .changeset/feature-a.md -->
---
"@scope/core": minor
---
Added feature A

<!-- .changeset/feature-b.md -->
---
"@scope/core": patch
---
Fixed bug in feature B
```

Result: `@scope/core` gets a `minor` bump with both notes in the changelog.

## Fallback

If a changeset file has no markdown body, the plugin falls back to conventional commits for that package's changelog notes.

## Hook

| Hook | Action |
|------|--------|
| `beforeShipIt` | Reads and parses changeset files |
| `getVersion` | Returns bump from changeset data |
