# Repository instructions for AI agents

Follow [CONTRIBUTING.md](CONTRIBUTING.md) for every change. It is the canonical
source for contribution, testing, and evidence requirements. Read
[Testing a fork in Confluence](docs/testing-in-confluence.md) before changing
application or Forge behavior.

## Pull request readiness gate

- Do not mark a pull request ready for review for a change that can affect the
  shipped app until the source at the final commit has been tested in a real
  Confluence Cloud site, with no working-tree difference except the documented
  contributor-owned `app.id` substitution.
- A draft pull request may be opened earlier to align on a high-level approach,
  but maintainers do not review drafts except for the focused decision described
  below. Do not request general implementation review while the pull request is
  a draft.
- If work cannot reasonably continue without a specific technical or UX
  decision, open an issue that states the decision and exact question, then
  link it from the draft. Request feedback only on that question.
- Do not treat unit tests, mocked Forge APIs, a standalone browser preview, or a
  successful build as Confluence end-to-end testing.
- Do not claim that a test ran, invent results, or fabricate screenshots.
- If you cannot access Forge or a suitable Confluence site, do not mark the pull
  request ready for review. Report the blocker in an issue or discussion; lack
  of access does not exempt the change from Confluence testing.
- Use only the exemptions defined in `CONTRIBUTING.md`. State the reason in the
  pull request, and do not invent or self-approve an ambiguous exemption.

## Repository-specific safeguards

- Test a fork under a contributor-owned Forge app created with
  `forge register`; never deploy against the upstream app registration.
- Never commit the contributor-owned `app.id` written to `app/manifest.yml` by
  `forge register`.
- Bind manual evidence to the full commit SHA whose source was tested and retest
  after any change to that commit.
- Review and understand all generated changes. The agent and contributor own
  their correctness and maintainability regardless of which tool produced them.
