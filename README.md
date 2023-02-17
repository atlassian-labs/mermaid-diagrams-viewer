# Diagrams Viewer
Renders mermaid diagrams from files hosted at Bitbucket as SVGs in Confluence
# Development
It's a forge app with custom ui
### Building custom-ui part
```sh
cd custom-ui
yarn
yarn build
```

### Building the rest of the app
```sh
cd custom-ui
yarn
# Generated js files actually will not be used by forge CLI, but helps ensuring correctness
yarn build
```

