## Open a quiz in Quizbun with the quizbun skill

The `quizbun` skill reads a quiz JSON file and writes a launcher file named `<quiz-id>.open.html`. Open the launcher file in a browser. Quizbun's import page loads the quiz, validates it, and shows the preview. You must click **Save to library** yourself.

The `quizbun` skill requires the [create-quiz](./create-quiz-skill.md) skill. It runs the `create-quiz` validator before it creates the launcher file. Install both skills:

```sh
npx skills add a-dev/quizbun --skill create-quiz --skill quizbun
```

Then invoke `quizbun` with a quiz JSON file. You can also ask `quizbun` to create a quiz about a topic. For this request, `quizbun` first uses `create-quiz` to create the quiz.

### Launcher file and exit codes

The launcher file contains the quiz link. The agent never prints the quiz link. The quiz link contains the whole quiz and is too long to copy by hand. The script `open-quiz.mjs` exits with one of these codes:

| Code | Meaning                                                           |
| ---- | ----------------------------------------------------------------- |
| 0    | The script wrote the launcher file.                               |
| 1    | The quiz is invalid. The script prints the validator's report.    |
| 2    | The quiz is over Quizbun's limits, or its link would be too long. |
| 3    | The `create-quiz` skill is missing.                               |

### Import limits

Quizbun imports quizzes with at most 200 questions and 1 MB of JSON. These import limits apply to Quizbun. They are not part of the Quiz Object Standard. A larger quiz is still valid under the standard, and other renderers may accept it. If your topic requires a larger quiz, divide it into several quizzes by subtopic. The `quizbun` skill offers to divide the quiz when it reaches an import limit.

### Privacy

The quiz link contains the quiz in its fragment, the part after `#`. Browsers never send the fragment to a server. Thus, Quizbun's host does not receive your quiz. The launcher file and your browser history contain the whole quiz until you delete them.

When you preview the quiz, remote images load from their own servers. This also occurs when you paste quiz JSON into import.
