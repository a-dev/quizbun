# Quizbun

Quizbun is a static, explanation-first quiz catalog built around the Quiz Object
Standard.

[https://a-dev.github.io/quizbun/](https://a-dev.github.io/quizbun/)

## Create quizzes with an AI agent

Install the standalone `create-quiz` skill with the [Skills CLI](https://skills.sh):

```sh
npx skills add a-dev/quizbun --skill create-quiz
```

The installed skill includes the Quiz Object Standard authoring contract and a dependency-free Node.js validator. It does not require the Quizbun application or Bun.

## Documentation

- Public quiz author and Catalog contributor docs live in [`docs/`](docs/).
- Developer planning and architecture docs live in [`dev-docs/`](dev-docs/).
