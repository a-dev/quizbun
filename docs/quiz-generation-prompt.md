# Quiz generation prompt

There are two ways to generate a Quiz with AI. If your agent supports Agent Skills, install `create-quiz`. Otherwise, copy the self-contained prompt on this page into any AI chat.

## Install the create-quiz skill

The skill includes the authoring rules, JSON Schema, canonical example, and a dependency-free Node.js validator. The validator checks cross-field rules that JSON Schema cannot express. It runs without Quizbun or Bun.

Install it directly from the Quizbun repository:

```sh
npx skills add a-dev/quizbun --skill create-quiz
```

Then invoke `create-quiz` in your agent and provide the topic, Question types, and Question count. Each agent has its own invocation syntax.

## Copy the prompt

If your AI tool does not support Agent Skills, use the copy button below. Replace the topic and Question mix placeholders before you send the prompt.
