# Quizbun ChatGPT plugin

This prototype bundles quiz generation and a browser-assisted import workflow.
It drives the current Quizbun interface, so it needs no Quizbun backend and no
MCP server. The standalone skills under `skills/` stay as they are.

The plugin has two skills:

- **setup** selects the destination and checks browser access.
- **create-quiz** does authoring, validation, and import in one workflow.

There is no separate import skill to pick. If you already have a quiz file,
give it to create-quiz.

## Build and install locally

From the repository root, run:

```sh
bun run plugin:package
```

This command assembles `plugins/quizbun/` and creates
`public/plugins/chatgpt-plugin.zip`. Git ignores the ZIP. CI builds it before
the site build, so the site serves it at
`https://quizbun.fyi/plugins/chatgpt-plugin.zip`.

The packaging step copies the generated resources from the standalone skills.
The copies are committed. Nobody edits them by hand, so package again after
you change those skills. `bun run plugin:check` catches copies that have
drifted, and CI runs it.

The repository marketplace at `.agents/plugins/marketplace.json` describes the
assembled package. Before you test, register the repository with the local host:

```sh
codex plugin marketplace add /absolute/path/to/quizbun
codex plugin marketplace list
```

Replace the path with your repository root. The list should include
`quizbun-development`. If it shows no marketplaces, the local plugins feature is
probably off. Turn it on with `codex features enable plugins` and list again.
To check the package, run:

```sh
codex plugin list --marketplace quizbun-development --available --json
```

To install the plugin:

1. Restart the ChatGPT desktop app.
2. Open the Plugins Directory in Work mode or Codex.
3. Select **Quizbun development** and install **Quizbun**.
4. Start a new conversation with the plugin enabled.
5. Run the plugin's setup workflow.

A local marketplace install copies the package into the host's cache. Editing
the source does nothing until you rebuild and then refresh or reinstall the
plugin.

Version 0.2.0 replaces the old three-skill package. Reinstall to get rid of the
old quizbun and quizbun-setup entries, since the new package has only setup and
create-quiz. A localhost destination lasts for one conversation. In a new chat,
give it again.

Host availability and workspace policies may block plugin installation or
browser access. Building the package doesn't publish it to the public directory.

## Prepare a public submission

Version 0.3.0 adds public listing metadata and the Quizbun icon, and keeps the
same two skills. The package credits Quizbun as the project, but the public
publisher name comes from the OpenAI dashboard. It uses the verified developer
identity you pick during upload. No GitHub username is needed.

Before you upload, run these commands:

```sh
bun run plugin:package
bun run plugin:check
```

The ZIP is `public/plugins/chatgpt-plugin.zip`. Both commands run the same
local preflight, which checks:

- listing text limits
- that the package has exactly two skills
- onboarding and icon paths
- PNG dimensions
- skill metadata
- that the package has no MCP configuration

Passing it says nothing about OpenAI's own portal validation, skill scans, or
review.

In the [Plugins dashboard](https://platform.openai.com/plugins):

1. Select the organization/project that will own the plugin. Complete
   individual or business verification for the publisher identity.
2. Start a new plugin submission through **Skills only**. Upload the ZIP.
3. Review the normalized metadata, especially the verified publisher name.
   Resolve automated findings. Wait for the skill scans to complete.
4. Complete the required attestations. Submit the plugin for review.
5. After approval, choose when to publish.

The short listing description is "Learn with custom quizzes". The listing says
automatic import needs supported local browser tools, and that other
environments get a file instead. We left out the optional privacy, terms, and
support URLs rather than make them up. The current skills-only submission rules
do not require all four URLs.

Test the advertised production workflow before you submit. So far the only
successful run is one five-question import against `http://localhost:4321/` in
Safari Technology Preview. That says nothing about the production domain or
other platforms. The acceptance checks below cover the rest of the host
testing. Nobody has uploaded, reviewed, or published the package yet.

If the Mac app's MCP bridge turns out to be the real product, rethink the
submission first. OpenAI currently can't add MCP to a published skills-only
plugin. Whether MCP works locally and whether the plugin can be listed publicly
are separate questions.

## Try it

Ask: "Create a 10-question quiz on JavaScript arrays for a beginner, text-only,
and save it to my Quizbun library."

With local browser tools, the plugin opens import, fills in the JSON, validates
it, saves it, and then checks the quiz detail page. If you left out a detail
that changes the content, the bundled authoring skill asks for it. The quiz
lands in the library of whatever browser the host uses. That may not be the
library you already have in Chrome, Safari, or an installed app.

Without local browser control, you get the JSON, plus the current launcher file
when Node.js is available. Open the launcher and select **Save to library**.
Nothing in a plugin's instructions grants browser permissions.

## Acceptance checks in ChatGPT

- A new quiz reaches the chosen local library. The learner can open it again
  there.
- Validation errors go back to the agent for repair. After the save, the plugin
  checks that the save succeeded.
- When a quiz reuses an id, the plugin asks for permission to replace the old
  quiz. If the user cancels, the old quiz stays.
- A preview-only request never saves.
- A normal learning question never starts quiz creation only because the plugin
  is enabled.
- If Node is missing, the plugin uses the website validator.
- If browser access is missing, the plugin hands over a file and says why. It
  never quietly treats a cloud browser as the local library.
- After an interrupted save, the plugin looks at what got saved before it
  retries. It names the browser profile it is using.
- Before it splits an over-limit quiz, the plugin discusses the split with the
  user. It never pastes long links.

Packaging and the bundled-script smoke checks run locally. The acceptance
checks don't. They need a real conversation with the installed plugin in the
target host. The prototype does not add WebMCP site
tools, offline loading, or run history.

Official references: [package a plugin](https://developers.openai.com/plugins/build/plugins)
and [connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt),
[submit and publish](https://developers.openai.com/plugins/deploy/submission), and
[submission requirements](https://developers.openai.com/plugins/deploy/submission-errors).
