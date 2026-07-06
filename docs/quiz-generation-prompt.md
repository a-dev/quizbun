# Quiz Generation Prompt

Use this prompt when you want an AI tool to generate one Quiz that conforms to the Quiz Object Standard v1. It is intentionally self-contained: authoring rules, the generated JSON Schema, and one canonical example, all in one paste.

## Prompt

Generate exactly one Quiz as strict JSON.

Return one JSON object, nothing else.
Do not wrap the JSON in markdown fences.
Do not add commentary before or after the JSON.

Topic: `<replace with topic>`

Question mix: `<replace with desired question types and count>`

Follow these rules:

- Set `schemaVersion` to the integer `1`, not a string.
- Use stable kebab-case `id` values for the Quiz and every Question. Question ids must be unique within the Quiz.
- Supported Question types are `single-choice`, `multiple-choice`, and `input`.
- Options are bare objects with only `text` and `isCorrect`. Do not add Option ids, labels, letters, or presentation fields.
- For `single-choice`, include at least 2 Options and exactly 1 correct Option.
- For `multiple-choice`, include at least 2 Options and at least 1 correct Option. Correctness is all-or-nothing.
- For `input`, use a `validation` object with `mode: "text"` or `mode: "numeric"` and at least one accepted answer.
- Text input answers are case-insensitive, trimmed, and whitespace-collapsed by default. Only add `caseSensitive` when exact casing is the learning goal.
- Numeric input answers must be JSON numbers. Use `tolerance` only when rounded answers should count as correct.
- Put the question itself in the Question `title`, phrased as the actual ask — usually ending in `?`. Use the optional Question `description` only for supporting context: the scenario, a code snippet, data, or answer-format hints. Renderers show the `description` as smaller secondary text, so it must never carry the real question.
- Include an `explanation` for every Question. The Explanation should teach the concept, not only restate the correct answer.
- Renderers shuffle Options, so the order in the JSON is not the order the learner sees. Never refer to an Option by its position or an invented label in any text field — no "the first option", "the last option", "the third distractor", "option B", or "(option 2)". Identify an Option by quoting or paraphrasing its text instead. (Positional labels are acceptable only when the Question defines them itself, e.g. as comments in a code snippet in the `description`.)
- Add optional `references` when a Question benefits from source links, citations, or further reading. References appear after the Explanation and must be non-empty when present. Where practical, prefer link text that names both the publication and the linked article or topic (for example, `[MDN: Array.prototype.sort()](...)`); this is a recommendation, not a requirement.
- Every text field is Markdown. Titles and Option text are inline-only; descriptions, Explanations, and References may use full Markdown. Never use raw HTML.
- Fenced code blocks in descriptions, Explanations, and References are syntax-highlighted for JavaScript/TypeScript (`js`, `ts`, `jsx`, `tsx`), `json`, `html`, `css`, Python (`py`), Bash (`bash`, `sh`), and `sql`. Other languages still render, just without colors. Prefer these hints, and always tag the fence with its language.
- Keep distractors plausible without making false facts feel correct.
- Do not add fields that are not in the schema. Validation is strict: unknown fields are rejected.

Before emitting the final JSON, silently check:

- The output is valid JSON with no trailing commas.
- The root value is one object, not an array.
- `schemaVersion` is `1`.
- Every required field is present.
- Every id is kebab-case.
- No unknown fields exist anywhere.
- Single-choice and multiple-choice correctness counts satisfy the rules above.
- Every Question `title` states the actual question; no `description` carries the ask on its own.
- No text field refers to an Option by position or label ("first option", "option B", …).

JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "schemaVersion": {
      "type": "number",
      "const": 1
    },
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
    },
    "title": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "language": {
      "type": "string",
      "pattern": "^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$"
    },
    "tags": {
      "default": [],
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
      }
    },
    "author": {
      "type": "string"
    },
    "questions": {
      "minItems": 1,
      "type": "array",
      "items": {
        "oneOf": [
          {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
              },
              "title": {
                "type": "string"
              },
              "description": {
                "type": "string"
              },
              "explanation": {
                "type": "string"
              },
              "references": {
                "type": "string"
              },
              "type": {
                "type": "string",
                "const": "single-choice"
              },
              "options": {
                "minItems": 2,
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "text": {
                      "type": "string"
                    },
                    "isCorrect": {
                      "type": "boolean"
                    }
                  },
                  "required": ["text", "isCorrect"],
                  "additionalProperties": false
                },
                "description": "Exactly one Option in this array must have `isCorrect: true`. JSON Schema cannot enforce this cross-field rule; the Zod validator and import page are the final authority."
              }
            },
            "required": ["id", "title", "explanation", "type", "options"],
            "additionalProperties": false,
            "description": "A single-choice Question must have exactly one Option where `isCorrect` is true. JSON Schema cannot enforce this cross-field rule; the Zod validator and import page are the final authority."
          },
          {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
              },
              "title": {
                "type": "string"
              },
              "description": {
                "type": "string"
              },
              "explanation": {
                "type": "string"
              },
              "references": {
                "type": "string"
              },
              "type": {
                "type": "string",
                "const": "multiple-choice"
              },
              "options": {
                "minItems": 2,
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "text": {
                      "type": "string"
                    },
                    "isCorrect": {
                      "type": "boolean"
                    }
                  },
                  "required": ["text", "isCorrect"],
                  "additionalProperties": false
                },
                "description": "At least one Option in this array must have `isCorrect: true`. All Options may be correct. JSON Schema cannot enforce this cross-field rule; the Zod validator and import page are the final authority."
              }
            },
            "required": ["id", "title", "explanation", "type", "options"],
            "additionalProperties": false,
            "description": "A multiple-choice Question must have at least one Option where `isCorrect` is true. All Options may be correct. JSON Schema cannot enforce this cross-field rule; the Zod validator and import page are the final authority."
          },
          {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
              },
              "title": {
                "type": "string"
              },
              "description": {
                "type": "string"
              },
              "explanation": {
                "type": "string"
              },
              "references": {
                "type": "string"
              },
              "type": {
                "type": "string",
                "const": "input"
              },
              "validation": {
                "oneOf": [
                  {
                    "type": "object",
                    "properties": {
                      "mode": {
                        "type": "string",
                        "const": "text"
                      },
                      "acceptedAnswers": {
                        "minItems": 1,
                        "type": "array",
                        "items": {
                          "type": "string"
                        }
                      },
                      "caseSensitive": {
                        "type": "boolean"
                      }
                    },
                    "required": ["mode", "acceptedAnswers"],
                    "additionalProperties": false
                  },
                  {
                    "type": "object",
                    "properties": {
                      "mode": {
                        "type": "string",
                        "const": "numeric"
                      },
                      "acceptedAnswers": {
                        "minItems": 1,
                        "type": "array",
                        "items": {
                          "type": "number"
                        }
                      },
                      "tolerance": {
                        "type": "number",
                        "minimum": 0
                      }
                    },
                    "required": ["mode", "acceptedAnswers"],
                    "additionalProperties": false
                  }
                ]
              }
            },
            "required": ["id", "title", "explanation", "type", "validation"],
            "additionalProperties": false
          }
        ]
      },
      "description": "Question ids must be unique within the Quiz. JSON Schema cannot enforce this cross-field rule; the Zod validator and import page are the final authority."
    }
  },
  "required": ["schemaVersion", "id", "title", "questions"],
  "additionalProperties": false,
  "title": "Quiz Object Standard v1",
  "description": "The published JSON Schema artifact for Quizbun's Quiz Object Standard v1. This artifact is generated from the Zod schema; the Zod validator and import page are the final authority."
}
```

Canonical example:

```json
{
  "schemaVersion": 1,
  "id": "javascript-falsy-single-choice-example",
  "title": "JavaScript Falsy Value Example",
  "description": "A minimal public quiz example that shows the simplest single-choice contribution path with explanation-first feedback.",
  "language": "en",
  "tags": ["javascript", "basics", "types"],
  "questions": [
    {
      "id": "falsy-zero",
      "title": "Which value is falsy in JavaScript?",
      "description": "Choose the value that becomes false in a boolean context without any conversion helper.",
      "type": "single-choice",
      "options": [
        {
          "text": "`[]`",
          "isCorrect": false
        },
        {
          "text": "`0`",
          "isCorrect": true
        },
        {
          "text": "`{}`",
          "isCorrect": false
        },
        {
          "text": "`\"0\"`",
          "isCorrect": false
        }
      ],
      "explanation": "`0` is one of JavaScript's built-in falsy values. Arrays, objects, and non-empty strings are all truthy, so this question teaches learners to separate literal appearance from boolean behavior.",
      "references": "[MDN: Falsy](https://developer.mozilla.org/en-US/docs/Glossary/Falsy)"
    }
  ]
}
```
