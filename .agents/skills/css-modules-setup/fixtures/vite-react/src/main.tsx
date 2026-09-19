import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import "#styles/global.css";
import { atoms } from "#styles";
import { ReferenceButton } from "./reference-button";
import probeStyles from "./unlayered-probe.module.css";

function Fixture() {
  const [loading, setLoading] = useState(false);

  return (
    <main>
      <ReferenceButton
        className="caller-class"
        loading={loading}
        onClick={() => setLoading(true)}
        pressed={false}
        progress={0.6}
        variant="primary"
      >
        Save
      </ReferenceButton>
      <div className={`${atoms.layerProbe} ${probeStyles.layerProbe}`} data-testid="layer-probe">
        Cascade probe
      </div>
      <div className={probeStyles.composed} data-testid="composes-probe">
        Composes probe
      </div>
    </main>
  );
}

const runtime = globalThis as typeof globalThis & { __cssModulesFixtureRoot?: Root };
runtime.__cssModulesFixtureRoot ??= createRoot(document.getElementById("root")!);
runtime.__cssModulesFixtureRoot.render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
