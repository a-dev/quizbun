# CSS Modules edge cases

Load this reference when selectors cross elements, a component has unusual roots, or a third-party integration needs exceptions.

## Relationship selectors

Every authored element that owns styling gets a class. Bare descendant element selectors are avoided; relationships between owned roles are valid.

```css
/* Root state controls an owned child. */
.root[data-loading] .spinner {
  opacity: 1;
}

/* Native interaction state. */
.root:hover,
.root:focus-visible {
  /* ... */
}

/* Generated visual part owned by root. */
.root::before {
  /* ... */
}

/* Avoid: the h2 has no explicit local role. */
.root h2 {
  /* ... */
}
```

Injected HTML is the exception: Markdown, CMS, rich-text, or WYSIWYG output may require scoped element selectors because application code cannot attach classes.

## Inline geometry owned by libraries

Application-owned values travel through private custom properties:

```tsx
<Progress style={cssVars({ "--_progress": progress })} />
```

Library-owned computed geometry may stay inline:

```tsx
<div ref={refs.setFloating} style={floatingStyles} />
```

Keep the exception at the integration boundary. Do not copy library-owned inline style patterns into general component APIs.

## Color exceptions

When the semantic color contract is enabled:

- `currentColor` is allowed when a component inherits its semantic foreground;
- CSS system colors are allowed for forced-colors support;
- `transparent` is allowed as a keyword;
- mixed colors start from semantic tokens;
- raw authored colors and palette variables stay out of component modules.

## Fragment and multi-root components

A component that returns a Fragment or multiple roots has no single styling root. Give each owned root a role class and put state on the element that semantically owns it.

Do not add a wrapper solely to satisfy the `root` naming convention when it changes layout, accessibility, or DOM semantics.

## `asChild` and slot composition

When a slot transfers props to its child:

- confirm class merging preserves caller classes;
- confirm state attributes land on the interactive DOM element;
- avoid assumptions about a fixed element selector;
- test the supported child shapes.

## Composition ownership

The project profile records `markup`, `composes`, or `mixed-with-rule`.

A useful mixed rule is:

- use markup composition when combinations vary by call site;
- use `composes` when one local role always includes the same shared classes.

This is only a proposal. The first agent in a project does not silently choose a permanent composition architecture.

## Shared extraction

Follow the project's `sharedApi.admissionRule`.

Semantic identity matters more than equal declarations. Two rules that currently look the same may have different reasons to change and should remain separate.

The second-semantic-consumer rule is a conservative default, not a universal invariant.
