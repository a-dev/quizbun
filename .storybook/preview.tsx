import type { Decorator, Preview } from "@storybook/react-vite";
import "#styles/index.css";

import {
  applyThemePreference,
  normalizeThemePreference,
} from "@/widgets/header/lib/theme-preference";

const withTheme: Decorator = (Story, context) => {
  const themePreference = normalizeThemePreference(context.globals.theme);

  applyThemePreference(themePreference);

  return <Story />;
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: "Theme",
      defaultValue: "light",
      toolbar: {
        title: "Theme",
        icon: "contrast",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
          { value: "system", title: "System" },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
