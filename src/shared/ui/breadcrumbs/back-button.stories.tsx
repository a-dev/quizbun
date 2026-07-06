import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { BackButton } from "./back-button";

const meta = {
  title: "UI / BackButton",
  component: BackButton,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    href: { control: "text" },
    text: { control: "text" },
  },
  args: {
    text: "Back",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof BackButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AsLink: Story = {
  args: {
    href: "/library/",
  },
};

export const CustomLabel: Story = {
  args: {
    href: "/library/",
    text: "All quizzes",
  },
};

export const AsButton: Story = {
  args: {
    onClick: fn(),
    text: "Back to quiz details",
  },
};
