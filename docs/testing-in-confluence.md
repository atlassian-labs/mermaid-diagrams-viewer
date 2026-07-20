# Testing a fork in Confluence

Changes that can affect the shipped app must be tested in a real Confluence
Cloud site before a pull request is marked ready for review. This guide creates
a contributor-owned copy of the Forge app, installs it on a development site,
and tests both the tunnelled source and the final deployed build.

## Prerequisites

You need:

- an Atlassian account;
- a personal [free Atlassian cloud development site](https://go.atlassian.com/cloud-dev)
  with Confluence;
- the Node.js version in [`.nvmrc`](../.nvmrc);
- Yarn 1; and
- the [Forge CLI](https://developer.atlassian.com/platform/forge/getting-started/#install-the-forge-cli).

Use a personal development site with disposable test content. Do not install a
contributor build on a customer site or use customer data in testing or
screenshots.

## 1. Install the tooling and dependencies

From the repository root:

```bash
nvm install
nvm use
npm install --global @forge/cli
forge login
forge whoami

cd custom-ui
yarn install --frozen-lockfile
```

Follow the Forge login prompt using the account that owns your development
site.

## 2. Register your own copy of the app

The repository manifest contains the upstream app ID. Do not deploy or install
using that registration. Register the copied source tree as an app owned by
your account:

```bash
cd ../app
forge register YOUR_GITHUB_USER-mermaid-viewer
```

Choose a unique name of at most 50 characters. `forge register` creates a new
Forge app and rewrites `app.id` in `app/manifest.yml`.

Important:

- Never commit your contributor-owned app ID.
- Record the original upstream ID and the new contributor-owned ID outside the
  repository. Reuse the contributor-owned ID when returning to this worktree.
- Do not run `forge register` repeatedly for the same working tree. Each run
  creates another registration and disconnects the tree from environments,
  variables, secrets, and storage belonging to its previous app ID.
- Keep the generated ID while testing, then restore only `app.id` to the
  upstream value before committing. If your contribution intentionally changes
  other manifest fields, take care not to discard those changes.

See the [Forge register reference](https://developer.atlassian.com/platform/forge/cli-reference/register/)
for the command's ownership and environment behavior.

## 3. Build, deploy, and install it

Forge needs the built Custom UI resource before it can deploy the app:

```bash
cd ../custom-ui
yarn build

cd ../app
forge lint
forge deploy --environment development
forge install \
  --environment development \
  --site YOUR_SITE.atlassian.net \
  --product confluence
```

Use `forge install` without `--upgrade` for the first installation. On later
runs, deploy the app again. If you changed installation metadata such as Forge
modules, scopes, or permissions, upgrade the existing installation:

```bash
forge install \
  --upgrade \
  --environment development \
  --site YOUR_SITE.atlassian.net \
  --product confluence
```

## 4. Run the development tunnel

The app manifest maps its Custom UI resource to Vite on port 5173. Start both
processes and leave them running while you exercise the app.

Terminal 1:

```bash
cd custom-ui
yarn dev
```

Terminal 2:

```bash
cd app
forge tunnel --environment development
```

Open the development site in Chrome or Firefox on the same machine, browser
session, and account that started the tunnel. The app must already be deployed
and installed in the development environment. The tunnel only redirects
requests made by your user.

A tunnel is a fast development loop, not final release evidence. It proxies the
Custom UI dev server and does not prove that the generated bundle and deployed
app work. See [Forge tunnelling](https://developer.atlassian.com/platform/forge/tunneling/)
for current browser, network, and manifest limitations.

## 5. Exercise the relevant Confluence behavior

At minimum, test the regression or feature described by the change and confirm
that a valid diagram still renders on a published page after a reload. Select
additional scenarios based on the integration boundaries touched by the diff.

| Area changed | Scenarios to exercise |
| --- | --- |
| Rendering or layout | Small and large diagrams, reload, relevant viewport sizes, light and dark themes |
| Editor or configuration | Create and edit a page, select a code block, save and cancel configuration, publish and reload |
| Code-block mapping | Multiple Mermaid and non-Mermaid blocks, automatic mapping, explicit selection, reordered blocks |
| Interaction | Open the full-screen diagram and exercise the affected zoom, pan, or other controls |
| Errors | Invalid Mermaid input and the specific API or rendering failure changed by the pull request |
| Content lookup | Published and draft pages; blog-post fallback when that path is affected |
| Manifest or permissions | Fresh installation or upgrade, changed module behavior, and every newly requested permission |

Record the scenario, expected result, and observed result as you test. Fixes must
demonstrate the original failure and the corrected behavior where practical.

## 6. Prepare the final commit

The Git commit must contain the upstream app ID, while Forge testing must use
your contributor-owned ID. Before the final test pass:

1. Record your contributor-owned ID outside the repository.
2. Restore only `app.id` to the upstream value.
3. Stage and commit all intended changes. Confirm that the commit does not
   contain your contributor-owned ID.
4. Temporarily put your contributor-owned ID back into the working-tree
   manifest without staging it.
5. Run `git diff -- app/manifest.yml` and confirm the only uncommitted manifest
   difference is `app.id`.

The local app-ID substitution selects your Forge registration; it must be the
only difference between the committed source and the source used for the final
test.

## 7. Test the final deployed build

After tunnel testing is complete, stop Vite and `forge tunnel`. Run the complete
local checks and deploy the production bundle:

```bash
cd custom-ui
yarn lint
yarn test --coverage
yarn build

cd ../app
forge lint
forge deploy --environment development
```

Run `forge install --upgrade` again only when installation metadata changed.
Perform a full browser reload of Confluence without the tunnel and repeat the
primary regression or feature scenario plus the published-page smoke test.
Capture pull request evidence from this final deployed build.

## 8. Capture evidence for the pull request

Record the full SHA of the commit you just tested:

```bash
git rev-parse HEAD
```

The pull request must identify that exact 40-character SHA. The local `app.id`
substitution is the only permitted difference from its source. Include:

- the Forge environment and browser;
- the scenarios, expected results, and actual results;
- screenshots with enough Confluence UI visible to establish the real product
  context;
- before and after images for visual fixes; and
- a recording or animated image for interactions that still images cannot
  demonstrate.

If testing results in another code change, restore the upstream app ID before
committing, make the change, then repeat the preparation and test process with
the new head. Evidence for an older commit does not validate the new head
commit.

## 9. Restore the upstream app ID

After capturing evidence, restore the committed manifest and inspect the
working tree:

```bash
git restore app/manifest.yml
git diff --check
git status --short
```

Because the intended manifest changes were committed in step 6, restoring the
file now preserves them and removes the temporary contributor-owned ID. The
working tree should be clean, and your contributor-owned Forge ID must not
appear in the pull request.

Do not run another Forge command while the worktree contains the upstream app
ID. For later testing, temporarily restore the contributor-owned ID that you
recorded earlier; do not run `forge register` again merely to reconnect it.

## Troubleshooting

- If a copied app cannot deploy or install, use `forge register`, not
  `forge create`.
- If the tunnel receives no requests, confirm the app is deployed and installed
  in the same development environment and that you are using the same browser
  account. VPNs, proxies, and firewalls can also block the Cloudflare tunnel.
- If Forge reports an authentication or permission error, run `forge login` and
  `forge whoami` again and resolve the account or token problem. Do not treat a
  tooling failure as permission to skip Confluence testing.
- If you edit `manifest.yml`, deploy again. Changes to modules, scopes, or
  permissions may also require `forge install --upgrade`.
- Forge runs against Atlassian Cloud. If you do not administer a suitable site,
  create the free development site linked in the prerequisites rather than
  trying to test the app in a local Confluence container.
- If you cannot complete real-Confluence testing, do not mark the pull request
  ready for review. Open an issue or discussion describing the blocker. If a
  specific technical or UX decision must be resolved before work can reasonably
  continue, state the exact question in an issue and link it from an alignment
  draft. Maintainer feedback on the draft is limited to that question.
