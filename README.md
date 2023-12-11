# Diagrams Viewer

Forge app which renders mermaid diagrams from code block at confluence page.
See [Marketplace listing](https://marketplace.atlassian.com/apps/1232887/mermaid-diagrams-viewer?tab=overview&hosting=cloud) for details.

## Development

It's a forge app with custom ui. Yarn workspaces used to manage dependencies and make `shared` code available for both custom ui and forge parts.

```bash
yarn # install dependencies

cd custom-ui
yarn build # generate static files

cd app
yarn deploy
```
