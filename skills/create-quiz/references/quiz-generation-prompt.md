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
- Put the question itself in the Question `title`. Phrase it as the actual ask, which will usually end in `?`. Use the optional Question `description` only for supporting context such as a scenario, code snippet, data, or answer-format hints. Renderers show the `description` as smaller secondary text, so it must never carry the real question.
- Include an `explanation` for every Question. Explain the concept instead of repeating the correct answer.
- Renderers shuffle Options, so the learner does not see the JSON order. Never refer to an Option by position or with an invented label in any text field. Avoid "the first option", "the last option", "the third distractor", "option B", and "(option 2)". Quote or paraphrase the Option text instead. Positional labels are allowed only when the Question defines them, for example as comments in a code snippet in the `description`.
- Add optional `references` when a Question benefits from source links, citations, or further reading. References appear after the Explanation and must be non-empty when present. Where practical, prefer link text that names both the publication and the linked article or topic (for example, `[MDN: Array.prototype.sort()](...)`); this is a recommendation, not a requirement.
- Media is optional. Add `images` or `videos` to a Question only when a diagram, screenshot, or clip teaches something the text cannot. Both fields are arrays and must be non-empty when present.
- An Image is `{ src, alt, caption?, placement?, width?, height? }`. `alt` is always required because a Question's Image is content, not decoration. Put attribution in `caption`. Image `src` is either an `https://` URL or a bare kebab-case filename with a `png`/`jpg`/`jpeg`/`webp`/`avif`/`gif`/`svg` extension. The validator rejects `http://`, protocol-relative and `data:` sources, and paths that contain directories.
- A Video is `{ provider: "youtube", id, start?, placement? }`. `id` is the bare 11-character YouTube id, never a URL. `start` is a whole number of seconds.
- `placement` is `"question"` or `"explanation"`. An absent `placement` already means `"question"`, so omit the default. Put anything that reveals the answer under `"explanation"`.
- **Never fabricate a source.** Every image URL, every filename, and every YouTube id must point at something you have verified exists. Generating your own diagram is welcome; inventing a plausible-looking URL or video id is not. Omit the media instead.
- **Never fabricate Image dimensions.** Always omit `width` and `height`. Repository tooling reads vendored Image files and fills in their intrinsic dimensions.
- Markdown image syntax does not work. `![alt](src)` and `<img>` are stripped everywhere; `images` is the only image channel.
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
- Every image source and every YouTube video id is one you verified, not one you invented.
- No Image has `width` or `height`; repository tooling fills in both fields for vendored Images.

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
              "images": {
                "minItems": 1,
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "src": {
                      "anyOf": [
                        {
                          "type": "string",
                          "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*\\.(?:png|jpe?g|webp|avif|gif|svg)$"
                        },
                        {
                          "type": "string",
                          "pattern": "^https:\\/\\/\\S+$"
                        }
                      ]
                    },
                    "alt": {
                      "type": "string"
                    },
                    "caption": {
                      "type": "string"
                    },
                    "placement": {
                      "type": "string",
                      "enum": ["question", "explanation"]
                    },
                    "width": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 9007199254740991
                    },
                    "height": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 9007199254740991
                    }
                  },
                  "required": ["src", "alt"],
                  "additionalProperties": false,
                  "dependentRequired": { "height": ["width"], "width": ["height"] },
                  "description": "An Image sets `width` and `height` together or omits both. Both must be the intrinsic pixel size of the file `src` names, which JSON Schema cannot check against the file itself; the Zod validator and import page are the final authority."
                }
              },
              "videos": {
                "minItems": 1,
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "provider": {
                      "type": "string",
                      "const": "youtube"
                    },
                    "id": {
                      "type": "string",
                      "pattern": "^[A-Za-z0-9_-]{11}$"
                    },
                    "start": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 9007199254740991
                    },
                    "placement": {
                      "type": "string",
                      "enum": ["question", "explanation"]
                    }
                  },
                  "required": ["provider", "id"],
                  "additionalProperties": false
                }
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
              "images": {
                "minItems": 1,
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "src": {
                      "anyOf": [
                        {
                          "type": "string",
                          "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*\\.(?:png|jpe?g|webp|avif|gif|svg)$"
                        },
                        {
                          "type": "string",
                          "pattern": "^https:\\/\\/\\S+$"
                        }
                      ]
                    },
                    "alt": {
                      "type": "string"
                    },
                    "caption": {
                      "type": "string"
                    },
                    "placement": {
                      "type": "string",
                      "enum": ["question", "explanation"]
                    },
                    "width": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 9007199254740991
                    },
                    "height": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 9007199254740991
                    }
                  },
                  "required": ["src", "alt"],
                  "additionalProperties": false,
                  "dependentRequired": { "height": ["width"], "width": ["height"] },
                  "description": "An Image sets `width` and `height` together or omits both. Both must be the intrinsic pixel size of the file `src` names, which JSON Schema cannot check against the file itself; the Zod validator and import page are the final authority."
                }
              },
              "videos": {
                "minItems": 1,
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "provider": {
                      "type": "string",
                      "const": "youtube"
                    },
                    "id": {
                      "type": "string",
                      "pattern": "^[A-Za-z0-9_-]{11}$"
                    },
                    "start": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 9007199254740991
                    },
                    "placement": {
                      "type": "string",
                      "enum": ["question", "explanation"]
                    }
                  },
                  "required": ["provider", "id"],
                  "additionalProperties": false
                }
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
              "images": {
                "minItems": 1,
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "src": {
                      "anyOf": [
                        {
                          "type": "string",
                          "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*\\.(?:png|jpe?g|webp|avif|gif|svg)$"
                        },
                        {
                          "type": "string",
                          "pattern": "^https:\\/\\/\\S+$"
                        }
                      ]
                    },
                    "alt": {
                      "type": "string"
                    },
                    "caption": {
                      "type": "string"
                    },
                    "placement": {
                      "type": "string",
                      "enum": ["question", "explanation"]
                    },
                    "width": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 9007199254740991
                    },
                    "height": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 9007199254740991
                    }
                  },
                  "required": ["src", "alt"],
                  "additionalProperties": false,
                  "dependentRequired": { "height": ["width"], "width": ["height"] },
                  "description": "An Image sets `width` and `height` together or omits both. Both must be the intrinsic pixel size of the file `src` names, which JSON Schema cannot check against the file itself; the Zod validator and import page are the final authority."
                }
              },
              "videos": {
                "minItems": 1,
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "provider": {
                      "type": "string",
                      "const": "youtube"
                    },
                    "id": {
                      "type": "string",
                      "pattern": "^[A-Za-z0-9_-]{11}$"
                    },
                    "start": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 9007199254740991
                    },
                    "placement": {
                      "type": "string",
                      "enum": ["question", "explanation"]
                    }
                  },
                  "required": ["provider", "id"],
                  "additionalProperties": false
                }
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
