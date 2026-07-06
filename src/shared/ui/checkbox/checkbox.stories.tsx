import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { Checkbox } from ".";

import styles from "./checkbox.stories.module.css";

const meta = {
  title: "UI / Checkbox",
  component: Checkbox,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    defaultChecked: { control: "boolean" },
    disabled: { control: "boolean" },
    indeterminate: { control: "boolean" },
    readOnly: { control: "boolean" },
    required: { control: "boolean" },
    value: { control: "text" },
  },
  args: {
    children: "Show explanations after each answer",
    defaultChecked: false,
    onCheckedChange: fn(),
    value: "show-explanations",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CheckboxSettings: Story = {};

export const States: Story = {
  parameters: {
    controls: { disable: true },
  },
  render: () => (
    <div className={styles.grid}>
      <div className={styles.column}>
        <span className={styles.caption}>Unchecked</span>
        <Checkbox value="unchecked">Option</Checkbox>
      </div>
      <div className={styles.column}>
        <span className={styles.caption}>Checked</span>
        <Checkbox value="checked" defaultChecked>
          Option
        </Checkbox>
      </div>
      <div className={styles.column}>
        <span className={styles.caption}>Indeterminate</span>
        <Checkbox indeterminate>Option</Checkbox>
      </div>
      <div className={styles.column}>
        <span className={styles.caption}>Disabled checked</span>
        <Checkbox value="disabled-checked" defaultChecked disabled>
          Option
        </Checkbox>
      </div>
    </div>
  ),
};
