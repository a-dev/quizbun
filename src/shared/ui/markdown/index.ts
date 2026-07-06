export { MarkdownRender, type MarkdownSize } from "./markdown";
// The shared prose stylesheet, exposed for non-React consumers that inject
// pre-rendered Markdown HTML themselves — e.g. the docs <article>, which applies
// `prose.prose` + `prose.sizeArticle` rather than going through MarkdownRender.
export { default as prose } from "./prose.module.css";
