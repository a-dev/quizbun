import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { Input, InputField } from "./input";

import styles from "./input.stories.module.css";

const SIZES = ["s", "m", "l"] as const;

const meta = {
  title: "UI / Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    size: {
      control: "select",
      options: SIZES,
    },
    disabled: { control: "boolean" },
    error: { control: "text" },
  },
  args: { onChange: fn() },
  tags: ["autodocs"],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InputSettings: Story = {
  args: {
    size: "m",
    placeholder: "Placeholder",
  },
};

export const Sizes: Story = {
  parameters: {
    controls: { disable: true },
  },
  render: () => (
    <div className={styles.grid}>
      {SIZES.map((size) => (
        <label key={size} className={styles.column}>
          <span className={styles.caption}>size {size}</span>
          <Input size={size} placeholder="Placeholder" />
        </label>
      ))}
    </div>
  ),
};

export const FieldStates: Story = {
  parameters: {
    controls: { disable: true },
  },
  render: () => (
    <div className={styles.stack}>
      <InputField label="Quiz title" placeholder="JavaScript fundamentals" />
      <InputField
        label="Source"
        placeholder="Paste a URL or citation"
        error="Source is required for published quizzes."
      />
      <InputField label="Locked title" placeholder="Read-only generated title" disabled />
    </div>
  ),
};
