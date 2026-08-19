import { beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { StorageDurability } from "./storage-durability";

const storageMocks = vi.hoisted(() => ({
  hasStoredData: vi.fn(),
  isStorageApiAvailable: vi.fn(),
  isStoragePersisted: vi.fn(),
  requestStoragePersistence: vi.fn(),
}));

vi.mock("@/shared/lib/storage", () => storageMocks);

const STORAGE_RISK_COPY = /Browsers delete stored data to free up space/;

function mediaQuery(matches = false): MediaQueryList {
  return {
    matches,
    media: "(display-mode: standalone)",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  storageMocks.hasStoredData.mockResolvedValue(false);
  storageMocks.isStorageApiAvailable.mockReturnValue(true);
  storageMocks.isStoragePersisted.mockResolvedValue(false);
  storageMocks.requestStoragePersistence.mockResolvedValue(false);
  vi.spyOn(window, "matchMedia").mockReturnValue(mediaQuery());
  Object.defineProperty(navigator, "standalone", { configurable: true, value: false });
});

describe("StorageDurability", () => {
  // Protected is the quiet state: nothing to ask, so nothing rendered at all.
  it("renders nothing when storage is already persisted", async () => {
    storageMocks.isStoragePersisted.mockResolvedValue(true);
    const screen = await page.render(<StorageDurability showWhenEmpty />);

    await vi.waitFor(() => expect(storageMocks.isStoragePersisted).toHaveBeenCalled());
    await expect.element(screen.getByRole("status")).not.toBeInTheDocument();
  });

  it("shows a warning and requests persistence only after activation", async () => {
    storageMocks.requestStoragePersistence.mockResolvedValue(true);
    const screen = await page.render(<StorageDurability showWhenEmpty />);

    await expect.element(screen.getByRole("status")).toBeInTheDocument();
    expect(storageMocks.requestStoragePersistence).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Ask browser to keep this data" }));

    expect(storageMocks.requestStoragePersistence).toHaveBeenCalledOnce();
    // A successful request quietly removes the notice.
    await expect.element(screen.getByRole("status")).not.toBeInTheDocument();
  });

  // A denial is the ordinary outcome; the click must still produce visible
  // feedback rather than looking like it did nothing.
  it("says so when the browser declines the persistence request", async () => {
    const screen = await page.render(<StorageDurability showWhenEmpty />);

    await userEvent.click(screen.getByRole("button", { name: "Ask browser to keep this data" }));

    await expect
      .element(screen.getByText(/Sorry, this browser turned that down/))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: "Ask browser to keep this data" }))
      .toBeDisabled();
  });

  it("keeps a dismissed notice hidden across renders", async () => {
    localStorage.setItem("quizbun.durability-notice-dismissed", "nothing-stored");
    const screen = await page.render(<StorageDurability showWhenEmpty />);

    await vi.waitFor(() => expect(storageMocks.hasStoredData).toHaveBeenCalled());
    await expect.element(screen.getByRole("status")).not.toBeInTheDocument();
  });

  // The Safari isolation warning only becomes true once there is data, so a
  // dismissal taken on an empty browser must not bury it.
  it("returns once something is stored, when dismissed on an empty browser", async () => {
    storageMocks.hasStoredData.mockResolvedValue(true);
    localStorage.setItem("quizbun.durability-notice-dismissed", "nothing-stored");
    const screen = await page.render(<StorageDurability showWhenEmpty />);

    await expect.element(screen.getByRole("status")).toBeInTheDocument();
  });

  it("stays hidden once dismissed with data present", async () => {
    storageMocks.hasStoredData.mockResolvedValue(true);
    localStorage.setItem("quizbun.durability-notice-dismissed", "data-stored");
    const screen = await page.render(<StorageDurability showWhenEmpty />);

    await vi.waitFor(() => expect(storageMocks.hasStoredData).toHaveBeenCalled());
    await expect.element(screen.getByRole("status")).not.toBeInTheDocument();
  });

  it("records dismissal against what is stored right now", async () => {
    storageMocks.hasStoredData.mockResolvedValue(true);
    const screen = await page.render(<StorageDurability showWhenEmpty />);

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    await expect.element(screen.getByRole("status")).not.toBeInTheDocument();
    expect(localStorage.getItem("quizbun.durability-notice-dismissed")).toBe("data-stored");
  });

  // Home mounts it without `showWhenEmpty`: a first-time visitor with nothing
  // stored gets no data-loss warning at all.
  it("renders nothing on an empty browser unless asked to", async () => {
    const screen = await page.render(<StorageDurability />);

    await vi.waitFor(() => expect(storageMocks.hasStoredData).toHaveBeenCalled());
    await expect.element(screen.getByRole("status")).not.toBeInTheDocument();
  });

  // …but a Catalog-only user with saved Progress and an empty Library does see it.
  it("renders without `showWhenEmpty` once Progress exists", async () => {
    storageMocks.hasStoredData.mockResolvedValue(true);
    const screen = await page.render(<StorageDurability />);

    await expect.element(screen.getByText(STORAGE_RISK_COPY)).toBeInTheDocument();
    await expect.element(screen.getByRole("status")).toBeInTheDocument();
  });

  it("hides the install notice in standalone display mode", async () => {
    vi.mocked(window.matchMedia).mockReturnValue(mediaQuery(true));
    const screen = await page.render(<StorageDurability showWhenEmpty />);

    await vi.waitFor(() => expect(storageMocks.requestStoragePersistence).toHaveBeenCalledOnce());
    await expect.element(screen.getByRole("status")).not.toBeInTheDocument();
  });

  // Installed is the only state where engines actually grant this, so it is
  // requested without a click — and a grant nobody asked for says nothing.
  it("requests persistence automatically when running installed, silently", async () => {
    storageMocks.requestStoragePersistence.mockResolvedValue(true);
    vi.mocked(window.matchMedia).mockReturnValue(mediaQuery(true));
    const screen = await page.render(<StorageDurability showWhenEmpty />);

    await vi.waitFor(() => expect(storageMocks.requestStoragePersistence).toHaveBeenCalledOnce());
    await expect.element(screen.getByRole("status")).not.toBeInTheDocument();
  });

  it("does not re-request persistence when already granted", async () => {
    storageMocks.isStoragePersisted.mockResolvedValue(true);
    vi.mocked(window.matchMedia).mockReturnValue(mediaQuery(true));
    await page.render(<StorageDurability showWhenEmpty />);

    await vi.waitFor(() => expect(storageMocks.isStoragePersisted).toHaveBeenCalled());
    expect(storageMocks.requestStoragePersistence).not.toHaveBeenCalled();
  });

  it("renders nothing when the Storage API is absent", async () => {
    storageMocks.isStorageApiAvailable.mockReturnValue(false);
    const screen = await page.render(<StorageDurability showWhenEmpty />);

    await expect.element(screen.getByRole("status")).not.toBeInTheDocument();
    expect(storageMocks.isStoragePersisted).not.toHaveBeenCalled();
  });

  it("captures Chromium's install prompt and activates it from the Install button", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const screen = await page.render(<StorageDurability showWhenEmpty />);
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), { prompt });

    window.dispatchEvent(event);
    await userEvent.click(screen.getByRole("button", { name: "Install Quizbun" }));

    expect(event.defaultPrevented).toBe(true);
    expect(prompt).toHaveBeenCalledOnce();
  });

  // `prompt()` is single-use and throws once spent; that must not surface as an
  // unhandled rejection.
  it("survives an install prompt that rejects", async () => {
    const prompt = vi.fn().mockRejectedValue(new Error("already used"));
    const screen = await page.render(<StorageDurability showWhenEmpty />);

    window.dispatchEvent(
      Object.assign(new Event("beforeinstallprompt", { cancelable: true }), { prompt }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Install Quizbun" }));

    expect(prompt).toHaveBeenCalledOnce();
    await expect
      .element(screen.getByRole("button", { name: "Install Quizbun" }))
      .not.toBeInTheDocument();
    await expect.element(screen.getByRole("status")).toBeInTheDocument();
  });

  it("warns iOS users about Safari and installed-app storage isolation", async () => {
    storageMocks.hasStoredData.mockResolvedValue(true);
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("iPhone");
    const screen = await page.render(<StorageDurability showWhenEmpty />);

    await expect
      .element(screen.getByText(/what you've saved in Safari won't appear there/))
      .toBeInTheDocument();
  });

  // Firefox has no install path at all, so install instructions there would be
  // simply wrong; the request button is the whole notice.
  it("omits install instructions on a browser that cannot install", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
    );
    const screen = await page.render(<StorageDurability showWhenEmpty />);

    await expect
      .element(screen.getByText("Allowing persistent storage reduces that risk.", { exact: false }))
      .toBeInTheDocument();
    await expect.element(screen.getByText(/browser's app or page menu/)).not.toBeInTheDocument();
    await expect.element(screen.getByText(/Add to Home Screen/)).not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: "Ask browser to keep this data" }))
      .toBeInTheDocument();
  });

  // Installing before saving anything only matters on WebKit, where the home-screen
  // app gets its own storage jar. A Chromium PWA shares storage with the browser.
  it("gives the install-first reason only on iOS", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("iPhone");
    const screen = await page.render(<StorageDurability showWhenEmpty />);

    await expect
      .element(screen.getByText(/installing before you save anything saves you doing it twice/))
      .toBeInTheDocument();
  });
});
