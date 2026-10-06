# Quizbun

Quizbun is a static, explanation-first quiz catalog built around the Quiz Object
Standard.

[https://quizbun.fyi/](https://quizbun.fyi/)

## Create quizzes with an AI agent

Install the standalone `create-quiz` skill with the [Skills CLI](https://skills.sh):

```sh
npx skills add a-dev/quizbun --skill create-quiz
```

The installed skill includes the Quiz Object Standard authoring contract and a dependency-free Node.js validator. It does not require the Quizbun application or Bun.

Add the `quizbun` skill to open a finished Quiz in Quizbun. It writes a launcher file that loads the Quiz on the Import page, and it requires `create-quiz`:

```sh
npx skills add a-dev/quizbun --skill create-quiz --skill quizbun
```

Quizbun imports Quizzes of at most 200 Questions and 1 MB of JSON. See [the quizbun skill](docs/quizbun-skill.md).

## Check Explanations against marked answers

Validation proves that a Question is well-formed, never that its Explanation
defends the Option marked `isCorrect`. A flag on the wrong Option passes every
automated gate, and a reviewer reading thirty Questions can miss it.

This check asks a [TypeSafe](https://typesafe.ai) judgment per choice Question
and reports the ones whose Explanation argues for a different answer:

```sh
bun run quiz:explanations:check content/quizzes/{id}.json
```

Add `--all` to print every probability rather than only the flagged Questions.
It needs `TYPESAFE_API_KEY` and network access, so it is advisory and stays out
of CI alongside the other optional analysers.

## Documentation

- Public quiz author and Catalog contributor docs live in [`docs/`](docs/).
- Maintainer product and architecture decisions live in [`SPEC.md`](SPEC.md).
