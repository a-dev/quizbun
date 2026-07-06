import type { Meta, StoryObj } from "@storybook/react-vite";

import colorsCss from "#styles/vars/colors.css?raw";
import { SemanticColors } from "./semantic-colors";

const meta = {
  title: "Colors",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<Record<string, never>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Semantic: Story = {
  render: () => <SemanticColors colorsCss={colorsCss} />,
};
