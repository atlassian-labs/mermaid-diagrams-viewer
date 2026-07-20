# Contributing to Mermaid Diagrams Viewer

Thank you for considering a contribution to Mermaid Diagrams Viewer. Issues,
discussions, and pull requests are welcome.

This is a Forge app that runs inside Confluence Cloud. Unit tests and a local
browser preview cannot reproduce all of the product APIs, iframe behavior,
sanitization, themes, editor states, and permissions that the released app
depends on. Changes that can affect the shipped app must therefore be tested in
a real Confluence Cloud site before a pull request is marked ready for review.

## Before you start

- For a substantial feature, new Forge module or scope, storage change, or
  architectural change, open an issue and agree on the approach with a
  maintainer first.
- Keep unrelated changes in separate pull requests.
- Follow the existing code and file structure.
- Use an issue or discussion if you need help setting up Forge or Confluence.
  Do not open a pull request merely to ask a maintainer to complete the
  integration testing.

## Definition of done

Before marking a pull request ready for review, you must:

1. Understand the change and review the entire diff, including any
   AI-generated or AI-modified code.
2. Add or update automated tests for changed behavior and run the relevant
   local checks.
3. Test the source at the final commit in a real Confluence Cloud site when the
   change can affect the shipped app.
4. Record the scenarios and results, and capture appropriate screenshots or a
   recording from Confluence.
5. Add the Confluence evidence, or explain why the documented exemption applies,
   in the pull request.

### Draft pull requests

A draft pull request may be opened before implementation and Confluence testing
are complete when it helps align on the high-level approach. Maintainers do not
review draft pull requests except for the focused decision described below.

If work cannot reasonably continue without a specific technical or UX decision,
open an issue first. State the decision and the exact question in the issue,
then link it from the draft pull request. Maintainer feedback on the draft will
be limited to that question. General implementation review begins only after
the pull request satisfies the definition of done and is marked ready for
review.

### When real-Confluence testing is required

Real-Confluence testing is required for changes that can affect users,
including:

- application code or styling;
- rendering, configuration, interaction, accessibility, or error behavior;
- calls to Confluence or Forge APIs;
- the Forge manifest, modules, scopes, resources, runtime, or deployment;
- runtime dependencies and dependency upgrades that may affect the generated
  bundle; and
- build changes that may alter the shipped application.

Documentation and community-metadata changes that cannot affect the shipped
application are exempt. Test-only, developer-tooling, and CI changes may
request an exemption when Confluence testing cannot provide meaningful
evidence. Explain every exemption in the pull request; maintainers have final
say when its scope is ambiguous.

Follow [Testing a fork in Confluence](docs/testing-in-confluence.md) for the
complete setup, test, and evidence process.

The recorded tested commit must match the pull request head. The only permitted
working-tree difference during Forge testing is the contributor-owned `app.id`
substitution described in that guide; all other tested source must come from
the recorded commit.

Run the relevant local checks in
[Testing a fork in Confluence](docs/testing-in-confluence.md). GitHub reports CI
results on the pull request, so contributors do not need to copy those results
into its description. Passing CI does not replace testing the app in
Confluence.

## Test evidence

For changes that require real-Confluence testing, the pull request must include:

- the full 40-character commit SHA whose source was tested;
- the browser used and a short description of what was tested and observed;
- at least one screenshot from a real Confluence page showing the tested
  behavior, including before and after images for visual changes where
  relevant; and
- a short recording or animated image when still images cannot demonstrate an
  interaction.

Capture evidence after testing the source at the final commit. If you push
another change, retest and update both the tested SHA and evidence. Show enough
Confluence context to distinguish the product integration from a standalone or
mocked preview, but use a personal development site and remove private
information.
Never include customer data, tokens, or secrets.

## AI-assisted contributions

AI-assisted contributions are welcome, but generated code is not a finished
contribution. Maintainers have access to the same generation tools; code
generation alone is not the difficult part this project needs help with.

The valuable contribution is ownership of the result: reproducing the problem,
understanding the implementation, validating the final commit in Confluence,
checking regressions, documenting evidence, and keeping the code maintainable.
The contributor remains responsible for all submitted code and claims,
regardless of which tools helped produce it. Never claim a test was run or
provide evidence that was not produced by the submitted change.

## Incomplete pull requests

A non-draft pull request that is missing required Confluence evidence is not
ready for maintainer review. Maintainers may label it as needing evidence. If
it receives no qualifying contributor update within seven days of that notice,
maintainers may close it. A closed pull request can be reopened when the
required testing and evidence are ready.

A qualifying update is a contributor-authored commit or pull request body edit
that addresses the missing requirements. Bot activity, check reruns, and
maintainer comments do not reset the inactivity period.

Pull requests waiting on a maintainer, a broken project service, or another
confirmed external blocker are exempt from this inactivity policy while the
blocker remains.

## Contributor License Agreement

Atlassian requires contributors to sign a Contributor License Agreement (CLA).
The CLA records that you are entitled to contribute the code, documentation, or
other material and are willing to license it for use in this project.

- [Corporate CLA](https://opensource.atlassian.com/corporate)
- [Individual CLA](https://opensource.atlassian.com/individual)

Use the same email address for the CLA and your commits so the automated check
can match them.
