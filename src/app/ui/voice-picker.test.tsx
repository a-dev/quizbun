import { beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";

import type { useVoicePreference } from "@/shared/lib/speech";

import { VoicePicker } from "./voice-picker";

const speechMocks = vi.hoisted(() => ({
  selectVoice: vi.fn<(voiceUri: string | null) => void>(),
  useVoicePreference: vi.fn<typeof useVoicePreference>(),
}));

vi.mock("@/shared/lib/speech", () => ({
  useVoicePreference: speechMocks.useVoicePreference,
}));

const voice = {
  default: true,
  lang: "en-US",
  localService: true,
  name: "Test Voice",
  voiceURI: "test-voice",
} as SpeechSynthesisVoice;

describe("VoicePicker", () => {
  beforeEach(() => {
    speechMocks.useVoicePreference.mockReturnValue({
      voices: [voice],
      selectedVoiceUri: null,
      selectVoice: speechMocks.selectVoice,
    });
  });

  it("names the voice combobox from its visible label", async () => {
    const screen = await page.render(<VoicePicker />);

    await expect.element(screen.getByRole("combobox", { name: "Read aloud" })).toBeInTheDocument();
  });
});
