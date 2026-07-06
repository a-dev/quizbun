import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { CodeTextarea, Textarea } from "./index";

import styles from "./textarea.stories.module.css";

const EXAMPLE_JSON = `{
  "schemaVersion": 1,
  "id": "javascript-basics",
  "title": "JavaScript basics",
  "questions": []
}`;

const meta = {
  title: "UI / Textarea",
  component: Textarea,
  parameters: {
    layout: "centered",
  },
  args: { onChange: fn() },
  tags: ["autodocs"],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TextareaSettings: Story = {
  args: {
    "aria-label": "Quiz description",
    placeholder: "Describe this quiz",
  },
  render: (args) => (
    <div className={styles.field}>
      <Textarea {...args} />
    </div>
  ),
};

export const JsonCode: Story = {
  render: () => <EditableCodeTextarea />,
};

function EditableCodeTextarea() {
  const [value, setValue] = useState(EXAMPLE_JSON);

  return (
    <div className={styles.field}>
      <CodeTextarea
        aria-label="Quiz JSON"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </div>
  );
}
