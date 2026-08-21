import type { Meta, StoryObj } from "@storybook/react-vite";

import { MediaFigure } from "./media-figure";

const meta = {
  title: "UI / Media figure",
  component: MediaFigure,
  parameters: {
    layout: "padded",
  },
  args: {
    src: "/quizbun-og-image.png",
    alt: "Quizbun logo beside an open book",
    caption: "Quizbun **preview image**.",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof MediaFigure>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MediaFigureSettings: Story = {};

export const BrokenSource: Story = {
  args: {
    src: "/missing-image.png",
    alt: "A missing diagram described by its alt text",
    caption: "The caption remains visible when the Image cannot load.",
  },
};
