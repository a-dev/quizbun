// Browser-lane setup. Importing `vitest-browser-react` for its side effect runs
// `page.extend({ render, renderHook })` and registers a `beforeEach(cleanup)`,
// so component specs can call `page.render(<Component />)` and get automatic
// unmount between tests. Without this import that injection never fires.
import "vitest-browser-react";
