import { faker } from "@faker-js/faker";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../button/button";
import { Popover } from "./popover";

import { disableControlsView } from "#storybook/lib/disable-control-view";

const meta: Meta<typeof Popover> = {
  title: "UI / Popover",
  component: Popover,
  tags: ["autodocs"],
  argTypes: {
    ...disableControlsView(["trigger", "children", "positioner", "modal", "classNames"]),
    openOnHover: {
      defaultValue: true,
      control: {
        type: "boolean",
      },
    },
    delay: {
      defaultValue: 200,
      control: {
        type: "number",
      },
    },
    closeDelay: {
      defaultValue: undefined,
      control: {
        type: "number",
      },
    },
    maxWidth: {
      defaultValue: undefined,
      control: {
        type: "text",
      },
    },
  },
};

export default meta;

export const PopoverComponent: StoryObj<typeof Popover> = {
  name: "Popover",
  args: {
    showCloseButton: true,
    positioner: {
      sideOffset: 20,
    },
    trigger: (
      <Button variant="secondary" size="m">
        Open popover
      </Button>
    ),
  },
  render: (args) => {
    return (
      <Popover {...args}>
        <div style={{ padding: "0 0 1.5rem 0" }}>
          <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>Image Popover</h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-secondary)" }}>
            A sample picture inside popover.
          </p>
        </div>
        <div>
          <img src={faker.image.urlPicsumPhotos({ width: 300, height: 300 })} alt="cat" />
        </div>
      </Popover>
    );
  },
};

export const PopoverComponentWithClick: StoryObj<typeof Popover> = {
  name: "Popover by click",
  args: {
    trigger: (
      <Button variant="secondary" size="m">
        Open popover with click
      </Button>
    ),
    openOnHover: false,
    showCloseButton: true,
  },
  render: (args) => {
    return (
      <Popover {...args}>
        <div style={{ padding: "0 0 1.5rem 0" }}>
          <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>Text Content</h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-secondary)" }}>
            Example text blocks.
          </p>
        </div>
        <div>
          {faker.lorem
            .paragraphs(5)
            .split("\n")
            .map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
        </div>
      </Popover>
    );
  },
};

export const PopoverScrolled: StoryObj<typeof Popover> = {
  args: {
    trigger: (
      <Button variant="secondary" size="m">
        Open popover
      </Button>
    ),
  },
  render: (args) => {
    const data = faker.helpers.uniqueArray(faker.lorem.sentence, 50);
    return (
      <Popover {...args}>
        <div style={{ overflow: "auto", height: "300px" }}>
          {data.map((item) => (
            <div key={item}>{item}</div>
          ))}
        </div>
      </Popover>
    );
  },
};
