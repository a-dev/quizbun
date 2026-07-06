import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { Radio, RadioGroup } from ".";

import styles from "./radio.stories.module.css";

const meta = {
  title: "UI / Radio",
  component: RadioGroup,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
    required: { control: "boolean" },
    children: { control: false },
  },
  args: {
    "aria-label": "Quiz focus",
    defaultValue: "react",
    name: "quiz-focus",
    onValueChange: fn(),
  },
  tags: ["autodocs"],
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Group: Story = {
  parameters: {
    controls: { disable: true },
  },
  render: () => (
    <RadioGroup defaultValue="local" aria-label="Quiz source" className={styles.stack}>
      <Radio value="catalog">Catalog quiz</Radio>
      <Radio value="local">Private browser quiz</Radio>
      <Radio value="json">Imported JSON file</Radio>
      <Radio value="epub" disabled>
        Imported EPUB file
      </Radio>
      <Radio value="txt">Imported TXT file</Radio>
    </RadioGroup>
  ),
};

export const GroupDisabled: Story = {
  parameters: {
    controls: { disable: true },
  },
  render: () => (
    <RadioGroup defaultValue="local" aria-label="Quiz source" className={styles.stack} disabled>
      <Radio value="catalog">Catalog quiz</Radio>
      <Radio value="local">Private browser quiz</Radio>
      <Radio value="json">Imported JSON file</Radio>
    </RadioGroup>
  ),
};
