---
name: quizbun
description: >
  Open a Quiz Object Standard Quiz in Quizbun (quizbun.fyi): check Quizbun's
  Import limits and make a launcher file that opens the Quiz on the Import page.
  Creates the Quiz first through the create-quiz skill when no file is given.
  Use only when the user invokes quizbun or explicitly asks to open a Quiz in Quizbun.
compatibility: Requires the create-quiz skill (a-dev/quizbun) and Node.js >= 22.12.
---

# Open a Quiz in Quizbun

This skill turns a Quiz JSON file into a launcher file. Opening the launcher in a browser loads the Quiz into Quizbun's Import page, where the user previews it and saves it to their Library. The skill never saves anything for the user.

## Steps

1. **Check that `create-quiz` is installed.** If the `create-quiz` skill is not available, stop. Tell the user to run `npx skills add a-dev/quizbun --skill create-quiz`, and do nothing else.
2. **Get a Quiz file.** Use the file the user gave. Otherwise, follow the `create-quiz` skill to create one. Tell it the Quizbun limit up front: at most 200 Questions. Suggest splitting larger topics into several Quizzes.
3. **Open it.** Run the script, then give the user the path of the launcher file it prints:

   ```sh
   node <quizbun-skill>/scripts/open-quiz.mjs quiz.json
   ```

   Options: `--out <dir>` sets the launcher's directory (default: next to the Quiz file), and `--base <url>` sets the Quizbun address (default `https://quizbun.fyi/`, for example `http://localhost:4398/` when testing a local build).

4. **On exit code 2**, explain the Quizbun limit and offer to split the Quiz into parts by subtopic, using `create-quiz` for the parts. The `.json` file stays valid and can still be used with other Renderers.
5. **Never print, retype or summarize the link.** It holds the whole Quiz and is far too long to copy by hand. Give the user the launcher file instead. `--print-url` exists for scripts only.

## Exit codes

| Code | Meaning                                                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | The launcher file was written.                                                                                                        |
| 1    | The Quiz is invalid. The script prints the `create-quiz` validator's report unchanged. Fix the Quiz with `create-quiz` and run again. |
| 2    | The Quiz is over Quizbun's limits (200 Questions or 1 MB of JSON), or its link would be too long.                                     |
| 3    | The `create-quiz` skill is missing. The script prints the install command.                                                            |

## Privacy

The Quiz travels in the link's fragment, which the browser never sends to a server. The launcher file and the browser history do hold the whole Quiz until the user deletes them.
