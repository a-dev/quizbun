## Open a Quiz in Quizbun with the quizbun skill

The `quizbun` skill takes a Quiz JSON file and writes a launcher file named `<quiz-id>.open.html`. Open the launcher in a browser and Quizbun's Import page loads the Quiz, validates it, and shows the preview. You still click **Save to Library** yourself.

The skill requires the [create-quiz](./create-quiz-skill.md) skill. It runs that skill's validator before it builds anything. Install both:

```sh
npx skills add a-dev/quizbun --skill create-quiz --skill quizbun
```

Then invoke `quizbun` with a Quiz file, or ask it to make a Quiz about a topic. In the second case it creates the Quiz through `create-quiz` first.

### Launcher file and exit codes

The launcher holds the link. The agent never prints the link, because it contains the whole Quiz and is too long to copy by hand. The script `open-quiz.mjs` exits with one of these codes:

| Code | Meaning                                                           |
| ---- | ----------------------------------------------------------------- |
| 0    | The launcher file was written.                                    |
| 1    | The Quiz is invalid. The validator's report is printed.           |
| 2    | The Quiz is over Quizbun's limits, or its link would be too long. |
| 3    | The `create-quiz` skill is missing.                               |

### Import limits

Quizbun imports Quizzes of at most 200 Questions and 1 MB of JSON. These limits belong to Quizbun, not to the Quiz Object Standard, so a larger Quiz is still valid and other Renderers may accept it. If your topic is bigger, split it into several Quizzes by subtopic. The skill offers to do this when it hits the limit.

### Privacy

The Quiz sits in the link's fragment, the part after `#`. Browsers never send the fragment to a server, so Quizbun's host does not receive your Quiz. The launcher file and your browser history do hold the whole Quiz until you delete them. Remote Images in a Quiz still load from their own servers when you preview it, the same as with a paste.
