# Quizbun Claude Code plugin

The Claude Code plugin is the same package as the
[ChatGPT plugin](chatgpt-plugin.md). It uses the same `plugins/quizbun/` folder
and the same two skills: **setup** and **create-quiz**. Only the manifest is
different. `plugins/quizbun/.claude-plugin/plugin.json` describes the package for
Claude Code. Two marketplaces list it:

- `.claude-plugin/marketplace.json` (name `quizbun`) is for users. It installs
  `./plugins/quizbun` from `main`.
- `plugins/.claude-plugin/marketplace.json` (name `quizbun-development`) is for
  local testing. It installs from this checkout.

Claude Code namespaces plugin skills, so they appear as `/quizbun:setup` and
`/quizbun:create-quiz`. They are separate from the standalone `create-quiz` and
`quizbun` skills under `skills/`.

## Build and install locally

The packaging step copies the validator, launcher, references, and icons from
the standalone skills and `public/`. The copies are committed, so
`plugins/quizbun/` is a complete plugin on `main`. Package again after you
change a source file:

```sh
bun run plugin:package
```

Then check the shared resources and both manifests:

```sh
bun run plugin:check
claude plugin validate plugins/quizbun
claude plugin validate .claude-plugin/marketplace.json
```

`plugin:check` also checks that the Claude manifest and the marketplace entry
use the same name, version, description, and license as `plugin.json`.

To try the plugin for one session without installing it:

```sh
claude --plugin-dir ./plugins/quizbun
```

To install the local build, which also works in the Code tab of the Claude
desktop app:

```sh
claude plugin marketplace add /absolute/path/to/quizbun/plugins
claude plugin install quizbun@quizbun-development
```

Claude Code reads a plugin from a local marketplace straight from
`plugins/quizbun/`. It does not copy it. After you edit a skill, package again.
The change takes effect in the next session or after `/reload-plugins`.

## Browser access

The plugin does not give Claude browser access. create-quiz uses whatever
browser tools the session already has.

- Claude in Chrome drives the user's everyday Chrome profile, so quizzes go to
  the Library they already use.
- The built-in browser in the Claude desktop app has its own profile and its own
  Library. The skill says so before it saves there.
- With no browser tool, the skill falls back to Node.js, which Claude Code can
  usually run. It validates the quiz with the bundled script and writes a
  `.open.html` launcher. The learner opens it and clicks **Save to library**.

## Publishing

The plugin is published from `plugins/quizbun/` on `main`. CI runs
`bun run plugin:check`, which fails when a committed copy differs from its
source. Anthropic's directory reads the same folder. Its listing icon is
`.claude-plugin/icon.png`, copied from `public/icons/icon-maskable-512.png`.

Users install the published plugin with:

```sh
claude plugin marketplace add a-dev/quizbun
claude plugin install quizbun@quizbun
```

## Acceptance checks in Claude Code

Everything in [the ChatGPT acceptance checks](chatgpt-plugin.md#acceptance-checks-in-chatgpt)
applies here too. On top of that:

- A normal question about learning does not start `/quizbun:create-quiz`.
- When the built-in browser is the only browser tool, the skill says that its
  Library is separate before it saves.
