# Host adapters: Codex and Claude Code

Use this adapter only when installing or verifying the skills for a host. The portable methodology does not depend on these paths or commands.

| Host        | `--agent`     | Project skills    | User (`--global`) skills |
| ----------- | ------------- | ----------------- | ------------------------ |
| Codex       | `codex`       | `.agents/skills/` | `~/.codex/skills/`       |
| Claude Code | `claude-code` | `.claude/skills/` | `~/.claude/skills/`      |

## Install and verify

```sh
npx skills add a-dev/skills \
  --skill css-modules-setup \
  --skill css-modules \
  --agent <host> \
  --yes
```

Add `--global` for a user-level installation. Then verify both the installer view and the host's actual skill catalog:

```sh
npx skills list --agent <host>
node <skills-dir>/css-modules-setup/scripts/verify-installation.mjs \
  --host <host> \
  --scope <project|global> \
  --project-root . \
  --scan .
```

`<skills-dir>` is the host's directory from the table above.

## Host-specific behavior

- Invoke `css-modules-setup` explicitly through the host's skill mechanism; do not assume a slash command exists. The daily `css-modules` skill may activate only after its adoption gate passes.
- `disable-model-invocation` expresses the author's manual-setup intent; support and UI behavior belong to the host. Confirm the installed skill's behavior in the host catalog.
- Do not keep project and user copies with the same name and rely on precedence. The verifier reports that state as ambiguous so an old copy cannot silently shadow an update.
- The repository tests the documented discovery directories, canonical-copy comparison, and shadow detection; inspecting the host's actual catalog remains a host-level step.
