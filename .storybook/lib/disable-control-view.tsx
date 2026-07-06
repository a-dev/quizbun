/**
 * Disables the view of the controls in the storybook
 * @param controls - Array of controls to disable
 * @returns Object with disabled controls
 */

export function disableControlsView(controls?: string[]) {
  if (!controls) return {};

  return controls.reduce(
    (acc, control) => {
      acc[control] = { table: { disable: true } };
      return acc;
    },
    {} as Record<string, { table: { disable: boolean } }>,
  );
}
