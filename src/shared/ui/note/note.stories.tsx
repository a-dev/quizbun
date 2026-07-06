import type { Meta, StoryObj } from "@storybook/react-vite";

import { Note, type NoteType } from "./note";

const TYPES = ["info", "warning", "error", "success"] as const satisfies readonly NoteType[];

const meta = {
  title: "UI / Note",
  component: Note,
  parameters: {
    layout: "padded",
  },
  argTypes: {
    type: {
      control: "select",
      options: TYPES,
    },
    children: { control: "text" },
  },
  args: {
    type: "info",
    children: "Private quizzes stay in this browser — they are never uploaded.",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Note>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoteSettings: Story = {};

export const Types: Story = {
  parameters: {
    controls: { disable: true },
  },
  render: () => (
    <div style={{ display: "grid", gap: "1rem", maxWidth: "32rem" }}>
      <Note type="info">Private quizzes stay in this browser — they are never uploaded.</Note>
      <Note type="warning">
        Re-importing this quiz with changed questions will reset your saved progress.
      </Note>
      <Note type="error">
        The file is not valid JSON. Fix the syntax error and try importing again.
      </Note>
      <Note type="success">The file is valid JSON. Import was successful.</Note>
    </div>
  ),
};

export const RichContent: Story = {
  parameters: {
    controls: { disable: true },
  },
  render: () => (
    <Note type="error" style={{ maxWidth: "32rem" }}>
      <strong>Validation failed.</strong> The field <code>questions[0].options</code> needs at least
      two options. Paste this path back into your AI chat to have it repaired.
    </Note>
  ),
};
