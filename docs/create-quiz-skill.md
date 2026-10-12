## Install the create-quiz skill

The skill includes the authoring rules, JSON Schema, canonical example, and a dependency-free Node.js validator. The validator checks cross-field rules that JSON Schema cannot express. It runs without Quizbun or Bun.

Install it directly from the Quizbun repository:

```sh
npx skills add a-dev/quizbun --skill create-quiz
```

Invoke `create-quiz` in your agent. Describe what you want to learn. Include your level, question count, and media preference if you know them. Each agent has its own invocation syntax.

The AI asks only for missing details. It can suggest a narrower topic, recommend question counts with coverage examples, and choose suitable question types. It asks about images or videos when they would help. The AI generates the quiz immediately if your request contains all necessary details.

Both the skill and copied prompt include an editing pass for clear questions and natural explanations. You do not need a separate writing skill. If you edit the quiz with another tool, ask it to preserve facts, accepted answers, and option correctness. Examples include [unslop](https://www.skills.sh/?q=unslop) and [humanizer](https://www.skills.sh/?q=humanizer). Validate the edited quiz again.

The AI delivers `<quiz-id>.json` when it can create files. Save the file. Choose the file on Quizbun's import page, or drag it onto that page. If the AI cannot create files, it provides a JSON code block with a filename and save instructions. You can also paste that JSON into the import page.

To open the quiz in Quizbun without saving the file first, also install the [quizbun](./quizbun-skill.md) skill. Install both with one command:

```sh
npx skills add a-dev/quizbun --skill create-quiz --skill quizbun
```

If your version of the CLI accepts only one skill per command, run the command once for each skill.
