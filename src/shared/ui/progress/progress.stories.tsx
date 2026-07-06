import type { Meta, StoryObj } from "@storybook/react-vite";

import { Progress } from "./progress";

const meta = {
  title: "UI / Progress",
  component: Progress,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    value: {
      control: { type: "range", min: 0, max: 100, step: 1 },
    },
    label: { control: "text" },
  },
  args: {
    value: 40,
    label: "Quiz progress",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ProgressSettings: Story = {};

export const Steps: Story = {
  parameters: {
    controls: { disable: true },
  },
  render: () => (
    <div style={{ display: "grid", gap: "1.5rem", maxWidth: "24rem" }}>
      {[0, 25, 50, 75, 100].map((value) => (
        <Progress key={value} value={value} label={`${value}% answered`} />
      ))}
    </div>
  ),
};
