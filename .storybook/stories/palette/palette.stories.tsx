import type { Meta, StoryObj } from "@storybook/react-vite";

import paletteCss from "#styles/vars/palette.css?raw";
import { ColorPalette } from "./color-palette";

const meta = {
  title: "Colors",
  parameters: {
    layout: "padded",
  },
} satisfies Meta<Record<string, never>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Palette: Story = {
  render: () => <ColorPalette paletteCss={paletteCss} />,
};
