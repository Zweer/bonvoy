# Documentation Guidelines

## Documentation Site

bonvoy uses **VitePress** for documentation:
- Location: `docs/`
- Configuration: `docs/.vitepress/config.ts`
- Deployed to: `https://zweer.github.io/bonvoy`

## Documentation Structure

```
docs/
├── .vitepress/
│   └── config.ts              # Site config (sidebar, nav, theme)
├── public/
│   └── logo.svg               # Assets
├── index.md                   # Landing page
├── getting-started.md         # Quick start guide
├── configuration.md           # Config reference
├── cli.md                     # CLI commands
├── comparison.md              # vs other tools
├── faq.md                     # FAQ
│
├── plugins/
│   ├── overview.md            # Plugin system
│   ├── conventional.md        # Per-plugin docs
│   └── ...
│
├── guides/
│   ├── monorepo.md            # How-to guides
│   ├── pr-workflow.md
│   └── ...
│
├── reference/
│   ├── hooks.md               # API reference
│   └── api.md
│
└── blog/
    └── why-i-built-bonvoy.md  # Articles
```

## Writing Style

### Voice & Tone
- **Concise** — No fluff, get to the point
- **Clear** — Simple language, avoid jargon
- **Practical** — Every example should work as-is
- **Helpful** — Anticipate questions, provide solutions

### Language
- **English only** — All documentation in English
- **Present tense** — "bonvoy generates" not "bonvoy will generate"
- **Active voice** — "Run the command" not "The command should be run"
- **Second person** — "You can configure" not "One can configure"

### Formatting
- **Short paragraphs** — 2-3 sentences max
- **Bullet points** — For lists and steps
- **Code blocks** — For all commands and code
- **Tables** — For comparisons and options
- **Headings** — Clear hierarchy (H2, H3, H4)

## Content Types

### Getting Started
- Installation instructions
- First release in < 5 minutes
- Copy-paste examples
- No configuration needed

### Configuration Reference
- All options documented
- Type information
- Default values
- Examples for each option

### CLI Reference
- All commands and flags
- Usage examples
- Output examples
- Exit codes

### Plugin Documentation
- What the plugin does
- Installation
- Configuration options
- Hooks used
- Examples

### Guides (How-to)
- Step-by-step instructions
- Real-world scenarios
- Troubleshooting tips
- Best practices

### API Reference
- Type signatures
- Parameters and return values
- Examples
- Links to source code

## Markdown Conventions

### Code Blocks
Always specify language:
````markdown
```bash
npm install -D bonvoy
```

```javascript
export default {
  plugins: ['@bonvoy/plugin-slack'],
};
```

```typescript
interface Config {
  versioning: 'independent' | 'fixed';
}
```
````

### Links
Use descriptive text:
```markdown
<!-- Good -->
See the [configuration guide](./configuration.md) for details.

<!-- Bad -->
See [here](./configuration.md) for details.
```

### Emphasis
- **Bold** for UI elements, commands, important terms
- *Italic* for emphasis (use sparingly)
- `code` for inline code, file names, package names

### Admonitions
VitePress supports custom containers:
```markdown
::: tip
This is a helpful tip.
:::

::: warning
This is a warning.
:::

::: danger
This is a critical warning.
:::
```

### Tables
Use for structured data:
```markdown
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | `'bonvoy'` | Package name |
```

## Examples

### Good Examples
- **Complete** — Can be copy-pasted and run
- **Realistic** — Use real package names and scenarios
- **Commented** — Explain non-obvious parts
- **Tested** — Verify examples work

Example:
```javascript
// bonvoy.config.js
export default {
  // Use independent versioning (each package has its own version)
  versioning: 'independent',
  
  // Custom commit message with emoji
  commitMessage: 'chore: :bookmark: release',
  
  // Enable AI-generated release notes
  plugins: [
    ['@bonvoy/plugin-ai', { provider: 'openai' }],
  ],
};
```

### Bad Examples
- Incomplete (missing imports, context)
- Unrealistic (foo, bar, baz)
- No explanation
- Untested

## Plugin Documentation Template

```markdown
# @bonvoy/plugin-name

> Short description (one sentence)

## Installation

\`\`\`bash
npm install -D @bonvoy/plugin-name
\`\`\`

## Usage

\`\`\`javascript
// bonvoy.config.js
export default {
  plugins: [
    ['@bonvoy/plugin-name', {
      option: 'value',
    }],
  ],
};
\`\`\`

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `option` | `string` | `'default'` | What it does |

### Example

\`\`\`javascript
// Detailed example
\`\`\`

## Hooks

This plugin taps into:
- `hookName` — What it does at this hook

## Environment Variables

- `ENV_VAR` — Description (optional/required)

## Troubleshooting

### Common Issue
Solution with example.

## License

MIT
```

## README Files

Each package has a README.md:
- Short description
- Installation
- Basic usage
- Link to full docs
- License

Keep it brief — full docs are on the site.

## Changelog

Each package has CHANGELOG.md:
- Generated automatically by bonvoy
- Follows [Keep a Changelog](https://keepachangelog.com/) format
- Grouped by type (Features, Bug Fixes, etc.)
- Links to commits and PRs

Don't edit manually unless necessary.

## Blog Articles

Articles in `docs/blog/`:
- First-person voice ("I built", "I was frustrated")
- Honest and practical
- Real examples and code
- See `.kiro/specs/articles/requirements.md` for editorial line

## LLM-Optimized Documentation

### llms.txt and llms-full.txt
- Generated via `scripts/generate-llms-txt.ts`
- Auto-generated on `npm run docs:build`
- Served at `/bonvoy/llms.txt` and `/bonvoy/llms-full.txt`
- Optimized for LLM consumption (no navigation, no UI elements)

### Format
- Plain text, markdown-like
- Clear section headers
- No HTML, no images
- Complete information in linear format

## Documentation Workflow

### Local Development
```bash
npm run docs:dev              # Start dev server
# Edit files in docs/
# Preview at http://localhost:5173
```

### Build and Preview
```bash
npm run docs:build            # Build for production
npm run docs:preview          # Preview production build
```

### Deployment
- Automatic via GitHub Actions after release
- Workflow: `.github/workflows/docs.yml`
- Triggered by CI after successful release

## Updating Documentation

### When to Update
- New feature added → add to docs
- Breaking change → update migration guide
- Bug fix → update troubleshooting if relevant
- Config option added → update configuration reference

### Documentation PR Checklist
- [ ] All new features documented
- [ ] Examples tested and working
- [ ] Links checked (no broken links)
- [ ] Spelling and grammar checked
- [ ] Sidebar updated (if new page)
- [ ] Search works for new content

## Screenshots and Videos

### When to Use
- Complex UI workflows
- Visual comparisons
- Terminal output examples

### Guidelines
- Use SVG for diagrams (not PNG/JPG)
- Use asciinema for terminal recordings
- Keep file sizes small
- Add alt text for accessibility

## Versioning Documentation

### Version-specific Docs
- Document current version only
- Note breaking changes in migration guide
- Link to previous versions if needed

### Deprecation Notices
```markdown
::: warning DEPRECATED
This option is deprecated since v2.0.0. Use `newOption` instead.
:::
```

## External Links

### When to Link
- Official documentation (npm, GitHub, etc.)
- Related tools and libraries
- Standards and specifications

### Link Format
```markdown
[descriptive text](https://example.com)
```

### Keep Links Updated
- Check for broken links regularly
- Update when external docs move
- Use stable URLs (not /latest/ or /master/)

## Accessibility

### Guidelines
- Use semantic HTML in custom components
- Provide alt text for images
- Use descriptive link text (not "click here")
- Ensure good color contrast
- Test with screen readers

## SEO

### Best Practices
- Descriptive page titles
- Meta descriptions for key pages
- Proper heading hierarchy
- Internal linking between related pages
- Canonical URLs

## Dependencies

### Keep Documentation Dependencies Updated

**CRITICAL**: Always use the **latest stable versions** of:
- VitePress (currently v1.x)
- Vue (VitePress dependency)
- Markdown-it plugins

### Update Process
```bash
cd docs
npm outdated
npm update
npm run docs:build    # Test build
npm run docs:preview  # Test preview
```

## Maintenance

### Regular Tasks
- [ ] Check for broken links (monthly)
- [ ] Update examples with latest syntax (on breaking changes)
- [ ] Review and update FAQ (quarterly)
- [ ] Update comparison table (when competitors change)
- [ ] Refresh screenshots (on UI changes)

### Metrics to Track
- Page views (most/least popular pages)
- Search queries (what users look for)
- External links (where traffic comes from)
- Bounce rate (pages that need improvement)

## Style Guide Summary

| Element | Style |
|---------|-------|
| **Headings** | Sentence case (not Title Case) |
| **Code** | Inline: \`code\`, Block: \`\`\`language |
| **Commands** | Always in code blocks with `bash` |
| **File names** | Inline code: \`package.json\` |
| **Package names** | Inline code: \`@bonvoy/core\` |
| **Emphasis** | **Bold** for important, *italic* sparingly |
| **Lists** | `-` for unordered, `1.` for ordered |
| **Links** | Descriptive text, not "click here" |
| **Line length** | No hard limit, break at natural points |

## Resources

- [VitePress Documentation](https://vitepress.dev/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)
