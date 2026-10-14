## Install the create-quiz skill

The skill bundles the authoring rules, JSON Schema, and a Node.js validator.

```sh
npx skills add a-dev/quizbun --skill create-quiz
```

Invoke `create-quiz` and describe what you want to learn. The AI asks only for missing details, then delivers `<quiz-id>.json`. Import that file on Quizbun's import page.
