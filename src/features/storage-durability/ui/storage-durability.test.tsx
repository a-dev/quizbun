import { beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { StorageDurability } from "./storage-durability";

const storageMocks = vi.hoisted(() => ({
  hasStoredData: vi.fn<() => Promise<boolean>>(),
  isStorageApiAvailable: vi.fn<() => boolean>(),
  isStoragePersisted: vi.fn<() => Promise<boolean>>(),
  requestStoragePersistence: vi.fn<() => Promise<boolean>>(),
}));

vi.mock("@/shared/lib/storage", () => storageMocks);

const STORAGE_RISK_COPY = /Browsers may delete a site's stored data to free up space/;

function mediaQuery(matches = false): MediaQueryList {
  return {
    matches,
    media: "(display-mode: standalone)",
    onchange: null,
    addListener: vi.fn<MediaQueryList["addListener"]>(),
    removeListener: vi.fn<MediaQueryList["removeListener"]>(),
    addEventListener: vi.fn<MediaQueryList["addEventListener"]>(),
    removeEventListener: vi.fn<MediaQueryList["removeEventListener"]>(),
    dispatchEvent: vi.fn<MediaQueryList["dispatchEvent"]>(),
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

    await userEvent.click(screen.getByRole("button", { name: "ask browser to keep this data" }));

    expect(storageMocks.requestStoragePersistence).toHaveBeenCalledOnce();
    // A successful request quietly removes the notice.
    await expect.element(screen.getByRole("status")).not.toBeInTheDocument();
  });

  it("links to the installation instructions", async () => {
    const screen = await page.render(<StorageDurability showWhenEmpty />);

    await expect
      .element(screen.getByRole("link", { name: "see the instructions" }))
      .toHaveAttribute("href", "/docs/how-to-install-app/");
  });

  // A denial is the ordinary outcome; the click must still produce visible
  // feedback rather than looking like it did nothing.
  it("says so when the browser declines the persistence request", async () => {
    const screen = await page.render(<StorageDurability showWhenEmpty />);

    await userEvent.click(screen.getByRole("button", { name: "ask browser to keep this data" }));

    await expect
      .element(screen.getByText(/This browser didn't grant the request/))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: "ask browser to keep this data" }))
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
    const screen = await page.render(
      <div style={{ paddingBlockStart: "1rem" }}>
        <StorageDurability showWhenEmpty />
      </div>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Close note" }));

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
});
