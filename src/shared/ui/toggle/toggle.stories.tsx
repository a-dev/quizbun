import type { Meta, StoryObj } from "@storybook/react-vite";

import { Toggle } from "./toggle";

const meta = {
  title: "UI / Toggle",
  component: Toggle,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["ghost", "outline", "soft"],
    },
    size: {
      control: "select",
      options: ["xs", "s", "m", "icon-s", "icon-m"],
    },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ─── Variants ──────────────────────────────────────── */

export const Ghost: Story = {
  args: {
    variant: "ghost",
    size: "m",
    children: "Ghost",
  },
};

export const Outline: Story = {
  args: {
    variant: "outline",
    size: "m",
    children: "Outline",
  },
};

export const Soft: Story = {
  args: {
    variant: "soft",
    size: "m",
    children: "Soft",
  },
};

/* ─── Pressed states ────────────────────────────────── */

export const PressedGhost: Story = {
  name: "Pressed (Ghost)",
  args: {
    variant: "ghost",
    size: "m",
    defaultPressed: true,
    children: "Bold",
  },
};

export const PressedOutline: Story = {
  name: "Pressed (Outline)",
  args: {
    variant: "outline",
    size: "m",
    defaultPressed: true,
    children: "Bold",
  },
};

/* ─── Icon sizes ────────────────────────────────────── */

export const IconSmall: Story = {
  name: "Icon — sm",
  args: {
    variant: "ghost",
    size: "icon-s",
    "aria-label": "Bold",
    children: "B",
  },
};

export const IconMedium: Story = {
  name: "Icon — md (default)",
  args: {
    variant: "ghost",
    size: "icon-m",
    "aria-label": "Bold",
    children: "B",
  },
};

/* ─── Disabled ──────────────────────────────────────── */

export const Disabled: Story = {
  args: {
    variant: "ghost",
    size: "m",
    disabled: true,
    children: "Disabled",
  },
};
