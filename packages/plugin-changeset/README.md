# @bonvoy/plugin-changeset 🚢

> Changeset-compatible workflow for bonvoy

Optional plugin that provides a [changeset](https://github.com/changesets/changesets)-compatible workflow with bonvoy extensions.

## Features

- ✅ **Changeset compatible** - Same file format as `@changesets/cli`
- ✅ **Migration friendly** - Reads from `.changeset/` and `.bonvoy/`
- ✅ **Explicit versions** - Supports `"2.0.0"` in addition to `major/minor/patch`
- ✅ **Multi-file merge** - Combines multiple files per package
- ✅ **Auto cleanup** - Deletes processed files after release

## Installation

```bash
npm install -D @bonvoy/plugin-changeset
```

## Usage

```javascript
// bonvoy.config.js
export default {
  plugins: [
    '@bonvoy/plugin-changeset',
    // NOTE: Do NOT use with @bonvoy/plugin-conventional
  ]
};
```

## File Format

Create files in `.changeset/` or `.bonvoy/` with YAML frontmatter:

```markdown
---
"@scope/core": minor
"@scope/utils": patch
---

Added new authentication feature.

This description goes into the changelog.
```

### Explicit Versions (Bonvoy Extension)

Unlike standard changeset, you can specify exact versions:

```markdown
---
"@scope/core": "2.0.0"
---

Breaking release with new API.
```

## Multi-file Behavior

When multiple files reference the same package:

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
Fixed bug B
```

Result:
- **Bump**: Takes highest (`minor` wins over `patch`)
- **Notes**: Concatenates all descriptions

## Configuration

```javascript
export default {
  plugins: [
    ['@bonvoy/plugin-changeset', {
      deleteAfterRelease: true,  // default: true
    }]
  ]
};
```

## Migration from Changesets

1. Install `@bonvoy/plugin-changeset`
2. Remove `@changesets/cli` from your project
3. Your existing `.changeset/*.md` files will work as-is
4. Run `bonvoy shipit` instead of `changeset version && changeset publish`

## License

MIT
