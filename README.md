# Quizbun

Quizbun is a static, explanation-first quiz catalog built around the quiz Object
Standard.

[https://quizbun.fyi/](https://quizbun.fyi/)

## Create quizzes with an AI agent

Install the standalone `create-quiz` skill with the [Skills CLI](https://skills.sh):

```sh
npx skills add a-dev/quizbun --skill create-quiz
```

The installed skill includes the Quiz Object Standard authoring contract and a dependency-free Node.js validator. It does not require the Quizbun application or Bun.

Add the `quizbun` skill to open a finished quiz in Quizbun. It writes a launcher file that loads the quiz on the import page, and it requires `create-quiz`:

```sh
npx skills add a-dev/quizbun --skill create-quiz --skill quizbun
```

Quizbun imports quizzes of at most 200 questions and 1 MB of JSON. See [the quizbun skill](docs/quizbun-skill.md).

For ChatGPT, a separate prototype plugin bundles quiz generation and a
browser-assisted import workflow. Build it with `bun run plugin:chatgpt:package`;
see [installation and testing](docs/chatgpt-plugin.md). The standalone skills
remain available independently.

## Check explanations against marked answers

Validation proves that a question is well-formed, never that its explanation
defends the option marked `isCorrect`. A flag on the wrong option passes every
automated gate, and a reviewer reading thirty questions can miss it.

This check asks a [TypeSafe](https://typesafe.ai) judgment per choice question
and reports the ones whose explanation argues for a different answer:

```sh
bun run quiz:explanations:check content/quizzes/{id}.json
```

Add `--all` to print every probability rather than only the flagged questions.
It needs `TYPESAFE_API_KEY` and network access, so it is advisory and stays out
of CI alongside the other optional analysers.

## Documentation

- Public quiz author and catalog contributor docs live in [`docs/`](docs/).
- Maintainer product and architecture decisions live in [`SPEC.md`](SPEC.md).
