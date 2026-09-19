# State and accessibility contracts

Load this reference when a component has loading, disabled, pressed, expanded, selected, checked, invalid, busy, or headless-library state.

## One semantic source

| Component state                      | Required source                       | Styling source           |
| ------------------------------------ | ------------------------------------- | ------------------------ |
| Native disabled control              | `disabled`                            | `:disabled`              |
| Focus-preserving unavailable control | `aria-disabled` plus guarded handlers | `[aria-disabled="true"]` |
| Toggle button                        | `aria-pressed={boolean}`              | value selector           |
| Disclosure                           | `aria-expanded={boolean}`             | value selector           |
| Checkbox or switch                   | native `checked` or required ARIA     | native or ARIA selector  |
| Invalid field                        | native validity or `aria-invalid`     | native or ARIA selector  |
| Private visual loading state         | `data-loading`                        | presence selector        |
| Headless component                   | library-owned state                   | library attribute        |

Do not mirror a native, ARIA, or library state into `data-*` merely for styling.

## Boolean attributes are not interchangeable

Private boolean data state uses presence:

```tsx
<div data-loading={loading || undefined} />
```

```css
.root[data-loading] {
  cursor: progress;
}
```

Meaningful ARIA false values remain present:

```tsx
<button aria-pressed={pressed} />
```

```css
.root[aria-pressed="true"] {
  /* pressed appearance */
}
```

`[aria-pressed]` is incorrect for the pressed appearance because it also matches `aria-pressed="false"`.

## Loading Button decision

Choose one product contract explicitly.

### Native disabled while loading

```tsx
<button
  disabled={disabled || loading}
  data-loading={loading || undefined}
  aria-busy={loading || undefined}
/>
```

This blocks pointer and keyboard activation and is robust against duplicate submission. Confirm whether losing normal focus behavior is acceptable for the product.

### Focus-preserving unavailable state

```tsx
<button
  aria-disabled={loading || undefined}
  aria-busy={loading || undefined}
  data-loading={loading || undefined}
  onClick={(event) => {
    if (loading) {
      event.preventDefault();
      return;
    }

    onClick?.(event);
  }}
/>
```

Guard every activation path, including keyboard behavior supplied by custom controls. Prefer a native button whenever possible.

## Spinner and announcements

A decorative spinner is hidden from the accessibility tree:

```tsx
<Spinner aria-hidden="true" className={styles.spinner} />
```

Keep the control's accessible name stable unless product requirements say otherwise. Announce progress or completion only when the surrounding workflow needs it.

`aria-busy` communicates that content is updating; it does not define naming, focus, duplicate activation, or live announcements.

## Verification checklist

- The DOM contains one source for each semantic state.
- Meaningful ARIA false values remain present.
- Keyboard and pointer activation follow the chosen loading contract.
- Decorative spinners are hidden.
- Accessible names remain correct in every state.
- Reduced-motion and forced-colors behavior is checked when applicable.
- Existing headless-library attributes are preserved.
