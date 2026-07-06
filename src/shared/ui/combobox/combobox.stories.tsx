import { useState } from "react";

import { faker } from "@faker-js/faker";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Combobox } from "./index";
import type { ComboboxOption, ComboboxValue } from "./types";

type Story = StoryObj<typeof Combobox>;
const meta: Meta<typeof Combobox> = {
  title: "UI / Combobox",
  component: Combobox,
  tags: ["autodocs"],
};

export default meta;

const options: ComboboxOption<string>[] = Array.from({ length: 20 }, () => ({
  value: faker.string.uuid(),
  label: faker.commerce.productName(),
  disabled: faker.datatype.boolean(0.2),
}));

const taxonomyOptions: ComboboxOption<string>[] = Array.from({ length: 50 }, () => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    firstName,
    lastName,
    value: faker.string.uuid(),
    label: `${firstName} ${lastName}`,
    disabled: faker.datatype.boolean(0.2),
  };
});

export const MultipleFuzzy: Story = {
  args: {
    placeholder: "Select values",
    isClearable: true,
    disabled: false,
    options: taxonomyOptions,
  },
  render: (args) => {
    const [value, setValue] = useState<ComboboxValue<string>>(undefined);

    return (
      <div style={{ display: "grid", gap: "1rem", width: "min(100%, 32rem)" }}>
        <Combobox<string>
          placeholder={args.placeholder}
          isClearable={args.isClearable}
          disabled={args.disabled}
          options={taxonomyOptions}
          value={value}
          onChange={setValue}
        />
      </div>
    );
  },
};

export const WithDefaultValue: Story = {
  args: {
    placeholder: "Select values",
    isClearable: true,
    disabled: false,
    options,
    slice: 3,
  },
  render: (args) => {
    const [value, setValue] = useState<ComboboxValue<string>>(options.slice(0, 2));

    return (
      <div style={{ display: "grid", gap: "1rem", maxWidth: "40rem" }}>
        <Combobox<string>
          placeholder={args.placeholder}
          isClearable={args.isClearable}
          slice={args.slice}
          disabled={args.disabled}
          options={options}
          value={value}
          onChange={setValue}
        />
      </div>
    );
  },
};
