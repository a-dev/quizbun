declare module "prismjs" {
  export type Grammar = Record<string, unknown>;

  interface PrismApi {
    languages: Record<string, Grammar | undefined>;
    highlight(code: string, grammar: Grammar, language: string): string;
  }

  const Prism: PrismApi;

  export default Prism;
}

declare module "prismjs/components/prism-bash.js";
declare module "prismjs/components/prism-json.js";
declare module "prismjs/components/prism-jsx.js";
declare module "prismjs/components/prism-python.js";
declare module "prismjs/components/prism-sql.js";
declare module "prismjs/components/prism-tsx.js";
declare module "prismjs/components/prism-typescript.js";
