if (
  typeof React !== "undefined" &&
  typeof ReactDOM !== "undefined" &&
  document.getElementById("root")
) {
  const h = React.createElement;
  const { useEffect, useMemo, useRef, useState } = React;

  const PRESETS = [20, 50, 100, 200, 500];
  const UNIT_OPTIONS = ["m", "cm", "mm", "ft-in"];
  const PAPER_SIZES = {
    A0: { wMm: 841, hMm: 1189 },
    A1: { wMm: 594, hMm: 841 },
    A2: { wMm: 420, hMm: 594 },
    A3: { wMm: 297, hMm: 420 },
    A4: { wMm: 210, hMm: 297 },
  };

  const PARKING_LAYOUTS = {
    parallel: { key: "parallel", spaceW: 2.2, spaceD: 6.0, aisleM: 4.0, label: "Parallel" },
    perpendicular: { key: "perpendicular", spaceW: 2.5, spaceD: 5.0, aisleM: 6.0, label: "Perpendicular (90°)" },
    angled: { key: "angled", spaceW: 2.5, spaceD: 5.0, aisleM: 4.5, label: "Angled (45°)" },
  };

  const PARKING_USAGE = {
    residential: { key: "residential", label: "Residential", mult: 1.0 },
    office: { key: "office", label: "Office / Commercial", mult: 1.05 },
    hospital: { key: "hospital", label: "Hospital", mult: 1.12 },
    mall: { key: "mall", label: "Shopping Mall", mult: 1.08 },
  };

  /** EN 17037 minimum daylight factor (%): residential-type 2%, workspaces 3%. IES (LM-83 / daylight metrics) as secondary reference in UI. */
  const DAYLIGHT_ROOM_TYPES = [
    { id: "bedroom", label: "Bedroom", enDfMin: 2 },
    { id: "living", label: "Living Room", enDfMin: 2 },
    { id: "kitchen", label: "Kitchen", enDfMin: 2 },
    { id: "office", label: "Office", enDfMin: 3 },
    { id: "classroom", label: "Classroom", enDfMin: 3 },
    { id: "hospital", label: "Hospital Room", enDfMin: 2 },
  ];

  const DAYLIGHT_FACADES = {
    north: { label: "North", sky: 1.0, pen: 1.0 },
    south: { label: "South", sky: 1.06, pen: 1.06 },
    east: { label: "East", sky: 0.93, pen: 0.96 },
    west: { label: "West", sky: 0.93, pen: 0.96 },
  };

  /** IBC 2021 indicative — max travel distance (m), no sprinkler / with sprinkler. */
  const FIRE_BUILDING_TYPES = [
    { id: "residential", label: "Residential", maxNoSprinkler: 38, maxSprinkler: 61 },
    { id: "office", label: "Office", maxNoSprinkler: 61, maxSprinkler: 91 },
    { id: "school", label: "School / Education", maxNoSprinkler: 46, maxSprinkler: 61 },
    { id: "hospital", label: "Hospital", maxNoSprinkler: 46, maxSprinkler: 61 },
    { id: "mall", label: "Shopping Mall", maxNoSprinkler: 61, maxSprinkler: 91 },
    { id: "industrial", label: "Industrial", maxNoSprinkler: 46, maxSprinkler: 76 },
  ];

  const FIRE_AREA_TWO_EXIT_M2 = 185;
  const FIRE_EXIT_WIDTH_M = 0.91;

  const U_VALUE_RSI = 0.13;
  const U_VALUE_RSO = 0.04;

  const U_VALUE_MATERIALS = [
    { id: "concrete", label: "Concrete", lambda: 1.75, fixedR: null },
    { id: "brick", label: "Brick", lambda: 0.77, fixedR: null },
    { id: "eps", label: "EPS Insulation", lambda: 0.036, fixedR: null },
    { id: "xps", label: "XPS Insulation", lambda: 0.03, fixedR: null },
    { id: "mineral", label: "Mineral Wool", lambda: 0.034, fixedR: null },
    { id: "plasterboard", label: "Plasterboard", lambda: 0.25, fixedR: null },
    { id: "timber", label: "Timber", lambda: 0.13, fixedR: null },
    { id: "glass", label: "Glass", lambda: 1.0, fixedR: null },
    { id: "airgap", label: "Air Gap", lambda: null, fixedR: 0.18 },
    { id: "render", label: "Render/Plaster", lambda: 0.57, fixedR: null },
  ];

  const U_VALUE_CLIMATES = [
    { id: "A", label: "Very Cold (Zone A)" },
    { id: "B", label: "Cold (Zone B)" },
    { id: "C", label: "Temperate (Zone C)" },
    { id: "D", label: "Warm (Zone D)" },
  ];

  const U_VALUE_CONSTRUCTION_TYPES = [
    { id: "external_wall", label: "External Wall" },
    { id: "roof", label: "Roof" },
    { id: "floor", label: "Floor" },
    { id: "window", label: "Window/Glazing" },
  ];

  /** Indicative max U (W/m²K) — ASHRAE 90.1 / EU EPBD style; window row typical EPBD glazing */
  const U_VALUE_THRESHOLDS = {
    external_wall: { A: 0.2, B: 0.25, C: 0.35, D: 0.45 },
    roof: { A: 0.15, B: 0.2, C: 0.25, D: 0.35 },
    floor: { A: 0.25, B: 0.3, C: 0.4, D: 0.5 },
    window: { A: 1.0, B: 1.2, C: 1.5, D: 1.8 },
  };

  const U_LAYER_SVG_COLORS = {
    concrete: "#94a3b8",
    brick: "#c2410c",
    eps: "#fcd34d",
    xps: "#fde68a",
    mineral: "#a5b4fc",
    plasterboard: "#e7e5e4",
    timber: "#d6a463",
    glass: "#7dd3fc",
    airgap: "#e7e5e4",
    render: "#d6d3d1",
  };

  const ROOM_PROGRAM_TYPES = [
    { id: "bedroom", name: "Bedroom", minAreaM2: 12, minDimM: 3.0 },
    { id: "living", name: "Living Room", minAreaM2: 20, minDimM: 3.3 },
    { id: "kitchen", name: "Kitchen", minAreaM2: 7, minDimM: 2.4 },
    { id: "bathroom", name: "Bathroom", minAreaM2: 4, minDimM: 1.8 },
    { id: "wc", name: "WC", minAreaM2: 1.5, minDimM: 1.0 },
    { id: "corridor", name: "Corridor", minAreaM2: 1.2, minDimM: 1.0 },
    { id: "studio", name: "Studio", minAreaM2: 25, minDimM: 4.5 },
    { id: "office", name: "Office", minAreaM2: 10, minDimM: 2.7 },
    { id: "lobby", name: "Lobby", minAreaM2: 15, minDimM: 3.0 },
    { id: "storage", name: "Storage", minAreaM2: 4, minDimM: 1.8 },
  ];

  const FT_TO_M = 0.3048;
  const IN_TO_M = 0.0254;
  const FT2_TO_M2 = FT_TO_M * FT_TO_M;
  const FT3_TO_M3 = FT2_TO_M2 * FT_TO_M;

  function classNames(...xs) {
    return xs.filter(Boolean).join(" ");
  }

  function parseFtInToMeters(s) {
    if (s == null) return null;
    const str = String(s).trim();
    if (!str) return null;

    // Accept: 5-10, 5 10, 5'10", 5:10
    // Note: the dash in "5-10" is a separator (inches), not a negative sign.
    const cleaned = str.replace(/["']/g, " ").replace(/[,:]/g, " ");
    const match = cleaned.match(
      /(-?\d+(?:\.\d+)?)(?:\s*[-\s]\s*(\d+(?:\.\d+)?))?/
    );
    if (!match) return null;

    const feet = Number(match[1]);
    const inches = match[2] != null ? Math.abs(Number(match[2])) : 0;
    if (!Number.isFinite(feet) || !Number.isFinite(inches)) return null;

    const totalInches = feet * 12 + inches;
    return totalInches * IN_TO_M;
  }

  function parseLengthToMeters(display, unit) {
    const str = display == null ? "" : String(display).trim();
    if (!str) return null;
    const n = Number(str);
    if (unit === "ft-in") return parseFtInToMeters(str);
    if (!Number.isFinite(n)) return null;
    if (unit === "m") return n;
    if (unit === "cm") return n / 100;
    if (unit === "mm") return n / 1000;
    return null;
  }

  function parseAreaToM2(display, unit) {
    const str = display == null ? "" : String(display).trim();
    if (!str) return null;
    const n = Number(str);
    if (!Number.isFinite(n)) return null;
    if (unit === "m") return n;
    if (unit === "cm") return n / 10000;
    if (unit === "mm") return n / 1_000_000;
    if (unit === "ft-in") return n * FT2_TO_M2; // ft² -> m²
    return null;
  }

  function parseVolumeFromDimsToM3(wM, hM, dM) {
    if (wM == null || hM == null || dM == null) return null;
    return wM * hM * dM;
  }

  function formatSmartNumber(n) {
    if (n == null || !Number.isFinite(n)) return "—";
    const rounded = Math.round(n * 10) / 10;
    return rounded.toFixed(1);
  }

  const STRUCTURA_TAGLINE = "Professional tools for architects and engineers";

  function AnimatedNumberText({ valueText, className }) {
    const [display, setDisplay] = useState(valueText);
    useEffect(() => {
      if (!valueText || valueText === "—") {
        setDisplay(valueText);
        return;
      }
      if (/[×x]/.test(String(valueText))) {
        setDisplay(valueText);
        return;
      }
      const num = parseFloat(String(valueText).replace(/[^\d.\-eE]/g, ""));
      if (!Number.isFinite(num)) {
        setDisplay(valueText);
        return;
      }
      let raf = 0;
      const start = performance.now();
      const dur = 300;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - (1 - t) * (1 - t);
        setDisplay(formatSmartNumber(num * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
        else setDisplay(formatSmartNumber(num));
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [valueText]);
    return h("div", { className }, display);
  }

  function ThemeToggleButton({ theme, setTheme }) {
    return h(
      "button",
      {
        type: "button",
        onClick: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
        className:
          "w-10 h-10 rounded-full border border-[var(--st-border)] bg-[var(--st-bg)] flex items-center justify-center hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150 text-[var(--st-fg)]",
        "aria-label": "Toggle dark mode",
      },
      theme === "dark"
        ? h(
            "svg",
            { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
            h("path", {
              d: "M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z",
              stroke: "currentColor",
              strokeWidth: "2",
              strokeLinecap: "round",
              strokeLinejoin: "round",
            })
          )
        : h(
            "svg",
            { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
            h("path", { d: "M12 2v2", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }),
            h("path", { d: "M12 20v2", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }),
            h("path", { d: "M4.93 4.93l1.41 1.41", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }),
            h("path", { d: "M17.66 17.66l1.41 1.41", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }),
            h("path", { d: "M2 12h2", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }),
            h("path", { d: "M20 12h2", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }),
            h("path", { d: "M4.93 19.07l1.41-1.41", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }),
            h("path", { d: "M17.66 6.34l1.41-1.41", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }),
            h("circle", { cx: "12", cy: "12", r: "4", stroke: "currentColor", strokeWidth: "2" })
          )
    );
  }

  function LandingToolIcon({ toolId, category }) {
    const iconColorClass =
      category === "compliance"
        ? "text-[#DC2626]"
        : category === "environment"
          ? "text-[#16A34A]"
          : "text-[#2563EB]";
    const c = {
      width: 28,
      height: 28,
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      className: iconColorClass,
    };
    const stroke = { stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" };
    switch (toolId) {
      case "scale":
        return h("svg", c, h("path", { ...stroke, d: "M4 12h16M12 4v16M6 6l12 12" }));
      case "stair":
        return h("svg", c, h("path", { ...stroke, d: "M4 20h4v-4h4v-4h4V8h4" }));
      case "ramp":
        return h("svg", c, h("path", { ...stroke, d: "M4 16L20 8M4 20h16" }));
      case "span":
        return h("svg", c, h("path", { ...stroke, d: "M4 18h16M8 18V10M16 18V10" }));
      case "siteCoverage":
        return h("svg", c, h("rect", { ...stroke, x: "3", y: "5", width: "18", height: "14", rx: "1" }), h("rect", { ...stroke, x: "8", y: "9", width: "8", height: "6", rx: "0.5" }));
      case "parking":
        return h("svg", c, h("path", { ...stroke, d: "M6 18V8h6l2 4H6M6 14h8" }));
      case "room":
        return h("svg", c, h("rect", { ...stroke, x: "4", y: "4", width: "7", height: "7" }), h("rect", { ...stroke, x: "13", y: "4", width: "7", height: "7" }), h("rect", { ...stroke, x: "4", y: "13", width: "7", height: "7" }));
      case "fireEscape":
        return h("svg", c, h("path", { ...stroke, d: "M12 3v18M8 7h8M8 12h8M8 17h8" }));
      case "daylight":
        return h("svg", c, h("circle", { ...stroke, cx: "12", cy: "12", r: "4" }), h("path", { ...stroke, d: "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41" }));
      case "uValue":
        return h("svg", c, h("path", { ...stroke, d: "M4 8h16v8H4zM8 8V6M12 8V5M16 8V6" }));
      default:
        return h("svg", c, h("circle", { ...stroke, cx: "12", cy: "12", r: "8" }));
    }
  }

  function formatUValue(n) {
    if (n == null || !Number.isFinite(n)) return "—";
    return (Math.round(n * 100) / 100).toFixed(2);
  }

  function formatFtInFromMeters(meters) {
    if (meters == null || !Number.isFinite(meters)) return "—";
    const totalInches = Math.round(meters / IN_TO_M);
    const sign = totalInches < 0 ? -1 : 1;
    const absIn = Math.abs(totalInches);
    const feet = Math.floor(absIn / 12) * sign;
    const inches = absIn % 12;
    return `${feet}-${inches}`; // ft-in as "feet-inches"
  }

  function metersToLengthDisplay(meters, unit) {
    if (meters == null || !Number.isFinite(meters)) return "";
    if (unit === "m") return formatSmartNumber(meters);
    if (unit === "cm") return formatSmartNumber(meters * 100);
    if (unit === "mm") return formatSmartNumber(meters * 1000);
    if (unit === "ft-in") return formatFtInFromMeters(meters);
    return "";
  }

  function meters2ToAreaDisplay(m2, unit) {
    if (m2 == null || !Number.isFinite(m2)) return "";
    if (unit === "m") return formatSmartNumber(m2);
    if (unit === "cm") return formatSmartNumber(m2 * 10000);
    if (unit === "mm") return formatSmartNumber(m2 * 1_000_000);
    if (unit === "ft-in") return formatSmartNumber(m2 / FT2_TO_M2); // m² -> ft²
    return "";
  }

  function m3ToVolumeDisplay(m3, unit) {
    if (m3 == null || !Number.isFinite(m3)) return "";
    if (unit === "m") return formatSmartNumber(m3);
    if (unit === "cm") return formatSmartNumber(m3 * 1_000_000);
    if (unit === "mm") return formatSmartNumber(m3 * 1_000_000_000);
    if (unit === "ft-in") return formatSmartNumber(m3 / FT3_TO_M3); // m³ -> ft³
    return "";
  }

  function unitLabel(unit) {
    if (unit === "ft-in") return "ft-in";
    return unit;
  }

  function areaUnitLabel(unit) {
    if (unit === "ft-in") return "ft²";
    if (unit === "m") return "m²";
    if (unit === "cm") return "cm²";
    if (unit === "mm") return "mm²";
    return "m²";
  }

  function volumeUnitLabel(unit) {
    if (unit === "ft-in") return "ft³";
    if (unit === "m") return "m³";
    if (unit === "cm") return "cm³";
    if (unit === "mm") return "mm³";
    return "m³";
  }

  function Card({ title, hint, children, right, tone }) {
    const cardTone =
      tone === "results"
        ? "bg-[var(--st-bg)] border-[var(--st-border)]"
        : "bg-[var(--st-bg)] border-[var(--st-border)]";
    return h(
      "section",
      {
        className: `border rounded-3xl p-6 text-[var(--st-fg)] ${cardTone}`,
      },
      [
        title
          ? h("div", { key: "head", className: "flex items-start justify-between gap-3 mb-4" }, [
              h("div", { key: "th" }, [
                h("div", { key: "ey", className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--st-muted)]" }, title),
                hint
                  ? h(
                      "div",
                      { key: "hi", className: "mt-1 text-xs text-[var(--st-muted)] font-semibold" },
                      hint
                    )
                  : null,
              ]),
              right ? right : null,
            ])
          : null,
        h("div", { key: "body" }, children),
      ].filter(Boolean)
    );
  }

  function SectionTitle({ label, hint }) {
    return h("div", { className: "mb-4" }, [
      h("div", { className: "text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--st-muted)]" }, label),
      hint
        ? h("div", { className: "mt-1.5 text-xs text-[var(--st-muted)] font-semibold leading-relaxed" }, hint)
        : null,
    ]);
  }

  function Field({ label, children }) {
    return h("label", { className: "block" }, [
      h("div", { className: "text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--st-muted)] mb-2.5" }, label),
      children,
    ]);
  }

  function InputBase(props) {
    const { value, onChange, placeholder, type, step, min, disabled } = props;
    const isText = type === "text";
    return h("input", {
      value: value,
      onChange: (e) => onChange(e.target.value),
      placeholder: placeholder,
      type: isText ? "text" : "number",
      step: step,
      min: min,
      disabled: !!disabled,
      className: classNames(
        "w-full h-[52px] rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 text-[var(--st-fg)] placeholder:text-[var(--st-muted)] focus:outline-none focus:ring-0 focus:border-[var(--st-accent)] transition-colors duration-200",
        disabled ? "opacity-55 cursor-not-allowed" : ""
      ),
    });
  }

  function ValueButton({ active, onClick, children }) {
    return h(
      "button",
      {
        type: "button",
        onClick,
        className: classNames(
          "h-10 px-3 rounded-full border text-xs font-extrabold tracking-[.16em] uppercase transition-colors duration-150",
          active
            ? "bg-[var(--st-accent)] border-[var(--st-accent)] text-white"
            : "bg-[var(--st-bg)] border-[var(--st-border)] text-[var(--st-fg)] hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))]"
        ),
      },
      children
    );
  }

  function ChipButton({ label, onClick }) {
    return h(
      "button",
      {
        type: "button",
        onClick,
        className:
          "h-9 px-3 rounded-full border border-[var(--st-border)] bg-[var(--st-bg)] hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] text-xs font-bold text-[var(--st-fg)] transition-colors duration-150",
      },
      label
    );
  }

  function ValueBlock({ label, valueText, unitText, big, children }) {
    return h("div", { className: "border border-[var(--st-border)] rounded-3xl bg-[var(--st-bg)]" }, [
      h("div", { className: "p-6" }, [
        h("div", { className: "text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--st-muted)] mb-4" }, label),
        h(
          "div",
          { className: classNames("flex items-baseline gap-3 flex-wrap", big ? "pt-1" : "") },
          [
            h(AnimatedNumberText, {
              valueText: valueText || "—",
              className: classNames(
                "font-black tracking-tight text-[var(--st-fg)] leading-none tabular-nums",
                big ? "text-7xl md:text-8xl" : "text-4xl"
              ),
            }),
            unitText
              ? h(
                  "div",
                  { className: classNames("text-[var(--st-muted)] font-extrabold tracking-[.22em] uppercase", big ? "text-xs" : "text-[11px]") },
                  unitText
                )
              : null,
          ].filter(Boolean)
        ),
        children
          ? h("div", { className: "mt-4" }, children)
          : null,
      ]),
    ]);
  }

  function formatDimsText(valueText, unit) {
    if (!valueText) return "—";
    return valueText;
  }

  function App() {
    const TOOL_ITEMS = [
      {
        id: "scale",
        label: "Scale Converter",
        description: "Scale, reverse, and paper fit calculations",
        intro: "Convert real dimensions into model-scale measurements for study models and design workflow.",
      },
      {
        id: "stair",
        label: "Stair Calculator",
        description: "Step count and stair proportion helper",
        intro: "Estimate step count, riser height, and run length for proportional stair design.",
      },
      {
        id: "ramp",
        label: "Ramp Calculator",
        description: "Slope and ramp-length compliance guidance",
        intro: "Relate total rise to slope and ramp length for accessibility-oriented planning.",
      },
      {
        id: "span",
        label: "Column & Beam Span Calculator",
        description: "Structural span and slab depth estimator",
        intro: "Estimate member depth, span-to-depth ratio, and indicative column or profile sizes from span and load assumptions.",
      },
      {
        id: "siteCoverage",
        label: "Site Coverage Calculator",
        description: "Plot ratio, coverage and floor area calculator",
        intro: "Relate plot area, SCR, FAR, and storey count to footprint, total GFA, open space, and simple compliance checks.",
      },
      {
        id: "parking",
        label: "Parking Calculator",
        description: "Vehicle capacity and layout estimator",
        intro: "Estimate stall counts, aisle widths, and layout efficiency from total parking area and typical module dimensions.",
      },
      {
        id: "room",
        label: "Room Program",
        description: "Room schedule and area program builder",
        intro: "Build a room schedule from typologies, compare guideline minimums to your areas, and export CSV or PDF.",
      },
      {
        id: "fireEscape",
        label: "Fire Escape Calculator",
        description: "Exit distance and evacuation compliance",
        intro: "Compare travel distance and exit counts to IBC 2021 indicative limits for common occupancies.",
      },
      {
        id: "daylight",
        label: "Daylight Calculator",
        description: "EN 17037 & IES daylight compliance",
        intro: "Assess indicative daylight factor against EN 17037; IES daylight metrics as secondary reference.",
      },
      {
        id: "uValue",
        label: "Wall U-Value Calculator",
        description: "Thermal transmittance and insulation checker",
        intro: "Build layer stacks, compute U-value from resistances, and check indicative ASHRAE 90.1 / EU EPBD limits by climate.",
      },
    ];

    const TOOL_GROUPS = [
      {
        id: "geometry",
        label: "Geometry",
        toolIds: ["scale", "stair", "ramp", "span", "siteCoverage", "parking", "room"],
      },
      { id: "compliance", label: "Compliance", toolIds: ["fireEscape"] },
      { id: "environment", label: "Environment", toolIds: ["daylight", "uValue"] },
    ];

    const TOOL_PATHS = {
      landing: "/",
      scale: "/scale-converter",
      stair: "/stair-calculator",
      ramp: "/ramp-calculator",
      span: "/span-calculator",
      room: "/room-program",
      parking: "/parking-calculator",
      daylight: "/daylight-calculator",
      fireEscape: "/fire-escape-calculator",
      uValue: "/u-value-calculator",
      siteCoverage: "/site-coverage-calculator",
    };

    function pathToTool(pathname) {
      const p = String(pathname || "").replace(/\/$/, "") || "/";
      if (p === "/") return "landing";
      if (p === "/scale-converter") return "scale";
      if (p === "/span-calculator") return "span";
      if (p === "/stair-calculator") return "stair";
      if (p === "/ramp-calculator") return "ramp";
      if (p === "/room-program") return "room";
      if (p === "/parking-calculator") return "parking";
      if (p === "/daylight-calculator") return "daylight";
      if (p === "/fire-escape-calculator") return "fireEscape";
      if (p === "/u-value-calculator") return "uValue";
      if (p === "/site-coverage-calculator") return "siteCoverage";
      return "landing";
    }

    const [activeTool, setActiveTool] = useState(() => pathToTool(typeof window !== "undefined" ? window.location.pathname : "/"));
    const [tab, setTab] = useState("convert"); // convert | reverse | paper
    const [denom, setDenom] = useState(50);
    const [unit, setUnit] = useState("m");
    const [customDenom, setCustomDenom] = useState("50");
    const [paperSize, setPaperSize] = useState("A3");

    const getInitialTheme = () => {
      try {
        const saved = localStorage.getItem("structura-theme");
        if (saved === "light" || saved === "dark") return saved;
      } catch {
        // ignore
      }
      try {
        const legacy = localStorage.getItem("arch-theme");
        if (legacy === "light" || legacy === "dark") return legacy;
      } catch {
        // ignore
      }
      try {
        return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      } catch {
        return "light";
      }
    };

    const [theme, setTheme] = useState(getInitialTheme);

    const [pdfModalOpen, setPdfModalOpen] = useState(false);
    const [pdfProjectName, setPdfProjectName] = useState("");

    // Convert (real -> model)
    const [realLen, setRealLen] = useState("3");
    const [realArea, setRealArea] = useState("");
    const [realW, setRealW] = useState("");
    const [realH, setRealH] = useState("");
    const [realD, setRealD] = useState("");

    // Reverse (model -> real)
    const [modelLen, setModelLen] = useState("");
    const [modelArea, setModelArea] = useState("");
    const [modelW, setModelW] = useState("");
    const [modelH, setModelH] = useState("");
    const [modelD, setModelD] = useState("");

    // Stair Calculator
    const [stairTotalHeightM, setStairTotalHeightM] = useState("3.0");
    const [stairDesiredRiserCm, setStairDesiredRiserCm] = useState("17");

    // Ramp Calculator
    const [rampTotalHeightM, setRampTotalHeightM] = useState("0.9");
    const [rampDesiredSlopePct, setRampDesiredSlopePct] = useState("6");
    const [rampLengthM, setRampLengthM] = useState("");
    const [rampInputMode, setRampInputMode] = useState("slope"); // slope | length

    // Column & Beam Span Calculator
    const [spanLengthM, setSpanLengthM] = useState("6");
    const [spanSystem, setSpanSystem] = useState("rc_flat"); // rc_flat | rc_beam | steel | timber
    const [spanLoad, setSpanLoad] = useState("medium"); // light | medium | heavy

    const [roomProgramTypeId, setRoomProgramTypeId] = useState("bedroom");
    const [roomProgramAreaStr, setRoomProgramAreaStr] = useState("12.0");
    const [roomProgramRows, setRoomProgramRows] = useState([]);

    const [parkingAreaM2, setParkingAreaM2] = useState("1000");
    const [parkingLayout, setParkingLayout] = useState("perpendicular");
    const [parkingUsage, setParkingUsage] = useState("office");

    const [daylightRoomType, setDaylightRoomType] = useState("living");
    const [daylightFloorM2, setDaylightFloorM2] = useState("20");
    const [daylightWindowM2, setDaylightWindowM2] = useState("3");
    const [daylightDepthM, setDaylightDepthM] = useState("5");
    const [daylightFacade, setDaylightFacade] = useState("south");

    const [fireBuildingType, setFireBuildingType] = useState("office");
    const [fireFloorM2, setFireFloorM2] = useState("200");
    const [fireNumExits, setFireNumExits] = useState("2");
    const [fireTravelM, setFireTravelM] = useState("45");
    const [fireFloors, setFireFloors] = useState("1");
    const [fireSprinkler, setFireSprinkler] = useState(true);

    const [uClimateZone, setUClimateZone] = useState("C");
    const [uConstructionType, setUConstructionType] = useState("external_wall");
    const [uLayers, setULayers] = useState(() => [
      { uid: "u_layer_0", materialId: "concrete", thicknessMm: "100" },
    ]);

    const [sitePlotM2, setSitePlotM2] = useState("1000");
    const [siteScrStr, setSiteScrStr] = useState("0.4");
    const [siteFarStr, setSiteFarStr] = useState("1.2");
    const [siteFloorsStr, setSiteFloorsStr] = useState("3");
    const [siteBasement, setSiteBasement] = useState(false);

    const [status, setStatus] = useState({ state: "idle", text: "Ready" });
    const statusState = status.state;

    const [history, setHistory] = useState([]);
    const calcKeyRef = useRef("");
    const lastAddedRef = useRef(null);

    const activeToolMeta = useMemo(() => {
      if (activeTool === "landing") {
        return { id: "landing", label: "Structura", description: STRUCTURA_TAGLINE, intro: STRUCTURA_TAGLINE };
      }
      return TOOL_ITEMS.find((t) => t.id === activeTool) ?? TOOL_ITEMS[0];
    }, [activeTool]);

    useEffect(() => {
      if (activeTool === "landing") {
        document.title = "Structura — Professional tools for architects and engineers";
      } else {
        document.title = `${activeToolMeta.label} — Structura`;
      }
    }, [activeTool, activeToolMeta.label]);

    const roomProgramTotal = useMemo(() => {
      const s = roomProgramRows.reduce((acc, r) => acc + r.userAreaM2, 0);
      return Math.round(s * 10) / 10;
    }, [roomProgramRows]);

    useEffect(() => {
      const t = ROOM_PROGRAM_TYPES.find((r) => r.id === roomProgramTypeId);
      if (t) setRoomProgramAreaStr(formatSmartNumber(t.minAreaM2));
    }, [roomProgramTypeId]);

    function navigateHome() {
      setActiveTool("landing");
      try {
        if (window.location.pathname !== "/") {
          window.history.pushState({ tool: "landing" }, "", "/");
        }
      } catch {
        // ignore
      }
    }

    function navigateToTool(toolId) {
      setActiveTool(toolId);
      const path = TOOL_PATHS[toolId] ?? "/scale-converter";
      try {
        if (window.location.pathname !== path) {
          window.history.pushState({ tool: toolId }, "", path);
        }
      } catch {
        // ignore
      }
    }

    useEffect(() => {
      function onPopState() {
        setActiveTool(pathToTool(window.location.pathname));
      }
      window.addEventListener("popstate", onPopState);
      return () => window.removeEventListener("popstate", onPopState);
    }, []);

    function applyTheme(nextTheme) {
      const isDark = nextTheme === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      document.body.classList.add("theme-transition");
      try {
        localStorage.setItem("structura-theme", nextTheme);
      } catch {
        // ignore
      }
    }

    useEffect(() => {
      applyTheme(theme);
    }, [theme]);

    // Unit conversion when unit changes (reformat existing inputs)
    const prevUnitRef = useRef(unit);
    const suppressUnitConvertRef = useRef(false);
    useEffect(() => {
      const oldUnit = prevUnitRef.current;
      if (oldUnit === unit) return;

      if (suppressUnitConvertRef.current) {
        suppressUnitConvertRef.current = false;
        prevUnitRef.current = unit;
        return;
      }

      // Convert only if we can parse current inputs
      const convLenM = parseLengthToMeters(realLen, oldUnit);
      const convAreaM2 = parseAreaToM2(realArea, oldUnit);
      const convWM = parseLengthToMeters(realW, oldUnit);
      const convHM = parseLengthToMeters(realH, oldUnit);
      const convDM = parseLengthToMeters(realD, oldUnit);

      const revLenM = parseLengthToMeters(modelLen, oldUnit);
      const revAreaM2 = parseAreaToM2(modelArea, oldUnit);
      const revWM = parseLengthToMeters(modelW, oldUnit);
      const revHM = parseLengthToMeters(modelH, oldUnit);
      const revDM = parseLengthToMeters(modelD, oldUnit);

      setRealLen(convLenM == null ? "" : metersToLengthDisplay(convLenM, unit));
      setRealArea(convAreaM2 == null ? "" : meters2ToAreaDisplay(convAreaM2, unit));
      setRealW(convWM == null ? "" : metersToLengthDisplay(convWM, unit));
      setRealH(convHM == null ? "" : metersToLengthDisplay(convHM, unit));
      setRealD(convDM == null ? "" : metersToLengthDisplay(convDM, unit));

      setModelLen(revLenM == null ? "" : metersToLengthDisplay(revLenM, unit));
      setModelArea(revAreaM2 == null ? "" : meters2ToAreaDisplay(revAreaM2, unit));
      setModelW(revWM == null ? "" : metersToLengthDisplay(revWM, unit));
      setModelH(revHM == null ? "" : metersToLengthDisplay(revHM, unit));
      setModelD(revDM == null ? "" : metersToLengthDisplay(revDM, unit));

      prevUnitRef.current = unit;
    }, [unit]); // eslint-disable-line react-hooks/exhaustive-deps

    const denomSafe = Number.isFinite(Number(denom)) && Number(denom) > 0 ? Number(denom) : 50;

    // Convert computations
    const realLenM = useMemo(() => parseLengthToMeters(realLen, unit), [realLen, unit]);
    const realAreaM2 = useMemo(() => parseAreaToM2(realArea, unit), [realArea, unit]);
    const realWM = useMemo(() => parseLengthToMeters(realW, unit), [realW, unit]);
    const realHM = useMemo(() => parseLengthToMeters(realH, unit), [realH, unit]);
    const realDM = useMemo(() => parseLengthToMeters(realD, unit), [realD, unit]);

    const convertScaledLenM = realLenM == null ? null : realLenM / denomSafe;
    const convertScaledAreaM2 =
      realAreaM2 == null ? null : realAreaM2 / (denomSafe * denomSafe);
    const convertScaledWM = realWM == null ? null : realWM / denomSafe;
    const convertScaledHM = realHM == null ? null : realHM / denomSafe;
    const convertScaledDM = realDM == null ? null : realDM / denomSafe;

    const convertVolumeM3 = useMemo(
      () => parseVolumeFromDimsToM3(realWM, realHM, realDM),
      [realWM, realHM, realDM]
    );
    const convertScaledVolumeM3 =
      convertVolumeM3 == null ? null : convertVolumeM3 / (denomSafe ** 3);

    // Reverse computations
    const modelLenM = useMemo(() => parseLengthToMeters(modelLen, unit), [modelLen, unit]);
    const modelAreaM2 = useMemo(() => parseAreaToM2(modelArea, unit), [modelArea, unit]);
    const modelWM = useMemo(() => parseLengthToMeters(modelW, unit), [modelW, unit]);
    const modelHM = useMemo(() => parseLengthToMeters(modelH, unit), [modelH, unit]);
    const modelDM = useMemo(() => parseLengthToMeters(modelD, unit), [modelD, unit]);

    const reverseRealLenM = modelLenM == null ? null : modelLenM * denomSafe;
    const reverseRealAreaM2 =
      modelAreaM2 == null ? null : modelAreaM2 * denomSafe * denomSafe;
    const reverseRealWM = modelWM == null ? null : modelWM * denomSafe;
    const reverseRealHM = modelHM == null ? null : modelHM * denomSafe;
    const reverseRealDM = modelDM == null ? null : modelDM * denomSafe;

    const reverseVolumeM3 = useMemo(
      () => parseVolumeFromDimsToM3(modelWM, modelHM, modelDM),
      [modelWM, modelHM, modelDM]
    );
    const reverseRealVolumeM3 =
      reverseVolumeM3 == null ? null : reverseVolumeM3 * (denomSafe ** 3);

    // Paper computations
    const paperAreaM2 = useMemo(() => {
      const p = PAPER_SIZES[paperSize];
      if (!p) return null;
      const wM = p.wMm / 1000;
      const hM = p.hMm / 1000;
      return wM * hM;
    }, [paperSize]);

    const paperRealAreaM2 = useMemo(() => {
      if (paperAreaM2 == null) return null;
      return paperAreaM2 * (denomSafe ** 2);
    }, [paperAreaM2, denomSafe]);

    const stairResult = useMemo(() => {
      const hM = Number(stairTotalHeightM);
      const desiredRiserCm = Number(stairDesiredRiserCm);
      if (!Number.isFinite(hM) || !Number.isFinite(desiredRiserCm)) return null;
      if (hM <= 0 || desiredRiserCm <= 0) return null;

      const totalHeightCm = hM * 100;
      const steps = Math.max(1, Math.round(totalHeightCm / desiredRiserCm));
      const actualRiserCm = totalHeightCm / steps;
      const suggestedTreadCm = 63 - 2 * actualRiserCm; // 2R + T ≈ 63 cm
      const totalRunCm = Math.max(0, steps - 1) * suggestedTreadCm;
      const totalRunM = totalRunCm / 100;

      return {
        steps,
        actualRiserCm,
        suggestedTreadCm,
        totalRunM,
      };
    }, [stairTotalHeightM, stairDesiredRiserCm]);

    const rampResult = useMemo(() => {
      const hM = Number(rampTotalHeightM);
      const slopePctInput = Number(rampDesiredSlopePct);
      const lengthInputM = Number(rampLengthM);

      if (!Number.isFinite(hM) || hM <= 0) return null;

      const hasSlope = Number.isFinite(slopePctInput) && slopePctInput > 0;
      const hasLength = Number.isFinite(lengthInputM) && lengthInputM > 0;

      let slopePct = null;
      let lengthM = null;

      if (rampInputMode === "length") {
        if (!hasLength) return null;
        lengthM = lengthInputM;
        slopePct = (hM / lengthM) * 100;
      } else if (rampInputMode === "slope") {
        if (!hasSlope) return null;
        slopePct = slopePctInput;
        lengthM = hM / (slopePct / 100);
      } else {
        return null;
      }

      if (!Number.isFinite(slopePct) || !Number.isFinite(lengthM) || lengthM <= 0) return null;

      let status = "Acceptable";
      let statusTone = "mid"; // low | mid | high (monochrome emphasis)
      if (slopePct <= 5) {
        status = "Very comfortable";
        statusTone = "low";
      } else if (slopePct > 8) {
        status = "Too steep";
        statusTone = "high";
      }

      return {
        slopePct,
        lengthM,
        heightM: hM,
        status,
        statusTone,
      };
    }, [rampTotalHeightM, rampDesiredSlopePct, rampLengthM, rampInputMode]);

    function steelProfileSuggestion(span) {
      if (span < 4) return "IPE 200 (indicative)";
      if (span < 6) return "IPE 270 (indicative)";
      if (span < 9) return "IPE 360 (indicative)";
      if (span < 12) return "IPE 450 (indicative)";
      return "Heavy rolled / plated section — consult structural engineer";
    }

    const spanResult = useMemo(() => {
      const span = Number(spanLengthM);
      if (!Number.isFinite(span) || span <= 0) return null;

      let divisor;
      if (spanSystem === "rc_flat") {
        if (spanLoad === "light") divisor = 30;
        else if (spanLoad === "medium") divisor = 28;
        else divisor = 25;
      } else if (spanSystem === "rc_beam") {
        if (spanLoad === "light") divisor = 20;
        else if (spanLoad === "medium") divisor = 18;
        else divisor = 15;
      } else if (spanSystem === "steel") {
        divisor = 20;
      } else {
        divisor = 15;
      }

      const depthM = span / divisor;
      const depthCm = Math.round(depthM * 100 * 10) / 10;
      const ldRatio = divisor;

      let memberSuggestion = "";
      if (spanSystem === "rc_flat" || spanSystem === "rc_beam") {
        const side = Math.round(Math.max(30, Math.min(90, 32 + span * 4.5)) * 10) / 10;
        memberSuggestion = `${formatSmartNumber(side)} × ${formatSmartNumber(side)} cm (RC column, indicative)`;
      } else if (spanSystem === "steel") {
        memberSuggestion = steelProfileSuggestion(span);
      } else {
        const w = Math.round(Math.max(20, Math.min(60, span * 8)) * 10) / 10;
        memberSuggestion = `Timber beam width often ≥ ${formatSmartNumber(w)} cm — verify species/grade`;
      }

      let spanWarnLevel = "green";
      let spanWarnText = null;
      if (spanSystem === "rc_flat") {
        if (span > 12) {
          spanWarnLevel = "red";
          spanWarnText = "Span exceeds typical RC flat slab range (>12 m).";
        } else if (span > 10) {
          spanWarnLevel = "yellow";
          spanWarnText = "Approaching typical RC flat slab limit (12 m).";
        }
      } else if (spanSystem === "rc_beam") {
        if (span > 18) {
          spanWarnLevel = "red";
          spanWarnText = "Span exceeds typical RC beam & slab range (>18 m).";
        } else if (span > 15) {
          spanWarnLevel = "yellow";
          spanWarnText = "Approaching typical RC beam limit (18 m).";
        }
      }

      let designLabel = "Efficient";
      let designStatus = "efficient";
      if (spanWarnLevel === "red") {
        designStatus = "review";
        designLabel = "Review Needed";
      } else if (spanWarnLevel === "yellow") {
        designStatus = "acceptable";
        designLabel = "Acceptable";
      } else if (
        (spanSystem === "rc_flat" || spanSystem === "rc_beam") &&
        spanLoad === "heavy" &&
        span > 8
      ) {
        designStatus = "acceptable";
        designLabel = "Acceptable";
      }

      const systemLabel =
        spanSystem === "rc_flat"
          ? "Reinforced Concrete Flat Slab"
          : spanSystem === "rc_beam"
            ? "Reinforced Concrete Beam & Slab"
            : spanSystem === "steel"
              ? "Steel Beam"
              : "Timber Beam";

      const loadLabel =
        spanLoad === "light" ? "Light (residential)" : spanLoad === "medium" ? "Medium (office/commercial)" : "Heavy (industrial)";

      return {
        spanM: span,
        depthM,
        depthCm,
        ldRatio,
        divisor,
        memberSuggestion,
        spanWarnLevel,
        spanWarnText,
        designStatus,
        designLabel,
        systemLabel,
        loadLabel,
      };
    }, [spanLengthM, spanSystem, spanLoad]);

    const parkingResult = useMemo(() => {
      const totalArea = Number(parkingAreaM2);
      if (!Number.isFinite(totalArea) || totalArea <= 0) return null;

      const layout = PARKING_LAYOUTS[parkingLayout] || PARKING_LAYOUTS.perpendicular;
      const usage = PARKING_USAGE[parkingUsage] || PARKING_USAGE.office;

      const stallArea = layout.spaceW * layout.spaceD;
      let grossPerStallRaw;
      if (parkingLayout === "parallel") {
        grossPerStallRaw = ((layout.spaceW * 2 + layout.aisleM) * layout.spaceD) / 2;
      } else {
        grossPerStallRaw = ((layout.spaceD * 2 + layout.aisleM) * layout.spaceW) / 2;
      }
      const grossPerStall = grossPerStallRaw * usage.mult;

      const spaces = Math.max(0, Math.floor(totalArea / grossPerStall));
      const efficiencyRaw = spaces > 0 ? (spaces * stallArea) / totalArea : 0;
      const efficiencyPct = Math.round(efficiencyRaw * 1000) / 10;

      let effLevel = "efficient";
      let effLabel = "Efficient layout";
      if (efficiencyPct < 50) {
        effLevel = "poor";
        effLabel = "Poor layout";
      } else if (efficiencyPct < 65) {
        effLevel = "acceptable";
        effLabel = "Acceptable layout";
      }

      const rampRequired = totalArea > 500;

      return {
        totalAreaM2: totalArea,
        spaces,
        aisleM: layout.aisleM,
        spaceDimW: layout.spaceW,
        spaceDimD: layout.spaceD,
        grossPerStall,
        efficiencyPct,
        effLevel,
        effLabel,
        rampRequired,
        layoutLabel: layout.label,
        usageLabel: usage.label,
        stallArea,
      };
    }, [parkingAreaM2, parkingLayout, parkingUsage]);

    const daylightResult = useMemo(() => {
      const floor = Number(daylightFloorM2);
      const win = Number(daylightWindowM2);
      const depth = Number(daylightDepthM);
      if (!Number.isFinite(floor) || floor <= 0) return null;
      if (!Number.isFinite(win) || win < 0) return null;
      if (!Number.isFinite(depth) || depth <= 0) return null;

      const room = DAYLIGHT_ROOM_TYPES.find((r) => r.id === daylightRoomType) || DAYLIGHT_ROOM_TYPES[1];
      const facade = DAYLIGHT_FACADES[daylightFacade] || DAYLIGHT_FACADES.north;

      const wfrPctRaw = (win / floor) * 100;
      const wfrPct = Math.round(wfrPctRaw * 10) / 10;

      const depthAdj = 1 / (1 + 0.14 * depth);
      const dfRaw = 2.0 * (wfrPct / 10) * facade.sky * depthAdj;
      const dfPct = Math.min(18, Math.round(dfRaw * 10) / 10);

      const depthFactorPen = 1 / (1 + 0.1 * depth);
      const penRaw = Math.min(
        depth,
        2.2 * Math.sqrt(Math.max(0.01, win)) * (wfrPct / 10) * facade.pen * depthFactorPen
      );
      const penetrationM = Math.round(penRaw * 10) / 10;

      const enDfMin = room.enDfMin;
      const enOk = dfPct + 1e-9 >= enDfMin;
      const lowBand = enDfMin * 0.8;

      let complianceLevel = "green";
      let complianceLabel = "Meets EN 17037 (indicative)";
      if (dfPct + 1e-9 >= enDfMin) {
        complianceLevel = "green";
        complianceLabel = "Meets EN 17037 (indicative)";
      } else if (dfPct + 1e-9 >= lowBand) {
        complianceLevel = "yellow";
        complianceLabel = "Below EN 17037 minimum — within 20% of threshold (indicative)";
      } else {
        complianceLevel = "red";
        complianceLabel = "Does not meet EN 17037 (indicative)";
      }

      const recommendations = [];
      if (complianceLevel === "red" || (complianceLevel === "yellow" && !enOk)) {
        if (dfPct > 0.05) {
          const targetWfr = wfrPct * (enDfMin / dfPct);
          const needWinE = (targetWfr / 100) * floor - win;
          if (needWinE > 0.05) {
            recommendations.push(
              `Increase window area by about ${formatSmartNumber(needWinE)} m² toward EN 17037 ${formatSmartNumber(enDfMin)}% DF for ${room.label} (IES-compatible metrics as secondary check).`
            );
          } else {
            recommendations.push(
              `Consider rooflights, clerestory glazing, or reducing room depth — indicative DF ${formatSmartNumber(dfPct)}% vs EN 17037 ${formatSmartNumber(enDfMin)}% for ${room.label}.`
            );
          }
        } else {
          recommendations.push(
            `Increase window area substantially — indicative DF is below EN 17037 ${formatSmartNumber(enDfMin)}% for ${room.label}.`
          );
        }
      }
      if (complianceLevel !== "green" && depth > penetrationM * 1.12) {
        recommendations.push(
          `Consider rooflights or light shelves — penetration (${formatSmartNumber(penetrationM)} m) is limited vs depth (${formatSmartNumber(depth)} m); verify with IES LM-83 / spatial daylight metrics where applicable.`
        );
      }
      if (recommendations.length === 0 && complianceLevel === "green") {
        recommendations.push("No changes indicated for EN 17037 indicative targets; confirm with project-specific simulation.");
      }

      return {
        floorM2: floor,
        windowM2: win,
        depthM: depth,
        roomLabel: room.label,
        facadeLabel: facade.label,
        wfrPct,
        dfPct,
        penetrationM,
        enDfMin,
        enOk,
        complianceLevel,
        complianceLabel,
        recommendations,
      };
    }, [daylightRoomType, daylightFloorM2, daylightWindowM2, daylightDepthM, daylightFacade]);

    const fireEscapeResult = useMemo(() => {
      const floor = Number(fireFloorM2);
      const travel = Number(fireTravelM);
      const exitsN = Number(fireNumExits);
      const floors = Number(fireFloors);
      if (!Number.isFinite(floor) || floor <= 0) return null;
      if (!Number.isFinite(travel) || travel < 0) return null;
      if (!Number.isFinite(exitsN) || exitsN < 0 || !Number.isInteger(exitsN)) return null;
      if (!Number.isFinite(floors) || floors < 1 || !Number.isInteger(floors)) return null;

      const bt = FIRE_BUILDING_TYPES.find((b) => b.id === fireBuildingType) || FIRE_BUILDING_TYPES[1];
      const maxTravelRaw = fireSprinkler ? bt.maxSprinkler : bt.maxNoSprinkler;
      const maxTravelM = Math.round(maxTravelRaw * 10) / 10;

      const requiredMinExits = floor > FIRE_AREA_TWO_EXIT_M2 ? 2 : 1;

      const travelOk = travel <= maxTravelM + 1e-9;
      const exitsOk = exitsN >= requiredMinExits;

      const exitWidthTotalMin = Math.round(requiredMinExits * FIRE_EXIT_WIDTH_M * 10) / 10;
      const providedExitWidthMin = Math.round(exitsN * FIRE_EXIT_WIDTH_M * 10) / 10;

      const travelRatio = maxTravelM > 0 ? travel / maxTravelM : 0;
      const marginalTravel = travelOk && travelRatio >= 0.9;
      const marginalExits = exitsOk && exitsN === requiredMinExits && requiredMinExits >= 2;

      const failures = [];
      if (!travelOk) {
        failures.push(
          `Travel distance exceeds IBC maximum (${formatSmartNumber(travel)} m > ${formatSmartNumber(maxTravelM)} m for ${bt.label}, ${fireSprinkler ? "sprinklered" : "non-sprinklered"}).`
        );
      }
      if (!exitsOk) {
        failures.push(
          `Insufficient exits (${exitsN} provided; minimum ${requiredMinExits} for ${formatSmartNumber(floor)} m² floor).`
        );
      }

      let complianceLevel = "full";
      let complianceLabel = "Fully compliant (indicative)";
      if (failures.length > 0) {
        complianceLevel = "fail";
        complianceLabel = "Non-compliant";
      } else if (marginalTravel || marginalExits) {
        complianceLevel = "marginal";
        if (marginalTravel && marginalExits) {
          complianceLabel = "Compliant — near travel limit and at minimum exit count";
        } else if (marginalTravel) {
          complianceLabel = "Compliant — within 10% of max travel distance";
        } else {
          complianceLabel = "Compliant — at minimum required exit count";
        }
      }

      return {
        buildingLabel: bt.label,
        floorM2: floor,
        travelM: travel,
        numExits: exitsN,
        floors,
        sprinkler: fireSprinkler,
        maxTravelM,
        requiredMinExits,
        exitWidthTotalMin,
        providedExitWidthMin,
        travelOk,
        exitsOk,
        complianceLevel,
        complianceLabel,
        failures,
        travelRatio,
      };
    }, [fireBuildingType, fireFloorM2, fireNumExits, fireTravelM, fireFloors, fireSprinkler]);

    const uValueResult = useMemo(() => {
      const getMat = (id) => U_VALUE_MATERIALS.find((m) => m.id === id) || U_VALUE_MATERIALS[0];
      let totalThicknessMm = 0;
      let RsumLayers = 0;
      const layerRows = [];
      for (let i = 0; i < uLayers.length; i++) {
        const layer = uLayers[i];
        const t = Number(layer.thicknessMm);
        if (!Number.isFinite(t) || t <= 0) return null;
        const mat = getMat(layer.materialId);
        let rLayer;
        if (mat.fixedR != null) {
          rLayer = mat.fixedR;
        } else if (mat.lambda != null && mat.lambda > 0) {
          rLayer = (t / 1000) / mat.lambda;
        } else {
          return null;
        }
        totalThicknessMm += t;
        RsumLayers += rLayer;
        layerRows.push({
          uid: layer.uid,
          materialId: layer.materialId,
          materialLabel: mat.label,
          thicknessMm: t,
          rLayer,
        });
      }
      const Rtotal = U_VALUE_RSI + RsumLayers + U_VALUE_RSO;
      if (!Number.isFinite(Rtotal) || Rtotal <= 0) return null;
      const U = 1 / Rtotal;
      const uRounded = Math.round(U * 100) / 100;
      const RtotalRounded = Math.round(Rtotal * 10) / 10;

      const climate = U_VALUE_CLIMATES.find((c) => c.id === uClimateZone) || U_VALUE_CLIMATES[2];
      const constr = U_VALUE_CONSTRUCTION_TYPES.find((c) => c.id === uConstructionType) || U_VALUE_CONSTRUCTION_TYPES[0];
      const thresholds = U_VALUE_THRESHOLDS[uConstructionType] || U_VALUE_THRESHOLDS.external_wall;
      const uMax = thresholds[uClimateZone] ?? thresholds.C;

      let complianceLevel = "green";
      let complianceLabel = "Meets ASHRAE 90.1 / EU EPBD threshold (indicative)";
      if (uRounded <= uMax + 1e-9) {
        complianceLevel = "green";
        complianceLabel = "Meets indicative threshold (U ≤ max)";
      } else if (uRounded <= uMax * 1.15 + 1e-9) {
        complianceLevel = "yellow";
        complianceLabel = "Above threshold — within 15% of limit (indicative)";
      } else {
        complianceLevel = "red";
        complianceLabel = "Exceeds threshold (indicative)";
      }

      const improvementWm2K = uRounded > uMax ? Math.round((uRounded - uMax) * 100) / 100 : 0;

      return {
        totalThicknessMm: Math.round(totalThicknessMm * 10) / 10,
        U: uRounded,
        Rtotal: RtotalRounded,
        uMax,
        climateLabel: climate.label,
        constructionLabel: constr.label,
        complianceLevel,
        complianceLabel,
        improvementWm2K,
        layerRows,
        uLayersSnapshot: uLayers.map((l) => ({ ...l })),
      };
    }, [uClimateZone, uConstructionType, uLayers]);

    function addULayer() {
      setULayers((prev) => {
        if (prev.length >= 8) return prev;
        return [
          ...prev,
          {
            uid: `u_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            materialId: "eps",
            thicknessMm: "50",
          },
        ];
      });
    }

    function removeULayer(uid) {
      setULayers((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.uid !== uid)));
    }

    function updateULayer(uid, patch) {
      setULayers((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));
    }

    const siteCoverageResult = useMemo(() => {
      const plot = Number(sitePlotM2);
      const scrRaw = Number(siteScrStr);
      const farRaw = Number(siteFarStr);
      const floorsN = Number(siteFloorsStr);
      if (!Number.isFinite(plot) || plot <= 0) return null;
      if (!Number.isFinite(scrRaw) || scrRaw < 0 || scrRaw > 1) return null;
      if (!Number.isFinite(farRaw) || farRaw < 0 || farRaw > 10) return null;
      if (!Number.isFinite(floorsN) || floorsN < 1 || !Number.isInteger(floorsN)) return null;

      const scr = Math.round(scrRaw * 1000) / 1000;
      const far = Math.round(farRaw * 1000) / 1000;

      const maxFootprintM2 = Math.round(plot * scr * 10) / 10;
      const maxTotalGfaM2 = Math.round(plot * far * 10) / 10;
      const gfaDemandM2 = Math.round(maxFootprintM2 * floorsN * 10) / 10;
      const maxGfaPerFloorM2 = Math.round(Math.min(maxFootprintM2, maxTotalGfaM2 / floorsN) * 10) / 10;
      const remainingPlotM2 = Math.round((plot - maxFootprintM2) * 10) / 10;
      const openSpaceRatioPct = Math.round((1 - scr) * 100 * 10) / 10;

      const exceedsFar = gfaDemandM2 > maxTotalGfaM2 + 1e-6;
      const headroomM2 = Math.round((maxTotalGfaM2 - gfaDemandM2) * 10) / 10;
      const overGfaM2 = Math.round((gfaDemandM2 - maxTotalGfaM2) * 10) / 10;
      const maxFloorsAtScr = scr > 1e-9 ? far / scr : Infinity;
      const floorsOver = exceedsFar && maxFootprintM2 > 0 ? Math.round(((gfaDemandM2 - maxTotalGfaM2) / maxFootprintM2) * 10) / 10 : 0;

      let complianceLevel = "green";
      let complianceLabel = "Inputs consistent and buildable (indicative)";
      if (exceedsFar) {
        complianceLevel = "red";
        complianceLabel = `Not compliant — ${formatSmartNumber(overGfaM2)} m² over FAR cap (≈ ${formatSmartNumber(floorsOver)} floor-equiv. at max footprint)`;
      } else if (gfaDemandM2 > maxTotalGfaM2 * 0.85 + 1e-6) {
        complianceLevel = "yellow";
        complianceLabel = `Near FAR limit — only ${formatSmartNumber(headroomM2)} m² GFA headroom before exceed`;
      }

      const basementAreaM2 = siteBasement ? maxFootprintM2 : null;

      return {
        plotM2: plot,
        scr,
        far,
        floors: floorsN,
        basementIncluded: siteBasement,
        maxFootprintM2,
        maxTotalGfaM2,
        maxGfaPerFloorM2,
        remainingPlotM2,
        openSpaceRatioPct,
        gfaDemandM2,
        exceedsFar,
        headroomM2,
        overGfaM2,
        maxFloorsAtScr,
        floorsOver,
        complianceLevel,
        complianceLabel,
        basementAreaM2,
        footprintPct: Math.round(scr * 1000) / 10,
      };
    }, [sitePlotM2, siteScrStr, siteFarStr, siteFloorsStr, siteBasement]);

    const computed = useMemo(() => {
      if (tab === "convert") {
        return {
          mode: "Convert",
          title: "Scaled outputs",
          lenOut: convertScaledLenM == null ? null : metersToLengthDisplay(convertScaledLenM, unit),
          areaOut:
            convertScaledAreaM2 == null ? null : meters2ToAreaDisplay(convertScaledAreaM2, unit),
          wOut: convertScaledWM == null ? null : metersToLengthDisplay(convertScaledWM, unit),
          hOut: convertScaledHM == null ? null : metersToLengthDisplay(convertScaledHM, unit),
          dOut: convertScaledDM == null ? null : metersToLengthDisplay(convertScaledDM, unit),
          volOut:
            convertScaledVolumeM3 == null
              ? null
              : m3ToVolumeDisplay(convertScaledVolumeM3, unit),
        };
      }
      if (tab === "reverse") {
        return {
          mode: "Reverse",
          title: "Real-world outputs",
          lenOut: reverseRealLenM == null ? null : metersToLengthDisplay(reverseRealLenM, unit),
          areaOut:
            reverseRealAreaM2 == null ? null : meters2ToAreaDisplay(reverseRealAreaM2, unit),
          wOut: reverseRealWM == null ? null : metersToLengthDisplay(reverseRealWM, unit),
          hOut: reverseRealHM == null ? null : metersToLengthDisplay(reverseRealHM, unit),
          dOut: reverseRealDM == null ? null : metersToLengthDisplay(reverseRealDM, unit),
          volOut:
            reverseRealVolumeM3 == null ? null : m3ToVolumeDisplay(reverseRealVolumeM3, unit),
        };
      }
      // paper
      return {
        mode: "Paper",
        title: "Paper size calculator",
        paperAreaOut: paperAreaM2 == null ? null : meters2ToAreaDisplay(paperAreaM2, unit),
        realAreaOut: paperRealAreaM2 == null ? null : meters2ToAreaDisplay(paperRealAreaM2, unit),
      };
    }, [
      tab,
      convertScaledLenM,
      convertScaledAreaM2,
      convertScaledWM,
      convertScaledHM,
      convertScaledDM,
      convertScaledVolumeM3,
      reverseRealLenM,
      reverseRealAreaM2,
      reverseRealWM,
      reverseRealHM,
      reverseRealDM,
      reverseRealVolumeM3,
      paperAreaM2,
      paperRealAreaM2,
      unit,
    ]);

    const anyValuePresent = useMemo(() => {
      if (tab === "convert") {
        return realLenM != null || realAreaM2 != null || realWM != null || realHM != null || realDM != null;
      }
      if (tab === "reverse") {
        return modelLenM != null || modelAreaM2 != null || modelWM != null || modelHM != null || modelDM != null;
      }
      return paperAreaM2 != null;
    }, [tab, realLenM, realAreaM2, realWM, realHM, realDM, modelLenM, modelAreaM2, modelWM, modelHM, modelDM, paperAreaM2]);

    function snapshot() {
      const snap = {
        tab,
        denom: denomSafe,
        unit,
        ts: Date.now(),
      };
      if (tab === "convert") {
        snap.inputs = {
          realLen,
          realArea,
          realW,
          realH,
          realD,
        };
      } else if (tab === "reverse") {
        snap.inputs = {
          modelLen,
          modelArea,
          modelW,
          modelH,
          modelD,
        };
      } else {
        snap.inputs = { paperSize };
      }
      snap.outputs = computed;
      return snap;
    }

    function pushHistoryNow() {
      if (!anyValuePresent) {
        setStatus({ state: "warn", text: "Enter a value to calculate." });
        return;
      }
      const snap = snapshot();
      const key = JSON.stringify({
        tab: snap.tab,
        denom: snap.denom,
        unit: snap.unit,
        inputs: snap.inputs,
      });
      if (lastAddedRef.current === key) return;
      lastAddedRef.current = key;

      setHistory((prev) => {
        const next = [snap, ...prev];
        return next.slice(0, 6);
      });
      setStatus({ state: "ok", text: "Added to history." });
    }

    useEffect(() => {
      function onKeyDown(e) {
        if (e.key !== "Enter") return;
        if (activeTool !== "scale") return;
        const active = document.activeElement;
        const tag = active && active.tagName ? active.tagName.toLowerCase() : "";
        const isTyping =
          tag === "input" || tag === "textarea" || tag === "select";
        if (!isTyping) return;
        e.preventDefault();
        pushHistoryNow();
      }
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTool, tab, denomSafe, unit, realLen, realArea, realW, realH, realD, modelLen, modelArea, modelW, modelH, modelD, paperSize, computed, anyValuePresent]);

    function applyScalePreset(nextDenom) {
      setDenom(nextDenom);
      setCustomDenom(String(nextDenom));
      setStatus({ state: "idle", text: "Updated scale." });
    }

    function applyCustomDenom() {
      const n = Number(customDenom);
      if (!Number.isFinite(n) || n <= 0) {
        setStatus({ state: "warn", text: "Invalid scale ratio." });
        return;
      }
      applyScalePreset(Math.round(n));
    }

    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        return false;
      }
    }

    function formatCopyText() {
      const scaleLine = `Scale 1:${denomSafe} (${computed.mode})`;
      if (tab === "paper") {
        const paperLabel = `${paperSize}`;
        return [
          "Structura — Scale Converter",
          scaleLine,
          `Paper size: ${paperLabel}`,
          `Paper area: ${computed.paperAreaOut ?? "—"} ${areaUnitLabel(unit)}`,
          `Real area that fits: ${computed.realAreaOut ?? "—"} ${areaUnitLabel(unit)}`,
        ].join("\n");
      }
      if (tab === "convert") {
        const dims = [
          `${computed.wOut ?? "—"} ${unitLabel(unit)}`,
          `${computed.hOut ?? "—"} ${unitLabel(unit)}`,
          `${computed.dOut ?? "—"} ${unitLabel(unit)}`,
        ].join(" × ");
        return [
          "Structura — Scale Converter",
          scaleLine,
          `Input (Real): length ${realLen || "—"} ${unitLabel(unit)}, area ${realArea || "—"} ${areaUnitLabel(unit)}`,
          `Input (Real dims): W ${realW || "—"} / H ${realH || "—"} / D ${realD || "—"} ${unitLabel(unit)}`,
          "",
          `Output (Scaled):`,
          `- Length: ${computed.lenOut ?? "—"} ${unitLabel(unit)}`,
          `- Area: ${computed.areaOut ?? "—"} ${areaUnitLabel(unit)}`,
          `- Dims: ${dims}`,
          `- Volume: ${computed.volOut ?? "—"} ${volumeUnitLabel(unit)}`,
        ].join("\n");
      }
      // reverse
      const dims = [
        `${computed.wOut ?? "—"} ${unitLabel(unit)}`,
        `${computed.hOut ?? "—"} ${unitLabel(unit)}`,
        `${computed.dOut ?? "—"} ${unitLabel(unit)}`,
      ].join(" × ");
      return [
        "Structura — Scale Converter",
        scaleLine,
        `Input (Model): length ${modelLen || "—"} ${unitLabel(unit)}, area ${modelArea || "—"} ${areaUnitLabel(unit)}`,
        `Input (Model dims): W ${modelW || "—"} / H ${modelH || "—"} / D ${modelD || "—"} ${unitLabel(unit)}`,
        "",
        `Output (Real):`,
        `- Length: ${computed.lenOut ?? "—"} ${unitLabel(unit)}`,
        `- Area: ${computed.areaOut ?? "—"} ${areaUnitLabel(unit)}`,
        `- Dims: ${dims}`,
        `- Volume: ${computed.volOut ?? "—"} ${volumeUnitLabel(unit)}`,
      ].join("\n");
    }

    function formatSpanCopyText() {
      if (!spanResult) {
        return ["Column & Beam Span Calculator", "", "Enter a valid span length (m)."].join("\n");
      }
      const r = spanResult;
      const parts = [
        "Column & Beam Span Calculator",
        "",
        `Structural system: ${r.systemLabel}`,
        `Load: ${r.loadLabel}`,
        `Span: ${formatSmartNumber(r.spanM)} m`,
        "",
        "Results:",
        `- Estimated slab/beam depth: ${formatSmartNumber(r.depthCm)} cm`,
        `- Span-to-depth ratio (used): L/d ≈ ${formatSmartNumber(r.ldRatio)}`,
        `- Column / profile: ${r.memberSuggestion}`,
        `- Design status: ${r.designLabel}`,
      ];
      if (r.spanWarnText) parts.push(`- Validation: ${r.spanWarnText}`);
      return parts.join("\n");
    }

    async function onCopy() {
      if (activeTool === "landing") {
        setStatus({ state: "warn", text: "Open a calculator to copy results." });
        return;
      }
      if (activeTool === "uValue") {
        if (!uValueResult) {
          setStatus({ state: "warn", text: "Enter valid thickness (mm) for each layer." });
          return;
        }
        const text = formatUValueCopyText();
        const ok = await copyText(text);
        if (ok) {
          setStatus({ state: "ok", text: "Copied to clipboard." });
          return;
        }
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "true");
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          setStatus({ state: "ok", text: "Copied to clipboard." });
        } catch {
          setStatus({ state: "warn", text: "Copy failed. Try again." });
        }
        return;
      }
      if (activeTool === "fireEscape") {
        if (!fireEscapeResult) {
          setStatus({ state: "warn", text: "Enter valid floor area, travel distance, exits, and floors." });
          return;
        }
        const text = formatFireEscapeCopyText();
        const ok = await copyText(text);
        if (ok) {
          setStatus({ state: "ok", text: "Copied to clipboard." });
          return;
        }
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "true");
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          setStatus({ state: "ok", text: "Copied to clipboard." });
        } catch {
          setStatus({ state: "warn", text: "Copy failed. Try again." });
        }
        return;
      }
      if (activeTool === "daylight") {
        if (!daylightResult) {
          setStatus({ state: "warn", text: "Enter valid floor area, window area, and room depth." });
          return;
        }
        const text = formatDaylightCopyText();
        const ok = await copyText(text);
        if (ok) {
          setStatus({ state: "ok", text: "Copied to clipboard." });
          return;
        }
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "true");
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          setStatus({ state: "ok", text: "Copied to clipboard." });
        } catch {
          setStatus({ state: "warn", text: "Copy failed. Try again." });
        }
        return;
      }
      if (activeTool === "parking") {
        if (!parkingResult) {
          setStatus({ state: "warn", text: "Enter a valid total parking area (m²)." });
          return;
        }
        const text = formatParkingCopyText();
        const ok = await copyText(text);
        if (ok) {
          setStatus({ state: "ok", text: "Copied to clipboard." });
          return;
        }
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "true");
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          setStatus({ state: "ok", text: "Copied to clipboard." });
        } catch {
          setStatus({ state: "warn", text: "Copy failed. Try again." });
        }
        return;
      }
      if (activeTool === "room") {
        const text = formatRoomProgramCopyText();
        const ok = await copyText(text);
        if (ok) {
          setStatus({ state: "ok", text: "Copied to clipboard." });
          return;
        }
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "true");
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          setStatus({ state: "ok", text: "Copied to clipboard." });
        } catch {
          setStatus({ state: "warn", text: "Copy failed. Try again." });
        }
        return;
      }
      if (activeTool === "siteCoverage") {
        const text = formatSiteCoverageCopyText();
        const ok = await copyText(text);
        if (ok) {
          setStatus({ state: "ok", text: "Copied to clipboard." });
          return;
        }
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "true");
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          setStatus({ state: "ok", text: "Copied to clipboard." });
        } catch {
          setStatus({ state: "warn", text: "Copy failed. Try again." });
        }
        return;
      }
      if (activeTool === "span") {
        if (!spanResult) {
          setStatus({ state: "warn", text: "Enter a valid span length." });
          return;
        }
        const text = formatSpanCopyText();
        const ok = await copyText(text);
        if (ok) {
          setStatus({ state: "ok", text: "Copied to clipboard." });
          return;
        }
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "true");
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          setStatus({ state: "ok", text: "Copied to clipboard." });
        } catch {
          setStatus({ state: "warn", text: "Copy failed. Try again." });
        }
        return;
      }
      if (!anyValuePresent) {
        setStatus({ state: "warn", text: "Nothing to copy yet." });
        return;
      }
      const text = formatCopyText();
      const ok = await copyText(text);
      if (ok) {
        setStatus({ state: "ok", text: "Copied to clipboard." });
        return;
      }
      // Fallback
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "true");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setStatus({ state: "ok", text: "Copied to clipboard." });
      } catch {
        setStatus({ state: "warn", text: "Copy failed. Try again." });
      }
    }

    function downloadTextFile(filename, text, mimeType) {
      const blob = new Blob([text], { type: mimeType || "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function csvEscape(value) {
      const v = value == null ? "" : String(value);
      if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
      return v;
    }

    function getCSVRowFromHistoryEntry(it) {
      const date = new Date(it.ts).toISOString();
      const scale = `1:${it.denom}`;
      const unit = it.unit;

      let realLength = "";
      let scaledLength = "";
      let realArea = "";
      let scaledArea = "";
      let dims = "";
      let volume = "";

      if (it.tab === "convert") {
        realLength = it.inputs?.realLen || "";
        scaledLength = it.outputs?.lenOut || "";
        realArea = it.inputs?.realArea || "";
        scaledArea = it.outputs?.areaOut || "";
        const w = it.outputs?.wOut;
        const h = it.outputs?.hOut;
        const d = it.outputs?.dOut;
        dims = w && h && d ? `${w}×${h}×${d}` : "";
        volume = it.outputs?.volOut || "";
      } else if (it.tab === "reverse") {
        // Inputs are model (scaled). Outputs are real.
        realLength = it.outputs?.lenOut || "";
        scaledLength = it.inputs?.modelLen || "";
        realArea = it.outputs?.areaOut || "";
        scaledArea = it.inputs?.modelArea || "";
        const w = it.inputs?.modelW;
        const h = it.inputs?.modelH;
        const d = it.inputs?.modelD;
        dims = w && h && d ? `${w}×${h}×${d}` : "";

        const modelWM = parseLengthToMeters(it.inputs?.modelW, unit);
        const modelHM = parseLengthToMeters(it.inputs?.modelH, unit);
        const modelDM = parseLengthToMeters(it.inputs?.modelD, unit);
        const modelVolM3 =
          modelWM == null || modelHM == null || modelDM == null
            ? null
            : parseVolumeFromDimsToM3(modelWM, modelHM, modelDM);
        volume = modelVolM3 == null ? "" : m3ToVolumeDisplay(modelVolM3, unit);
      } else if (it.tab === "paper") {
        // Paper mode: only scaled/real area are relevant
        scaledArea = it.outputs?.paperAreaOut || "";
        realArea = it.outputs?.realAreaOut || "";
      }

      return [
        date,
        scale,
        unit,
        realLength,
        scaledLength,
        realArea,
        scaledArea,
        dims,
        volume,
      ];
    }

    function exportHistoryCSV() {
      const header = [
        "date",
        "scale",
        "unit",
        "real length",
        "scaled length",
        "real area",
        "scaled area",
        "W×H×D",
        "volume",
      ];

      const rows = history.slice().reverse().map((it) => getCSVRowFromHistoryEntry(it));
      const csv = [header.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      downloadTextFile(`scale-converter-history-${ts}.csv`, csv, "text/csv;charset=utf-8");
      setStatus({ state: "ok", text: "CSV exported." });
    }

    function addRoomToProgram() {
      const t = ROOM_PROGRAM_TYPES.find((r) => r.id === roomProgramTypeId);
      if (!t) return;
      const a = Number(roomProgramAreaStr);
      if (!Number.isFinite(a) || a <= 0) {
        setStatus({ state: "warn", text: "Enter a valid area (m²)." });
        return;
      }
      setRoomProgramRows((prev) => [
        ...prev,
        {
          uid: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          name: t.name,
          minAreaM2: t.minAreaM2,
          minDimM: t.minDimM,
          userAreaM2: Math.round(a * 10) / 10,
        },
      ]);
      setStatus({ state: "ok", text: "Room added to list." });
    }

    function removeRoomProgramRow(uid) {
      setRoomProgramRows((prev) => prev.filter((r) => r.uid !== uid));
    }

    function exportRoomProgramCSV() {
      const header = ["room", "min_area_m2", "user_area_m2", "min_dimension_m"];
      const rows = roomProgramRows.map((r) => [
        r.name,
        formatSmartNumber(r.minAreaM2),
        formatSmartNumber(r.userAreaM2),
        formatSmartNumber(r.minDimM),
      ]);
      const csv = [header.join(","), ...rows.map((row) => row.map(csvEscape).join(","))].join("\n");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      downloadTextFile(`room-program-${ts}.csv`, csv, "text/csv;charset=utf-8");
      setStatus({ state: "ok", text: "CSV exported." });
    }

    function formatParkingCopyText() {
      if (!parkingResult) {
        return ["Parking Calculator", "", "Enter a valid total parking area (m²)."].join("\n");
      }
      const r = parkingResult;
      return [
        "Parking Calculator",
        "",
        `Total parking area: ${formatSmartNumber(r.totalAreaM2)} m²`,
        `Layout: ${r.layoutLabel}`,
        `Usage: ${r.usageLabel}`,
        "",
        "Results:",
        `- Parking spaces: ${r.spaces}`,
        `- Required aisle width: ${formatSmartNumber(r.aisleM)} m`,
        `- Single space: ${formatSmartNumber(r.spaceDimW)} × ${formatSmartNumber(r.spaceDimD)} m`,
        `- Ramp required: ${r.rampRequired ? "Yes" : "No"}`,
        `- Efficiency: ${formatSmartNumber(r.efficiencyPct)} %`,
        `- Assessment: ${r.effLabel}`,
      ].join("\n");
    }

    function formatDaylightCopyText() {
      if (!daylightResult) {
        return ["Daylight Calculator", "", "Enter valid floor area (m²), window area (m²), and room depth (m)."].join("\n");
      }
      const r = daylightResult;
      const lines = [
        "Daylight Calculator (EN 17037 · IES reference)",
        "",
        `Room type: ${r.roomLabel}`,
        `Floor area: ${formatSmartNumber(r.floorM2)} m²`,
        `Window area: ${formatSmartNumber(r.windowM2)} m²`,
        `Room depth: ${formatSmartNumber(r.depthM)} m`,
        `Facade: ${r.facadeLabel}`,
        "",
        "Results:",
        `- Window-to-floor ratio: ${formatSmartNumber(r.wfrPct)} %`,
        `- Daylight factor (estimate): ${formatSmartNumber(r.dfPct)} %`,
        `- Penetration depth: ${formatSmartNumber(r.penetrationM)} m`,
        "",
        "Standards (indicative):",
        "- Primary: EN 17037 (minimum daylight factor)",
        "- Secondary reference: IES daylight metrics (e.g. LM-83 spatial daylight)",
        "",
        "Compliance:",
        `- EN 17037 (min DF ${formatSmartNumber(r.enDfMin)}% for ${r.roomLabel}): ${r.enOk ? "Pass" : "Fail"}`,
        `- Status: ${r.complianceLabel}`,
        "",
        "Recommendations:",
        ...(r.recommendations.length ? r.recommendations.map((s) => `- ${s}`) : ["- None — meets indicative targets."]),
      ];
      return lines.join("\n");
    }

    function formatFireEscapeCopyText() {
      if (!fireEscapeResult) {
        return ["Fire Escape Calculator", "", "Enter valid floor area, travel distance, whole-number exits, and floors."].join("\n");
      }
      const r = fireEscapeResult;
      const lines = [
        "Fire Escape Calculator",
        "",
        `Building use: ${r.buildingLabel}`,
        `Floor area: ${formatSmartNumber(r.floorM2)} m²`,
        `Number of exits: ${r.numExits}`,
        `Travel distance to nearest exit: ${formatSmartNumber(r.travelM)} m`,
        `Number of floors: ${r.floors}`,
        `Sprinkler system: ${r.sprinkler ? "Yes" : "No"}`,
        "",
        "Results (IBC 2021 — indicative):",
        `- Maximum allowed travel distance: ${formatSmartNumber(r.maxTravelM)} m`,
        `- Required minimum number of exits: ${r.requiredMinExits}`,
        `- Exit width requirement (total): ${formatSmartNumber(r.exitWidthTotalMin)} m (${formatSmartNumber(FIRE_EXIT_WIDTH_M)} m per required exit)`,
        `- Minimum aggregate width for ${r.numExits} exit(s): ${formatSmartNumber(r.providedExitWidthMin)} m`,
        `- Compliance: ${r.complianceLabel}`,
        "",
        r.failures.length ? ["Issues:", ...r.failures.map((f) => `- ${f}`)].join("\n") : "No compliance issues for entered criteria.",
      ];
      return lines.join("\n");
    }

    function formatUValueCopyText() {
      if (!uValueResult) {
        return ["Wall U-Value Calculator", "", "Enter valid thickness (mm) for each layer."].join("\n");
      }
      const r = uValueResult;
      const lines = [
        "Wall U-Value Calculator (indicative)",
        "",
        `Climate zone: ${r.climateLabel}`,
        `Construction: ${r.constructionLabel}`,
        `Fixed surface resistances: Rsi = ${formatSmartNumber(U_VALUE_RSI)} m²K/W, Rso = ${formatSmartNumber(U_VALUE_RSO)} m²K/W`,
        "",
        "Layers (order as entered):",
        ...r.layerRows.map((row, i) => `  ${i + 1}. ${row.materialLabel} — ${formatSmartNumber(row.thicknessMm)} mm (layer R ≈ ${formatSmartNumber(row.rLayer)} m²K/W)`),
        "",
        "Results:",
        `- Total thickness: ${formatSmartNumber(r.totalThicknessMm)} mm`,
        `- R-value total: ${formatSmartNumber(r.Rtotal)} m²K/W`,
        `- U-value: ${formatUValue(r.U)} W/m²K`,
        `- Indicative max U (ASHRAE 90.1 / EU EPBD): ${formatUValue(r.uMax)} W/m²K`,
        `- Compliance: ${r.complianceLabel}`,
      ];
      if (r.improvementWm2K > 0) {
        lines.push(`- Improvement needed: reduce U by at least ${formatUValue(r.improvementWm2K)} W/m²K to meet max U`);
      }
      lines.push("");
      lines.push("Verify with national annexes and product data.");
      return lines.join("\n");
    }

    function formatRoomProgramCopyText() {
      const lines = ["Room Program", "", `Timestamp: ${new Date().toLocaleString()}`, ""];
      if (roomProgramRows.length === 0) {
        lines.push("No rooms in list.");
        return lines.join("\n");
      }
      roomProgramRows.forEach((r) => {
        lines.push(
          `${r.name} — min ${formatSmartNumber(r.minAreaM2)} m² | user ${formatSmartNumber(r.userAreaM2)} m² | min dim ${formatSmartNumber(r.minDimM)} m`
        );
      });
      lines.push("");
      lines.push(`Total program area: ${formatSmartNumber(roomProgramTotal)} m²`);
      return lines.join("\n");
    }

    function formatSiteCoverageCopyText() {
      const lines = ["Site Coverage Calculator", "", `Timestamp: ${new Date().toLocaleString()}`, ""];
      if (!siteCoverageResult) {
        lines.push("Enter valid plot area, SCR (0–1), FAR (0–10), and whole number of floors (≥ 1).");
        return lines.join("\n");
      }
      const r = siteCoverageResult;
      lines.push("Inputs");
      lines.push(`- Total plot area: ${formatSmartNumber(r.plotM2)} m²`);
      lines.push(`- Site coverage ratio (SCR): ${formatSmartNumber(r.scr)}`);
      lines.push(`- Floor area ratio (FAR): ${formatSmartNumber(r.far)}`);
      lines.push(`- Number of floors: ${r.floors}`);
      lines.push(`- Basement included: ${r.basementIncluded ? "Yes" : "No"}`);
      lines.push("");
      lines.push("Auto-calculated (indicative)");
      lines.push(`- Maximum footprint area: ${formatSmartNumber(r.maxFootprintM2)} m²`);
      lines.push(`- Maximum total floor area (GFA cap): ${formatSmartNumber(r.maxTotalGfaM2)} m²`);
      lines.push(`- Maximum floor area per floor: ${formatSmartNumber(r.maxGfaPerFloorM2)} m²`);
      lines.push(`- Remaining plot area (open / green): ${formatSmartNumber(r.remainingPlotM2)} m²`);
      lines.push(`- Open space ratio (ground): ${formatSmartNumber(r.openSpaceRatioPct)} %`);
      lines.push(`- GFA demand (footprint × floors): ${formatSmartNumber(r.gfaDemandM2)} m²`);
      if (r.basementIncluded && r.basementAreaM2 != null) {
        lines.push(`- Basement footprint (below grade): ${formatSmartNumber(r.basementAreaM2)} m²`);
      }
      lines.push("");
      lines.push("Validation");
      lines.push(`- Status: ${r.complianceLabel}`);
      if (r.exceedsFar) {
        lines.push(`- Over FAR by: ${formatSmartNumber(r.overGfaM2)} m²`);
      } else if (r.complianceLevel === "yellow") {
        lines.push(`- GFA headroom: ${formatSmartNumber(r.headroomM2)} m²`);
      }
      lines.push("");
      lines.push("Indicative planning check only — verify with local zoning.");
      return lines.join("\n");
    }

    function buildPDFLines(projectName) {
      if (activeTool === "uValue") {
        const timestamp = new Date().toLocaleString();
        const lines = [];
        lines.push(projectName ? projectName : "Project (untitled)");
        lines.push("Wall U-Value Calculator (indicative)");
        lines.push(`Timestamp: ${timestamp}`);
        lines.push("");
        if (!uValueResult) {
          lines.push("No valid layer inputs.");
          return lines;
        }
        const r = uValueResult;
        lines.push("Inputs");
        lines.push(`- Climate zone: ${r.climateLabel}`);
        lines.push(`- Construction: ${r.constructionLabel}`);
        lines.push(`- Rsi / Rso: ${formatSmartNumber(U_VALUE_RSI)} / ${formatSmartNumber(U_VALUE_RSO)} m²K/W`);
        lines.push("");
        lines.push("Layers");
        r.layerRows.forEach((row, i) => {
          lines.push(`- ${i + 1}. ${row.materialLabel} — ${formatSmartNumber(row.thicknessMm)} mm (R ≈ ${formatSmartNumber(row.rLayer)} m²K/W)`);
        });
        lines.push("");
        lines.push("Results");
        lines.push(`- Total thickness: ${formatSmartNumber(r.totalThicknessMm)} mm`);
        lines.push(`- R-value total: ${formatSmartNumber(r.Rtotal)} m²K/W`);
        lines.push(`- U-value: ${formatUValue(r.U)} W/m²K`);
        lines.push(`- Indicative max U: ${formatUValue(r.uMax)} W/m²K`);
        lines.push(`- Compliance: ${r.complianceLabel}`);
        if (r.improvementWm2K > 0) {
          lines.push(`- Reduce U by at least ${formatUValue(r.improvementWm2K)} W/m²K to meet threshold`);
        }
        lines.push("");
        lines.push("Standards: indicative ASHRAE 90.1 / EU EPBD thresholds by climate.");
        return lines;
      }
      if (activeTool === "fireEscape") {
        const timestamp = new Date().toLocaleString();
        const lines = [];
        lines.push(projectName ? projectName : "Project (untitled)");
        lines.push("Fire Escape Calculator (IBC 2021 — indicative)");
        lines.push(`Timestamp: ${timestamp}`);
        lines.push("");
        if (!fireEscapeResult) {
          lines.push("No valid inputs.");
          return lines;
        }
        const r = fireEscapeResult;
        lines.push("Inputs");
        lines.push(`- Building use: ${r.buildingLabel}`);
        lines.push(`- Floor area: ${formatSmartNumber(r.floorM2)} m²`);
        lines.push(`- Number of exits: ${r.numExits}`);
        lines.push(`- Travel distance to nearest exit: ${formatSmartNumber(r.travelM)} m`);
        lines.push(`- Number of floors: ${r.floors}`);
        lines.push(`- Sprinkler system: ${r.sprinkler ? "Yes" : "No"}`);
        lines.push("");
        lines.push("Results");
        lines.push(`- Maximum allowed travel distance: ${formatSmartNumber(r.maxTravelM)} m`);
        lines.push(`- Required minimum number of exits: ${r.requiredMinExits}`);
        lines.push(`- Exit width requirement (total for required exits): ${formatSmartNumber(r.exitWidthTotalMin)} m`);
        lines.push(`- Minimum aggregate width (${r.numExits} exit(s)): ${formatSmartNumber(r.providedExitWidthMin)} m`);
        lines.push(`- Compliance status: ${r.complianceLabel}`);
        lines.push("");
        if (r.failures.length) {
          lines.push("Issues");
          r.failures.forEach((f) => lines.push(`- ${f}`));
        } else {
          lines.push("No compliance issues for entered criteria.");
        }
        return lines;
      }
      if (activeTool === "daylight") {
        const timestamp = new Date().toLocaleString();
        const lines = [];
        lines.push(projectName ? projectName : "Project (untitled)");
        lines.push("Daylight Calculator (EN 17037 primary · IES reference)");
        lines.push(`Timestamp: ${timestamp}`);
        lines.push("");
        if (!daylightResult) {
          lines.push("No valid inputs.");
          return lines;
        }
        const r = daylightResult;
        lines.push("Inputs");
        lines.push(`- Room type: ${r.roomLabel}`);
        lines.push(`- Floor area: ${formatSmartNumber(r.floorM2)} m²`);
        lines.push(`- Window area: ${formatSmartNumber(r.windowM2)} m²`);
        lines.push(`- Room depth: ${formatSmartNumber(r.depthM)} m`);
        lines.push(`- Facade: ${r.facadeLabel}`);
        lines.push("");
        lines.push("Results");
        lines.push(`- Window-to-floor ratio: ${formatSmartNumber(r.wfrPct)} %`);
        lines.push(`- Daylight factor (estimate): ${formatSmartNumber(r.dfPct)} %`);
        lines.push(`- Penetration depth: ${formatSmartNumber(r.penetrationM)} m`);
        lines.push("");
        lines.push("Standards (indicative)");
        lines.push("- Primary: EN 17037");
        lines.push("- Secondary reference: IES daylight metrics (e.g. LM-83)");
        lines.push("");
        lines.push("Compliance");
        lines.push(`- EN 17037 (min DF ${formatSmartNumber(r.enDfMin)}% for ${r.roomLabel}): ${r.enOk ? "Pass" : "Fail"}`);
        lines.push(`- Status: ${r.complianceLabel}`);
        lines.push("");
        lines.push("Recommendations");
        if (r.recommendations.length === 0) {
          lines.push("- None — meets indicative targets.");
        } else {
          r.recommendations.forEach((s) => lines.push(`- ${s}`));
        }
        return lines;
      }
      if (activeTool === "parking") {
        const timestamp = new Date().toLocaleString();
        const lines = [];
        lines.push(projectName ? projectName : "Project (untitled)");
        lines.push("Parking Calculator");
        lines.push(`Timestamp: ${timestamp}`);
        lines.push("");
        if (!parkingResult) {
          lines.push("No valid parking area entered.");
          return lines;
        }
        const r = parkingResult;
        lines.push("Inputs");
        lines.push(`- Total parking area: ${formatSmartNumber(r.totalAreaM2)} m²`);
        lines.push(`- Layout: ${r.layoutLabel}`);
        lines.push(`- Usage: ${r.usageLabel}`);
        lines.push("");
        lines.push("Results");
        lines.push(`- Parking spaces: ${r.spaces}`);
        lines.push(`- Required aisle width: ${formatSmartNumber(r.aisleM)} m`);
        lines.push(`- Single space: ${formatSmartNumber(r.spaceDimW)} × ${formatSmartNumber(r.spaceDimD)} m`);
        lines.push(`- Ramp required: ${r.rampRequired ? "Yes" : "No"}`);
        lines.push(`- Efficiency: ${formatSmartNumber(r.efficiencyPct)} %`);
        lines.push(`- Assessment: ${r.effLabel}`);
        return lines;
      }
      if (activeTool === "room") {
        const timestamp = new Date().toLocaleString();
        const lines = [];
        lines.push(projectName ? projectName : "Project (untitled)");
        lines.push("Room Program");
        lines.push(`Timestamp: ${timestamp}`);
        lines.push("");
        if (roomProgramRows.length === 0) {
          lines.push("No rooms in list.");
          return lines;
        }
        lines.push("Room | Min area (m²) | User area (m²) | Min dimension (m)");
        roomProgramRows.forEach((r) => {
          lines.push(
            `${r.name} | ${formatSmartNumber(r.minAreaM2)} | ${formatSmartNumber(r.userAreaM2)} | ${formatSmartNumber(r.minDimM)}`
          );
        });
        lines.push("");
        lines.push(`Total program area: ${formatSmartNumber(roomProgramTotal)} m²`);
        return lines;
      }
      if (activeTool === "span") {
        const timestamp = new Date().toLocaleString();
        const lines = [];
        lines.push(projectName ? projectName : "Project (untitled)");
        lines.push("Column & Beam Span Calculator");
        lines.push(`Timestamp: ${timestamp}`);
        lines.push("");
        if (!spanResult) {
          lines.push("No valid span entered.");
          return lines;
        }
        const r = spanResult;
        lines.push("Inputs");
        lines.push(`- Span length: ${formatSmartNumber(r.spanM)} m`);
        lines.push(`- Structural system: ${r.systemLabel}`);
        lines.push(`- Load: ${r.loadLabel}`);
        lines.push("");
        lines.push("Results");
        lines.push(`- Estimated slab/beam depth: ${formatSmartNumber(r.depthCm)} cm`);
        lines.push(`- Span-to-depth ratio (rule used): L/d ≈ ${formatSmartNumber(r.ldRatio)}`);
        lines.push(`- Column / profile: ${r.memberSuggestion}`);
        lines.push(`- Design status: ${r.designLabel}`);
        if (r.spanWarnText) {
          lines.push(`- Validation: ${r.spanWarnText}`);
        }
        return lines;
      }
      if (activeTool === "siteCoverage") {
        const timestamp = new Date().toLocaleString();
        const lines = [];
        lines.push(projectName ? projectName : "Project (untitled)");
        lines.push("Site Coverage Calculator (indicative)");
        lines.push(`Timestamp: ${timestamp}`);
        lines.push("");
        if (!siteCoverageResult) {
          lines.push("No valid inputs.");
          return lines;
        }
        const r = siteCoverageResult;
        lines.push("Inputs");
        lines.push(`- Total plot area: ${formatSmartNumber(r.plotM2)} m²`);
        lines.push(`- SCR: ${formatSmartNumber(r.scr)}`);
        lines.push(`- FAR: ${formatSmartNumber(r.far)}`);
        lines.push(`- Floors: ${r.floors}`);
        lines.push(`- Basement: ${r.basementIncluded ? "Yes" : "No"}`);
        lines.push("");
        lines.push("Results");
        lines.push(`- Max footprint: ${formatSmartNumber(r.maxFootprintM2)} m²`);
        lines.push(`- Max total GFA: ${formatSmartNumber(r.maxTotalGfaM2)} m²`);
        lines.push(`- Max GFA per floor: ${formatSmartNumber(r.maxGfaPerFloorM2)} m²`);
        lines.push(`- Remaining plot (open): ${formatSmartNumber(r.remainingPlotM2)} m²`);
        lines.push(`- Open space ratio: ${formatSmartNumber(r.openSpaceRatioPct)} %`);
        lines.push(`- GFA demand (footprint × floors): ${formatSmartNumber(r.gfaDemandM2)} m²`);
        if (r.basementIncluded && r.basementAreaM2 != null) {
          lines.push(`- Basement area: ${formatSmartNumber(r.basementAreaM2)} m²`);
        }
        lines.push("");
        lines.push("Validation");
        lines.push(`- ${r.complianceLabel}`);
        if (r.exceedsFar) {
          lines.push(`- Over FAR: ${formatSmartNumber(r.overGfaM2)} m²`);
        }
        lines.push("");
        lines.push("Verify with local codes and plot geometry.");
        return lines;
      }

      const timestamp = new Date().toLocaleString();
      const scale = `1:${denomSafe}`;
      const unitStr = unitLabel(unit);

      const lines = [];
      lines.push(projectName ? projectName : "Project (untitled)");
      lines.push("Structura — Scale Converter");
      lines.push(`Scale: ${scale} • Unit: ${unitStr} • Tab: ${computed.mode}`);
      lines.push(`Timestamp: ${timestamp}`);
      lines.push("");

      if (tab === "convert") {
        lines.push("Inputs (Real)");
        lines.push(`- Length: ${realLen || "—"} ${unitLabel(unit)}`);
        lines.push(`- Area: ${realArea || "—"} ${areaUnitLabel(unit)}`);
        lines.push(`- Dims: ${realW || "—"} × ${realH || "—"} × ${realD || "—"} ${unitLabel(unit)}`);
        lines.push("");
        lines.push("Results (Scaled)");
        lines.push(`- Length: ${computed.lenOut ?? "—"} ${unitLabel(unit)}`);
        lines.push(`- Area: ${computed.areaOut ?? "—"} ${areaUnitLabel(unit)}`);
        lines.push(`- Dims: ${computed.wOut ?? "—"} × ${computed.hOut ?? "—"} × ${computed.dOut ?? "—"} ${unitLabel(unit)}`);
        lines.push(`- Volume: ${computed.volOut ?? "—"} ${volumeUnitLabel(unit)}`);
      } else if (tab === "reverse") {
        lines.push("Inputs (Model)");
        lines.push(`- Length: ${modelLen || "—"} ${unitLabel(unit)}`);
        lines.push(`- Area: ${modelArea || "—"} ${areaUnitLabel(unit)}`);
        lines.push(`- Dims: ${modelW || "—"} × ${modelH || "—"} × ${modelD || "—"} ${unitLabel(unit)}`);
        lines.push("");
        lines.push("Results (Real)");
        lines.push(`- Length: ${computed.lenOut ?? "—"} ${unitLabel(unit)}`);
        lines.push(`- Area: ${computed.areaOut ?? "—"} ${areaUnitLabel(unit)}`);
        lines.push(`- Dims: ${computed.wOut ?? "—"} × ${computed.hOut ?? "—"} × ${computed.dOut ?? "—"} ${unitLabel(unit)}`);
        lines.push(`- Volume: ${computed.volOut ?? "—"} ${volumeUnitLabel(unit)}`);
      } else {
        lines.push("Inputs (Paper)");
        lines.push(`- Paper size: ${paperSize}`);
        lines.push("");
        lines.push("Results (Areas)");
        lines.push(`- Paper area (model): ${computed.paperAreaOut ?? "—"} ${areaUnitLabel(unit)}`);
        lines.push(`- Real area that fits: ${computed.realAreaOut ?? "—"} ${areaUnitLabel(unit)}`);
      }

      return lines;
    }

    function exportCurrentToPDF() {
      try {
        if (!window.jspdf || !window.jspdf.jsPDF) {
          setStatus({ state: "warn", text: "jsPDF not available." });
          return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: "pt", format: "a4" });

        const marginX = 48;
        let y = 56;
        const lines = buildPDFLines(pdfProjectName.trim());
        const maxWidth = 595 - marginX * 2; // A4 width minus margins

        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        const yMax =
          activeTool === "span" ||
          activeTool === "parking" ||
          activeTool === "daylight" ||
          activeTool === "fireEscape" ||
          activeTool === "uValue" ||
          activeTool === "siteCoverage"
            ? 520
            : 780;
        lines.forEach((line) => {
          if (y > yMax) return;
          const chunks = doc.splitTextToSize(line, maxWidth);
          chunks.forEach((chunk) => {
            if (y > yMax) return;
            doc.text(chunk, marginX, y);
            y += chunk.trim() === "" ? 12 : 14;
          });
        });

        if (activeTool === "span" && spanResult) {
          y += 10;
          if (y < 640) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text("Cross-section (schematic)", marginX, y);
            y += 16;
            doc.setFont("helvetica", "normal");
            const sx = marginX;
            const sy = y;
            const spanW = 230;
            const memH = 22;
            const supW = 12;
            const supH = 36;
            doc.setDrawColor(80);
            doc.setFillColor(228, 228, 231);
            doc.rect(sx, sy, spanW, memH, "FD");
            doc.setFillColor(212, 212, 216);
            doc.rect(sx, sy + memH, supW, supH, "FD");
            doc.rect(sx + spanW - supW, sy + memH, supW, supH, "FD");
            doc.setFontSize(8);
            doc.setTextColor(60);
            doc.text(`Span ${formatSmartNumber(spanResult.spanM)} m (clear)`, sx + spanW / 2 - 30, sy - 4);
            doc.text(`Depth ≈ ${formatSmartNumber(spanResult.depthCm)} cm`, sx + spanW + 14, sy + memH / 2 + 3);
            doc.setDrawColor(120);
            doc.line(sx, sy + memH + supH + 6, sx + spanW, sy + memH + supH + 6);
            doc.line(sx, sy + memH + supH + 2, sx, sy + memH + supH + 10);
            doc.line(sx + spanW, sy + memH + supH + 2, sx + spanW, sy + memH + supH + 10);
            doc.setTextColor(0);
          }
        }

        if (activeTool === "parking" && parkingResult) {
          y += 10;
          if (y < 680) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text("Top view (schematic)", marginX, y);
            y += 14;
            doc.setFont("helvetica", "normal");
            const sx = marginX;
            const sy = y;
            const w = 220;
            doc.setDrawColor(100);
            doc.setFillColor(210, 210, 218);
            doc.rect(sx, sy, w, 20, "F");
            doc.setFillColor(230, 230, 235);
            doc.rect(sx, sy + 20, w, 14, "F");
            doc.setFillColor(210, 210, 218);
            doc.rect(sx, sy + 34, w, 20, "F");
            doc.setFontSize(7);
            doc.setTextColor(55);
            doc.text("Parking stalls", sx + 6, sy + 13);
            doc.text(`Central aisle ${formatSmartNumber(parkingResult.aisleM)} m`, sx + 6, sy + 29);
            doc.text("Parking stalls", sx + 6, sy + 47);
            doc.setTextColor(0);
            y += 62;
          }
        }

        if (activeTool === "daylight" && daylightResult) {
          y += 10;
          if (y < 680) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text("Cross-section (schematic)", marginX, y);
            y += 14;
            doc.setFont("helvetica", "normal");
            const dr = daylightResult;
            const sx = marginX;
            const sy = y;
            const rw = 240;
            const rh = 72;
            const penFrac = dr.depthM > 0 ? Math.min(1, dr.penetrationM / dr.depthM) : 0;
            const penW = rw * penFrac;
            doc.setDrawColor(90);
            doc.setFillColor(255, 251, 235);
            doc.rect(sx + 2, sy + 8, Math.max(8, penW), rh - 8, "F");
            doc.setFillColor(244, 244, 246);
            doc.rect(sx, sy, rw, rh, "S");
            doc.setFillColor(200, 220, 255);
            doc.rect(sx - 2, sy + 22, 6, 28, "F");
            doc.setFontSize(7);
            doc.setTextColor(55);
            doc.text("Window", sx - 2, sy + 18);
            doc.text(`Penetration ≈ ${formatSmartNumber(dr.penetrationM)} m`, sx + 8, sy + rh + 10);
            doc.setTextColor(0);
            y += rh + 22;
          }
        }

        if (activeTool === "fireEscape" && fireEscapeResult) {
          y += 10;
          if (y < 680) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text("Floor plan (schematic)", marginX, y);
            y += 14;
            doc.setFont("helvetica", "normal");
            const fr = fireEscapeResult;
            const sx = marginX;
            const sy = y;
            const w = 220;
            const h = 70;
            doc.setDrawColor(80);
            doc.rect(sx, sy, w, h, "S");
            doc.setFillColor(180, 220, 180);
            doc.rect(sx + 8, sy + h - 10, 36, 10, "F");
            doc.rect(sx + w - 44, sy + h - 10, 36, 10, "F");
            doc.setDrawColor(200, 80, 80);
            doc.rect(sx + 24, sy + 18, 8, 8, "S");
            doc.setDrawColor(100);
            if (typeof doc.setLineDash === "function") doc.setLineDash([4, 3], 0);
            doc.line(sx + 28, sy + 22, sx + w - 36, sy + h - 5);
            if (typeof doc.setLineDash === "function") doc.setLineDash([]);
            doc.setFontSize(7);
            doc.setTextColor(55);
            doc.text(`Travel ${formatSmartNumber(fr.travelM)} m / max ${formatSmartNumber(fr.maxTravelM)} m`, sx + 6, sy + h + 12);
            doc.setTextColor(0);
            y += h + 22;
          }
        }

        if (activeTool === "uValue" && uValueResult) {
          y += 10;
          if (y < 640) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text("Layer cross-section (schematic)", marginX, y);
            y += 14;
            doc.setFont("helvetica", "normal");
            const ur = uValueResult;
            const sx = marginX;
            const sy = y;
            const barH = 26;
            const totalBarW = 220;
            const twMm = ur.layerRows.reduce((acc, row) => acc + row.thicknessMm, 0);
            let x = sx;
            const pdfColors = [
              [148, 163, 184],
              [194, 65, 12],
              [252, 211, 77],
              [253, 230, 138],
              [165, 180, 252],
              [231, 229, 228],
              [214, 164, 99],
              [125, 211, 252],
              [231, 229, 228],
              [214, 211, 209],
            ];
            ur.layerRows.forEach((row, idx) => {
              const segW = twMm > 0 ? (row.thicknessMm / twMm) * totalBarW : totalBarW / ur.layerRows.length;
              const c = pdfColors[idx % pdfColors.length];
              doc.setFillColor(c[0], c[1], c[2]);
              doc.setDrawColor(90);
              doc.rect(x, sy, Math.max(segW, 4), barH, "FD");
              doc.setFontSize(6);
              doc.setTextColor(40);
              doc.text(`${formatSmartNumber(row.thicknessMm)}`, x + 2, sy + barH / 2 + 2);
              x += segW;
            });
            doc.setTextColor(0);
            doc.setFontSize(8);
            y += barH + 14;
          }
        }

        if (activeTool === "siteCoverage" && siteCoverageResult) {
          y += 10;
          if (y < 640) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text("Site plan (schematic — area proportions)", marginX, y);
            y += 14;
            doc.setFont("helvetica", "normal");
            const sr = siteCoverageResult;
            const sx = marginX;
            const sy = y;
            const pw = 200;
            const ph = 120;
            const sf = Math.sqrt(Math.max(0, Math.min(1, sr.scr)));
            const fw = pw * sf;
            const fh = ph * sf;
            const fx = sx + (pw - fw) / 2;
            const fy = sy + (ph - fh) / 2;
            doc.setDrawColor(70);
            doc.setFillColor(209, 250, 229);
            doc.rect(sx, sy, pw, ph, "FD");
            if (fw > 0.5 && fh > 0.5) {
              doc.setFillColor(180, 180, 190);
              doc.rect(fx, fy, fw, fh, "FD");
            }
            doc.setDrawColor(60);
            doc.rect(sx, sy, pw, ph, "S");
            doc.setFontSize(7);
            doc.setTextColor(30);
            doc.text(`Open ${formatSmartNumber(sr.openSpaceRatioPct)}%`, sx + 4, sy + 10);
            if (fw > 12 && fh > 12) {
              doc.text(`Footprint ${formatSmartNumber(sr.footprintPct)}%`, fx + fw / 2 - 22, fy + fh / 2 + 2);
            }
            if (sr.basementIncluded && fw > 4) {
              const bh = 14;
              doc.setFillColor(148, 163, 184);
              doc.rect(fx, sy + ph + 4, fw, bh, "FD");
              doc.setDrawColor(80);
              doc.rect(fx, sy + ph + 4, fw, bh, "S");
              doc.text("Basement (footprint)", fx + 4, sy + ph + 4 + bh / 2 + 2);
              y += bh + 6;
            }
            doc.setTextColor(0);
            y += ph + 18;
          }
        }

        const safeName = (pdfProjectName.trim() || "Untitled").replace(/[\\/:*?"<>|]+/g, "-");
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        const suffix =
          activeTool === "span"
            ? "span-calculator"
            : activeTool === "room"
              ? "room-program"
              : activeTool === "parking"
                ? "parking-calculator"
                : activeTool === "daylight"
                  ? "daylight-calculator"
                  : activeTool === "fireEscape"
                    ? "fire-escape-calculator"
                    : activeTool === "uValue"
                      ? "u-value-calculator"
                      : activeTool === "siteCoverage"
                        ? "site-coverage-calculator"
                        : "scale-converter";
        doc.save(`${safeName}-${suffix}-${ts}.pdf`);
        setStatus({ state: "ok", text: "PDF exported." });
        setPdfModalOpen(false);
      } catch (e) {
        setStatus({ state: "warn", text: "PDF export failed." });
      }
    }

    function onReset() {
      setStatus({ state: "idle", text: "Ready" });
      setHistory([]);
      setTab("convert");
      setPaperSize("A3");

      setRealLen("");
      setRealArea("");
      setRealW("");
      setRealH("");
      setRealD("");

      setModelLen("");
      setModelArea("");
      setModelW("");
      setModelH("");
      setModelD("");
    }

    function setFromMeters(field, valueM) {
      const next = metersToLengthDisplay(valueM, unit);
      return next;
    }

    // Quick reference chips (values in meters)
    const quickChips = [
      { label: "Door 0.9m", apply: () => (tab === "convert" ? setRealLen(metersToLengthDisplay(0.9, unit)) : setModelLen(metersToLengthDisplay(0.9, unit))) },
      { label: "Floor height 3.0m", apply: () => (tab === "convert" ? setRealH(metersToLengthDisplay(3.0, unit)) : setModelH(metersToLengthDisplay(3.0, unit))) },
      { label: "Room width 4.5m", apply: () => (tab === "convert" ? setRealW(metersToLengthDisplay(4.5, unit)) : setModelW(metersToLengthDisplay(4.5, unit))) },
      { label: "Room depth 6.0m", apply: () => (tab === "convert" ? setRealD(metersToLengthDisplay(6.0, unit)) : setModelD(metersToLengthDisplay(6.0, unit))) },
    ];

    const inputState = {
      convert: { len: realLen, area: realArea, w: realW, h: realH, d: realD, onLen: setRealLen, onArea: setRealArea, onW: setRealW, onH: setRealH, onD: setRealD },
      reverse: { len: modelLen, area: modelArea, w: modelW, h: modelH, d: modelD, onLen: setModelLen, onArea: setModelArea, onW: setModelW, onH: setModelH, onD: setModelD },
    };

    const isFt = unit === "ft-in";

    const LenInput = ({ value, onChange, placeholder }) =>
      h(InputBase, {
        value: value,
        onChange,
        placeholder,
        type: isFt ? "text" : "number",
        step: "any",
        min: 0,
      });

    const AreaInput = ({ value, onChange, placeholder }) =>
      h(InputBase, {
        value: value,
        onChange,
        placeholder,
        type: "number",
        step: "any",
        min: 0,
      });

    function ResultHeader() {
      const pillClasses = classNames(
        "inline-flex items-center justify-center h-8 px-3.5 rounded-full border text-[10px] font-extrabold tracking-[.18em] uppercase transition-colors duration-150",
        statusState === "ok"
          ? "bg-[#16A34A] border-[#16A34A] text-white"
          : statusState === "warn"
            ? "border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)]"
            : "border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-muted)]"
      );
      return h("div", { className: "flex items-start justify-between gap-3 mb-5 pb-4 border-b border-[var(--st-border)]" }, [
        h("div", {}, [
          h("div", { className: "text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--st-muted)]" }, computed.title),
          h("div", { className: "mt-1.5 text-xs text-[var(--st-muted)] font-semibold" }, `Scale 1:${denomSafe} • Unit ${unitLabel(unit)}`),
        ]),
        h("div", { className: pillClasses }, status.text),
      ]);
    }

    function ResultsPanel() {
      if (tab === "paper") {
        return h("div", {}, [
          h("div", { className: "grid grid-cols-1 gap-5" }, [
            h(ValueBlock, {
              label: "Paper area (model)",
              valueText: computed.paperAreaOut || "—",
              unitText: areaUnitLabel(unit),
              big: true,
            }),
            h(ValueBlock, {
              label: "Real area that fits",
              valueText: computed.realAreaOut || "—",
              unitText: areaUnitLabel(unit),
              big: true,
            }),
          ]),
          h("div", { className: "mt-5" }, [
          h("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3 w-full" }, [
            h(
              "button",
              { type: "button", onClick: onCopy, className: "h-12 rounded-2xl bg-[var(--st-accent)] text-white font-extrabold tracking-wide hover:brightness-110 transition-colors duration-150" },
              "Copy as text"
            ),
            h(
              "button",
              { type: "button", onClick: exportHistoryCSV, className: "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150" },
              "Export CSV"
            ),
            h(
              "button",
              {
                type: "button",
                onClick: () => setPdfModalOpen(true),
                className: "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150",
              },
              "Export PDF"
            ),
          ]),
        ]),
        ]);
      }

      const isConvert = tab === "convert";
      const lenLabel = isConvert ? "Scaled length" : "Real length";
      const areaLabel = isConvert ? "Scaled area" : "Real area";
      const dimsLabel = isConvert ? "Scaled width / height / depth" : "Real width / height / depth";
      const volLabel = isConvert ? "Scaled volume" : "Real volume";

      const dimsText = [
        computed.wOut ?? "—",
        computed.hOut ?? "—",
        computed.dOut ?? "—",
      ].join(" × ");

      return h("div", {}, [
        h("div", { className: "flex flex-col gap-5" }, [
          h(ValueBlock, {
            label: lenLabel,
            valueText: computed.lenOut || "—",
            unitText: unitLabel(unit),
            big: true,
          }),
          h("div", { className: "grid grid-cols-1 gap-5 md:grid-cols-1" }, [
            h(ValueBlock, {
              label: areaLabel,
              valueText: computed.areaOut || "—",
              unitText: areaUnitLabel(unit),
              big: true,
            }),
          ]),
          h("div", { className: "border border-[var(--st-border)] rounded-3xl bg-[color-mix(in_srgb,var(--st-fg)_5%,var(--st-bg))] p-6" }, [
            h("div", { className: "text-[11px] font-semibold tracking-[.22em] uppercase text-[var(--st-muted)] mb-3" }, dimsLabel),
            h("div", { className: "flex items-baseline gap-3 flex-wrap" }, [
              h(AnimatedNumberText, {
                valueText: computed.wOut && computed.hOut && computed.dOut ? dimsText : "—",
                className: "font-black tracking-tight text-[var(--st-fg)] text-4xl tabular-nums",
              }),
              h("div", { className: "text-xs font-extrabold tracking-[.22em] uppercase text-[var(--st-muted)]" }, unitLabel(unit)),
            ]),
            h("div", { className: "mt-4 border-t border-[var(--st-border)] pt-4" }, [
              h("div", { className: "text-[11px] font-semibold tracking-[.22em] uppercase text-[var(--st-muted)] mb-2" }, volLabel),
              h("div", { className: "flex items-baseline gap-3" }, [
                h(AnimatedNumberText, {
                  valueText: computed.volOut || "—",
                  className: "font-black tracking-tight text-[var(--st-fg)] text-3xl tabular-nums",
                }),
                h("div", { className: "text-xs font-extrabold tracking-[.22em] uppercase text-[var(--st-muted)]" }, volumeUnitLabel(unit)),
              ]),
            ]),
          ]),
        ]),
        h("div", { className: "mt-5" }, [
          h("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3 w-full" }, [
            h(
              "button",
              { type: "button", onClick: onCopy, className: "h-12 rounded-2xl bg-[var(--st-accent)] text-white font-extrabold tracking-wide hover:brightness-110 transition-colors duration-150" },
              "Copy as text"
            ),
            h(
              "button",
              { type: "button", onClick: exportHistoryCSV, className: "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150" },
              "Export CSV"
            ),
            h(
              "button",
              {
                type: "button",
                onClick: () => setPdfModalOpen(true),
                className: "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150",
              },
              "Export PDF"
            ),
          ]),
        ]),
      ]);
    }

    function TabBar() {
      const tabs = [
        { id: "convert", label: "Convert" },
        { id: "reverse", label: "Reverse" },
        { id: "paper", label: "Paper size" },
      ];
      return h("div", { className: "flex gap-2 bg-[var(--st-bg)] border border-[var(--st-border)] rounded-2xl p-2 mb-4" }, [
        tabs.map((t) =>
          h(ValueButton, {
            key: t.id,
            active: tab === t.id,
            onClick: () => setTab(t.id),
          }, t.label)
        ),
      ]);
    }

    function ScaleSelector() {
      return h("div", { className: "bg-[var(--st-bg)] border border-[var(--st-border)] rounded-3xl p-5 mb-5" }, [
        h("div", { className: "flex items-end justify-between gap-4 mb-3" }, [
          h("div", {}, [
            h("div", { className: "text-[10px] font-bold tracking-[.24em] uppercase text-[var(--st-muted)]" }, "Scale"),
            h("div", { className: "mt-1 text-xs text-[var(--st-muted)] font-semibold" }, "Preset buttons + custom ratio"),
          ]),
          h("div", { className: "text-right" }, [
            h("div", { className: "text-[11px] font-semibold tracking-[.22em] uppercase text-[var(--st-muted)] mb-2" }, "1 :"),
            h("div", { className: "flex items-center gap-2 justify-end" }, [
              h("input", {
                value: customDenom,
                onChange: (e) => {
                  const v = e.target.value;
                  setCustomDenom(v);
                  const n = Number(v);
                  if (Number.isFinite(n) && n > 0) setDenom(Math.round(n));
                },
                type: "number",
                min: 1,
                step: "1",
                className: "h-11 w-28 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-3 focus:outline-none focus:border-[var(--st-accent)] text-[var(--st-fg)]",
                onKeyDown: (e) => {
                  if (e.key === "Enter") applyCustomDenom();
                },
              }),
              h(
                "button",
                { type: "button", onClick: applyCustomDenom, className: "h-11 px-4 rounded-2xl bg-[var(--st-accent)] text-white font-extrabold hover:brightness-110 transition-colors duration-150" },
                "Apply"
              ),
            ]),
          ]),
        ]),
        h("div", { className: "flex flex-wrap gap-2" }, [
          PRESETS.map((p) =>
            h(
              "button",
              {
                key: p,
                type: "button",
                onClick: () => applyScalePreset(p),
                className: classNames(
                  "h-9 px-3 rounded-full border text-xs font-extrabold tracking-[.16em] uppercase transition-colors",
                  denomSafe === p
                    ? "bg-[var(--st-accent)] border-[var(--st-accent)] text-white"
                    : "border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))]"
                ),
              },
              `1:${p}`
            )
          ),
        ]),
      ]);
    }

    function UnitSwitcher() {
      return h("div", { className: "bg-[var(--st-bg)] border border-[var(--st-border)] rounded-3xl p-5 mb-5" }, [
        h("div", { className: "mb-3" }, [
          h("div", { className: "text-[11px] font-semibold tracking-[.22em] uppercase text-[var(--st-muted)]" }, "Unit"),
          h("div", { className: "mt-1 text-xs text-[var(--st-muted)] font-semibold" }, "Affects input + output display"),
        ]),
        h("div", { className: "flex flex-wrap gap-2" }, [
          UNIT_OPTIONS.map((u) =>
            h(
              "button",
              {
                key: u,
                type: "button",
                onClick: () => setUnit(u),
                className: classNames(
                  "h-9 px-3 rounded-full border text-xs font-extrabold tracking-[.16em] uppercase transition-colors",
                  unit === u
                    ? "bg-[var(--st-accent)] border-[var(--st-accent)] text-white"
                    : "border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))]"
                ),
              },
              u === "ft-in" ? "ft-in" : u
            )
          ),
        ]),
      ]);
    }

    function HistoryPanel() {
      return h("div", {}, [
        h("div", { className: "text-[11px] font-semibold tracking-[.22em] uppercase text-[var(--st-muted)] mb-3" }, "History (last 6)"),
        history.length === 0
          ? h("div", { className: "text-xs text-[var(--st-muted)] font-semibold" }, "Press Enter to add a calculation.")
          : h("div", { className: "flex flex-col gap-2" }, history.map((it, idx) => {
              const label =
                it.tab === "paper"
                  ? `Paper ${it.inputs.paperSize} • 1:${it.denom}`
                  : `${it.tab === "convert" ? "Convert" : "Reverse"} • 1:${it.denom}`;
              return h(
                "button",
                {
                  key: it.ts + "_" + idx,
                  type: "button",
                  onClick: () => {
                    setTab(it.tab);
                    setDenom(it.denom);
                    setCustomDenom(String(it.denom));
                    suppressUnitConvertRef.current = true;
                    setUnit(it.unit);
                    if (it.tab === "convert") {
                      setRealLen(it.inputs.realLen);
                      setRealArea(it.inputs.realArea);
                      setRealW(it.inputs.realW);
                      setRealH(it.inputs.realH);
                      setRealD(it.inputs.realD);
                    } else if (it.tab === "reverse") {
                      setModelLen(it.inputs.modelLen);
                      setModelArea(it.inputs.modelArea);
                      setModelW(it.inputs.modelW);
                      setModelH(it.inputs.modelH);
                      setModelD(it.inputs.modelD);
                    } else {
                      setPaperSize(it.inputs.paperSize);
                    }
                    setStatus({ state: "ok", text: "Loaded from history." });
                  },
                  className:
                    "text-left rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] px-4 py-3 transition-colors",
                },
                [
                  h("div", { key: "t", className: "text-xs font-extrabold tracking-wide text-[var(--st-fg)]" }, label),
                  h("div", { key: "s", className: "text-[11px] mt-1 text-[var(--st-muted)] font-semibold" }, `Unit ${it.unit}`),
                ]
              );
            })),
      ]);
    }

    function QuickChips() {
      return h("div", { className: "flex flex-wrap gap-2 mt-3" }, quickChips.map((c) =>
        h(ChipButton, { key: c.label, label: c.label, onClick: c.apply })
      ));
    }

    function InputsPanel() {
      const active = tab === "convert" ? "convert" : tab === "reverse" ? "reverse" : "paper";
      return h("div", {}, [
        h(TabBar, {}),
        h(ScaleSelector, {}),
        h(UnitSwitcher, {}),

        tab !== "paper"
          ? h("div", { className: "bg-[var(--st-bg)] border border-[var(--st-border)] rounded-3xl p-5" }, [
              // 2D
              h(SectionTitle, {
                label: tab === "convert" ? "2D (real → model)" : "2D (model → real)",
                hint: "Length + area at selected scale",
              }),
              h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-5" }, [
                h(Field, {
                  label: tab === "convert" ? `Real length (${unitLabel(unit)})` : `Model length (${unitLabel(unit)})`,
                  children: h(LenInput, { value: tab === "convert" ? realLen : modelLen, onChange: tab === "convert" ? setRealLen : setModelLen, placeholder: isFt ? "e.g., 5-10" : "e.g., 4.2" }),
                }),
                h(Field, {
                  label: tab === "convert" ? `Real area (${areaUnitLabel(unit)})` : `Model area (${areaUnitLabel(unit)})`,
                  children: h(AreaInput, { value: tab === "convert" ? realArea : modelArea, onChange: tab === "convert" ? setRealArea : setModelArea, placeholder: "e.g., 12.5" }),
                }),
              ]),
              h(QuickChips, {}),

              // divider
              h("div", { className: "h-px bg-[var(--st-border)] my-6" }),

              // 3D
              h(SectionTitle, { label: "3D (dimensions + volume)", hint: "Width × height × depth" }),
              h("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4" }, [
                h(Field, { label: tab === "convert" ? `Width (${unitLabel(unit)})` : `Width (${unitLabel(unit)})`, children: h(LenInput, { value: tab === "convert" ? realW : modelW, onChange: tab === "convert" ? setRealW : setModelW, placeholder: "e.g., 3" }) }),
                h(Field, { label: tab === "convert" ? `Height (${unitLabel(unit)})` : `Height (${unitLabel(unit)})`, children: h(LenInput, { value: tab === "convert" ? realH : modelH, onChange: tab === "convert" ? setRealH : setModelH, placeholder: "e.g., 2.7" }) }),
                h(Field, { label: tab === "convert" ? `Depth (${unitLabel(unit)})` : `Depth (${unitLabel(unit)})`, children: h(LenInput, { value: tab === "convert" ? realD : modelD, onChange: tab === "convert" ? setRealD : setModelD, placeholder: "e.g., 1.5" }) }),
              ]),
            ])
          : h("div", { className: "bg-[var(--st-bg)] border border-[var(--st-border)] rounded-3xl p-5" }, [
              h(SectionTitle, { label: "Paper size calculator", hint: "How much real area fits at your scale" }),
              h(Field, {
                label: "Select paper size (A0–A4)",
                children: h("select", {
                  value: paperSize,
                  onChange: (e) => setPaperSize(e.target.value),
                  className:
                    "w-full h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 text-[var(--st-fg)]",
                }, Object.keys(PAPER_SIZES).map((k) => h("option", { key: k, value: k }, k))),
              }),
              h("div", { className: "mt-4 text-xs text-[var(--st-muted)] font-semibold" }, "Tip: change scale presets and instantly see the real area that fits."),
            ]),

        h("div", { className: "mt-5" }, [
          h(HistoryPanel, {}),
        ]),

        h("div", { className: "mt-5 flex gap-3" }, [
          h(
            "button",
            {
              type: "button",
              onClick: onReset,
              className: "w-full h-12 rounded-2xl bg-[var(--st-bg)] border border-[var(--st-border)] text-[var(--st-fg)] font-extrabold hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors",
            },
            "Reset"
          ),
        ]),
      ]);
    }

    function renderMainToolContent() {
      if (activeTool === "room") {
        const rt = ROOM_PROGRAM_TYPES.find((r) => r.id === roomProgramTypeId) ?? ROOM_PROGRAM_TYPES[0];
        return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
          h(Card, {
            title: "Room Program",
            hint: "Inputs",
            children: h("div", { className: "space-y-4" }, [
              h(SectionTitle, {
                label: "Room type",
                hint: "Guideline minimums are indicative — verify with local codes.",
              }),
              h(Field, {
                label: "Select",
                children: h(
                  "select",
                  {
                    value: roomProgramTypeId,
                    onChange: (e) => setRoomProgramTypeId(e.target.value),
                    className:
                      "w-full h-[52px] rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 text-sm font-semibold text-[var(--st-fg)] focus:outline-none focus:border-[var(--st-accent)]",
                  },
                  ROOM_PROGRAM_TYPES.map((opt) => h("option", { key: opt.id, value: opt.id }, opt.name))
                ),
              }),
              h(
                "div",
                {
                  className:
                    "rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)]/30 px-4 py-3 text-xs font-semibold text-[var(--st-muted)] space-y-1",
                },
                [
                  h("div", { key: "a" }, `Recommended minimum area: ${formatSmartNumber(rt.minAreaM2)} m²`),
                  h("div", { key: "d" }, `Recommended minimum dimension: ${formatSmartNumber(rt.minDimM)} m`),
                ]
              ),
              h(Field, {
                label: "Area (m²) — override if needed",
                children: h(InputBase, {
                  value: roomProgramAreaStr,
                  onChange: setRoomProgramAreaStr,
                  placeholder: "e.g., 12.0",
                  type: "number",
                  step: "any",
                  min: 0,
                }),
              }),
              h(
                "button",
                {
                  type: "button",
                  onClick: addRoomToProgram,
                  className:
                    "w-full h-12 rounded-2xl bg-[var(--st-accent)] text-white font-extrabold tracking-wide hover:brightness-110 transition-colors duration-150",
                },
                "Add to list"
              ),
            ]),
          }),
          h(Card, {
            title: "Room list",
            hint: "Program & export",
            tone: "results",
            children: h("div", { className: "space-y-4" }, [
              roomProgramRows.length === 0
                ? h(
                    "div",
                    { className: "text-sm font-semibold text-[var(--st-muted)]" },
                    "No rooms yet. Add a room from the left."
                  )
                : h(
                    "div",
                    { className: "overflow-x-auto rounded-2xl border border-[var(--st-border)]" },
                    h(
                      "table",
                      { className: "w-full text-left text-sm border-collapse" },
                      [
                        h(
                          "thead",
                          { className: "bg-[color-mix(in_srgb,var(--st-fg)_8%,var(--st-bg))] text-[10px] font-extrabold tracking-[.18em] uppercase text-[var(--st-muted)]" },
                          h("tr", {}, [
                            h("th", { className: "px-4 py-3 border-b border-[var(--st-border)]" }, "Name"),
                            h("th", { className: "px-4 py-3 border-b border-[var(--st-border)]" }, "Min area"),
                            h("th", { className: "px-4 py-3 border-b border-[var(--st-border)]" }, "Your area"),
                            h("th", { className: "px-4 py-3 border-b border-[var(--st-border)] w-24" }, ""),
                          ])
                        ),
                        h(
                          "tbody",
                          {},
                          roomProgramRows.map((row) =>
                            h("tr", { key: row.uid, className: "border-b border-[var(--st-border)] last:border-0 bg-[var(--st-bg)]/50" }, [
                              h("td", { className: "px-4 py-3 font-bold text-[var(--st-fg)]" }, row.name),
                              h("td", { className: "px-4 py-3 font-semibold text-[var(--st-fg)]" }, `${formatSmartNumber(row.minAreaM2)} m²`),
                              h("td", { className: "px-4 py-3 font-semibold text-[var(--st-fg)]" }, `${formatSmartNumber(row.userAreaM2)} m²`),
                              h("td", { className: "px-4 py-3" }, [
                                h(
                                  "button",
                                  {
                                    type: "button",
                                    onClick: () => removeRoomProgramRow(row.uid),
                                    className:
                                      "text-xs font-extrabold tracking-wide uppercase text-red-600 dark:text-red-400 hover:underline",
                                  },
                                  "Delete"
                                ),
                              ]),
                            ])
                          )
                        ),
                      ]
                    )
                  ),
              h("div", { className: "flex items-baseline justify-between gap-4 pt-4 border-t border-[var(--st-border)]" }, [
                h(
                  "div",
                  { className: "text-[11px] font-extrabold tracking-[.22em] uppercase text-[var(--st-muted)]" },
                  "Total program area"
                ),
                h("div", { className: "text-2xl font-black text-[var(--st-fg)]" }, `${formatSmartNumber(roomProgramTotal)} m²`),
              ]),
              h("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2" }, [
                h(
                  "button",
                  {
                    type: "button",
                    onClick: onCopy,
                    className:
                      "h-12 rounded-2xl bg-[var(--st-accent)] text-white font-extrabold tracking-wide hover:brightness-110 transition-colors duration-150",
                  },
                  "Copy as text"
                ),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: exportRoomProgramCSV,
                    className:
                      "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150",
                  },
                  "Export CSV"
                ),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: () => setPdfModalOpen(true),
                    className:
                      "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150",
                  },
                  "Export PDF"
                ),
              ]),
            ]),
          }),
        ]);
      }

      if (activeTool === "parking") {
        const pr = parkingResult;
        const effBadgeClass =
          pr && pr.effLevel === "efficient"
            ? "border border-[#16A34A]/45 bg-[#16A34A]/12 text-[#166534] dark:text-[#86EFAC]"
            : pr && pr.effLevel === "acceptable"
              ? "border border-[#CA8A04]/45 bg-[#CA8A04]/12 text-[#854D0E] dark:text-[#FDE047]"
              : pr
                ? "border border-[#DC2626]/45 bg-[#DC2626]/12 text-[#991B1B] dark:text-[#FCA5A5]"
                : "border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-muted)]";

        const layoutSvg = pr
          ? h(
              "svg",
              {
                viewBox: "0 0 320 140",
                className:
                  "w-full h-auto max-h-52 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)]/40 text-[var(--st-fg)]",
                "aria-hidden": true,
              },
              [
                [0, 1, 2, 3].map((i) =>
                  h("rect", {
                    key: "ts" + i,
                    x: 20 + i * 70,
                    y: 16,
                    width: 60,
                    height: 34,
                    rx: 2,
                    className: "fill-zinc-200 dark:fill-zinc-800 stroke-zinc-400 dark:stroke-zinc-500",
                    strokeWidth: 1,
                  })
                ),
                h("rect", {
                  x: 20,
                  y: 56,
                  width: 280,
                  height: 24,
                  rx: 2,
                  className: "fill-zinc-300/90 dark:fill-zinc-600/80 stroke-zinc-500 dark:stroke-zinc-400",
                  strokeWidth: 1,
                }),
                h(
                  "text",
                  {
                    x: 160,
                    y: 72,
                    textAnchor: "middle",
                    className: "fill-current text-[9px] font-extrabold",
                    style: { fontFamily: "system-ui, sans-serif" },
                  },
                  `Aisle ${formatSmartNumber(pr.aisleM)} m`
                ),
                [0, 1, 2, 3].map((i) =>
                  h("rect", {
                    key: "bs" + i,
                    x: 20 + i * 70,
                    y: 86,
                    width: 60,
                    height: 34,
                    rx: 2,
                    className: "fill-zinc-200 dark:fill-zinc-800 stroke-zinc-400 dark:stroke-zinc-500",
                    strokeWidth: 1,
                  })
                ),
              ]
            )
          : h(
              "div",
              {
                className:
                  "rounded-2xl border border-dashed border-[var(--st-border)] bg-[color-mix(in_srgb,var(--st-fg)_4%,var(--st-bg))] p-10 text-center text-xs font-semibold text-[var(--st-muted)]",
              },
              "Enter a valid parking area to preview the layout."
            );

        return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
          h(Card, {
            title: "Parking Calculator",
            hint: "Inputs",
            children: h("div", { className: "space-y-4" }, [
              h(SectionTitle, {
                label: "Parking area",
                hint: "Gross floor area allocated to parking",
              }),
              h(Field, {
                label: "Total parking area (m²)",
                children: h(InputBase, {
                  value: parkingAreaM2,
                  onChange: setParkingAreaM2,
                  placeholder: "e.g., 1000",
                  type: "number",
                  step: "any",
                  min: 0,
                }),
              }),
              h(SectionTitle, { label: "Parking type", hint: "Standard stall and aisle module" }),
              h("div", { className: "flex flex-wrap gap-2" }, [
                h(ValueButton, { active: parkingLayout === "parallel", onClick: () => setParkingLayout("parallel") }, "Parallel"),
                h(ValueButton, { active: parkingLayout === "perpendicular", onClick: () => setParkingLayout("perpendicular") }, "Perpendicular (90°)"),
                h(ValueButton, { active: parkingLayout === "angled", onClick: () => setParkingLayout("angled") }, "Angled (45°)"),
              ]),
              h(SectionTitle, { label: "Usage type", hint: "Adjusts circulation / module factor" }),
              h("div", { className: "flex flex-wrap gap-2" }, [
                h(ValueButton, { active: parkingUsage === "residential", onClick: () => setParkingUsage("residential") }, "Residential"),
                h(ValueButton, { active: parkingUsage === "office", onClick: () => setParkingUsage("office") }, "Office / Commercial"),
                h(ValueButton, { active: parkingUsage === "hospital", onClick: () => setParkingUsage("hospital") }, "Hospital"),
                h(ValueButton, { active: parkingUsage === "mall", onClick: () => setParkingUsage("mall") }, "Shopping Mall"),
              ]),
              h(
                "div",
                {
                  className:
                    "rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)]/30 px-4 py-3 text-[11px] font-semibold text-[var(--st-muted)] leading-relaxed",
                },
                "Modules use double-loaded aisles: parallel stalls 2.2×6 m; perpendicular & angled stalls 2.5×5 m with aisles as listed."
              ),
            ]),
          }),
          h(Card, {
            title: "Results",
            hint: "Capacity and efficiency",
            tone: "results",
            children: h("div", { className: "space-y-5" }, [
              h(
                "div",
                { className: classNames("inline-flex items-center h-9 px-4 rounded-full text-[10px] font-extrabold tracking-[.18em] uppercase", effBadgeClass) },
                pr ? pr.effLabel : "—"
              ),
              layoutSvg,
              pr
                ? h("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, [
                    h(ValueBlock, {
                      label: "Parking spaces",
                      valueText: String(pr.spaces),
                      unitText: "spaces",
                      big: true,
                    }),
                    h(ValueBlock, {
                      label: "Required aisle width",
                      valueText: formatSmartNumber(pr.aisleM),
                      unitText: "m",
                      big: true,
                    }),
                    h(ValueBlock, {
                      label: "Single space (W × D)",
                      valueText: `${formatSmartNumber(pr.spaceDimW)} × ${formatSmartNumber(pr.spaceDimD)}`,
                      unitText: "m",
                      big: false,
                    }),
                    h(ValueBlock, {
                      label: "Efficiency",
                      valueText: formatSmartNumber(pr.efficiencyPct),
                      unitText: "%",
                      big: false,
                    }),
                  ])
                : null,
              pr
                ? h("div", { className: "rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 py-3 text-sm font-semibold text-[var(--st-fg)]" }, [
                    h("span", { className: "text-[var(--st-muted)] font-bold uppercase text-[10px] tracking-[.2em] mr-2" }, "Ramp required"),
                    pr.rampRequired ? "Yes (area > 500 m²)" : "No",
                  ])
                : null,
              h("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2" }, [
                h(
                  "button",
                  {
                    type: "button",
                    onClick: onCopy,
                    className:
                      "h-12 rounded-2xl bg-[var(--st-accent)] text-white font-extrabold tracking-wide hover:brightness-110 transition-colors duration-150",
                  },
                  "Copy as text"
                ),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: () => setPdfModalOpen(true),
                    className:
                      "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150 sm:col-span-1",
                  },
                  "Export PDF"
                ),
              ]),
            ]),
          }),
        ]);
      }

      if (activeTool === "daylight") {
        const dr = daylightResult;
        const compBadgeClass =
          dr && dr.complianceLevel === "green"
            ? "border border-[#16A34A]/45 bg-[#16A34A]/12 text-[#166534] dark:text-[#86EFAC]"
            : dr && dr.complianceLevel === "yellow"
              ? "border border-[#CA8A04]/45 bg-[#CA8A04]/12 text-[#854D0E] dark:text-[#FDE047]"
              : dr
                ? "border border-[#DC2626]/45 bg-[#DC2626]/12 text-[#991B1B] dark:text-[#FCA5A5]"
                : "border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-muted)]";

        const penFrac = dr && dr.depthM > 0 ? Math.min(1, dr.penetrationM / dr.depthM) : 0;
        const xPen = 56 + penFrac * 210;

        const sectionSvg = dr
          ? h(
              "svg",
              {
                viewBox: "0 0 320 140",
                className:
                  "w-full h-auto max-h-56 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)]/40 text-[var(--st-fg)]",
                "aria-hidden": true,
              },
              [
                h("defs", {}, [
                  h(
                    "linearGradient",
                    { id: "daylightPenGrad", x1: "0%", y1: "0%", x2: "100%", y2: "0%" },
                    [
                      h("stop", { offset: "0%", stopColor: "rgb(253 224 71)", stopOpacity: 0.55 }),
                      h("stop", { offset: "100%", stopColor: "rgb(253 224 71)", stopOpacity: 0.08 }),
                    ]
                  ),
                ]),
                h("rect", {
                  x: 56,
                  y: 48,
                  width: 210,
                  height: 56,
                  className: "fill-zinc-100 dark:fill-zinc-800/80 stroke-zinc-400 dark:stroke-zinc-500",
                  strokeWidth: 1,
                }),
                h("polygon", {
                  points: `56,58 56,88 ${xPen},104 56,104`,
                  fill: "url(#daylightPenGrad)",
                }),
                h("rect", {
                  x: 46,
                  y: 62,
                  width: 6,
                  height: 28,
                  rx: 1,
                  className: "fill-sky-200 dark:fill-sky-500/60 stroke-sky-400 dark:stroke-sky-500",
                  strokeWidth: 1,
                }),
                h("line", { x1: 56, y1: 104, x2: 266, y2: 104, stroke: "currentColor", strokeWidth: 1, opacity: 0.45 }),
                h(
                  "text",
                  {
                    x: 160,
                    y: 128,
                    textAnchor: "middle",
                    className: "fill-current text-[9px] font-extrabold",
                    style: { fontFamily: "system-ui, sans-serif" },
                  },
                  `Daylight zone ≈ ${formatSmartNumber(dr.penetrationM)} m deep`
                ),
              ]
            )
          : h(
              "div",
              {
                className:
                  "rounded-2xl border border-dashed border-[var(--st-border)] bg-[color-mix(in_srgb,var(--st-fg)_4%,var(--st-bg))] p-10 text-center text-xs font-semibold text-[var(--st-muted)]",
              },
              "Enter valid dimensions to preview daylight penetration."
            );

        return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
          h(Card, {
            title: "Daylight Calculator",
            hint: "Inputs",
            children: h("div", { className: "space-y-4" }, [
              h(SectionTitle, {
                label: "Room",
                hint: "Category sets EN 17037 minimum daylight factor",
              }),
              h(Field, {
                label: "Room type",
                children: h(
                  "select",
                  {
                    value: daylightRoomType,
                    onChange: (e) => setDaylightRoomType(e.target.value),
                    className:
                      "w-full h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 text-[var(--st-fg)]",
                  },
                  DAYLIGHT_ROOM_TYPES.map((t) => h("option", { key: t.id, value: t.id }, t.label))
                ),
              }),
              h(Field, {
                label: "Floor area (m²)",
                children: h(InputBase, {
                  value: daylightFloorM2,
                  onChange: setDaylightFloorM2,
                  placeholder: "e.g., 24",
                  type: "number",
                  step: "any",
                  min: 0,
                }),
              }),
              h(Field, {
                label: "Total window area (m²)",
                children: h(InputBase, {
                  value: daylightWindowM2,
                  onChange: setDaylightWindowM2,
                  placeholder: "e.g., 3",
                  type: "number",
                  step: "any",
                  min: 0,
                }),
              }),
              h(Field, {
                label: "Room depth (m)",
                children: h(InputBase, {
                  value: daylightDepthM,
                  onChange: setDaylightDepthM,
                  placeholder: "e.g., 5",
                  type: "number",
                  step: "any",
                  min: 0,
                }),
              }),
              h(SectionTitle, { label: "Facade orientation", hint: "Affects indicative DF and penetration" }),
              h("div", { className: "flex flex-wrap gap-2" }, [
                h(ValueButton, { active: daylightFacade === "north", onClick: () => setDaylightFacade("north") }, "North"),
                h(ValueButton, { active: daylightFacade === "south", onClick: () => setDaylightFacade("south") }, "South"),
                h(ValueButton, { active: daylightFacade === "east", onClick: () => setDaylightFacade("east") }, "East"),
                h(ValueButton, { active: daylightFacade === "west", onClick: () => setDaylightFacade("west") }, "West"),
              ]),
              h(
                "div",
                {
                  className:
                    "rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)]/30 px-4 py-3 text-[11px] font-semibold text-[var(--st-muted)] leading-relaxed",
                },
                `EN 17037 minimum daylight factor: ${formatSmartNumber(2)}% (bedroom, living room, kitchen, hospital room) / ${formatSmartNumber(3)}% (office, classroom). IES metrics (e.g. LM-83) as secondary reference.`
              ),
            ]),
          }),
          h(Card, {
            title: "Results",
            hint: "EN 17037 primary · IES reference",
            tone: "results",
            children: h("div", { className: "space-y-5" }, [
              h(
                "div",
                { className: classNames("inline-flex items-center h-9 px-4 rounded-full text-[10px] font-extrabold tracking-[.18em] uppercase", compBadgeClass) },
                dr ? dr.complianceLabel : "—"
              ),
              sectionSvg,
              dr
                ? h("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, [
                    h(ValueBlock, {
                      label: "Window-to-floor ratio",
                      valueText: formatSmartNumber(dr.wfrPct),
                      unitText: "%",
                      big: true,
                    }),
                    h(ValueBlock, {
                      label: "Daylight factor (estimate)",
                      valueText: formatSmartNumber(dr.dfPct),
                      unitText: "%",
                      big: true,
                    }),
                    h(ValueBlock, {
                      label: "Penetration depth",
                      valueText: formatSmartNumber(dr.penetrationM),
                      unitText: "m",
                      big: false,
                    }),
                    h(ValueBlock, {
                      label: "EN 17037 min DF",
                      valueText: formatSmartNumber(dr.enDfMin),
                      unitText: "%",
                      big: false,
                    }),
                  ])
                : null,
              dr
                ? h("div", { className: "space-y-2 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 py-3" }, [
                    h("div", { className: "text-[10px] font-bold tracking-[.2em] uppercase text-[var(--st-muted)]" }, "Compliance (indicative)"),
                    h("div", { className: "text-xs font-semibold text-[var(--st-muted)] mb-1" }, "Primary: EN 17037 · Secondary: IES daylight metrics"),
                    h("div", { className: "text-sm font-semibold text-[var(--st-fg)]" }, [
                      `EN 17037 (min DF ${formatSmartNumber(dr.enDfMin)}% for ${dr.roomLabel}): `,
                      h("span", { className: dr.enOk ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400" }, dr.enOk ? "Pass" : "Fail"),
                    ]),
                  ])
                : null,
              dr
                ? h("div", { className: "space-y-2" }, [
                    h("div", { className: "text-[10px] font-bold tracking-[.2em] uppercase text-[var(--st-muted)]" }, "Recommendations"),
                    h(
                      "ul",
                      { className: "list-disc space-y-1.5 pl-5 text-sm font-semibold text-[var(--st-muted)]" },
                      dr.recommendations.length
                        ? dr.recommendations.map((s, i) => h("li", { key: i }, s))
                        : [h("li", { key: "ok" }, "No changes required for indicative EN 17037 targets.")]
                    ),
                  ])
                : null,
              h("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2" }, [
                h(
                  "button",
                  {
                    type: "button",
                    onClick: onCopy,
                    className:
                      "h-12 rounded-2xl bg-[var(--st-accent)] text-white font-extrabold tracking-wide hover:brightness-110 transition-colors duration-150",
                  },
                  "Copy as text"
                ),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: () => setPdfModalOpen(true),
                    className:
                      "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150",
                  },
                  "Export PDF"
                ),
              ]),
            ]),
          }),
        ]);
      }

      if (activeTool === "fireEscape") {
        const fr = fireEscapeResult;
        const fireBadgeClass =
          fr && fr.complianceLevel === "full"
            ? "border border-[#16A34A]/45 bg-[#16A34A]/12 text-[#166534] dark:text-[#86EFAC]"
            : fr && fr.complianceLevel === "marginal"
              ? "border border-[#CA8A04]/45 bg-[#CA8A04]/12 text-[#854D0E] dark:text-[#FDE047]"
              : fr
                ? "border border-[#DC2626]/45 bg-[#DC2626]/12 text-[#991B1B] dark:text-[#FCA5A5]"
                : "border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-muted)]";

        const travelRatioVis = fr && fr.maxTravelM > 0 ? Math.min(1, fr.travelM / fr.maxTravelM) : 0;

        const floorSvg = fr
          ? h(
              "svg",
              {
                viewBox: "0 0 320 180",
                className:
                  "w-full h-auto max-h-64 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)]/40 text-[var(--st-fg)]",
                "aria-hidden": true,
              },
              [
                h("rect", {
                  x: 40,
                  y: 40,
                  width: 240,
                  height: 120,
                  rx: 2,
                  className: "fill-zinc-100 dark:fill-zinc-800/80 stroke-zinc-400 dark:stroke-zinc-500",
                  strokeWidth: 1,
                }),
                h("rect", {
                  x: 48,
                  y: 148,
                  width: 44,
                  height: 12,
                  rx: 1,
                  className: "fill-emerald-300/90 dark:fill-emerald-700/80 stroke-emerald-600 dark:stroke-emerald-500",
                  strokeWidth: 1,
                }),
                h("rect", {
                  x: 228,
                  y: 148,
                  width: 44,
                  height: 12,
                  rx: 1,
                  className: "fill-emerald-300/90 dark:fill-emerald-700/80 stroke-emerald-600 dark:stroke-emerald-500",
                  strokeWidth: 1,
                }),
                h("text", { x: 70, y: 162, className: "fill-current text-[7px] font-bold" }, "EXIT"),
                h("text", { x: 238, y: 162, className: "fill-current text-[7px] font-bold" }, "EXIT"),
                h("circle", { cx: 56, cy: 52, r: 5, className: "fill-red-500/90 stroke-red-700 dark:stroke-red-400", strokeWidth: 1 }),
                h(
                  "path",
                  {
                    d: `M 56 52 Q ${56 + 70 + travelRatioVis * 40} ${100 + travelRatioVis * 20} 248 152`,
                    fill: "none",
                    className: "stroke-amber-500 dark:stroke-amber-400",
                    strokeWidth: 2,
                    strokeDasharray: "5 4",
                    opacity: 0.95,
                  }
                ),
                h(
                  "text",
                  {
                    x: 160,
                    y: 176,
                    textAnchor: "middle",
                    className: "fill-current text-[9px] font-extrabold",
                    style: { fontFamily: "system-ui, sans-serif" },
                  },
                  `Travel ${formatSmartNumber(fr.travelM)} m (max ${formatSmartNumber(fr.maxTravelM)} m)`
                ),
              ]
            )
          : h(
              "div",
              {
                className:
                  "rounded-2xl border border-dashed border-[var(--st-border)] bg-[color-mix(in_srgb,var(--st-fg)_4%,var(--st-bg))] p-10 text-center text-xs font-semibold text-[var(--st-muted)]",
              },
              "Enter valid inputs to preview travel path and exits."
            );

        return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
          h(Card, {
            title: "Fire Escape Calculator",
            hint: "Inputs",
            children: h("div", { className: "space-y-4" }, [
              h(SectionTitle, {
                label: "Building",
                hint: "Occupancy type sets IBC travel distance limits",
              }),
              h(Field, {
                label: "Building use type",
                children: h(
                  "select",
                  {
                    value: fireBuildingType,
                    onChange: (e) => setFireBuildingType(e.target.value),
                    className:
                      "w-full h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 text-[var(--st-fg)]",
                  },
                  FIRE_BUILDING_TYPES.map((t) => h("option", { key: t.id, value: t.id }, t.label))
                ),
              }),
              h(Field, {
                label: "Floor area (m²)",
                children: h(InputBase, {
                  value: fireFloorM2,
                  onChange: setFireFloorM2,
                  placeholder: "e.g., 200",
                  type: "number",
                  step: "any",
                  min: 0,
                }),
              }),
              h(Field, {
                label: "Number of exits",
                children: h(InputBase, {
                  value: fireNumExits,
                  onChange: setFireNumExits,
                  placeholder: "e.g., 2",
                  type: "number",
                  step: 1,
                  min: 0,
                }),
              }),
              h(Field, {
                label: "Maximum travel distance to nearest exit (m)",
                children: h(InputBase, {
                  value: fireTravelM,
                  onChange: setFireTravelM,
                  placeholder: "e.g., 45",
                  type: "number",
                  step: "any",
                  min: 0,
                }),
              }),
              h(Field, {
                label: "Number of floors",
                children: h(InputBase, {
                  value: fireFloors,
                  onChange: setFireFloors,
                  placeholder: "e.g., 1",
                  type: "number",
                  step: 1,
                  min: 1,
                }),
              }),
              h(SectionTitle, { label: "Sprinkler system", hint: "Affects maximum travel distance" }),
              h("div", { className: "flex flex-wrap gap-2" }, [
                h(ValueButton, { active: fireSprinkler === true, onClick: () => setFireSprinkler(true) }, "Yes"),
                h(ValueButton, { active: fireSprinkler === false, onClick: () => setFireSprinkler(false) }, "No"),
              ]),
              h(
                "div",
                {
                  className:
                    "rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)]/30 px-4 py-3 text-[11px] font-semibold text-[var(--st-muted)] leading-relaxed",
                },
                `IBC 2021: minimum ${formatSmartNumber(FIRE_EXIT_WIDTH_M)} m per exit; two exits required when floor area exceeds ${FIRE_AREA_TWO_EXIT_M2} m².`
              ),
            ]),
          }),
          h(Card, {
            title: "Results",
            hint: "IBC 2021 — indicative",
            tone: "results",
            children: h("div", { className: "space-y-5" }, [
              h(
                "div",
                { className: classNames("inline-flex items-center h-9 px-4 rounded-full text-[10px] font-extrabold tracking-[.18em] uppercase", fireBadgeClass) },
                fr ? fr.complianceLabel : "—"
              ),
              floorSvg,
              fr
                ? h("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, [
                    h(ValueBlock, {
                      label: "Maximum allowed travel distance",
                      valueText: formatSmartNumber(fr.maxTravelM),
                      unitText: "m",
                      big: true,
                    }),
                    h(ValueBlock, {
                      label: "Required minimum exits",
                      valueText: String(fr.requiredMinExits),
                      unitText: "exits",
                      big: true,
                    }),
                    h(ValueBlock, {
                      label: "Exit width requirement (total)",
                      valueText: formatSmartNumber(fr.exitWidthTotalMin),
                      unitText: "m",
                      big: false,
                    }),
                    h(ValueBlock, {
                      label: "Your travel distance",
                      valueText: formatSmartNumber(fr.travelM),
                      unitText: "m",
                      big: false,
                    }),
                  ])
                : null,
              fr
                ? h("div", { className: "rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 py-3 text-sm font-semibold text-[var(--st-fg)]" }, [
                    h("span", { className: "text-[var(--st-muted)] font-bold uppercase text-[10px] tracking-[.2em] mr-2" }, "Reference"),
                    "IBC 2021 — verify with AHJ and full code path.",
                  ])
                : null,
              fr && fr.failures.length
                ? h("div", { className: "space-y-2 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/30 px-4 py-3" }, [
                    h("div", { className: "text-[10px] font-bold tracking-[.2em] uppercase text-red-700 dark:text-red-300" }, "What fails"),
                    h(
                      "ul",
                      { className: "list-disc space-y-1.5 pl-5 text-sm font-semibold text-red-900 dark:text-red-200" },
                      fr.failures.map((f, i) => h("li", { key: i }, f))
                    ),
                  ])
                : null,
              h("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2" }, [
                h(
                  "button",
                  {
                    type: "button",
                    onClick: onCopy,
                    className:
                      "h-12 rounded-2xl bg-[var(--st-accent)] text-white font-extrabold tracking-wide hover:brightness-110 transition-colors duration-150",
                  },
                  "Copy as text"
                ),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: () => setPdfModalOpen(true),
                    className:
                      "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150",
                  },
                  "Export PDF"
                ),
              ]),
            ]),
          }),
        ]);
      }

      if (activeTool === "uValue") {
        const ur = uValueResult;
        const uBadgeClass =
          ur && ur.complianceLevel === "green"
            ? "border border-[#16A34A]/45 bg-[#16A34A]/12 text-[#166534] dark:text-[#86EFAC]"
            : ur && ur.complianceLevel === "yellow"
              ? "border border-[#CA8A04]/45 bg-[#CA8A04]/12 text-[#854D0E] dark:text-[#FDE047]"
              : ur
                ? "border border-[#DC2626]/45 bg-[#DC2626]/12 text-[#991B1B] dark:text-[#FCA5A5]"
                : "border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-muted)]";

        const twMmSvg = ur ? ur.layerRows.reduce((a, b) => a + b.thicknessMm, 0) : 0;
        const svgChildren = [];
        if (ur) {
          let cx = 24;
          const maxBar = 268;
          const barY = 28;
          const barH = 34;
          svgChildren.push(
            h(
              "text",
              { x: 160, y: 18, textAnchor: "middle", className: "fill-current text-[10px] font-extrabold" },
              "Layer build-up (inside → outside)"
            )
          );
          ur.layerRows.forEach((row) => {
            const segW = Math.max(10, twMmSvg > 0 ? (row.thicknessMm / twMmSvg) * maxBar : maxBar / ur.layerRows.length);
            const fill = U_LAYER_SVG_COLORS[row.materialId] || "#64748b";
            svgChildren.push(
              h("rect", {
                key: row.uid,
                x: cx,
                y: barY,
                width: segW,
                height: barH,
                rx: 2,
                fill,
                stroke: "rgba(0,0,0,0.25)",
                strokeWidth: 1,
              })
            );
            svgChildren.push(
              h(
                "text",
                {
                  key: "t" + row.uid,
                  x: cx + segW / 2,
                  y: barY + barH / 2 + 4,
                  textAnchor: "middle",
                  className: "fill-zinc-900 dark:fill-zinc-100 text-[8px] font-extrabold",
                  style: { textShadow: "0 0 2px rgba(255,255,255,0.8)" },
                },
                `${formatSmartNumber(row.thicknessMm)} mm`
              )
            );
            cx += segW;
          });
        }

        const uSvg = ur
          ? h(
              "svg",
              {
                viewBox: "0 0 320 88",
                className:
                  "w-full h-auto max-h-40 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)]/40 text-[var(--st-fg)]",
                "aria-hidden": true,
              },
              svgChildren
            )
          : h(
              "div",
              {
                className:
                  "rounded-2xl border border-dashed border-[var(--st-border)] bg-[color-mix(in_srgb,var(--st-fg)_4%,var(--st-bg))] p-10 text-center text-xs font-semibold text-[var(--st-muted)]",
              },
              "Enter valid layer thicknesses to preview build-up."
            );

        return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
          h(Card, {
            title: "Wall U-Value Calculator",
            hint: "Inputs",
            children: h("div", { className: "space-y-4" }, [
              h(SectionTitle, { label: "Climate & type", hint: "Thresholds: indicative ASHRAE 90.1 / EU EPBD" }),
              h(Field, {
                label: "Climate zone",
                children: h(
                  "select",
                  {
                    value: uClimateZone,
                    onChange: (e) => setUClimateZone(e.target.value),
                    className:
                      "w-full h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 text-[var(--st-fg)]",
                  },
                  U_VALUE_CLIMATES.map((c) => h("option", { key: c.id, value: c.id }, c.label))
                ),
              }),
              h(SectionTitle, { label: "Construction", hint: "Select envelope element" }),
              h("div", { className: "flex flex-wrap gap-2" }, [
                h(ValueButton, { active: uConstructionType === "external_wall", onClick: () => setUConstructionType("external_wall") }, "External Wall"),
                h(ValueButton, { active: uConstructionType === "roof", onClick: () => setUConstructionType("roof") }, "Roof"),
                h(ValueButton, { active: uConstructionType === "floor", onClick: () => setUConstructionType("floor") }, "Floor"),
                h(ValueButton, { active: uConstructionType === "window", onClick: () => setUConstructionType("window") }, "Window/Glazing"),
              ]),
              h(SectionTitle, { label: "Layer builder", hint: "1–8 layers; air gap uses fixed R = 0.18 m²K/W" }),
              ...uLayers.map((layer) =>
                h(
                  "div",
                  { key: layer.uid, className: "rounded-2xl border border-[var(--st-border)] bg-[color-mix(in_srgb,var(--st-fg)_4%,var(--st-bg))] p-3 space-y-3" },
                  [
                    h("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" }, [
                      h(Field, {
                        label: "Material",
                        children: h(
                          "select",
                          {
                            value: layer.materialId,
                            onChange: (e) => updateULayer(layer.uid, { materialId: e.target.value }),
                            className:
                              "w-full h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 text-[var(--st-fg)] text-sm",
                          },
                          U_VALUE_MATERIALS.map((m) => h("option", { key: m.id, value: m.id }, m.label))
                        ),
                      }),
                      h(Field, {
                        label: "Thickness (mm)",
                        children: h(InputBase, {
                          value: layer.thicknessMm,
                          onChange: (v) => updateULayer(layer.uid, { thicknessMm: v }),
                          placeholder: "e.g., 100",
                          type: "number",
                          step: "any",
                          min: 0,
                        }),
                      }),
                    ]),
                    h(
                      "button",
                      {
                        type: "button",
                        disabled: uLayers.length <= 1,
                        onClick: () => removeULayer(layer.uid),
                        className:
                          "h-9 px-4 rounded-xl border border-[var(--st-border)] bg-[var(--st-bg)] text-xs font-extrabold text-[var(--st-fg)] hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] disabled:opacity-40 disabled:cursor-not-allowed",
                      },
                      "Remove layer"
                    ),
                  ]
                )
              ),
              h(
                "button",
                {
                  type: "button",
                  disabled: uLayers.length >= 8,
                  onClick: addULayer,
                  className:
                    "w-full h-12 rounded-2xl bg-[var(--st-accent)] text-white font-extrabold tracking-wide hover:brightness-110 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed",
                },
                "Add layer"
              ),
              h(
                "div",
                {
                  className:
                    "rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)]/30 px-4 py-3 text-[11px] font-semibold text-[var(--st-muted)] leading-relaxed",
                },
                "λ from literature; R = d/λ per layer except air gap (fixed R). U = 1/(Rsi + ΣR + Rso). Window/glazing uses indicative max U per EPBD-style table."
              ),
            ]),
          }),
          h(Card, {
            title: "Results",
            hint: "ASHRAE 90.1 / EU EPBD (indicative)",
            tone: "results",
            children: h("div", { className: "space-y-5" }, [
              h(
                "div",
                { className: classNames("inline-flex items-center min-h-9 px-4 py-2 rounded-full text-[10px] font-extrabold tracking-[.12em] uppercase", uBadgeClass) },
                ur ? ur.complianceLabel : "—"
              ),
              uSvg,
              ur
                ? h("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, [
                    h(ValueBlock, {
                      label: "Total thickness",
                      valueText: formatSmartNumber(ur.totalThicknessMm),
                      unitText: "mm",
                      big: true,
                    }),
                    h(ValueBlock, {
                      label: "U-value",
                      valueText: formatUValue(ur.U),
                      unitText: "W/m²K",
                      big: true,
                    }),
                    h(ValueBlock, {
                      label: "R-value total",
                      valueText: formatSmartNumber(ur.Rtotal),
                      unitText: "m²K/W",
                      big: false,
                    }),
                    h(ValueBlock, {
                      label: "Max U (climate)",
                      valueText: formatUValue(ur.uMax),
                      unitText: "W/m²K",
                      big: false,
                    }),
                  ])
                : null,
              ur && ur.improvementWm2K > 0
                ? h("div", { className: "rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 text-sm font-semibold text-amber-950 dark:text-amber-100" }, [
                    h("span", { className: "text-[10px] font-bold uppercase tracking-[.2em] text-amber-800 dark:text-amber-300 mr-2" }, "Improvement"),
                    `Reduce U-value by at least ${formatUValue(ur.improvementWm2K)} W/m²K to meet indicative max U (${formatUValue(ur.uMax)} W/m²K).`,
                  ])
                : null,
              ur
                ? h("div", { className: "text-[11px] font-semibold text-[var(--st-muted)]" }, "Reference: ASHRAE 90.1 & EU EPBD-style limits — verify nationally.")
                : null,
              h("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2" }, [
                h(
                  "button",
                  {
                    type: "button",
                    onClick: onCopy,
                    className:
                      "h-12 rounded-2xl bg-[var(--st-accent)] text-white font-extrabold tracking-wide hover:brightness-110 transition-colors duration-150",
                  },
                  "Copy as text"
                ),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: () => setPdfModalOpen(true),
                    className:
                      "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150",
                  },
                  "Export PDF"
                ),
              ]),
            ]),
          }),
        ]);
      }

      if (activeTool === "siteCoverage") {
        const sr = siteCoverageResult;
        const siteBadgeClass =
          sr && sr.complianceLevel === "green"
            ? "border border-[#16A34A]/45 bg-[#16A34A]/12 text-[#166534] dark:text-[#86EFAC]"
            : sr && sr.complianceLevel === "yellow"
              ? "border border-[#CA8A04]/45 bg-[#CA8A04]/12 text-[#854D0E] dark:text-[#FDE047]"
              : sr
                ? "border border-[#DC2626]/45 bg-[#DC2626]/12 text-[#991B1B] dark:text-[#FCA5A5]"
                : "border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-muted)]";

        const plotX = 28;
        const plotY = 24;
        const plotW = 264;
        const plotH = 118;
        const sf = sr ? Math.sqrt(Math.max(0, Math.min(1, sr.scr))) : 0;
        const fpW = plotW * sf;
        const fpH = plotH * sf;
        const fpX = plotX + (plotW - fpW) / 2;
        const fpY = plotY + (plotH - fpH) / 2;
        const basementH = 22;

        const siteSvg = sr
          ? h(
              "svg",
              {
                viewBox: "0 0 320 200",
                className:
                  "w-full h-auto max-h-64 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)]/40 text-[var(--st-fg)]",
                "aria-hidden": true,
              },
              [
                h("defs", {}, [
                  h(
                    "pattern",
                    { id: "siteOpenPattern", patternUnits: "userSpaceOnUse", width: 8, height: 8 },
                    [
                      h("path", {
                        d: "M0 8 L8 0 M-2 2 L2 -2 M6 10 L10 6",
                        className: "stroke-emerald-300/50 dark:stroke-emerald-600/40",
                        strokeWidth: 1,
                        fill: "none",
                      }),
                    ]
                  ),
                ]),
                h("rect", {
                  x: plotX,
                  y: plotY,
                  width: plotW,
                  height: plotH,
                  rx: 3,
                  className: "fill-emerald-100/95 dark:fill-emerald-950/50 stroke-zinc-400 dark:stroke-zinc-500",
                  strokeWidth: 1.5,
                }),
                h("rect", {
                  x: plotX,
                  y: plotY,
                  width: plotW,
                  height: plotH,
                  rx: 3,
                  fill: "url(#siteOpenPattern)",
                  className: "stroke-none",
                  opacity: 0.85,
                }),
                fpW > 1 && fpH > 1
                  ? h("rect", {
                      x: fpX,
                      y: fpY,
                      width: Math.max(fpW, 2),
                      height: Math.max(fpH, 2),
                      rx: 2,
                      className: "fill-zinc-400/90 dark:fill-zinc-500/85 stroke-zinc-600 dark:stroke-zinc-400",
                      strokeWidth: 1.2,
                    })
                  : null,
                h(
                  "text",
                  {
                    x: plotX + 8,
                    y: plotY + 16,
                    className: "fill-emerald-900 dark:fill-emerald-200 text-[9px] font-extrabold",
                    style: { fontFamily: "system-ui, sans-serif" },
                  },
                  `Open ${formatSmartNumber(sr.openSpaceRatioPct)}%`
                ),
                fpW > 16 && fpH > 14
                  ? h(
                      "text",
                      {
                        x: fpX + Math.max(fpW, 2) / 2,
                        y: fpY + Math.max(fpH, 2) / 2 + 3,
                        textAnchor: "middle",
                        className: "fill-zinc-950 dark:fill-zinc-50 text-[9px] font-extrabold",
                        style: { fontFamily: "system-ui, sans-serif", textShadow: "0 0 4px rgba(255,255,255,0.9)" },
                      },
                      `Building ${formatSmartNumber(sr.footprintPct)}%`
                    )
                  : fpW > 1
                    ? h(
                        "text",
                        {
                          x: fpX + Math.max(fpW, 2) / 2,
                          y: fpY + Math.max(fpH, 2) / 2 + 3,
                          textAnchor: "middle",
                          className: "fill-zinc-950 dark:fill-zinc-50 text-[8px] font-extrabold",
                          style: { fontFamily: "system-ui, sans-serif" },
                        },
                        `${formatSmartNumber(sr.footprintPct)}%`
                      )
                    : null,
                sr.basementIncluded
                  ? h("g", { key: "basement" }, [
                      h("rect", {
                        x: fpX,
                        y: plotY + plotH + 6,
                        width: Math.max(fpW, 2),
                        height: basementH,
                        rx: 2,
                        className: "fill-slate-400/85 dark:fill-slate-600/80 stroke-slate-600 dark:stroke-slate-400",
                        strokeWidth: 1,
                      }),
                      h(
                        "text",
                        {
                          x: fpX + Math.max(fpW, 2) / 2,
                          y: plotY + plotH + 6 + basementH / 2 + 3,
                          textAnchor: "middle",
                          className: "fill-zinc-950 dark:fill-zinc-50 text-[8px] font-extrabold",
                          style: { fontFamily: "system-ui, sans-serif" },
                        },
                        `Basement ${formatSmartNumber(sr.basementAreaM2 ?? 0)} m²`
                      ),
                    ])
                  : null,
                h(
                  "text",
                  {
                    x: plotX + plotW / 2,
                    y: sr.basementIncluded ? plotY + plotH + basementH + 28 : plotY + plotH + 22,
                    textAnchor: "middle",
                    className: "fill-current text-[8px] font-bold opacity-70",
                    style: { fontFamily: "system-ui, sans-serif" },
                  },
                  "Plan proportions from SCR (indicative)"
                ),
              ]
            )
          : h(
              "div",
              {
                className:
                  "rounded-2xl border border-dashed border-[var(--st-border)] bg-[color-mix(in_srgb,var(--st-fg)_4%,var(--st-bg))] p-10 text-center text-xs font-semibold text-[var(--st-muted)]",
              },
              "Enter a valid plot, SCR (0–1), FAR (0–10), and floor count to preview the site plan."
            );

        return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
          h(Card, {
            title: "Site Coverage Calculator",
            hint: "Inputs",
            children: h("div", { className: "space-y-4" }, [
              h(SectionTitle, {
                label: "Plot & ratios",
                hint: "SCR = max footprint / plot; FAR = max total GFA / plot",
              }),
              h(Field, {
                label: "Total plot area (m²)",
                children: h(InputBase, {
                  value: sitePlotM2,
                  onChange: setSitePlotM2,
                  placeholder: "e.g., 1000",
                  type: "number",
                  step: "any",
                  min: 0,
                }),
              }),
              h(Field, {
                label: "Site coverage ratio — SCR (0.00 – 1.00)",
                children: h(InputBase, {
                  value: siteScrStr,
                  onChange: setSiteScrStr,
                  placeholder: "e.g., 0.4",
                  type: "number",
                  step: "0.01",
                  min: 0,
                  max: 1,
                }),
              }),
              h(Field, {
                label: "Floor area ratio — FAR (0.00 – 10.00)",
                children: h(InputBase, {
                  value: siteFarStr,
                  onChange: setSiteFarStr,
                  placeholder: "e.g., 1.2",
                  type: "number",
                  step: "0.1",
                  min: 0,
                  max: 10,
                }),
              }),
              h(Field, {
                label: "Number of floors (whole number, ≥ 1)",
                children: h(InputBase, {
                  value: siteFloorsStr,
                  onChange: setSiteFloorsStr,
                  placeholder: "e.g., 3",
                  type: "number",
                  step: 1,
                  min: 1,
                }),
              }),
              h(SectionTitle, { label: "Basement", hint: "Below-grade footprint matches max footprint when included" }),
              h("div", { className: "flex flex-wrap gap-2" }, [
                h(ValueButton, { active: siteBasement === false, onClick: () => setSiteBasement(false) }, "No"),
                h(ValueButton, { active: siteBasement === true, onClick: () => setSiteBasement(true) }, "Yes"),
              ]),
              h(
                "div",
                {
                  className:
                    "rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)]/30 px-4 py-3 text-[11px] font-semibold text-[var(--st-muted)] leading-relaxed",
                },
                "Checks assume a uniform footprint on each floor at max SCR. FAR cap applies to total GFA; basement policy varies by code — shown for reference only."
              ),
            ]),
          }),
          h(Card, {
            title: "Auto-calculate",
            hint: "Footprint, GFA & open space",
            tone: "results",
            children: h("div", { className: "space-y-5" }, [
              h(
                "div",
                { className: classNames("inline-flex items-center min-h-9 px-4 py-2 rounded-full text-[10px] font-extrabold tracking-[.12em] uppercase", siteBadgeClass) },
                sr ? sr.complianceLabel : "Enter valid inputs"
              ),
              siteSvg,
              sr
                ? h("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, [
                    h(ValueBlock, {
                      label: "Maximum footprint area",
                      valueText: formatSmartNumber(sr.maxFootprintM2),
                      unitText: "m²",
                      big: true,
                    }),
                    h(ValueBlock, {
                      label: "Maximum total floor area",
                      valueText: formatSmartNumber(sr.maxTotalGfaM2),
                      unitText: "m²",
                      big: true,
                    }),
                    h(ValueBlock, {
                      label: "Maximum floor area per floor",
                      valueText: formatSmartNumber(sr.maxGfaPerFloorM2),
                      unitText: "m²",
                      big: false,
                    }),
                    h(ValueBlock, {
                      label: "Remaining plot area (open)",
                      valueText: formatSmartNumber(sr.remainingPlotM2),
                      unitText: "m²",
                      big: false,
                    }),
                    h(ValueBlock, {
                      label: "Open space ratio",
                      valueText: formatSmartNumber(sr.openSpaceRatioPct),
                      unitText: "%",
                      big: false,
                    }),
                    h(ValueBlock, {
                      label: "GFA demand (footprint × floors)",
                      valueText: formatSmartNumber(sr.gfaDemandM2),
                      unitText: "m²",
                      big: false,
                    }),
                  ])
                : null,
              sr && sr.basementIncluded && sr.basementAreaM2 != null
                ? h("div", { className: "rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/40 px-4 py-3" }, [
                    h("div", { className: "text-[10px] font-extrabold tracking-[.2em] uppercase text-slate-600 dark:text-slate-400 mb-1" }, "Basement (below grade)"),
                    h("div", { className: "text-lg font-black text-[var(--st-fg)]" }, `${formatSmartNumber(sr.basementAreaM2)} m²`),
                  ])
                : null,
              sr && sr.exceedsFar
                ? h("div", { className: "rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-950 dark:text-red-100" }, [
                    h("span", { className: "text-[10px] font-bold uppercase tracking-[.2em] text-red-800 dark:text-red-300 mr-2" }, "FAR exceedance"),
                    `Reduce footprint, floors, or increase allowable FAR — currently ${formatSmartNumber(sr.overGfaM2)} m² over the GFA cap.`,
                  ])
                : null,
              sr && sr.complianceLevel === "yellow"
                ? h("div", { className: "rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 text-sm font-semibold text-amber-950 dark:text-amber-100 space-y-2" }, [
                    h("div", {}, [
                      h("span", { className: "text-[10px] font-bold uppercase tracking-[.2em] text-amber-800 dark:text-amber-300 mr-2" }, "Headroom"),
                      `${formatSmartNumber(sr.headroomM2)} m² of GFA capacity remaining before footprint × floors would exceed FAR.`,
                    ]),
                    sr.scr > 1e-6 && Number.isFinite(sr.maxFloorsAtScr)
                      ? h(
                          "div",
                          { className: "text-xs font-semibold text-amber-900/90 dark:text-amber-200/95" },
                          `At full SCR, FAR allows ≈ ${formatSmartNumber(sr.maxFloorsAtScr)} equal storeys of max footprint (you have ${sr.floors}).`
                        )
                      : null,
                  ])
                : null,
              h("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2" }, [
                h(
                  "button",
                  {
                    type: "button",
                    onClick: onCopy,
                    className:
                      "h-12 rounded-2xl bg-[var(--st-accent)] text-white font-extrabold tracking-wide hover:brightness-110 transition-colors duration-150",
                  },
                  "Copy as text"
                ),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: () => setPdfModalOpen(true),
                    className:
                      "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150",
                  },
                  "Export PDF"
                ),
              ]),
            ]),
          }),
        ]);
      }

      if (activeTool === "span") {
        const SPAN_SYSTEM_OPTIONS = [
          { value: "rc_flat", label: "Reinforced Concrete Flat Slab" },
          { value: "rc_beam", label: "Reinforced Concrete Beam & Slab" },
          { value: "steel", label: "Steel Beam" },
          { value: "timber", label: "Timber Beam" },
        ];

        const designBadgeClass =
          spanResult && spanResult.designStatus === "efficient"
            ? "border border-[#16A34A]/45 bg-[#16A34A]/12 text-[#166534] dark:text-[#86EFAC]"
            : spanResult && spanResult.designStatus === "acceptable"
              ? "border border-[#CA8A04]/45 bg-[#CA8A04]/12 text-[#854D0E] dark:text-[#FDE047]"
              : spanResult
                ? "border border-[#DC2626]/45 bg-[#DC2626]/12 text-[#991B1B] dark:text-[#FCA5A5]"
                : "border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-muted)]";

        const spanLimitBadgeClass =
          spanResult && spanResult.spanWarnLevel === "green"
            ? "border border-[#16A34A]/45 bg-[#16A34A]/12 text-[#166534] dark:text-[#86EFAC]"
            : spanResult && spanResult.spanWarnLevel === "yellow"
              ? "border border-[#CA8A04]/45 bg-[#CA8A04]/12 text-[#854D0E] dark:text-[#FDE047]"
              : spanResult && spanResult.spanWarnLevel === "red"
                ? "border border-[#DC2626]/45 bg-[#DC2626]/12 text-[#991B1B] dark:text-[#FCA5A5]"
                : "border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-muted)]";

        const diagramEl = spanResult
          ? h(
              "svg",
              {
                viewBox: "0 0 440 152",
                className: "w-full h-auto rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)]/40 text-[var(--st-fg)]",
                "aria-hidden": true,
              },
              [
                h("rect", {
                  x: 32,
                  y: 78,
                  width: 16,
                  height: 48,
                  rx: 2,
                  className: "fill-zinc-300 dark:fill-zinc-600 stroke-zinc-500 dark:stroke-zinc-400",
                  strokeWidth: 1,
                }),
                h("rect", {
                  x: 392,
                  y: 78,
                  width: 16,
                  height: 48,
                  rx: 2,
                  className: "fill-zinc-300 dark:fill-zinc-600 stroke-zinc-500 dark:stroke-zinc-400",
                  strokeWidth: 1,
                }),
                h("rect", {
                  x: 32,
                  y: 44,
                  width: 376,
                  height: 34,
                  rx: 2,
                  className: "fill-zinc-200/95 dark:fill-zinc-800/95 stroke-zinc-400 dark:stroke-zinc-500",
                  strokeWidth: 1,
                }),
                h("line", { x1: 32, y1: 134, x2: 408, y2: 134, stroke: "currentColor", strokeWidth: 1, opacity: 0.5 }),
                h("path", { d: "M 32 130 L 32 138 M 408 130 L 408 138", stroke: "currentColor", strokeWidth: 1 }),
                h(
                  "text",
                  {
                    x: 220,
                    y: 148,
                    textAnchor: "middle",
                    className: "fill-current text-[11px] font-extrabold",
                    style: { fontFamily: "system-ui, sans-serif" },
                  },
                  `Span ${formatSmartNumber(spanResult.spanM)} m`
                ),
                h(
                  "text",
                  {
                    x: 412,
                    y: 64,
                    className: "fill-current text-[10px] font-bold",
                    style: { fontFamily: "system-ui, sans-serif" },
                  },
                  `d = ${formatSmartNumber(spanResult.depthCm)} cm`
                ),
                h("line", { x1: 412, y1: 44, x2: 412, y2: 78, stroke: "currentColor", strokeWidth: 1, strokeDasharray: "3 2", opacity: 0.7 }),
              ]
            )
          : h(
              "div",
              {
                className:
                  "rounded-2xl border border-dashed border-[var(--st-border)] bg-[color-mix(in_srgb,var(--st-fg)_4%,var(--st-bg))] p-10 text-center text-xs font-semibold text-[var(--st-muted)]",
              },
              "Enter a valid span to preview the cross-section."
            );

        return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
          h(Card, {
            title: "Column & Beam Span Calculator",
            hint: "Inputs",
            children: h("div", { className: "space-y-4" }, [
              h(SectionTitle, {
                label: "Span & system",
                hint: "Distance between supports and structural assumptions",
              }),
              h(Field, {
                label: "Span length (m)",
                children: h(InputBase, {
                  value: spanLengthM,
                  onChange: setSpanLengthM,
                  placeholder: "e.g., 6",
                  type: "number",
                  step: "any",
                  min: 0,
                }),
              }),
              h(Field, {
                label: "Structural system",
                children: h(
                  "select",
                  {
                    value: spanSystem,
                    onChange: (e) => setSpanSystem(e.target.value),
                    className:
                      "w-full h-[52px] rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 text-sm font-semibold text-[var(--st-fg)] focus:outline-none focus:border-[var(--st-accent)]",
                  },
                  SPAN_SYSTEM_OPTIONS.map((opt) => h("option", { key: opt.value, value: opt.value }, opt.label))
                ),
              }),
              h(SectionTitle, {
                label: "Load type",
                hint:
                  spanSystem === "steel" || spanSystem === "timber"
                    ? "Depth rule for steel/timber uses typical L/d; load presets apply to RC systems."
                    : "Presets adjust RC span-to-depth divisors.",
              }),
              h("div", { className: "flex flex-wrap gap-2" }, [
                h(ValueButton, { active: spanLoad === "light", onClick: () => setSpanLoad("light") }, "Light"),
                h(ValueButton, { active: spanLoad === "medium", onClick: () => setSpanLoad("medium") }, "Medium"),
                h(ValueButton, { active: spanLoad === "heavy", onClick: () => setSpanLoad("heavy") }, "Heavy"),
              ]),
              h("div", { className: "text-[11px] font-semibold text-[var(--st-muted)] leading-relaxed" }, [
                h("div", {}, "Light — residential"),
                h("div", {}, "Medium — office / commercial"),
                h("div", {}, "Heavy — industrial"),
              ]),
            ]),
          }),
          h(Card, {
            title: "Results",
            hint: "Depth, ratio, and indicative sizing",
            tone: "results",
            children: h("div", { className: "space-y-5" }, [
              h("div", { className: "flex flex-wrap gap-2" }, [
                h(
                  "div",
                  { className: classNames("inline-flex items-center h-9 px-4 rounded-full text-[10px] font-extrabold tracking-[.18em] uppercase", designBadgeClass) },
                  spanResult ? spanResult.designLabel : "—"
                ),
                h(
                  "div",
                  { className: classNames("inline-flex items-center h-9 px-4 rounded-full text-[10px] font-extrabold tracking-[.18em] uppercase", spanLimitBadgeClass) },
                  spanResult
                    ? spanResult.spanWarnLevel === "green"
                      ? "Span check: OK"
                      : spanResult.spanWarnLevel === "yellow"
                        ? "Span check: Caution"
                        : "Span check: Limit"
                    : "—"
                ),
              ]),
              spanResult && spanResult.spanWarnText
                ? h(
                    "div",
                    {
                      className:
                        "rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 py-3 text-xs font-semibold text-[var(--st-fg)]",
                    },
                    spanResult.spanWarnText
                  )
                : null,
              diagramEl,
              h(ValueBlock, {
                label: "Estimated slab / beam depth",
                valueText: spanResult ? formatSmartNumber(spanResult.depthCm) : "—",
                unitText: "cm",
                big: true,
              }),
              h("div", { className: "border border-[var(--st-border)] rounded-3xl bg-[var(--st-bg)]" }, [
                h("div", { className: "p-6" }, [
                  h("div", { className: "text-[10px] font-bold tracking-[.24em] uppercase text-[var(--st-muted)] mb-3" }, "Column / profile suggestion"),
                  h(
                    "div",
                    { className: "text-lg md:text-xl font-black tracking-tight text-[var(--st-fg)] leading-snug" },
                    spanResult ? spanResult.memberSuggestion : "—"
                  ),
                ]),
              ]),
              h(ValueBlock, {
                label: "Span-to-depth ratio (rule used)",
                valueText: spanResult ? formatSmartNumber(spanResult.ldRatio) : "—",
                unitText: "L/d",
                big: false,
              }),
              h("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2" }, [
                h(
                  "button",
                  {
                    type: "button",
                    onClick: onCopy,
                    className:
                      "h-12 rounded-2xl bg-[var(--st-accent)] text-white font-extrabold tracking-wide hover:brightness-110 transition-colors duration-150",
                  },
                  "Copy as text"
                ),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: () => setPdfModalOpen(true),
                    className:
                      "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150",
                  },
                  "Export PDF"
                ),
              ]),
            ]),
          }),
        ]);
      }

      if (activeTool === "ramp") {
        const statusClass = rampResult
          ? rampResult.statusTone === "low"
            ? "bg-[color-mix(in_srgb,var(--st-fg)_12%,var(--st-bg))] text-[var(--st-fg)] border-[var(--st-border)]"
            : rampResult.statusTone === "high"
              ? "bg-[var(--st-accent)] text-white border-[var(--st-accent)]"
              : "bg-[#CA8A04]/15 text-[var(--st-fg)] border-[#CA8A04]/35"
          : "bg-[color-mix(in_srgb,var(--st-fg)_8%,var(--st-bg))] text-[var(--st-muted)] border-[var(--st-border)]";
        const meterWidth = rampResult
          ? rampResult.statusTone === "low"
            ? "w-1/3"
            : rampResult.statusTone === "mid"
              ? "w-2/3"
              : "w-full"
          : "w-0";
        const meterTone = rampResult
          ? rampResult.statusTone === "low"
            ? "bg-[var(--st-muted)]"
            : rampResult.statusTone === "mid"
              ? "bg-[#CA8A04]"
              : "bg-[var(--st-accent)]"
          : "bg-transparent";

        return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
          h(Card, {
            title: "Ramp Calculator",
            hint: "Ramp Calculator",
            children: h("div", { className: "space-y-4" }, [
              h(SectionTitle, {
                label: "Inputs",
                hint: "Enter total height and either desired slope (%) or ramp length (m)",
              }),
              h(Field, {
                label: "Total height (m)",
                children: h(InputBase, {
                  value: rampTotalHeightM,
                  onChange: setRampTotalHeightM,
                  placeholder: "e.g., 0.9",
                  type: "number",
                  step: "any",
                  min: 0,
                }),
              }),
              h(Field, {
                label: "Desired slope (%)",
                children: h(InputBase, {
                  value: rampDesiredSlopePct,
                  onChange: (v) => {
                    setRampInputMode("slope");
                    setRampDesiredSlopePct(v);
                    setRampLengthM("");
                  },
                  placeholder: "e.g., 6",
                  type: "number",
                  step: "any",
                  min: 0,
                  disabled: rampInputMode === "length",
                }),
              }),
              h("div", { className: "flex items-center gap-3" }, [
                h(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      setRampInputMode("slope");
                      setRampLengthM("");
                    },
                    className: classNames(
                      "h-8 px-3 rounded-full border text-[10px] font-extrabold tracking-[.18em] uppercase transition-colors",
                      rampInputMode === "slope"
                        ? "bg-[var(--st-accent)] border-[var(--st-accent)] text-white"
                        : "bg-[var(--st-bg)] border-[var(--st-border)] text-[var(--st-muted)]"
                    ),
                  },
                  "Use slope"
                ),
                h("div", { className: "text-center text-xs font-bold tracking-[.22em] uppercase text-[var(--st-muted)]" }, "or"),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      setRampInputMode("length");
                      setRampDesiredSlopePct("");
                    },
                    className: classNames(
                      "h-8 px-3 rounded-full border text-[10px] font-extrabold tracking-[.18em] uppercase transition-colors",
                      rampInputMode === "length"
                        ? "bg-[var(--st-accent)] border-[var(--st-accent)] text-white"
                        : "bg-[var(--st-bg)] border-[var(--st-border)] text-[var(--st-muted)]"
                    ),
                  },
                  "Use length"
                ),
              ]),
              h(Field, {
                label: "Ramp length (m)",
                children: h(InputBase, {
                  value: rampLengthM,
                  onChange: (v) => {
                    setRampInputMode("length");
                    setRampLengthM(v);
                    setRampDesiredSlopePct("");
                  },
                  placeholder: "e.g., 15",
                  type: "number",
                  step: "any",
                  min: 0,
                  disabled: rampInputMode === "slope",
                }),
              }),
              h(
                "div",
                {
                  className:
                    "rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] p-4 text-xs font-semibold text-[var(--st-muted)] leading-relaxed",
                },
                "Logic: slope (%) = (height / length) × 100 and length = height / slope."
              ),
            ]),
          }),
          h(Card, {
            title: "Results",
            hint: "Ramp geometry and comfort validation",
            tone: "results",
            children: h("div", { className: "flex flex-col gap-5" }, [
              h("div", { className: `inline-flex self-start items-center h-9 px-4 rounded-full border text-[11px] font-extrabold tracking-[.18em] uppercase ${statusClass}` }, rampResult ? rampResult.status : "Awaiting input"),
              h("div", { className: "border border-[var(--st-border)] rounded-2xl bg-[color-mix(in_srgb,var(--st-fg)_5%,var(--st-bg))] p-4" }, [
                h("div", { className: "text-[10px] font-bold tracking-[.24em] uppercase text-[var(--st-muted)] mb-2" }, "Slope quality"),
                h("div", { className: "h-2 rounded-full bg-[var(--st-border)] overflow-hidden" }, [
                  h("div", { className: `h-full rounded-full transition-all duration-200 ${meterWidth} ${meterTone}` }),
                ]),
                h("div", { className: "mt-2 text-xs font-semibold text-[var(--st-muted)]" }, rampResult ? `${rampResult.status} (${formatSmartNumber(rampResult.slopePct)}%)` : "Enter height and slope or length"),
              ]),
              h(ValueBlock, {
                label: "Calculated slope",
                valueText:
                  rampResult && Number.isFinite(rampResult.slopePct)
                    ? formatSmartNumber(rampResult.slopePct)
                    : "—",
                unitText: "%",
                big: true,
              }),
              h(ValueBlock, {
                label: "Required ramp length",
                valueText:
                  rampResult && Number.isFinite(rampResult.lengthM)
                    ? formatSmartNumber(rampResult.lengthM)
                    : "—",
                unitText: "m",
                big: true,
              }),
              h(ValueBlock, {
                label: "Height (confirmation)",
                valueText:
                  rampResult && Number.isFinite(rampResult.heightM)
                    ? formatSmartNumber(rampResult.heightM)
                    : "—",
                unitText: "m",
                big: true,
              }),
            ]),
          }),
        ]);
      }

      if (activeTool === "stair") {
        return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
          h(Card, {
            title: "Stair Calculator",
            hint: "Stair Calculator",
            children: h("div", { className: "space-y-4" }, [
              h(SectionTitle, {
                label: "Inputs",
                hint: "Set floor height and target riser to estimate step geometry",
              }),
              h(Field, {
                label: "Total height (m)",
                children: h(InputBase, {
                  value: stairTotalHeightM,
                  onChange: setStairTotalHeightM,
                  placeholder: "e.g., 3.0",
                  type: "number",
                  step: "any",
                  min: 0,
                }),
              }),
              h(Field, {
                label: "Desired riser height (cm)",
                children: h(InputBase, {
                  value: stairDesiredRiserCm,
                  onChange: setStairDesiredRiserCm,
                  placeholder: "e.g., 17",
                  type: "number",
                  step: "any",
                  min: 0,
                }),
              }),
              h(
                "div",
                {
                  className:
                    "rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] p-4 text-xs font-semibold text-[var(--st-muted)] leading-relaxed",
                },
                "Rule used: 2 × riser + tread ≈ 63 cm"
              ),
            ]),
          }),
          h(Card, {
            title: "Results",
            hint: "Calculated stair proportions",
            tone: "results",
            children: h("div", { className: "flex flex-col gap-4" }, [
              h(ValueBlock, {
                label: "Number of steps",
                valueText: stairResult ? formatSmartNumber(stairResult.steps) : "—",
                unitText: "steps",
                big: true,
              }),
              h(ValueBlock, {
                label: "Actual riser height",
                valueText:
                  stairResult && Number.isFinite(stairResult.actualRiserCm)
                    ? formatSmartNumber(stairResult.actualRiserCm)
                    : "—",
                unitText: "cm",
                big: true,
              }),
              h(ValueBlock, {
                label: "Total run length",
                valueText:
                  stairResult && Number.isFinite(stairResult.totalRunM)
                    ? formatSmartNumber(stairResult.totalRunM)
                    : "—",
                unitText: "m",
                big: true,
              }),
              h(ValueBlock, {
                label: "Suggested tread depth",
                valueText:
                  stairResult && Number.isFinite(stairResult.suggestedTreadCm)
                    ? formatSmartNumber(stairResult.suggestedTreadCm)
                    : "—",
                unitText: "cm",
                big: true,
              }),
            ]),
          }),
        ]);
      }

      return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
        h(Card, { title: "Inputs", hint: tab === "paper" ? "Paper size mode" : tab === "reverse" ? "Model → real mode" : "Real → model mode", children: h(InputsPanel, {}) }),
        h(Card, { title: "Results", hint: "Instant outputs (with copy + history)", right: null, tone: "results", children: [h(ResultHeader, {}), h(ResultsPanel, {})] }),
      ]);
    }

    const LANDING_TOOL_ORDER = [
      "scale",
      "stair",
      "ramp",
      "span",
      "siteCoverage",
      "parking",
      "room",
      "fireEscape",
      "daylight",
      "uValue",
    ];
    const LANDING_CATEGORY_BY_ID = TOOL_GROUPS.reduce((acc, g) => {
      g.toolIds.forEach((tid) => {
        acc[tid] = g.id;
      });
      return acc;
    }, {});
    const landingToolsList = LANDING_TOOL_ORDER.map((tid) => {
      const tool = TOOL_ITEMS.find((t) => t.id === tid);
      if (!tool) return null;
      return { tool, category: LANDING_CATEGORY_BY_ID[tid] || "geometry" };
    }).filter(Boolean);

    if (activeTool === "landing") {
      return h("div", { className: "min-h-screen flex flex-col bg-[var(--st-bg)] text-[var(--st-fg)]" }, [
        h("div", { className: "structura-hero-shell" }, [
          h("div", { className: "structura-hero-grid-bg", "aria-hidden": true }),
          h("div", { className: "relative z-10 max-w-6xl mx-auto w-full px-4" }, [
            h("header", { className: "pt-6 flex justify-end" }, h(ThemeToggleButton, { theme, setTheme })),
            h("section", { className: "pt-4 pb-10 md:pt-10 md:pb-14" }, [
              h(
                "h1",
                {
                  className:
                    "structura-hero-line structura-hero-line--1 font-display text-[clamp(2.5rem,10vw,4.25rem)] md:text-[72px] font-bold tracking-tight leading-[1.02] text-[var(--st-fg)]",
                },
                "Structura"
              ),
              h(
                "p",
                {
                  className: "structura-hero-line structura-hero-line--2 mt-5 text-lg md:text-xl text-[var(--st-muted)] font-medium max-w-2xl leading-snug",
                },
                STRUCTURA_TAGLINE
              ),
              h(
                "button",
                {
                  type: "button",
                  className:
                    "structura-hero-line structura-hero-line--4 mt-10 h-14 px-8 rounded-2xl bg-[var(--st-accent)] text-white font-semibold text-[15px] tracking-wide hover:brightness-110 transition-all duration-150",
                  onClick: () => document.getElementById("structura-tool-grid")?.scrollIntoView({ behavior: "smooth" }),
                },
                "Open Toolkit"
              ),
            ]),
          ]),
        ]),
        h("section", { id: "structura-tool-grid", className: "max-w-6xl mx-auto w-full px-4 pb-16 md:pb-24" }, [
          h("h2", { className: "font-display text-xl md:text-2xl font-bold text-[var(--st-fg)] mb-8" }, "All Tools"),
          h(
            "div",
            { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" },
            landingToolsList.map(({ tool, category }, idx) =>
              h(
                "button",
                {
                  key: tool.id,
                  type: "button",
                  style: { animationDelay: `${idx * 100}ms` },
                  className:
                    "landing-tool-card group w-full text-left rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] p-5 hover:border-[var(--st-accent)]",
                  onClick: () => navigateToTool(tool.id),
                },
                h("div", { className: "flex gap-4 items-start transition-transform duration-150 ease-out group-hover:-translate-y-1" }, [
                  h(LandingToolIcon, { toolId: tool.id, category }),
                  h("div", { className: "min-w-0" }, [
                    h(
                      "div",
                      {
                        className: "text-[15px] font-semibold text-[var(--st-fg)] group-hover:text-[var(--st-accent)] transition-colors duration-150 font-sans",
                      },
                      tool.label
                    ),
                    h("div", { className: "mt-1 text-sm text-[var(--st-muted)] leading-snug font-sans" }, tool.description),
                  ]),
                ])
              )
            )
          ),
        ]),
        h("footer", { className: "mt-auto pt-10 pb-8 text-center px-4 border-t border-[var(--st-border)]" }, [
          h("div", { className: "text-[12px] font-medium text-[var(--st-muted)]" }, "Designed & developed by Melih Özdemir"),
          h(
            "div",
            { className: "mt-3 text-[11px] text-[var(--st-muted)] max-w-xl mx-auto leading-relaxed opacity-95" },
            "© 2025 Structura. Designed & developed by Melih Özdemir. All rights reserved."
          ),
          h("div", { className: "mt-2 text-[10px] font-medium text-[var(--st-muted)] opacity-80" }, "Structura — 2025"),
        ]),
      ]);
    }

    return h("div", { className: "min-h-screen flex flex-col px-4 py-12 md:py-14 bg-[var(--st-bg)] text-[var(--st-fg)]" }, [
      h(
        "div",
        { className: "flex-1 max-w-7xl mx-auto w-full space-y-8" },
        [
          h("header", { className: "pb-7 border-b border-[var(--st-border)]" }, [
            h("div", { className: "flex items-end justify-between gap-4 flex-wrap" }, [
              h("div", { className: "min-w-0" }, [
                h(
                  "button",
                  {
                    type: "button",
                    onClick: navigateHome,
                    className:
                      "text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--st-accent)] mb-2 hover:brightness-110 transition-colors duration-150 text-left",
                  },
                  "Structura"
                ),
                h(
                  "h1",
                  { className: "font-display text-3xl md:text-4xl font-bold tracking-tight text-[var(--st-fg)] leading-tight" },
                  activeToolMeta.label
                ),
                h(
                  "div",
                  { className: "mt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--st-muted)]" },
                  STRUCTURA_TAGLINE
                ),
              ]),
              h(ThemeToggleButton, { theme, setTheme }),
            ]),
            h("p", { className: "mt-5 max-w-3xl text-[15px] text-[var(--st-muted)] font-medium leading-relaxed" }, activeToolMeta.intro),
          ]),

          h("div", { className: "grid grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)] gap-7 items-start" }, [
            h(
              "aside",
              { className: "border border-[var(--st-border)] rounded-3xl bg-[var(--st-bg)] p-4 lg:sticky lg:top-6" },
              [
                h("div", { className: "text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-muted)] mb-3 px-2" }, "Tools"),
                h(
                  "div",
                  { className: "flex flex-col gap-5" },
                  TOOL_GROUPS.map((group, gi) =>
                    h("div", { key: group.id, className: gi ? "pt-4 mt-1 border-t border-[var(--st-border)]" : "" }, [
                      h(
                        "div",
                        { className: classNames("text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-muted)] mb-2 px-2", gi ? "mt-0" : "") },
                        group.label
                      ),
                      h(
                        "nav",
                        { className: "flex flex-col gap-2" },
                        group.toolIds.map((tid) => {
                          const tool = TOOL_ITEMS.find((t) => t.id === tid);
                          if (!tool) return null;
                          return h(
                            "button",
                            {
                              key: tool.id,
                              type: "button",
                              onClick: () => navigateToTool(tool.id),
                              className: classNames(
                                "structura-nav-btn w-full text-left rounded-2xl border-l-4 px-3.5 py-3.5",
                                activeTool === tool.id
                                  ? "border-[var(--st-accent)] bg-[color-mix(in_srgb,var(--st-accent)_10%,var(--st-bg))] text-[var(--st-accent)]"
                                  : "border-transparent text-[var(--st-fg)] hover:bg-[color-mix(in_srgb,var(--st-fg)_5%,var(--st-bg))]"
                              ),
                            },
                            [
                              h(
                                "div",
                                { key: "l", className: "text-[15px] font-semibold tracking-tight font-sans" },
                                tool.label
                              ),
                              h(
                                "div",
                                {
                                  key: "d",
                                  className: classNames(
                                    "mt-1 text-[11px] font-medium leading-relaxed font-sans",
                                    activeTool === tool.id ? "text-[var(--st-muted)]" : "text-[var(--st-muted)]"
                                  ),
                                },
                                tool.description
                              ),
                            ]
                          );
                        })
                      ),
                    ])
                  )
                )
              ]
            ),
            h("main", { className: "min-w-0" }, [renderMainToolContent()]),
          ]),
          pdfModalOpen
            ? h("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4" }, [
                h("div", { className: "absolute inset-0 bg-black/40 dark:bg-black/50", onClick: () => setPdfModalOpen(false) }),
                h("div", { className: "relative w-full max-w-md rounded-2xl bg-[var(--st-bg)] border border-[var(--st-border)] p-5" }, [
                  h("div", { className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--st-muted)] mb-3" }, "Export as PDF"),
                  h("div", { className: "text-sm text-[var(--st-fg)] font-semibold" }, "Project name (optional)"),
                  h("input", {
                    value: pdfProjectName,
                    onChange: (e) => setPdfProjectName(e.target.value),
                    placeholder: "e.g., Studio Model Set 01",
                    className:
                      "mt-3 w-full h-11 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 text-[var(--st-fg)] placeholder:text-[var(--st-muted)] focus:outline-none focus:border-[var(--st-accent)] transition-colors duration-200",
                  }),
                  h("div", { className: "mt-5 flex gap-3" }, [
                    h(
                      "button",
                      {
                        type: "button",
                        onClick: () => setPdfModalOpen(false),
                        className:
                          "flex-1 h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150",
                      },
                      "Cancel"
                    ),
                    h(
                      "button",
                      {
                        type: "button",
                        onClick: exportCurrentToPDF,
                        className:
                          "flex-1 h-12 rounded-2xl bg-[var(--st-accent)] text-white font-extrabold tracking-wide hover:brightness-110 transition-colors duration-150",
                      },
                      "Export PDF"
                    ),
                  ]),
                  h(
                    "div",
                    { className: "mt-3 text-xs text-[var(--st-muted)]" },
                    activeTool === "span"
                      ? "PDF includes values and a schematic cross-section diagram."
                      : activeTool === "room"
                        ? "PDF includes the room table, total area, and timestamp."
                        : activeTool === "parking"
                          ? "PDF includes all values and a schematic top-view diagram."
                          : activeTool === "daylight"
                            ? "PDF includes EN 17037 / IES reference notes, values, and a daylight penetration diagram."
                            : activeTool === "fireEscape"
                              ? "PDF includes all values and a schematic floor plan with travel path."
                              : activeTool === "uValue"
                                ? "PDF includes layer build-up, U/R values, and a schematic layer diagram."
                                : activeTool === "siteCoverage"
                                  ? "PDF includes SCR/FAR results, validation notes, and a schematic site plan diagram."
                                  : "PDF is generated as a clean single-page layout."
                  ),
                ]),
              ])
            : null,
        ]
      ),
      h("footer", { className: "mt-auto pt-12 pb-6 text-center px-4 border-t border-[var(--st-border)]" }, [
        h("div", { className: "text-[12px] font-medium text-[var(--st-muted)]" }, "Designed & developed by Melih Özdemir"),
        h(
          "div",
          { className: "mt-3 text-[11px] text-[var(--st-muted)] max-w-2xl mx-auto leading-relaxed" },
          "© 2025 Structura. Designed & developed by Melih Özdemir. All rights reserved."
        ),
        h("div", { className: "mt-2 text-[10px] font-medium text-[var(--st-muted)] opacity-80" }, "Structura — 2025"),
      ]),
    ]);
  }

  // Override Results card composition to avoid deep createElement nesting
  function RootApp() {
    return h("div", { className: "min-h-screen" }, null);
  }

  ReactDOM.createRoot(document.getElementById("root")).render(h(App));
} else {
  const $ = (id) => document.getElementById(id);

const form = $("scaleForm");
const scaleSelect = $("scaleSelect");

const lengthMEl = $("lengthM");
const areaM2El = $("areaM2");
const widthMEl = $("widthM");
const heightMEl = $("heightM");
const depthMEl = $("depthM");

const lengthOut = $("lengthOut");
const areaOut = $("areaOut");
const dimsOut = $("dimsOut");
const copyBtn = $("copyBtn");
const resetBtn = $("resetBtn");
const statusPill = $("statusPill");
const formulaText = $("formulaText");

function toNumberOrNull(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function clampNonNegative(n) {
  return n < 0 ? 0 : n;
}

function formatSmart(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);

  if (abs === 0) return "0";
  if (abs >= 10000) return n.toFixed(0);
  if (abs >= 100) return n.toFixed(2).replace(/\.?0+$/, "");
  if (abs >= 1) return n.toFixed(3).replace(/\.?0+$/, "");
  return n.toFixed(4).replace(/\.?0+$/, "");
}

function setStatus(state, text) {
  statusPill.dataset.state = state;
  statusPill.textContent = text;
}

function computeScaleFactor() {
  const denom = Number(scaleSelect.value);
  return Number.isFinite(denom) && denom > 0 ? denom : 50;
}

function computeScaledLengthCm(meters, denom) {
  // real meters -> real cm -> scaled
  return (meters * 100) / denom;
}

function computeScaledAreaCm2(areaM2, denom) {
  // real m^2 -> real cm^2 -> scaled by denom^2
  return (areaM2 * 10000) / (denom * denom);
}

function computeScaledDimsCm({ w, h, d }, denom) {
  return {
    w: computeScaledLengthCm(w, denom),
    h: computeScaledLengthCm(h, denom),
    d: computeScaledLengthCm(d, denom),
  };
}

function buildResultText({ denom, lengthCm, areaCm2, dims }) {
  const lines = [
    `Scale: 1:${denom}`,
    "",
    `Scaled length: ${formatSmart(lengthCm)} cm`,
    `Scaled area: ${formatSmart(areaCm2)} cm²`,
    `Scaled 3D: ${formatSmart(dims.w)} × ${formatSmart(dims.h)} × ${formatSmart(dims.d)} cm`,
  ];
  return lines.join("\n");
}

function updateFormula(denom) {
  formulaText.innerHTML = `
    <div><code>length_cm = (length_m × 100) ÷ ${denom}</code></div>
    <div style="margin-top:10px;"><code>area_cm2 = (area_m2 × 10000) ÷ ${denom}²</code></div>
    <div style="margin-top:10px;"><code>dims_cm = (dims_m × 100) ÷ ${denom}</code></div>
  `.trim();
}

function setOutputs({ lengthCm, areaCm2, dims }) {
  lengthOut.textContent = formatSmart(lengthCm);
  areaOut.textContent = formatSmart(areaCm2);
  dimsOut.textContent = `${formatSmart(dims.w)} × ${formatSmart(dims.h)} × ${formatSmart(dims.d)}`;
}

function clearOutputs() {
  lengthOut.textContent = "—";
  areaOut.textContent = "—";
  dimsOut.textContent = "—";
  copyBtn.disabled = true;
  setStatus("idle", "Ready");
}

function calculate() {
  const denom = computeScaleFactor();

  const lengthM = toNumberOrNull(lengthMEl.value);
  const areaM2 = toNumberOrNull(areaM2El.value);
  const w = toNumberOrNull(widthMEl.value);
  const h = toNumberOrNull(heightMEl.value);
  const d = toNumberOrNull(depthMEl.value);

  const anyInput = lengthM != null || areaM2 != null || w != null || h != null || d != null;

  if (!anyInput) {
    clearOutputs();
    updateFormula(denom);
    setStatus("warn", "Enter a value");
    return { ok: false, denom };
  }

  const lengthCm = computeScaledLengthCm(clampNonNegative(lengthM ?? 0), denom);
  const areaCm2 = computeScaledAreaCm2(clampNonNegative(areaM2 ?? 0), denom);

  const dims = computeScaledDimsCm(
    {
      w: clampNonNegative(w ?? 0),
      h: clampNonNegative(h ?? 0),
      d: clampNonNegative(d ?? 0),
    },
    denom
  );

  setOutputs({ lengthCm, areaCm2, dims });
  copyBtn.disabled = false;
  updateFormula(denom);
  setStatus("ok", "Calculated");

  return { ok: true, denom, lengthCm, areaCm2, dims };
}

async function copyResult() {
  const denom = computeScaleFactor();
  const result = calculate();
  if (!result.ok) return;

  const text = buildResultText({
    denom,
    lengthCm: result.lengthCm,
    areaCm2: result.areaCm2,
    dims: result.dims,
  });

  try {
    await navigator.clipboard.writeText(text);
    setStatus("ok", "Copied");
    copyBtn.textContent = "Copied";
    window.setTimeout(() => {
      copyBtn.textContent = "Copy result";
      setStatus("ok", "Calculated");
    }, 1200);
  } catch {
    // Fallback for restricted clipboard contexts
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "true");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    setStatus("ok", "Copied");
    copyBtn.textContent = "Copied";
    window.setTimeout(() => {
      copyBtn.textContent = "Copy result";
      setStatus("ok", "Calculated");
    }, 1200);
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  calculate();
});

resetBtn.addEventListener("click", () => {
  form.reset();
  clearOutputs();
  updateFormula(computeScaleFactor());
});

copyBtn.addEventListener("click", () => {
  copyResult();
});

// Quality-of-life: recalc when scale changes (but don't force user)
scaleSelect.addEventListener("change", () => {
  updateFormula(computeScaleFactor());
  const hasAny = lengthMEl.value || areaM2El.value || widthMEl.value || heightMEl.value || depthMEl.value;
  if (hasAny) calculate();
});

updateFormula(computeScaleFactor());
clearOutputs();

}
