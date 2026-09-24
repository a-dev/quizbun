import type { Meta, StoryObj } from "@storybook/react-vite";

import { LinkArrow } from "./link-arrow";

import { cx, typography } from "#styles";
import styles from "./link-arrow.stories.module.css";

const VARIANTS = [
  { motion: "bounce", direction: "right", note: "0.6s, hits the end and rebounds (quiz card)" },
  { motion: "wobbly", direction: "right", note: "1.1s, big overshoot, several wobbles" },
  { motion: "bounce", direction: "left", note: "0.6s, mirrored" },
  { motion: "wobbly", direction: "left", note: "1.1s, mirrored (back button)" },
] as const;

const meta = {
  title: "UI / LinkArrow",
  component: LinkArrow,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    motion: {
      control: "select",
      options: ["bounce", "wobbly"],
    },
    direction: {
      control: "select",
      options: ["right", "left"],
    },
  },
  args: {
    size: 18,
    motion: "bounce",
    direction: "right",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof LinkArrow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InALink: Story = {
  render: (args) => (
    <a
      href="#link-arrow"
      className={cx(
        typography.h3,
        typography.hLink,
        styles.row,
        args.direction === "left" && styles.rowReverse,
      )}
    >
      Hover or Tab to me
      <LinkArrow {...args} className={styles.arrow} />
    </a>
  ),
};

/** Each row is its own link: hover them one at a time. */
export const Variants: Story = {
  parameters: {
    controls: { disable: true },
  },
  render: () => (
    <div className={styles.list}>
      {VARIANTS.map(({ motion, direction, note }) => (
        <a
          key={`${motion}-${direction}`}
          href="#link-arrow"
          className={cx(
            typography.h3,
            typography.hLink,
            styles.row,
            direction === "left" && styles.rowReverse,
          )}
        >
          <span className={styles.label}>
            {`${motion}, ${direction}`}
            <span className={styles.caption}>{note}</span>
          </span>
          <LinkArrow size={18} motion={motion} direction={direction} className={styles.arrow} />
        </a>
      ))}
    </div>
  ),
};
