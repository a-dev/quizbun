import type { Meta, StoryObj } from "@storybook/react-vite";

import { Select } from "./select";

const fruits = [
  { label: "Gala", value: "gala" },
  { label: "Fuji", value: "fuji" },
  { label: "Honeycrisp", value: "honeycrisp" },
  { label: "Granny Smith", value: "granny-smith" },
  { label: "Pink Lady", value: "pink-lady" },
] as const;

const longOptions = Array.from({ length: 40 }, (_, index) => {
  const number = index + 1;

  return {
    label: `Option ${number.toString().padStart(2, "0")}`,
    value: `option-${number}`,
  };
});

const languages = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  rust: "Rust",
  go: "Go",
} as const;

type Language = keyof typeof languages;

const languageValues = Object.keys(languages) as Language[];

type ShippingMethod = {
  id: string;
  name: string;
  duration: string;
  price: string;
};

const shippingMethods: ShippingMethod[] = [
  {
    id: "standard",
    name: "Standard",
    duration: "Delivers in 4-6 business days",
    price: "$4.99",
  },
  {
    id: "express",
    name: "Express",
    duration: "Delivers in 2-3 business days",
    price: "$9.99",
  },
  {
    id: "overnight",
    name: "Overnight",
    duration: "Delivers next business day",
    price: "$19.99",
  },
];

function renderMultiValue(values: Language[]) {
  if (values.length === 0) {
    return "Select languages…";
  }

  const first = languages[values[0]!];
  const suffix = values.length > 1 ? ` (+${values.length - 1} more)` : "";
  return first + suffix;
}

function SingleDemo() {
  return (
    <Select items={fruits} defaultValue="fuji" trigger="Select fruit" scrollArrows>
      {fruits.map((item) => (
        <Select.Item key={item.value} value={item.value}>
          {item.label}
        </Select.Item>
      ))}
    </Select>
  );
}

function SmallDemo() {
  return (
    <Select size="s" items={fruits} defaultValue="fuji" trigger="Select fruit">
      {fruits.map((item) => (
        <Select.Item key={item.value} value={item.value}>
          {item.label}
        </Select.Item>
      ))}
    </Select>
  );
}

function LongListDemo() {
  return (
    <Select items={longOptions} defaultValue="option-1" trigger="Select an option" scrollArrows>
      {longOptions.map((item) => (
        <Select.Item key={item.value} value={item.value}>
          {item.label}
        </Select.Item>
      ))}
    </Select>
  );
}

function MultiDemo() {
  return (
    <Select<Language, true>
      multiple
      defaultValue={["javascript", "typescript"]}
      renderValue={renderMultiValue}
      alignItemWithTrigger={false}
    >
      {languageValues.map((value) => (
        <Select.Item key={value} value={value}>
          {languages[value]}
        </Select.Item>
      ))}
    </Select>
  );
}

function GroupedDemo() {
  return (
    <Select<string> defaultValue="beets" trigger="Select food">
      <Select.Group>
        <Select.GroupLabel>Fruits</Select.GroupLabel>
        <Select.Item value="apple">Apple</Select.Item>
        <Select.Item value="orange">Orange</Select.Item>
      </Select.Group>
      <Select.Separator />
      <Select.Group>
        <Select.GroupLabel>Vegetables</Select.GroupLabel>
        <Select.Item value="beets">Beets</Select.Item>
        <Select.Item value="broccoli">Broccoli</Select.Item>
      </Select.Group>
    </Select>
  );
}

function ObjectValueDemo() {
  return (
    <Select<ShippingMethod>
      defaultValue={shippingMethods[0]}
      itemToStringValue={(item) => item.id}
      isItemEqualToValue={(item, value) => item.id === value.id}
      renderValue={(method: ShippingMethod) =>
        `${method.name} — ${method.duration} (${method.price})`
      }
      scrollArrows
    >
      {shippingMethods.map((method) => (
        <Select.Item key={method.id} value={method}>
          {method.name} — {method.duration} ({method.price})
        </Select.Item>
      ))}
    </Select>
  );
}

const meta = {
  title: "UI / Select",
  component: SingleDemo,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof SingleDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  render: () => <SingleDemo />,
};

export const Small: Story = {
  render: () => <SmallDemo />,
};

export const LongList: Story = {
  render: () => <LongListDemo />,
};

export const Multi: Story = {
  render: () => <MultiDemo />,
};

export const Grouped: Story = {
  render: () => <GroupedDemo />,
};

export const ObjectValues: Story = {
  render: () => <ObjectValueDemo />,
};
