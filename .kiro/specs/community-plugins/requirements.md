# Community Plugins — Integrations, Registries & Languages

> Low priority. Build only when requested by the community.

These plugins extend bonvoy with integrations and publishing to registries beyond npm. None are planned for active development — they'll be built when users ask for them.

## Integrations

### plugin-sentry
- Create releases on Sentry
- Associate commits with release
- Sourcemap upload

### plugin-email
- Notifications via SMTP or Amazon SES
- Customizable HTML templates
- Configurable recipient list

### plugin-jira
- Update Jira tickets mentioned in commits
- Automatic status transition
- Comment with release link

### plugin-linear
- Update Linear issues
- Automatic issue closing

### plugin-s3
- Upload assets to S3
- Bucket and path configuration
- CloudFront invalidation support

## JavaScript / TypeScript

### plugin-jsr
- Publish to [JSR](https://jsr.io) (Deno's JavaScript Registry)
- Native TypeScript support, compatible with Deno and Bun
- `jsr.json` / `deno.json` management
- `jsr publish` wrapper

## Containers

### plugin-docker
- Build and push Docker images on release
- Automatic version-based tags (`latest`, `1.2.0`, `1.2`, `1`)
- Multi-registry: Docker Hub, GHCR, ECR, GCR
- Dockerfile path and build args configuration

## Python

### plugin-pypi
- Publish to PyPI (Python Package Index)
- `pyproject.toml` and `setup.py` version management
- OIDC authentication (Trusted Publishers)
- `twine upload` or `flit publish` wrapper

## Rust

### plugin-cargo
- Publish to crates.io
- `Cargo.toml` version management
- Cargo workspace support

## Java / Kotlin

### plugin-maven
- Publish to Maven Central
- `pom.xml` version management
- GPG signing

## .NET

### plugin-nuget
- Publish to NuGet Gallery
- `.csproj` / `.nuspec` version management

## Ruby

### plugin-rubygems
- Publish to RubyGems.org
- `.gemspec` version management

## Elixir

### plugin-hex
- Publish to Hex.pm
- `mix.exs` version management

## Dart / Flutter

### plugin-pub
- Publish to pub.dev
- `pubspec.yaml` version management

## PHP

### plugin-packagist
- Publish to Packagist (Composer)
- `composer.json` version management

## Swift / iOS

### plugin-swift
- Swift Package Registry support
- `Package.swift` version management

## CLI Distribution

### plugin-homebrew
- Update Homebrew tap formula on release
- Automatic SHA256 and URL update
- Cask support for GUI apps

---

*Status: 🗄️ Backlog — build on community request*
*Priority: Low*
*Note: bonvoy's plugin system makes it easy for anyone to build these. We'll prioritize based on demand.*
