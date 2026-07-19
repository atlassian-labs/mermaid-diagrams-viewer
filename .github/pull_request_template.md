<!--
Do not submit this pull request until the final commit satisfies CONTRIBUTING.md.
Remove placeholders, choose exactly one E2E option, and complete the applicable
checklists. Use an issue or discussion if you need setup help before submission.
-->

## Summary

<!-- What changed, why it is needed, and any issue it resolves. -->

## Real Confluence validation

Choose exactly one:

- [ ] **Required:** I tested the source at the final commit in a real Confluence
      Cloud site, with only the documented local `app.id` substitution.
- [ ] **Exemption requested:** Confluence testing cannot provide meaningful
      evidence for this change. I explained why below.

Tested commit: `FULL_40_CHARACTER_COMMIT_SHA_OR_N/A`

Forge environment: `development_OR_N/A`

Browser: `BROWSER_AND_VERSION_OR_N/A`

When real-Confluence validation is required:

- [ ] The tested commit above is the current pull request head, and there were
      no other uncommitted source changes during testing.
- [ ] The evidence below includes at least one screenshot from a real
      Confluence page, with before/after evidence or a recording where needed.

### Scenarios and results

| Scenario | Expected | Actual |
| --- | --- | --- |
| Replace with the behavior tested | Replace with the expected result | Replace with the observed result |

### Evidence

<!--
Attach screenshots from a real Confluence page. Include before/after images for
visual changes and a recording or animated image for interactions when needed.
Show enough Confluence context to distinguish it from a standalone preview, and
remove private information. Do not include customer data, tokens, or secrets.
-->

### Exemption reason

<!-- Required only when "Exemption requested" is selected. -->

## Automated checks

- [ ] `yarn lint`
- [ ] `yarn test --coverage`
- [ ] `yarn build`
- [ ] `forge lint` when the Forge app or manifest is affected
- [ ] I added or updated automated tests for changed behavior

Explanation for any unchecked check: `N/A_OR_EXPLANATION`

## Contributor declaration

- [ ] I reviewed and understand the entire diff, including AI-generated or
      AI-modified code.
- [ ] The validation claims, evidence, and exemption request above are accurate;
      no result or evidence was fabricated or copied from unrelated behavior.
- [ ] After the latest change, I retested and updated the evidence or confirmed
      that the requested exemption still applies.
- [ ] This pull request does not contain my contributor-owned Forge `app.id`,
      customer data, credentials, or other secrets.
