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

Clone the repository and install dependencies:

```bash
yarn # install dependencies
```

The project uses Yarn workspaces to manage dependencies across three packages:
- `app` - The Forge app backend
- `custom-ui` - The React UI for rendering diagrams
- `shared` - Shared code between app and custom-ui

### Running Locally

```bash
# Terminal 1: Start the custom UI dev server
cd custom-ui
yarn dev # starts vite dev server on port 5173

# Terminal 2: Start the Forge tunnel
cd app
forge tunnel # proxies requests to local dev server and executes lambdas locally
```

Then install the app on your Confluence instance using:
```bash
forge install --upgrade
```

### Deploying Locally

```bash
# Build the custom UI
cd custom-ui
yarn build

# Deploy to your Forge app
cd app
forge deploy
forge install --upgrade
```

## Tests

Run tests across all workspaces:

```bash
# Run all tests
yarn test

# Run tests with coverage
yarn test --coverage

# Run tests for a specific workspace
cd custom-ui && yarn test
cd app && yarn test
cd shared && yarn test
```

## Development Guidelines

- **Linting:** Run `yarn lint` to check code style
- **Node Version:** Latest node LTS is required
- **Package Manager:** Yarn v1

## Contributions

Contributions to Mermaid Diagrams Viewer are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

Copyright (c) 2024 Atlassian US., Inc.
Apache 2.0 licensed, see [LICENSE](LICENSE) file.

<br/>

[![With ❤️ from Atlassian](https://raw.githubusercontent.com/atlassian-internal/oss-assets/master/banner-cheers.png)](https://www.atlassian.com)

[![With ❤️ from Atlassian](https://raw.githubusercontent.com/atlassian-internal/oss-assets/master/banner-with-thanks.png)](https://www.atlassian.com)
