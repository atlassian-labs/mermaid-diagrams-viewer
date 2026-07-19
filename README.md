# Mermaid Diagrams Viewer

[![Atlassian license](https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square)](LICENSE) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)

A Forge app (for Confluence cloud) that renders mermaid diagrams from code blocks in Confluence pages.

**Resources:**
- [About Forge](https://developer.atlassian.com/platform/forge/)
- [Marketplace listing](https://marketplace.atlassian.com/apps/1232887/mermaid-diagrams-viewer?tab=overview&hosting=cloud)
- [YouTube demo](https://youtu.be/FwUpc4kd1M4?si=0Odab7ntS5PFSD0z)

## Usage

1. Add a code block to your Confluence page
2. Write your mermaid diagram syntax inside the code block
3. Add a macro using "/" key and search for "mermaid"
4. The diagram will be rendered automatically on the page

### Supported Diagrams

This app supports all [Mermaid diagram types](https://mermaid.js.org/syntax/syntax.html), including:
- Flowcharts
- Sequence diagrams
- Class diagrams
- State diagrams
- Entity relationship diagrams
- And more...

## Installation

This is a Forge app. Install it from the [Atlassian Marketplace](https://marketplace.atlassian.com/apps/1232887/mermaid-diagrams-viewer).

### Development Setup

Fork and clone the repository, then install dependencies using the Node.js
version in `.nvmrc`:

```bash
nvm install
nvm use
cd custom-ui
yarn install --frozen-lockfile
```

The project has two directories:
- `custom-ui` - The React UI for rendering diagrams (all JS tooling lives here)
- `app` - The Forge app manifest and build output

### Test a fork in Confluence

The manifest contains the upstream Forge app ID. Before deploying a fork, use
`forge register` to create a contributor-owned copy:

```bash
# From the repository root
cd app
forge login
forge register YOUR_GITHUB_USER-mermaid-viewer
```

`forge register` rewrites `app.id` in `app/manifest.yml`. Never include that
personal ID in a commit. The full testing guide explains how to temporarily use
it for the final deployed test while keeping the upstream ID in Git history.

Build, deploy, and perform the first installation before starting a tunnel:

```bash
# From the repository root
cd custom-ui
yarn build

cd ../app
forge lint
forge deploy --environment development
forge install \
  --environment development \
  --site YOUR_SITE.atlassian.net \
  --product confluence
```

For the development loop, run Vite and the Forge tunnel in separate terminals:

```bash
# Terminal 1
cd custom-ui
yarn dev

# Terminal 2
cd app
forge tunnel --environment development
```

Before marking a pull request ready for review, stop the tunnel, rebuild and
deploy, then test the bundle built from the final commit in a real Confluence
Cloud site. Follow
[Testing a fork in Confluence](docs/testing-in-confluence.md) for the complete
setup, smoke-test matrix, evidence requirements, installation upgrades, and app
ID cleanup.

### Deploying a local change

```bash
# Build the custom UI
cd custom-ui
yarn build

# Deploy to your Forge app
cd ../app
forge lint
forge deploy --environment development
```

Run `forge install --upgrade` after the deploy only when Forge modules, scopes,
permissions, or other installation metadata changed.

## Tests

```bash
cd custom-ui

# Run all tests
yarn test

# Run tests with coverage
yarn test --coverage
```

## Development Guidelines

- **Linting:** Run `yarn lint` from the `custom-ui` directory to check code style
- **Node Version:** See `.nvmrc` or the `engines` field in `custom-ui/package.json`
- **Package Manager:** Yarn v1

## Contributions

Contributions to Mermaid Diagrams Viewer are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

Copyright (c) 2024 Atlassian US., Inc.
Apache 2.0 licensed, see [LICENSE](LICENSE) file.

<br/>

[![With ❤️ from Atlassian](https://raw.githubusercontent.com/atlassian-internal/oss-assets/master/banner-cheers.png)](https://www.atlassian.com)

[![With ❤️ from Atlassian](https://raw.githubusercontent.com/atlassian-internal/oss-assets/master/banner-with-thanks.png)](https://www.atlassian.com)
