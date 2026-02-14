# Build & Tooling

## Build System

### tsdown
- **tsdown** for building all packages (NOT tsc, esbuild, rollup, or others)
- Configuration: `tsdown.config.ts` at root
- Workspace mode: builds all packages in one pass
- Outputs: `.mjs` files + `.d.ts` type definitions + sourcemaps

### Build Configuration
```typescript
// tsdown.config.ts
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['packages/*/src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
});
```

### Build Commands
```bash
npm run build              # Build all packages
npm run build:watch        # Watch mode (rebuilds on change)
```

### Build Output
```
packages/<name>/
└── dist/
    ├── index.mjs          # Compiled JavaScript
    ├── index.mjs.map      # Source map
    ├── index.d.ts         # Type definitions
    └── index.d.ts.map     # Type definition source map
```

## Package Configuration

### package.json Exports
```json
{
  "type": "module",
  "exports": {
    ".": "./dist/index.mjs",
    "./package.json": "./package.json"
  },
  "files": [
    "dist"
  ]
}
```

### TypeScript Configuration
- Root `tsconfig.json` applies to all packages
- No per-package `tsconfig.json` needed
- Strict mode enabled
- ES2022 target
- Node resolution

## Development Workflow

### Initial Setup
```bash
npm install                # Install dependencies
npm run build              # Build all packages
npm test                   # Run tests
```

### Development Loop
```bash
npm run build:watch        # Terminal 1: watch build
npm run test:watch         # Terminal 2: watch tests
```

### Before Commit
```bash
npm run lint               # Lint + typecheck + lockfile check
npm test                   # Run all tests
npm run test:coverage      # Verify 100% coverage
```

## Linting & Formatting

### Biome
- **Biome** for linting and formatting (NOT ESLint/Prettier)
- Configuration: `biome.json` at root
- Single quotes, 100 line width, no semicolons
- Runs on pre-commit hook via husky

### Commands
```bash
npm run lint               # Check all (biome + typecheck + lockfile)
npm run lint:biome         # Biome check only
npm run lint:biome:fix     # Biome fix
npm run typecheck          # TypeScript check
```

### Biome Configuration
```json
{
  "formatter": {
    "enabled": true,
    "lineWidth": 100,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded"
    }
  }
}
```

## Git Hooks

### Husky
- Pre-commit: runs lint-staged
- Commit-msg: validates commit message format

### lint-staged
- Runs Biome on staged files only
- Configured in `package.json`:
```json
{
  "lint-staged": {
    "*.{js,ts,json}": "biome check --write"
  }
}
```

## Commit Message Validation

### commitlint
- Validates conventional commit format
- Configuration: `commitlint.config.js`
- Runs on commit-msg hook

### Format
```
type(scope): :emoji: description
```

See `.kiro/skills/commit-format.md` for full details.

## Package Manager

### npm
- Use **npm** (NOT pnpm or yarn)
- Lock file: `package-lock.json`
- Workspaces enabled in root `package.json`

### Workspace Commands
```bash
npm install                           # Install all packages
npm run build -w @bonvoy/core         # Build specific package
npm test -w @bonvoy/core              # Test specific package
```

### Dependency Management
- Use `^` for internal dependencies (e.g., `"@bonvoy/core": "^0.12.1"`)
- **CRITICAL**: Keep dependencies up to date — always use latest stable versions
- Run `npm outdated` regularly and update
- Run `npm audit` regularly for security issues
- Security updates must be applied immediately

## Documentation

### VitePress
- Documentation site in `docs/`
- Configuration: `docs/.vitepress/config.ts`
- Markdown files with frontmatter

### Commands
```bash
npm run docs:dev           # Dev server (http://localhost:5173)
npm run docs:build         # Production build
npm run docs:preview       # Preview production build
```

### LLM-Optimized Docs
- `llms.txt` and `llms-full.txt` generated via `scripts/generate-llms-txt.ts`
- Auto-generated on `npm run docs:build` (via `predocs:build` hook)
- Served at `/bonvoy/llms.txt` and `/bonvoy/llms-full.txt`

## CI/CD

### GitHub Actions
- Workflows in `.github/workflows/`
- `ci.yml` — Main CI (test, build, release, docs)
- `docs.yml` — Docs deployment (called by CI after release)

### CI Steps
1. Install dependencies
2. Build all packages
3. Run tests with coverage
4. Lint and typecheck
5. Release (if on main branch)
6. Deploy docs (after release)

### Release Process
- Automated via `bonvoy shipit` in CI
- Triggered on push to main
- Creates git tags, GitHub releases, publishes to npm
- See `bonvoy.config.ts` for configuration

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run build` | Build all packages with tsdown |
| `npm run build:watch` | Watch mode for development |
| `npm test` | Run all tests (requires build first) |
| `npm run test:watch` | Watch mode for tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Lint + typecheck + lockfile check |
| `npm run lint:biome` | Biome check only |
| `npm run lint:biome:fix` | Biome fix |
| `npm run typecheck` | TypeScript type checking |
| `npm run docs:dev` | VitePress dev server |
| `npm run docs:build` | Build docs (includes llms.txt generation) |
| `npm run docs:preview` | Preview docs build |

## Environment Variables

### Development
- No env vars needed for local development

### CI/CD
- `GITHUB_TOKEN` — GitHub API (provided by GitHub Actions)
- `NPM_TOKEN` — npm publish (optional, OIDC preferred)

### Optional
- `OPENAI_API_KEY` — For AI release notes (plugin-ai)
- `ANTHROPIC_API_KEY` — For AI release notes (plugin-ai)
- `GEMINI_API_KEY` — For AI release notes (plugin-ai)

## Troubleshooting

### Build Fails
```bash
rm -rf packages/*/dist     # Clean build output
npm run build              # Rebuild
```

### Tests Fail
```bash
npm run build              # Tests require built packages
npm test                   # Run tests again
```

### Type Errors
```bash
npm run typecheck          # Check types
npm run build              # Rebuild type definitions
```

### Lock File Issues
```bash
rm -rf node_modules package-lock.json
npm install                # Fresh install
```
