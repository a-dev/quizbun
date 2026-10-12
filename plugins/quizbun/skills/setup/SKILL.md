---
name: setup
description: >
  Set up the Quizbun plugin when the user runs plugin onboarding or asks how
  to connect ChatGPT to their Quizbun library. Do not generate a quiz during
  setup unless requested.
---

# Set up Quizbun

Use a Quizbun address already selected in this conversation. If none is known,
ask whether to use `https://quizbun.fyi/` or a local address. Check which browser
capabilities this host exposes. With local browser control, open the selected
site's library. Keep this address as the destination for this conversation; do
not promise it is remembered across new chats. For an unavailable local address,
report the failure instead of switching to the production site.
Explain that quizzes will be saved in this browser's library on this device;
another browser, profile, or installed app may have a separate library.

If browser control is unavailable or only a remote/cloud browser is available,
explain that this environment can prepare a file for import but cannot save it
directly into the user's local library. The plugin needs no account, API key,
MCP server, or Node installation for the normal browser import path. Optional
validator and launcher scripts need Node.js when used.

Offer this example prompt: "Create a 10-question quiz about what we've discussed
and save it to my Quizbun library." Do not modify browser permissions or generate
sample content merely to complete onboarding.
