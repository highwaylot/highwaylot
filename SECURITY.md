# Security Policy

## Supported Versions

HIGHWAYLOT is a pre-alpha, actively-developed project with a single
maintainer. Only the current production version (whatever is live at
highwaylot.com) receives security fixes — there is no long-term support
for older versions while the project is at this stage.

| Version         | Supported          |
| ---------------- | ------------------ |
| v13.5 (current)  | :white_check_mark: |
| < v13.5          | :x:                |

This table will be updated as the project matures past pre-alpha and a
real support policy for older releases becomes relevant.

## Reporting a Vulnerability

If you find a security issue in HIGHWAYLOT — anything from a data exposure
to a way to bypass the listing management links, to an injection or auth
bypass — please report it privately rather than opening a public GitHub
issue.

**How to report:**
Email **hugo@highwaylot.com** with a description of the issue, steps to
reproduce it, and its potential impact if known. If that address isn't yet
active, reports can also be sent through the contact method listed on
highwaylot.com.

**What to expect:**
- HIGHWAYLOT is currently run by a single developer, so response times are
  best-effort rather than covered by a formal SLA. Reasonable goal is an
  initial acknowledgment within a few days.
- If the report is confirmed, a fix will be prioritized based on severity —
  critical issues (data exposure, auth bypass, ability to alter or delete
  another user's listing without their management link) get fixed as fast
  as possible; lower-severity issues are queued alongside other work.
- You'll get an update when the issue is resolved and deployed.
- If a report is declined (not reproducible, out of scope, or determined
  not to be a real vulnerability), you'll get an explanation of why.
- Please don't publicly disclose a vulnerability until it's been resolved
  or a reasonable amount of time has passed with no response.

**Scope note:** HIGHWAYLOT does not currently offer a paid bug bounty
program. Genuine, responsibly-disclosed reports are appreciated and will be
credited (with permission) once a public changelog exists for that purpose.
