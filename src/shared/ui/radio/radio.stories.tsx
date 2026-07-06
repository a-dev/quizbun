import type { Meta, StoryObj } from "@storybook/react-vite";

import { Radio, RadioGroup } from ".";

import styles from "./radio.stories.module.css";

const meta = {
  title: "UI / Radio",
  component: Radio,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
    required: { control: "boolean" },
    value: { control: "text" },
  },
  args: {
    children: "Explanation-first answer",
    value: "explanation",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Radio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RadioSettings: Story = {
  render: (args) => (
    <RadioGroup defaultValue="explanation" aria-label="Radio settings">
      <Radio {...args} />
    </RadioGroup>
  ),
};

export const States: Story = {
  parameters: {
    controls: { disable: true },
  },
  render: () => (
    <div className={styles.grid}>
      <div className={styles.column}>
        <span className={styles.caption}>Unchecked</span>
        <RadioGroup defaultValue="other" aria-label="Unchecked radio">
          <Radio value="option">Option</Radio>
        </RadioGroup>
      </div>
      <div className={styles.column}>
        <span className={styles.caption}>Checked</span>
        <RadioGroup defaultValue="option" aria-label="Checked radio">
          <Radio value="option">Option</Radio>
        </RadioGroup>
      </div>
      <div className={styles.column}>
        <span className={styles.caption}>Disabled unchecked</span>
        <RadioGroup defaultValue="other" aria-label="Disabled unchecked radio">
          <Radio value="option" disabled>
            Option
          </Radio>
        </RadioGroup>
      </div>
      <div className={styles.column}>
        <span className={styles.caption}>Disabled checked</span>
        <RadioGroup defaultValue="option" aria-label="Disabled checked radio">
          <Radio value="option" disabled>
            Option
          </Radio>
        </RadioGroup>
      </div>
    </div>
  ),
};
