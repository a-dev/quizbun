import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { Checkbox, CheckboxGroup } from ".";

import styles from "./checkbox.stories.module.css";

const OPTION_VALUES = ["explanations", "incorrect", "unanswered"] as const;

const meta = {
  title: "UI / Checkbox",
  component: CheckboxGroup,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    allValues: { control: false },
    children: { control: false },
    defaultValue: { control: "object" },
    disabled: { control: "boolean" },
    value: { control: false },
  },
  args: {
    "aria-label": "Review filters",
    allValues: [...OPTION_VALUES],
    defaultValue: ["explanations"],
    onValueChange: fn(),
  },
  render: (args) => (
    <CheckboxGroup {...args}>
      <Checkbox value="explanations">Questions with explanations</Checkbox>
      <Checkbox value="incorrect">Incorrect answers</Checkbox>
      <Checkbox value="unanswered">Unanswered questions</Checkbox>
    </CheckboxGroup>
  ),
  tags: ["autodocs"],
} satisfies Meta<typeof CheckboxGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CheckboxGroupSettings: Story = {};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const WithParentCheckbox: Story = {
  parameters: {
    controls: { disable: true },
  },
  render: () => (
    <CheckboxGroup
      allValues={[...OPTION_VALUES]}
      aria-label="Review filters with parent"
      className={styles.stack}
      defaultValue={["explanations", "incorrect"]}
    >
      <Checkbox value="all" parent>
        All review filters
      </Checkbox>
      <Checkbox value="explanations">Questions with explanations</Checkbox>
      <Checkbox value="incorrect">Incorrect answers</Checkbox>
      <Checkbox value="unanswered">Unanswered questions</Checkbox>
    </CheckboxGroup>
  ),
};
