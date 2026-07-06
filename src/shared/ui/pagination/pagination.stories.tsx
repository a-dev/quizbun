import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { Pagination } from "./pagination";

const meta = {
  title: "UI / Pagination",
  component: Pagination,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    currentPage: {
      control: { type: "number", min: 1 },
    },
    pageCount: {
      control: { type: "number", min: 1 },
    },
  },
  args: {
    "aria-label": "Example pages",
    currentPage: 6,
    pageCount: 55,
    onPageChange: fn(),
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ManyPages: Story = {
  render: (args) => {
    const [currentPage, setCurrentPage] = useState(args.currentPage);

    return (
      <Pagination
        {...args}
        currentPage={currentPage}
        onPageChange={(page) => {
          setCurrentPage(page);
          args.onPageChange?.(page);
        }}
      />
    );
  },
};

export const NearStart: Story = {
  args: {
    currentPage: 2,
    pageCount: 55,
  },
  render: ManyPages.render,
};

export const NearEnd: Story = {
  args: {
    currentPage: 54,
    pageCount: 55,
  },
  render: ManyPages.render,
};

export const SevenPages: Story = {
  args: {
    currentPage: 4,
    pageCount: 7,
  },
  render: ManyPages.render,
};
