import { faker } from "@faker-js/faker";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../button/button";
import { Dialog } from "./dialog";

import { disableControlsView } from "#storybook/lib/disable-control-view";

const meta: Meta<typeof Dialog> = {
  title: "UI / Dialog",
  component: Dialog,
  tags: ["autodocs"],
  argTypes: {
    ...disableControlsView(["trigger", "children", "footer", "classNames", "handle"]),
    title: { control: { type: "text" } },
    description: { control: { type: "text" } },
    modal: {
      control: { type: "radio" },
      options: [true, false, "trap-focus"],
    },
    dismissible: {
      defaultValue: true,
      control: { type: "boolean" },
    },
    showCloseButton: {
      defaultValue: true,
      control: { type: "boolean" },
    },
  },
};

export default meta;

export const DialogComponent: StoryObj<typeof Dialog> = {
  name: "Dialog",
  args: {
    title: "Delete this Run?",
    description: "This clears your saved progress for the quiz. This action cannot be undone.",
    showCloseButton: true,
    trigger: (
      <Button variant="secondary" size="m">
        Open dialog
      </Button>
    ),
  },
  render: (args) => (
    <Dialog
      {...args}
      footer={
        <>
          <Dialog.Close
            render={
              <Button variant="outline" size="m">
                Cancel
              </Button>
            }
          />
          <Dialog.Close
            render={
              <Button variant="destructive" size="m">
                Delete
              </Button>
            }
          />
        </>
      }
    />
  ),
};

export const DialogScrollable: StoryObj<typeof Dialog> = {
  name: "Dialog with long content",
  args: {
    title: "Terms of use",
    showCloseButton: true,
    trigger: (
      <Button variant="secondary" size="m">
        Read the terms
      </Button>
    ),
  },
  render: (args) => (
    <Dialog {...args}>
      {faker.lorem
        .paragraphs(10)
        .split("\n")
        .map((paragraph, index) => (
          <p key={index} style={{ margin: "0 0 1rem" }}>
            {paragraph}
          </p>
        ))}
    </Dialog>
  ),
};

export const DialogNonModal: StoryObj<typeof Dialog> = {
  name: "Non-modal dialog",
  args: {
    title: "Heads up",
    description: "The page stays interactive while this dialog is open.",
    modal: false,
    showCloseButton: true,
    trigger: (
      <Button variant="secondary" size="m">
        Open non-modal dialog
      </Button>
    ),
  },
  render: (args) => (
    <Dialog {...args}>
      <p style={{ margin: 0 }}>
        Because <code>modal=false</code>, focus is not trapped and the rest of the document remains
        scrollable and clickable.
      </p>
    </Dialog>
  ),
};
