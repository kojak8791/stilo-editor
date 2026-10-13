# Security policy

Stilo turns HTML from any source (files, the clipboard, a server) into editable content, so a
security bug can put the users of every application that embeds it at risk. Thank you for
reporting one with care.

## Supported versions

Stilo is in its `0.x` preview phase: security fixes go into the latest published version only.

## Reporting a vulnerability

**Do not open a public issue.** Report it privately on GitHub: go to the
[Security tab](https://github.com/kojak8791/stilo-editor/security) of the repository and choose
**Report a vulnerability**. Only the maintainer sees the report.

Please include:

- the Stilo version and the browser;
- what an attacker can do (for example: run a script, inject a link with a dangerous URL);
- the smallest input that shows it: the HTML given to `setHTML`, or what is pasted or dropped,
  and the steps to reproduce.

## What happens next

1. The report is confirmed, or more details are asked, in the same private thread.
2. The fix is prepared privately, and a test that reproduces the problem is added to the
   security test suite.
3. A new version is published together with a public
   [security advisory](https://github.com/kojak8791/stilo-editor/security/advisories): what is
   affected, which versions, the version that fixes it, and credit to the reporter if they
   want it. The advisory also reaches `npm audit`, so applications that use Stilo are warned.

The report stays private only until the fix is published: users can then update right away,
instead of learning about a problem they cannot fix yet. When a vulnerability is already
exploited in the wild, the advisory is published at once with a workaround, if one exists.

## Scope

In scope: the sanitizing of HTML input (scripts, event handlers, URLs, styles), the HTML output
of `getHTML()`, and the default UI. Out of scope: HTML that an application changes after
`getHTML()`, and content inserted through `editor.view`, which bypasses the sanitizing.
