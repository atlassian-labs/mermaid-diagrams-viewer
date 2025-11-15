# Diagrams Viewer

Forge app which renders mermaid diagrams from code block at confluence page.
Details:

* [Marketplace listing](https://marketplace.atlassian.com/apps/1232887/mermaid-diagrams-viewer?tab=overview&hosting=cloud)
* [Youtube demo](https://youtu.be/FwUpc4kd1M4?si=0Odab7ntS5PFSD0z)

## Development

It's a forge app with custom ui. Yarn workspaces used to manage dependencies and make `shared` code available for both custom ui and forge parts.

### Running locally

```bash
yarn # install dependencies

cd custom-ui
yarn dev # start vite dev server

cd app
forge tunnel # start forge funnel which will execute lambdas locally and proxy static files to vite dev server
```

### Deploying locally

```bash
yarn # install dependencies

cd custom-ui
yarn build # generate static files

cd app
forge deploy # deploy to dev environment
```

## Testing

```bash
# Run all tests across all workspaces
yarn test

# Run tests for a specific workspace
cd custom-ui && yarn test
cd app && yarn test
cd shared && yarn test

# Run tests with coverage
yarn test --coverage
```
