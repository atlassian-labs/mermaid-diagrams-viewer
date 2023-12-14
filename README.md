# Diagrams Viewer

Forge app which renders mermaid diagrams from code block at confluence page.
Details:

* [Marketplace listing](https://marketplace.atlassian.com/apps/1232887/mermaid-diagrams-viewer?tab=overview&hosting=cloud)
* [Loom demo](https://www.loom.com/share/9e172ada65e7423c9616ecf8c4116e45?sid=8495c3f4-63b6-4a7f-b66f-da76dc2425e6)

## Development

It's a forge app with custom ui. Yarn workspaces used to manage dependencies and make `shared` code available for both custom ui and forge parts.

```bash
yarn # install dependencies

cd custom-ui
yarn build # generate static files

cd app
yarn deploy
```
