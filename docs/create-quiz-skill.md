## 📥 Install the create-quiz skill

The skill includes the authoring rules, JSON Schema, canonical example, and a dependency-free Node.js validator. The validator checks cross-field rules that JSON Schema cannot express. It runs without Quizbun or Bun.

Install it directly from the Quizbun repository:

```sh
npx skills add a-dev/quizbun --skill create-quiz
```

Then invoke `create-quiz` in your agent and describe what you want to learn. Include your level, Question count, and media preference if you know them. Each agent has its own invocation syntax.

The AI asks only for missing details. It can suggest a narrower topic, recommend Question counts with coverage examples, and choose suitable Question types. It asks about Images or Videos when they would help. A complete request goes straight to generation.

Both the skill and copied prompt include an editing pass for clear Questions and natural Explanations. You do not need a separate writing skill. If you use [unslop](https://www.skills.sh/?q=unslop), or [humanizer](https://www.skills.sh/?q=humanizer) or another improvement tool afterward, ask it to preserve facts, accepted answers, and Option correctness, then validate the edited Quiz again.

The AI delivers `<quiz-id>.json` when it can create files. Save the file, then choose or drop it on Quizbun's Import page. If the AI cannot create files, it provides a JSON code block with a filename and save instructions. You can also paste that JSON into the Import page.
