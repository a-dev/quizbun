import { useLayoutEffect, useRef, type RefObject } from "react";

type EditableElement = HTMLInputElement | HTMLTextAreaElement;

/**
 * Replays text a visitor typed into a prerendered field before its island
 * hydrated, so React state catches up with what is already on screen.
 *
 * Astro serves these fields as static markup, and the browser lets people type
 * into them straight away. React attaches later; it keeps whatever text the
 * element holds but starts from the state the island was rendered with. A
 * controlled field then sits at the typed text forever while its owner still
 * reads the empty initial value, so anything gated on that state — a Validate
 * button, a syntax overlay — never notices the input. Nothing recovers it,
 * because the next keystroke reports the full value the owner already ignores.
 *
 * Running on mount, after React has attached its listeners, keeps the fix in
 * one place: the element replays the input it missed, and the owner's ordinary
 * `onChange` handles it like any other edit.
 */
export function useRecoveredInput(
  ref: RefObject<EditableElement | null>,
  renderedValue: string,
): void {
  const hasRecoveredRef = useRef(false);

  useLayoutEffect(() => {
    if (hasRecoveredRef.current) return;

    hasRecoveredRef.current = true;

    const element = ref.current;

    if (element === null || element.value === renderedValue) return;

    replayInput(element);
  }, [ref, renderedValue]);
}

function replayInput(element: EditableElement): void {
  const recovered = element.value;
  const { selectionStart, selectionEnd } = element;
  const nativeSetter = Object.getOwnPropertyDescriptor(prototypeOf(element), "value")?.set;

  // React remembers the last value it saw for an element and ignores `input`
  // events that do not move it — and the text typed before hydration is what
  // it recorded. Clearing through React's own `value` accessor resets that
  // record; restoring through the prototype setter, which the accessor wraps
  // and therefore does not see, leaves the replayed event looking like a real
  // edit. Assigning twice also drops the caret to the end, so put it back.
  if (nativeSetter === undefined) {
    element.value = recovered;
  } else {
    element.value = "";
    nativeSetter.call(element, recovered);
  }

  // `email` and `number` inputs report no selection and throw if given one.
  if (selectionStart !== null && selectionEnd !== null) {
    element.setSelectionRange(selectionStart, selectionEnd);
  }

  element.dispatchEvent(new Event("input", { bubbles: true }));
}

function prototypeOf(element: EditableElement): EditableElement {
  return element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
}
