# Quizbun ChatGPT plugin

This prototype bundles quiz generation and a browser-assisted import workflow.
It uses the current Quizbun interface and requires no Quizbun backend or MCP
server. Existing standalone skills under `skills/` remain unchanged.

The plugin exposes two skills: **setup** selects the destination and checks browser
access; **create-quiz** handles authoring, validation, and import in one workflow.
Users do not need to select a separate import skill. An existing quiz file can
also go through create-quiz directly.

## Build and install locally

From the repository root, run:

```sh
bun run plugin:chatgpt:package
```

This assembles `plugins/quizbun/` and creates `tmp/chatgpt-plugin/quizbun.zip`.
The generated resources are copied from the existing standalone skills, not
maintained separately. Run packaging again after updating those skills. Use
`bun run plugin:chatgpt:check` to check the assembled copies for drift.

The repository marketplace at `.agents/plugins/marketplace.json` describes the
assembled package. Register the repository with the local host before testing:

```sh
codex plugin marketplace add /absolute/path/to/quizbun
codex plugin marketplace list
```

Replace the path with your repository root. The list should include
`quizbun-development`. If it reports no marketplaces and the local plugins
feature is disabled, enable it with `codex features enable plugins` and rerun
the list. Check the package with:

```sh
codex plugin list --marketplace quizbun-development --available --json
```

Restart the ChatGPT desktop app,
open the Plugins Directory in Work mode or Codex, select **Quizbun development**,
and install **Quizbun**. Start a new conversation with the plugin enabled and
run its setup workflow. Local marketplace installation copies the package into
the host's cache; after edits, rebuild and refresh or reinstall the local plugin.
Version 0.2.0 replaces the former three-skill package. Reinstall it to remove the
old quizbun and quizbun-setup entries; the new package contains only setup and
create-quiz. Keep a localhost destination in the same conversation, or specify it
again when starting a new chat.

Host availability and workspace policies may restrict plugin installation or
browser access. Creating this package does not publish it to the public directory.

## Prepare a public submission

Version 0.3.0 adds public listing metadata and the existing Quizbun icon. It keeps
the two-skill interface. The package uses Quizbun as project attribution;
OpenAI's dashboard sets the public publisher name from the verified developer
identity selected during upload. A GitHub username is not required.

Run these commands before uploading:

```sh
bun run plugin:chatgpt:package
bun run plugin:chatgpt:check
bun run plugin:chatgpt:preflight
```

The ZIP is `tmp/chatgpt-plugin/quizbun.zip`. Packaging runs the same local
publication preflight: listing text limits, exactly two skills, onboarding and
icon paths, PNG dimensions, skill metadata, and absence of MCP configuration.
These checks do not replace OpenAI's portal validation, skill scans, or review.

In the [Plugins dashboard](https://platform.openai.com/plugins):

1. Select the organization/project that will own the plugin and complete
   individual or business verification for the publisher identity.
2. Start a new plugin submission through **Skills only** and upload the ZIP.
3. Review normalized metadata, especially the verified publisher name. Resolve
   automated findings and wait for skill scans to complete.
4. Complete the required attestations and submit for review.
5. After approval, choose when to publish.

The short listing description is **Learn with custom quizzes**. The listing
states that automatic import depends on supported local browser tools and that
other environments receive files. Optional privacy, terms, and support URLs are
not invented; current skills-only submission rules do not require all four URLs.

Verify the advertised production workflow before submission. The successful
five-question import demonstrated in this chat used `http://localhost:4321/`
in Safari Technology Preview; it does not establish production-domain or
cross-platform behavior. The acceptance checks below cover the remaining host
testing. No public upload, review, or publication has been performed.

If the Mac app's MCP bridge becomes the intended product, revisit the submission
architecture first: OpenAI currently does not support adding MCP to an existing
skills-only published plugin. Local MCP support and public-directory eligibility
are different questions.

## Try it

Ask: "Create a 10-question quiz on JavaScript arrays for a beginner, text-only,
and save it to my Quizbun library."

With local browser tools, the plugin opens import, fills the JSON, validates,
saves, and checks the resulting quiz detail page. If generation details are
missing and affect the content, the bundled authoring skill asks for them.
The destination is the library of the browser used by the host, which may be
separate from an existing library in Chrome, Safari, or an installed app.

Without local browser control, the plugin provides JSON and, when Node.js is
available, the current launcher file. The learner then opens it and selects
**Save to library**. A plugin's instructions do not grant browser permissions.

## Acceptance checks in ChatGPT

- A new quiz reaches the chosen local library and can be reopened there.
- Validation errors return to the agent for repair; saving is verified afterward.
- Reusing an id requires replacement authorization and preserves the old quiz
  when cancelled.
- A preview-only request never saves; a normal learning question never triggers
  Quiz creation solely because the plugin is enabled.
- Missing Node uses the website validator; missing browser access gives an honest
  file fallback. A cloud browser is not silently treated as the local library.
- An interrupted save is inspected before retrying; browser profiles are identified.
- Over-limit quizzes are discussed before splitting; long links are never pasted.

Packaging and bundled script smoke checks can run locally. These acceptance
checks still require an actual installed-plugin conversation in the target host.
The prototype does not add WebMCP site tools, offline loading, or run history.

Official references: [package a plugin](https://developers.openai.com/plugins/build/plugins)
and [connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt),
[submit and publish](https://developers.openai.com/plugins/deploy/submission), and
[submission requirements](https://developers.openai.com/plugins/deploy/submission-errors).
