import { faker } from "@faker-js/faker";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CheckCircle } from "lucide-react";
import { fn } from "storybook/test";

import { Button, LinkAsButton } from "./button";

const VARIANTS = [
  "primary",
  "secondary",
  "outline",
  "destructive",
  "ghost",
  "link",
  "icon",
] as const;
const SIZES = ["l", "m", "s", "icon-xs", "icon-s", "icon-m"] as const;

const meta = {
  title: "UI / Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    variant: {
      control: "select",
      options: VARIANTS,
    },
    size: {
      control: "select",
      options: SIZES,
    },
    disabled: { control: "boolean" },
  },
  args: { onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ButtonSettings: Story = {
  args: {
    size: "m",
    variant: "primary",
    children: "Primary Button",
  },
};

export const AllButtons: Story = {
  parameters: {
    controls: { disable: true },
  },
  render: () => {
    const variantsWithoutIcon = VARIANTS.filter((v) => v !== "icon");
    const sizesWithoutIcon = SIZES.filter((s) => !s.startsWith("icon"));
    const iconSizes = SIZES.filter((s) => s.startsWith("icon"));
    return (
      <div style={{ display: "grid", gap: "48px" }}>
        <div
          style={{
            display: "grid",
            gap: "24px",
            gridTemplateColumns: `repeat(${variantsWithoutIcon.length}, 1fr)`,
          }}
        >
          {variantsWithoutIcon.map((variant) => (
            <div
              key={variant}
              style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "start" }}
            >
              {sizesWithoutIcon.map((size) => (
                <div
                  key={`${variant}-${size}`}
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <div style={{ fontSize: "var(--fs-xs)" }}>{`${variant} ${size}`}</div>
                  <Button key={`${variant}-${size}`} variant={variant} size={size}>
                    {size.startsWith("icon") ? "I" : faker.lorem.words(1)}
                  </Button>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "grid",
            gap: "24px",
            gridTemplateColumns: `repeat(${VARIANTS.length}, 1fr)`,
          }}
        >
          {VARIANTS.map((variant) => (
            <div key={variant} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {iconSizes.map((size) => (
                <div
                  key={`${variant}-${size}`}
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <div style={{ fontSize: "var(--fs-xs)" }}>{`${variant} ${size}`}</div>
                  <Button key={`${variant}-${size}`} variant={variant} size={size}>
                    {size.startsWith("icon") ? <CheckCircle size={16} /> : faker.lorem.words(1)}
                  </Button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  },
};

export const LinkAsButtonSettings: Story = {
  args: {
    size: "m",
    variant: "primary",
    children: "Primary Button",
  },
  render: (args) => <LinkAsButton href="#" {...args} />,
};
