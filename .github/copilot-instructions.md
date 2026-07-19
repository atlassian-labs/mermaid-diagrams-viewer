# Mermaid Diagrams Viewer review instructions

[CONTRIBUTING.md](../CONTRIBUTING.md) is the canonical source for contribution,
testing, and evidence requirements. Apply it when generating or reviewing code.

- Treat missing real-Confluence testing and evidence as blocking when a change
  that can affect the shipped app is marked ready for review or considered for
  merge.
- Do not review draft pull requests unless a draft links an issue that asks a
  specific technical or UX question. In that case, limit feedback to that
  question rather than reviewing the implementation generally.
- Unit tests use mocked Mermaid and Forge boundaries. Do not describe them as
  end-to-end coverage or assume green CI proves Confluence behavior.
- Check that pull request evidence names the current head commit and comes from
  real Confluence rather than a standalone or mocked preview.
- Flag accidental changes to the upstream `app.id` in `app/manifest.yml`.
- Review for maintainability, regression risk, permission and scope changes,
  product integration behavior, and adequate tests. A generated implementation
  is not complete until the contributor has validated and understood it.
- Never recommend merging a pull request whose required checks, Confluence
  evidence, or review conversations remain incomplete.
