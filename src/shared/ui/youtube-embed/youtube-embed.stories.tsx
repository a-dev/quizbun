import type { Meta, StoryObj } from "@storybook/react-vite";

import { YouTubeEmbed } from "./youtube-embed";

const meta = {
  title: "UI / YouTube embed",
  component: YouTubeEmbed,
  parameters: {
    layout: "padded",
  },
  args: {
    videoId: "dQw4w9WgXcQ",
    title: "Video for cache hierarchy",
    start: 90,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof YouTubeEmbed>;

export default meta;
type Story = StoryObj<typeof meta>;

export const YouTubeEmbedSettings: Story = {};

export const FromBeginning: Story = {
  args: {
    start: undefined,
  },
};
