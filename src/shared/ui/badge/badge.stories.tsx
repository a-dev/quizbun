import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "./badge";

const SIZES = ["s", "m"] as const;

const meta = {
  title: "UI / Badge",
  component: Badge,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    size: {
      control: "select",
      options: SIZES,
    },
    intent: {
      control: "select",
      options: ["taxonomy"],
    },
  },
  args: {
    children: "algorithms",
    size: "s",
    intent: "taxonomy",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BadgeSettings: Story = {};

export const Sizes: Story = {
  parameters: {
    controls: { disable: true },
  },
  render: () => (
    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
      {SIZES.map((size) => (
        <Badge key={size} size={size}>
          {`size ${size}`}
        </Badge>
      ))}
    </div>
  ),
};

export const TagList: Story = {
  parameters: {
    controls: { disable: true },
  },
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", maxWidth: "20rem" }}>
      {["algorithms", "data-structures", "javascript", "recursion", "big-o"].map((tag) => (
        <Badge key={tag}>{tag}</Badge>
      ))}
    </div>
  ),
};
