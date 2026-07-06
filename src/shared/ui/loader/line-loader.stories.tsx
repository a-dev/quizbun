import type { Meta, StoryObj } from "@storybook/react-vite";

import { LineLoader, TopLineLoader } from "./line-loader";

const meta = {
  title: "UI / Loader / LineLoader",
  component: LineLoader,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof LineLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div style={{ position: "relative", minHeight: 120 }}>
      <LineLoader />
      <p style={{ padding: 16, color: "var(--color-text-muted)" }}>
        The fixed-positioned bar renders at the very top of the viewport. Scroll the story preview
        to see it stick.
      </p>
    </div>
  ),
};

export const TopLevelPortal: StoryObj = {
  render: () => (
    <div style={{ padding: 16 }}>
      <p>
        <code>TopLineLoader</code> portals into <code>document.body</code> after mount, so it
        appears at the top of the Storybook iframe rather than inside this story&apos;s container.
      </p>
      <TopLineLoader />
    </div>
  ),
};
