import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { ReadAloudButton } from "./read-aloud-button";

const VOICE = {
  voiceURI: "test-voice",
  name: "Test Voice",
  lang: "en-US",
  localService: true,
  default: true,
} as SpeechSynthesisVoice;

// The real `SpeechSynthesisUtterance.voice` setter only accepts genuine
// SpeechSynthesisVoice instances (which come from getVoices() in the browser).
// Swap in a plain class so the test can assign a fake voice and read it back.
class FakeUtterance {
  lang = "";
  voice: SpeechSynthesisVoice | null = null;
  onend: ((event: Event) => unknown) | null = null;
  onerror: ((event: Event) => unknown) | null = null;
  constructor(public text: string) {}
}

// Drive the real `window.speechSynthesis` but stop its methods short of the
// device engine, so the test asserts our wiring without depending on installed
// voices or audio output.
function stubSpeech() {
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  const speak = vi.spyOn(window.speechSynthesis, "speak").mockImplementation(() => {});
  const cancel = vi.spyOn(window.speechSynthesis, "cancel").mockImplementation(() => {});
  vi.spyOn(window.speechSynthesis, "pause").mockImplementation(() => {});
  vi.spyOn(window.speechSynthesis, "resume").mockImplementation(() => {});
  return { speak, cancel };
}

describe("ReadAloudButton", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders nothing until a voice is chosen", async () => {
    stubSpeech();
    const screen = await page.render(<ReadAloudButton text="Hello" voice={null} />);
    await expect.element(screen.getByRole("button")).not.toBeInTheDocument();
  });

  it("speaks with the chosen voice when pressed", async () => {
    const { speak } = stubSpeech();
    const screen = await page.render(<ReadAloudButton text="Hello there" voice={VOICE} />);

    await userEvent.click(screen.getByRole("button", { name: "Read aloud" }));

    expect(speak).toHaveBeenCalledOnce();
    const utterance = speak.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(utterance.text).toBe("Hello there");
    expect(utterance.voice).toBe(VOICE);
    expect(utterance.lang).toBe("en-US");
  });

  it("toggles to a stop control, then cancels on a second press", async () => {
    const { cancel } = stubSpeech();
    const screen = await page.render(
      <ReadAloudButton text="Hello" voice={VOICE} label="Read explanation aloud" />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Read explanation aloud" }));
    const stopButton = screen.getByRole("button", { name: "Stop reading" });
    await expect.element(stopButton).toBeInTheDocument();

    await userEvent.click(stopButton);
    expect(cancel).toHaveBeenCalled();
    await expect
      .element(screen.getByRole("button", { name: "Read explanation aloud" }))
      .toBeInTheDocument();
  });
});
