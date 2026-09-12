## Prompt

Create one explanation-first Quiz that follows the Quiz Object Standard v1 below. Help the Learner understand each concept through the Explanation shown after answering.

### 1. Resolve missing details

Use the user's request and conversation. Do not ask again for details already provided. If the request is complete, generate the Quiz immediately.

Ask only for missing details that affect the content:

- Topic and scope. If the topic is broad or ambiguous, suggest concrete subtopics and ask which to cover.
- Learner level or learning goal. Ask when you cannot infer it and it would change the Questions or Explanations.
- Question count. Once the scope and level are clear, recommend counts with specific coverage for each. For example, a JavaScript array Quiz might use 10 Questions on indexing and common methods, 30 adding mutation, callbacks, and method selection, or 60 adding sparse arrays, shallow copies, and edge cases. Adapt the counts to the topic. More Questions do not guarantee greater depth; avoid repetition or padding.
- Media preference, only when Images or Videos would help teach this topic. Explain what they would add and ask whether to include them. Respect an existing preference. If the user delegates the choice, default to text-only.

Recommend suitable Question types alongside the count options. Use `single-choice` for one best answer, `multiple-choice` for several independently correct statements, and `input` for short text or numeric answers with predictable accepted forms. Choose the mix unless the user specifies one. Do not force every type into every Quiz.

Group independent questions into one short message and wait for the answers. If scope is unclear, resolve it before suggesting counts. Use the conversation's language unless the user requests another. If the user asks you to choose all missing details, proceed with reasonable assumptions instead of interviewing them. Do not require a separate plan approval.

### 2. Write, review, and deliver

Cover the agreed scope and count. Write distinct Questions with plausible distractors based on common mistakes. Avoid trick wording, accidental clues, and ambiguous accepted answers.

#### Write natural teaching text

- Put the actual ask in each Question's `title`. Use `description` only for supporting context, code, data, or answer-format hints. Omit it when it adds nothing.
- Make each `explanation` teach why the answer holds. Address a likely misconception or explain a tempting distractor when useful. Do not merely restate the answer or describe what the Question teaches.
- Use plain words, active voice, and concrete examples. Keep technical terms precise and consistent. Split dense sentences without dropping necessary reasoning.
- Remove filler such as "It is important to note", inflated claims, vague attributions such as "experts say", and stock contrasts such as "not just X, but Y".
- Let the concept determine the length and structure. Avoid repeating the same opener, conclusion, or list template across Explanations. Skip decorative emojis, excessive emphasis, and ornamental punctuation.
- Edit all learner-facing text before delivery. Preserve facts, terminology, code, accepted answers, and which Options are correct. Recheck correctness after editing. This pass is built in; it does not require another skill.

#### Follow the Standard

- Return exactly one Quiz object. Set `schemaVersion` to the number `1`. Use stable kebab-case Quiz and Question ids, with unique Question ids within the Quiz.
- Include every required field in the schema. Omit empty optional text and arrays. Add no unknown fields or presentation settings, including difficulty, page size, Option ids, or Option labels.
- Options contain only `text` and `isCorrect`. Both choice types require at least 2 Options. `single-choice` requires exactly 1 correct Option. `multiple-choice` requires at least 1 and permits all to be correct; scoring is all-or-nothing.
- For `input`, include `validation` with `mode: "text"` or `mode: "numeric"` and a non-empty `acceptedAnswers` array. Text answers are case-insensitive, trimmed, and whitespace-normalized by default. Set `caseSensitive` only when exact casing is the learning goal. Numeric answers must be JSON numbers; use `tolerance` only when rounding should be accepted.
- Include an `explanation` for every Question. Renderers shuffle Options, so never identify an Option by its JSON position or an invented label such as "option B". Quote or paraphrase its text. Labels defined within the Question itself, such as code comments, are allowed.
- Use Markdown for learner-facing text. Titles, Option text, and Image captions are inline-only. Descriptions, Explanations, and References support full Markdown. Never use raw HTML or Markdown image syntax; structured `images` is the only Image channel.
- Tag every fenced code block with its language. Supported highlighting includes `js`, `ts`, `jsx`, `tsx`, `json`, `html`, `css`, `py`, `bash`, `sh`, and `sql`. Other languages render without highlighting.
- Add `references` when source material or further reading helps. Prefer links naming the publication and topic, such as `[MDN: Array.prototype.sort()](...)`. Never invent citations or URLs. Verify factual claims and use primary sources when research is needed. Do not present uncertain claims as settled facts.

#### Include media only when useful and agreed

- Add `images` or `videos` only when they teach something the text cannot. Each is a non-empty array when present.
- An Image is `{ src, alt, caption?, placement? }`. Write meaningful `alt` text and put attribution in `caption`. Always omit `width` and `height`; repository tooling fills in intrinsic dimensions for vendored Images.
- For a standalone Quiz file, use verified `https://` Image URLs. The Standard also permits bare kebab-case filenames ending in `png`, `jpg`, `jpeg`, `webp`, `avif`, `gif`, or `svg`, but these resolve to Catalog assets and are not bundled with an imported JSON file. Use filenames only when those assets will exist in the target Catalog. Directory paths, `http://`, protocol-relative URLs, and `data:` URLs are invalid.
- A Video is `{ provider: "youtube", id, start?, placement? }`. Use the bare 11-character YouTube id. Optional `start` is a non-negative whole number of seconds.
- `placement` is `"question"` or `"explanation"`. Omit the default `"question"`. Put answer-revealing media under `"explanation"` and avoid revealing the answer through question-side alt text or captions.
- Verify every Image source and YouTube id exists and matches the intended content. You may create a diagram if you can supply it through a supported source. Never invent media identifiers. Omit unverified media; if this prevents the agreed coverage, explain the limitation before generating.

#### Check the result

Before delivery, check JSON syntax, required fields, unknown fields, unique kebab-case ids, Option correctness counts, and input validation. Check factual accuracy, agreed coverage and count, clear Question titles, useful Explanations, and verified media. Remove any references to shuffled Option positions.

Use a compatible validator when available and fix its errors. The schema below does not enforce every rule, including unique Question ids and correct Option counts. Do not claim you ran validation unless you did.

#### Deliver a JSON file

If your tools can create files, save the complete Quiz as UTF-8 `<quiz-id>.json`. The file must contain only the Quiz JSON object, without Markdown fences or commentary. Provide the actual download link, attachment, or accessible file link with a short instruction to import it into Quizbun.

If you cannot create a file, say to save the code block's contents as `<quiz-id>.json` and import that file into Quizbun. Then provide the complete object in one `json` code block. Do not invent a download link or claim a file was created. Honor an explicit request for raw JSON instead.

Never return a partial Quiz, placeholders, or multiple JSON objects as the final artifact. If the requested count exceeds your output capacity, explain the limit and agree on a smaller count before generating.

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
