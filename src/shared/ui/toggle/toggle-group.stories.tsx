import type { Meta, StoryObj } from "@storybook/react-vite";

import { Toggle, ToggleGroup } from ".";

const meta = {
  title: "UI / Toggle",
  component: ToggleGroup,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    multiple: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ─── Single select (radio behaviour) ──────────────── */

export const SingleSelect: Story = {
  name: "Single select (radio)",
  render: () => (
    <ToggleGroup defaultValue={["left"]} aria-label="Text align">
      <Toggle value="left" aria-label="Align left" size="icon-m" variant="ghost">
        ←
      </Toggle>
      <Toggle value="center" aria-label="Align center" size="icon-m" variant="ghost">
        ↔
      </Toggle>
      <Toggle value="right" aria-label="Align right" size="icon-m" variant="ghost">
        →
      </Toggle>
    </ToggleGroup>
  ),
};

/* ─── Multi select (checkbox behaviour) ─────────────── */

export const MultiSelectOutline: Story = {
  name: "Multi select (checkbox)",
  render: () => (
    <ToggleGroup multiple defaultValue={["bold"]} aria-label="Text format">
      <Toggle value="bold" aria-label="Bold" size="m" variant="outline">
        B
      </Toggle>
      <Toggle value="italic" aria-label="Italic" size="m" variant="outline">
        I
      </Toggle>
      <Toggle value="underline" aria-label="Underline" size="m" variant="outline">
        U
      </Toggle>
    </ToggleGroup>
  ),
};

export const MultiSelectGhost: Story = {
  name: "Multi select (checkbox)",
  render: () => (
    <ToggleGroup multiple defaultValue={["bold"]} aria-label="Text format">
      <Toggle value="bold" aria-label="Bold" size="m" variant="ghost">
        B
      </Toggle>
      <Toggle value="italic" aria-label="Italic" size="m" variant="ghost">
        I
      </Toggle>
      <Toggle value="underline" aria-label="Underline" size="m" variant="ghost">
        U
      </Toggle>
    </ToggleGroup>
  ),
};

export const MultiSelectSoft: Story = {
  name: "Multi select (checkbox)",
  render: () => (
    <ToggleGroup multiple defaultValue={["bold"]} aria-label="Text format">
      <Toggle value="bold" aria-label="Bold" size="m" variant="soft">
        B
      </Toggle>
      <Toggle value="italic" aria-label="Italic" size="m" variant="soft">
        I
      </Toggle>
      <Toggle value="underline" aria-label="Underline" size="m" variant="soft">
        U
      </Toggle>
    </ToggleGroup>
  ),
};

/* ─── Disabled ──────────────────────────────────────── */

export const DisabledGroup: Story = {
  render: () => (
    <ToggleGroup disabled aria-label="Text align">
      <Toggle value="left" aria-label="Align left" size="icon-m" variant="ghost">
        ←
      </Toggle>
      <Toggle value="center" aria-label="Align center" size="icon-m" variant="ghost">
        ↔
      </Toggle>
    </ToggleGroup>
  ),
};
