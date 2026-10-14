---
name: setup
description: >
  Set up the Quizbun plugin when the user runs plugin onboarding or asks how
  to connect their assistant to their Quizbun library. Do not generate a quiz during
  setup unless requested.
---

# Set up Quizbun

Use a Quizbun address already selected in this conversation. If none is known,
ask whether to use `https://quizbun.fyi/` or a local address. Keep this address
as the destination for this conversation; do not promise it is remembered across
new chats. For an unavailable local address, report the failure instead of
switching to the production site.

Explain that each browser keeps its own library on this device; another browser,
profile, or installed app may have a separate library.

## Explain the two ways to import

Check which browser capabilities this host exposes. When code execution is
available, also check `node --version` (the launcher needs Node.js 22.12 or
later). Then tell the user, in a few short lines, that a quiz can reach their
library in two ways, and which of them work here:

1. **Browser control.** With local browser tools, the assistant opens the
   import page, validates the quiz, saves it, and checks the result. The quiz
   goes to the library of the browser those tools control. If available, open
   the selected site's library now.
2. **Launcher file.** The assistant writes `<quiz-id>.open.html` next to the
   quiz JSON. The user opens it in any browser on this device, and it loads the
   quiz into Quizbun's import preview there; the user then clicks
   **Save to library**. This needs no browser tools, so it is the way to choose
   exactly which browser's library gets the quiz. The quiz travels in the link's
   fragment, which the browser does not send to a server; the launcher file and
   browser history keep a copy until the user deletes them.

A browser isolated from the user's everyday profile, such as an in-app or
automation browser, has its own library; say so before treating it as the
destination, and mention the launcher as the way to reach their usual browser.
If only a remote/cloud browser is available, explain that it cannot save to the
user's local library; offer the launcher file instead.

Ask which way the user prefers and use it for quizzes in this conversation. If
neither works (no browser control and no Node.js), the quiz JSON file can still
be pasted or dropped on the import page. The plugin needs no account, API key,
or MCP server.

Offer this example prompt: "Create a 10-question quiz about what we've discussed
and save it to my Quizbun library." Do not modify browser permissions or generate
sample content merely to complete onboarding.
