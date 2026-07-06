import { mkdir, writeFile } from "node:fs/promises";

import { SCHEMA_ARTIFACT_URL, serializeQuizJsonSchema } from "./quiz-json-schema";

await mkdir(new URL(".", SCHEMA_ARTIFACT_URL), { recursive: true });
await writeFile(SCHEMA_ARTIFACT_URL, serializeQuizJsonSchema(), "utf8");

console.log(`Generated ${SCHEMA_ARTIFACT_URL.pathname}`);
