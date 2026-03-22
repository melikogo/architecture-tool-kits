import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const h = React.createElement;

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

  /** Building Load Calculator — indicative EN 1991-1-1 style characteristic values (kN/m²) */
  const LOAD_CALC_LIVE_KNM2 = {
    residential: 2.0,
    office: 3.0,
    retail: 4.0,
    hospital: 4.0,
    industrial: 7.5,
    education: 3.0,
  };
  const LOAD_CALC_FLOOR_DEAD_KNM2 = {
    rc_flat: 5.0,
    rc_beam: 6.0,
    steel_composite: 3.5,
    timber: 2.0,
  };
  const LOAD_CALC_FACADE_KNM2 = {
    light: 0.5,
    medium: 1.5,
    heavy: 3.0,
  };
  const LOAD_CALC_ROOF_DEAD_KNM2 = 2.0;
  const LOAD_CALC_ROOF_LIVE_KNM2 = 0.75;
  const LOAD_CALC_DEFAULT_TRIBUTARY_M2 = 25;

  const FT_TO_M = 0.3048;
  const IN_TO_M = 0.0254;
  const FT2_TO_M2 = FT_TO_M * FT_TO_M;
  const FT3_TO_M3 = FT2_TO_M2 * FT_TO_M;

  function classNames(...xs) {
    return xs.filter(Boolean).join(" ");
  }

  const LANG_STORAGE_KEY = "structura-lang";

  function structuraGetByPath(obj, path) {
    if (!obj || !path) return undefined;
    return path.split(".").reduce((a, k) => (a != null && a[k] !== undefined && a[k] !== null ? a[k] : undefined), obj);
  }

  const LanguageContext = React.createContext(null);

  function LanguageProvider({ children }) {
    const [lang, setLangState] = useState(() => {
      try {
        const s = localStorage.getItem(LANG_STORAGE_KEY);
        if (s === "tr" || s === "en") return s;
      } catch (e) {
        /* ignore */
      }
      return "en";
    });

    const setLang = useCallback((next) => {
      const v = next === "tr" ? "tr" : "en";
      setLangState(v);
      try {
        localStorage.setItem(LANG_STORAGE_KEY, v);
      } catch (e) {
        /* ignore */
      }
    }, []);

    const dict = useMemo(() => {
      const packs =
        typeof window !== "undefined" && window.STRUCTURA_TRANSLATIONS ? window.STRUCTURA_TRANSLATIONS : { en: {}, tr: {} };
      return { en: packs.en || {}, tr: packs.tr || {} };
    }, []);

    const t = useCallback(
      (path) => {
        const cur = structuraGetByPath(dict[lang], path);
        if (cur !== undefined && cur !== null && String(cur) !== "") return cur;
        const en = structuraGetByPath(dict.en, path);
        if (en !== undefined && en !== null && String(en) !== "") return en;
        return path;
      },
      [lang, dict]
    );

    const mergeToolMeta = useCallback(
      (tool) => {
        if (!tool || !tool.id) return tool;
        const p = `tools.${tool.id}`;
        return {
          ...tool,
          label: t(`${p}.label`),
          description: t(`${p}.description`),
          intro: t(`${p}.intro`),
        };
      },
      [t]
    );

    const value = useMemo(() => ({ lang, setLang, t, mergeToolMeta }), [lang, setLang, t, mergeToolMeta]);

    useEffect(() => {
      if (typeof document !== "undefined") {
        document.documentElement.lang = lang === "tr" ? "tr" : "en";
      }
    }, [lang]);

    return h(LanguageContext.Provider, { value }, children);
  }

  function useI18n() {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error("Structura: useI18n must be used within LanguageProvider");
    return ctx;
  }

  /** Maps status.text (English source) to translation path under common.* */
  const STATUS_TEXT_TO_KEY = {
    Ready: "common.ready",
    "Enter a value to calculate.": "common.statusEnterValue",
    "Added to history.": "common.statusAddedHistory",
    "Updated scale.": "common.statusUpdatedScale",
    "Invalid scale ratio.": "common.statusInvalidScale",
    "Open a calculator to copy results.": "common.openCalculatorToCopy",
    "Enter valid thickness (mm) for each layer.": "common.statusValidThickness",
    "Copied to clipboard.": "common.copied",
    "Copy failed. Try again.": "common.copyFailed",
    "Enter valid floor area, travel distance, exits, and floors.": "common.statusValidFireInputs",
    "Enter valid floor area, window area, and room depth.": "common.statusValidDaylightInputs",
    "Enter a valid total parking area (m²).": "common.statusValidParkingArea",
    "Enter a valid span length.": "common.statusValidSpanLength",
    "Nothing to copy yet.": "common.nothingToCopy",
    "CSV exported.": "common.statusCsvExported",
    "Enter a valid area (m²).": "common.statusValidAreaM2",
    "Room added to list.": "common.statusRoomAdded",
    "jsPDF not available.": "common.pdfUnavailable",
    "PDF exported.": "common.pdfExported",
    "PDF export failed.": "common.pdfFailed",
    "Loaded from history.": "common.statusLoadedHistory",
  };

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

  /** kN/m² etc. — two decimal places */
  function formatLoadKnM2(n) {
    if (n == null || !Number.isFinite(n)) return "—";
    const rounded = Math.round(n * 100) / 100;
    return rounded.toFixed(2);
  }

  /** Whole numbers only (steps, exits, parking spaces, etc.) — no trailing “.0” */
  function formatInteger(n) {
    if (n == null || !Number.isFinite(n)) return "—";
    return String(Math.round(n));
  }

  function AnimatedNumberText({ valueText, className, integer, decimals }) {
    const fmt =
      integer ? formatInteger : decimals === 2 ? (n) => formatLoadKnM2(n) : formatSmartNumber;
    const [display, setDisplay] = useState(valueText);
    const rootRef = useRef(null);
    const tweenProxyRef = useRef({ v: 0 });
    useGSAP(
      () => {
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
        const proxy = tweenProxyRef.current;
        gsap.killTweensOf(proxy);
        proxy.v = 0;
        gsap.fromTo(
          proxy,
          { v: 0 },
          {
            v: num,
            duration: 0.3,
            ease: "power2.out",
            onUpdate: () => setDisplay(fmt(proxy.v)),
            onComplete: () => setDisplay(fmt(num)),
          }
        );
      },
      { scope: rootRef, dependencies: [valueText, integer, decimals] }
    );
    return h("div", { ref: rootRef, className }, display);
  }

  function ThemeToggleButton({ theme, onToggle }) {
    return h(
      "button",
      {
        type: "button",
        onClick: onToggle,
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

  function LangToggleButton() {
    const { lang, setLang } = useI18n();
    const seg = (active) =>
      classNames(
        "px-3.5 min-w-[2.5rem] h-10 flex items-center justify-center transition-colors duration-150 text-[11px] font-extrabold tracking-wide",
        active
          ? "bg-[var(--st-accent)] text-white"
          : "bg-[var(--st-bg)] text-[var(--st-muted)] hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))]"
      );
    return h(
      "div",
      {
        className: "flex rounded-full border border-[var(--st-border)] overflow-hidden",
        role: "group",
        "aria-label": "Language",
      },
      [
        h("button", { type: "button", onClick: () => setLang("en"), className: seg(lang === "en"), "aria-pressed": lang === "en" }, "EN"),
        h("button", { type: "button", onClick: () => setLang("tr"), className: seg(lang === "tr"), "aria-pressed": lang === "tr" }, "TR"),
      ]
    );
  }

  function NavToggles({ theme, onThemeToggle }) {
    return h("div", { className: "flex items-center gap-2 shrink-0" }, [
      h(LangToggleButton),
      h(ThemeToggleButton, { theme, onToggle: onThemeToggle }),
    ]);
  }

  /** Sparse pulsing nodes for hero blueprint grid (positions in viewBox 0 0 1200 700) */
  const HERO_PULSE_NODES = (() => {
    const out = [];
    const delayClasses = [
      "",
      "structura-hero-node--d1",
      "structura-hero-node--d2",
      "structura-hero-node--d3",
      "structura-hero-node--d4",
      "structura-hero-node--d5",
    ];
    let i = 0;
    for (let x = 56; x < 1160; x += 72) {
      for (let y = 56; y < 640; y += 72) {
        if (((x / 72) | 0) % 2 !== ((y / 72) | 0) % 2) continue;
        out.push({ cx: x, cy: y, d: delayClasses[i % delayClasses.length] });
        i += 1;
      }
    }
    return out;
  })();

  /** Full-bleed animated SVG: grid, wireframe, nodes, hard hat (crane on far edge: LandingHeroEdgeCrane) */
  function LandingHeroBackgroundScene() {
    const ns = "http://www.w3.org/2000/svg";
    return h("div", { className: "structura-hero-scene", "aria-hidden": true }, [
      h(
        "svg",
        {
          className: "structura-hero-scene-svg",
          viewBox: "0 0 1200 700",
          preserveAspectRatio: "xMidYMid slice",
          xmlns: ns,
        },
        [
          h("defs", null, [
            h(
              "pattern",
              {
                id: "structura-hero-grid-pat",
                width: 56,
                height: 56,
                patternUnits: "userSpaceOnUse",
              },
              h("path", {
                className: "structura-hero-stroke",
                d: "M56 0H0V56",
                strokeWidth: 0.55,
                opacity: 0.9,
              })
            ),
          ]),
          h(
            "g",
            { className: "structura-hero-grid-drift" },
            h("rect", {
              x: -80,
              y: -80,
              width: 1360,
              height: 860,
              fill: "url(#structura-hero-grid-pat)",
              opacity: 0.45,
            })
          ),
          /* Building wireframe — right */
          h(
            "g",
            { opacity: 0.14 },
            h("path", {
              className: "structura-hero-stroke",
              strokeWidth: 0.85,
              strokeLinejoin: "miter",
              d: "M 760 520 L 760 220 L 820 180 L 980 145 L 1120 175 L 1180 230 L 1180 540 L 1040 560 L 900 548 L 760 520 Z M 820 180 L 820 520 M 980 145 L 980 530 M 1040 200 L 1120 210 L 1120 520 M 800 320 L 1160 300 M 800 400 L 1140 385",
            })
          ),
          /* Pulsing intersection nodes */
          ...HERO_PULSE_NODES.map(({ cx, cy, d }, idx) =>
            h("circle", {
              key: `n-${idx}`,
              className: `structura-hero-node ${d}`.trim(),
              cx,
              cy,
              r: 2.2,
              opacity: 0.85,
            })
          ),
          /* Hard hat — bottom right */
          h(
            "g",
            { transform: "translate(1028, 612) scale(0.72)", opacity: 0.12 },
            h("path", {
              className: "structura-hero-stroke",
              strokeWidth: 1,
              d: "M 4 28 C 4 12 18 2 36 2 C 54 2 68 12 68 28 L 72 32 L 0 32 Z",
            }),
            h("path", {
              className: "structura-hero-stroke",
              strokeWidth: 0.75,
              d: "M 0 32 L 72 32 L 76 36 L -4 36 Z",
            }),
            h("line", {
              className: "structura-hero-stroke",
              x1: 14,
              y1: 18,
              x2: 58,
              y2: 18,
              strokeWidth: 0.6,
              opacity: 0.8,
            })
          ),
        ]
      ),
    ]);
  }

  /**
   * Shared under-construction sketch (floors draw → scaffold → roof crane). Same SVG for left + center hero.
   * @param {{ className?: string, keyPrefix?: string }} opts
   */
  function HeroConstructionSketchSvg(opts) {
    const className = opts?.className ?? "structura-hero-construction-svg";
    const kp = (k) => `${opts?.keyPrefix ?? ""}${k}`;
    const ns = "http://www.w3.org/2000/svg";
    const floorY = [248, 204, 160, 116, 72];
    const scaffoldV = [52, 82, 112, 142, 168];
    const scaffoldH = [226, 182, 138, 94];
    return h(
      "svg",
      {
        className,
        viewBox: "0 0 220 300",
        xmlns: ns,
        fill: "none",
        focusable: "false",
      },
      [
        ...floorY.map((y, i) =>
          h("path", {
            key: kp(`fl-${i}`),
            className: `structura-uc-floor structura-uc-floor--${i + 1}`,
            d: `M 48 ${y} L 172 ${y}`,
            pathLength: 1,
            strokeLinecap: "butt",
          })
        ),
        h(
          "g",
          { className: "structura-uc-scaffold" },
          [
            h("line", { key: kp("sg-0"), className: "structura-uc-scaffold-line", x1: 44, y1: 252, x2: 176, y2: 252 }),
            h("line", { key: kp("sg-1"), className: "structura-uc-scaffold-line", x1: 44, y1: 248, x2: 44, y2: 68 }),
            h("line", { key: kp("sg-2"), className: "structura-uc-scaffold-line", x1: 176, y1: 248, x2: 176, y2: 68 }),
            ...scaffoldV.map((x) =>
              h("line", { key: kp(`sv-${x}`), className: "structura-uc-scaffold-line", x1: x, y1: 248, x2: x, y2: 72 })
            ),
            ...scaffoldH.map((y) =>
              h("line", { key: kp(`sh-${y}`), className: "structura-uc-scaffold-line", x1: 44, y1: y, x2: 176, y2: y })
            ),
          ]
        ),
        h(
          "g",
          { className: "structura-uc-roof-crane", transform: "translate(110, 68)" },
          [
            h("line", { key: kp("cm"), className: "structura-uc-crane-mast", x1: 0, y1: 0, x2: 0, y2: -26, strokeLinecap: "square" }),
            h(
              "g",
              { className: "structura-uc-crane-jib", transform: "translate(0,-26)" },
              [
                h("line", {
                  key: kp("cj"),
                  className: "structura-uc-crane-line",
                  x1: 0,
                  y1: 0,
                  x2: 50,
                  y2: -8,
                  strokeLinecap: "square",
                }),
                h("line", {
                  key: kp("cc"),
                  className: "structura-uc-crane-line structura-uc-crane-cable",
                  x1: 38,
                  y1: -6,
                  x2: 38,
                  y2: 36,
                  strokeDasharray: "2 3",
                  strokeLinecap: "round",
                }),
                h("path", {
                  key: kp("ch"),
                  className: "structura-uc-crane-hook",
                  d: "M 34 36 L 42 36 L 38 42 Z",
                }),
              ]
            ),
          ]
        ),
      ]
    );
  }

  /** Left-side under-construction silhouette — same SVG as center; see style.css */
  function LandingHeroConstructionBuilding() {
    return h("div", { className: "structura-hero-construction-building", "aria-hidden": true }, [
      HeroConstructionSketchSvg({ className: "structura-hero-construction-svg", keyPrefix: "" }),
    ]);
  }

  /** Center: duplicate of left construction sketch, scaled up; md+ only. */
  function LandingHeroWireframe3D() {
    return h("div", { className: "structura-hero-wireframe-slot", "aria-hidden": true }, [
      h("div", { className: "structura-hero-construction-building structura-hero-construction-building--center" }, [
        HeroConstructionSketchSvg({ className: "structura-hero-construction-svg", keyPrefix: "c-" }),
      ]),
    ]);
  }

  /** Left-side sheet graphics: north arrow, dimensions, ruler 0–10, scale label (behind text) */
  function LandingHeroSheetDecor() {
    const ns = "http://www.w3.org/2000/svg";
    const dimMk = "url(#structura-sheet-dim-arrow)";
    const rulerX0 = 44;
    const rulerX1 = 498;
    const rulerY = 646;
    const span = (rulerX1 - rulerX0) / 10;
    const rulerMajor = [];
    const rulerNums = [];
    const rulerMinor = [];
    for (let i = 0; i <= 10; i += 1) {
      const x = rulerX0 + i * span;
      rulerMajor.push(
        h("line", {
          key: `maj-${i}`,
          className: "structura-hero-sheet-stroke",
          x1: x,
          y1: rulerY,
          x2: x,
          y2: rulerY - 16,
          strokeWidth: 1.15,
        })
      );
      rulerNums.push(
        h(
          "text",
          {
            key: `num-${i}`,
            className: "structura-hero-sheet-text",
            x,
            y: rulerY - 22,
            textAnchor: "middle",
            fontSize: 15,
            fontWeight: "600",
          },
          String(i)
        )
      );
    }
    for (let i = 0; i < 10; i += 1) {
      const x = rulerX0 + i * span + span / 2;
      rulerMinor.push(
        h("line", {
          key: `min-${i}`,
          className: "structura-hero-sheet-stroke",
          x1: x,
          y1: rulerY,
          x2: x,
          y2: rulerY - 8,
          strokeWidth: 0.75,
        })
      );
    }

    return h("div", { className: "structura-hero-sheet-layer", "aria-hidden": true }, [
      h(
        "svg",
        {
          className: "structura-hero-sheet-svg",
          viewBox: "0 0 1200 700",
          preserveAspectRatio: "xMinYMid meet",
          xmlns: ns,
        },
        [
          h("defs", null, [
            h(
              "marker",
              {
                id: "structura-sheet-dim-arrow",
                markerWidth: 5,
                markerHeight: 5,
                refX: 2.5,
                refY: 2.5,
                orient: "auto",
                markerUnits: "strokeWidth",
              },
              h("path", { className: "structura-hero-sheet-fill", d: "M0,0 L5,2.5 L0,5 Z" })
            ),
          ]),
          /* North arrow — top left */
          h(
            "g",
            { opacity: 0.1 },
            h("g", { transform: "translate(88, 82)" }, [
              h("circle", {
                className: "structura-hero-sheet-stroke",
                cx: 0,
                cy: 6,
                r: 22,
                strokeWidth: 1.2,
              }),
              h("path", {
                className: "structura-hero-sheet-fill",
                d: "M 0 -38 L -9 -17 L 9 -17 Z",
              }),
              h("line", {
                className: "structura-hero-sheet-stroke",
                x1: 0,
                y1: -17,
                x2: 0,
                y2: -2,
                strokeWidth: 1.2,
                strokeLinecap: "square",
              }),
              h(
                "text",
                {
                  className: "structura-hero-sheet-text",
                  x: 0,
                  y: 14,
                  textAnchor: "middle",
                  fontSize: 17,
                  fontWeight: "800",
                },
                "N"
              ),
            ])
          ),
          /* Dimension strings — left zone */
          h("g", { opacity: 0.06 }, [
            h("g", null, [
              h("line", { className: "structura-hero-sheet-stroke", x1: 52, y1: 276, x2: 52, y2: 296, strokeWidth: 0.7 }),
              h("line", { className: "structura-hero-sheet-stroke", x1: 232, y1: 276, x2: 232, y2: 296, strokeWidth: 0.7 }),
              h("line", {
                className: "structura-hero-sheet-stroke",
                x1: 52,
                y1: 268,
                x2: 232,
                y2: 268,
                strokeWidth: 0.75,
                markerEnd: dimMk,
                markerStart: dimMk,
              }),
            ]),
            h("g", null, [
              h("line", { className: "structura-hero-sheet-stroke", x1: 48, y1: 348, x2: 48, y2: 368, strokeWidth: 0.7 }),
              h("line", { className: "structura-hero-sheet-stroke", x1: 196, y1: 348, x2: 196, y2: 368, strokeWidth: 0.7 }),
              h("line", {
                className: "structura-hero-sheet-stroke",
                x1: 48,
                y1: 340,
                x2: 196,
                y2: 340,
                strokeWidth: 0.75,
                markerEnd: dimMk,
                markerStart: dimMk,
              }),
            ]),
            h("g", null, [
              h("line", { className: "structura-hero-sheet-stroke", x1: 56, y1: 428, x2: 56, y2: 448, strokeWidth: 0.7 }),
              h("line", { className: "structura-hero-sheet-stroke", x1: 168, y1: 428, x2: 168, y2: 448, strokeWidth: 0.7 }),
              h("line", {
                className: "structura-hero-sheet-stroke",
                x1: 56,
                y1: 420,
                x2: 168,
                y2: 420,
                strokeWidth: 0.75,
                markerEnd: dimMk,
                markerStart: dimMk,
              }),
            ]),
          ]),
          /* Ruler + scale label (11px monospace via HTML inside foreignObject) */
          h("g", { opacity: 0.08 }, [
            h("line", {
              className: "structura-hero-sheet-stroke",
              x1: rulerX0,
              y1: rulerY,
              x2: rulerX1,
              y2: rulerY,
              strokeWidth: 1.25,
              strokeLinecap: "square",
            }),
            ...rulerMajor,
            ...rulerMinor,
            ...rulerNums,
            h(
              "foreignObject",
              { x: rulerX1 + 10, y: rulerY - 10, width: 200, height: 28 },
              h("div", {
                className: "structura-hero-sheet-scale-html",
                xmlns: "http://www.w3.org/1999/xhtml",
              }, "scale 1:100")
            ),
          ]),
        ]
      ),
    ]);
  }

  /** Silhouette crane on hero right edge — mast, jib, cable, hook; jib swings ±5° */
  function LandingHeroEdgeCrane() {
    const ns = "http://www.w3.org/2000/svg";
    return h("div", { className: "structura-hero-edge-crane", "aria-hidden": true }, [
      h(
        "svg",
        {
          className: "structura-hero-edge-crane-svg",
          /* Jib reaches ~x=122 + ~3px for ±5° swing; was 100-wide and clipped on the right */
          viewBox: "0 0 132 260",
          xmlns: ns,
        },
        [
          h("rect", {
            className: "structura-hero-edge-fill",
            x: 38,
            y: 242,
            width: 24,
            height: 14,
            rx: 1,
            opacity: 0.85,
          }),
          h("line", {
            className: "structura-hero-edge-stroke",
            x1: 50,
            y1: 242,
            x2: 50,
            y2: 36,
            strokeWidth: 2.25,
            strokeLinecap: "square",
          }),
          h(
            "g",
            { transform: "translate(50,36)" },
            h(
              "g",
              { className: "structura-hero-edge-crane-jib" },
              [
                h("line", {
                  className: "structura-hero-edge-stroke",
                  x1: 0,
                  y1: 0,
                  x2: 72,
                  y2: -4,
                  strokeWidth: 2,
                  strokeLinecap: "square",
                }),
                h("line", {
                  className: "structura-hero-edge-stroke",
                  x1: 0,
                  y1: 0,
                  x2: -28,
                  y2: 10,
                  strokeWidth: 1.5,
                  strokeLinecap: "square",
                  opacity: 0.9,
                }),
                h("line", {
                  className: "structura-hero-edge-stroke",
                  x1: 58,
                  y1: -3,
                  x2: 58,
                  y2: 52,
                  strokeWidth: 1.1,
                  strokeDasharray: "3 3.5",
                  opacity: 0.95,
                }),
                h("path", {
                  className: "structura-hero-edge-fill",
                  d: "M 54 50 L 62 50 L 58 60 Z",
                  opacity: 0.9,
                }),
              ]
            )
          ),
        ]
      ),
    ]);
  }

  /** Detailed faint floor plan: thick walls, door arcs, dimensions, stair */
  function LandingHeroFloorPlanSvg() {
    const ns = "http://www.w3.org/2000/svg";
    const mk = "url(#structura-fp-arrow)";
    return h(
      "svg",
      {
        className: "structura-hero-floorplan-svg",
        viewBox: "0 0 440 360",
        fill: "none",
        xmlns: ns,
        "aria-hidden": true,
      },
      [
        h("defs", null, [
          h(
            "marker",
            {
              id: "structura-fp-arrow",
              markerWidth: 5,
              markerHeight: 5,
              refX: 4,
              refY: 2.5,
              orient: "auto",
              markerUnits: "strokeWidth",
            },
            h("path", { className: "structura-hero-floor-fill", d: "M0,0 L5,2.5 L0,5 Z" })
          ),
        ]),
        h("g", { vectorEffect: "non-scaling-stroke" }, [
          /* —— Thick walls (exterior + interior) —— */
          h("rect", {
            className: "structura-hero-floor-w structura-hero-floor-wall",
            x: 36,
            y: 36,
            width: 368,
            height: 248,
            strokeWidth: 5,
          }),
          h("line", {
            className: "structura-hero-floor-w structura-hero-floor-wall-inner",
            x1: 210,
            y1: 36,
            x2: 210,
            y2: 98,
            strokeWidth: 4,
          }),
          h("line", {
            className: "structura-hero-floor-w structura-hero-floor-wall-inner",
            x1: 210,
            y1: 148,
            x2: 210,
            y2: 284,
            strokeWidth: 4,
          }),
          h("line", {
            className: "structura-hero-floor-w structura-hero-floor-wall-inner",
            x1: 36,
            y1: 182,
            x2: 92,
            y2: 182,
            strokeWidth: 4,
          }),
          h("line", {
            className: "structura-hero-floor-w structura-hero-floor-wall-inner",
            x1: 138,
            y1: 182,
            x2: 210,
            y2: 182,
            strokeWidth: 4,
          }),
          h("line", {
            className: "structura-hero-floor-w structura-hero-floor-wall-inner",
            x1: 210,
            y1: 128,
            x2: 404,
            y2: 128,
            strokeWidth: 3.5,
          }),
          h("line", {
            className: "structura-hero-floor-w structura-hero-floor-wall-inner",
            x1: 292,
            y1: 128,
            x2: 292,
            y2: 284,
            strokeWidth: 3.5,
          }),
          /* —— Door arcs (quarter circles) —— */
          h("path", {
            className: "structura-hero-floor-door structura-hero-floor-wall-inner",
            d: "M 210 98 A 22 22 0 0 1 188 120",
            strokeWidth: 2,
          }),
          h("path", {
            className: "structura-hero-floor-door structura-hero-floor-wall-inner",
            d: "M 92 182 A 20 20 0 0 1 112 162",
            strokeWidth: 2,
          }),
          h("path", {
            className: "structura-hero-floor-door structura-hero-floor-wall-inner",
            d: "M 330 284 A 24 24 0 0 1 306 260",
            strokeWidth: 2,
          }),
          h("path", {
            className: "structura-hero-floor-door structura-hero-floor-wall-inner",
            d: "M 404 200 A 18 18 0 0 1 386 218",
            strokeWidth: 2,
          }),
          /* —— Staircase symbol (rect + treads) —— */
          h("rect", {
            className: "structura-hero-floor-thin",
            x: 224,
            y: 198,
            width: 56,
            height: 72,
            strokeWidth: 2,
          }),
          h("line", { className: "structura-hero-floor-thin", x1: 224, y1: 210, x2: 280, y2: 210, strokeWidth: 1.25 }),
          h("line", { className: "structura-hero-floor-thin", x1: 224, y1: 222, x2: 280, y2: 222, strokeWidth: 1.25 }),
          h("line", { className: "structura-hero-floor-thin", x1: 224, y1: 234, x2: 280, y2: 234, strokeWidth: 1.25 }),
          h("line", { className: "structura-hero-floor-thin", x1: 224, y1: 246, x2: 280, y2: 246, strokeWidth: 1.25 }),
          h("line", { className: "structura-hero-floor-thin", x1: 224, y1: 258, x2: 280, y2: 258, strokeWidth: 1.25 }),
          h("path", {
            className: "structura-hero-floor-thin",
            d: "M 224 198 L 280 270",
            strokeWidth: 1,
            strokeDasharray: "2 3",
            opacity: 0.85,
          }),
          /* —— Dimension lines + arrows —— */
          h("line", {
            className: "structura-hero-floor-dim",
            x1: 36,
            y1: 308,
            x2: 404,
            y2: 308,
            markerEnd: mk,
            markerStart: mk,
          }),
          h("line", { className: "structura-hero-floor-dim", x1: 36, y1: 302, x2: 36, y2: 314, strokeWidth: 0.5 }),
          h("line", { className: "structura-hero-floor-dim", x1: 404, y1: 302, x2: 404, y2: 314, strokeWidth: 0.5 }),
          h("line", {
            className: "structura-hero-floor-dim",
            x1: 22,
            y1: 36,
            x2: 22,
            y2: 284,
            markerEnd: mk,
            markerStart: mk,
          }),
          h("line", { className: "structura-hero-floor-dim", x1: 16, y1: 36, x2: 28, y2: 36, strokeWidth: 0.5 }),
          h("line", { className: "structura-hero-floor-dim", x1: 16, y1: 284, x2: 28, y2: 284, strokeWidth: 0.5 }),
          h("line", {
            className: "structura-hero-floor-dim",
            x1: 210,
            y1: 296,
            x2: 404,
            y2: 296,
            markerEnd: mk,
            markerStart: mk,
            opacity: 0.85,
          }),
          h("line", { className: "structura-hero-floor-dim", x1: 210, y1: 290, x2: 210, y2: 302, strokeWidth: 0.5 }),
          h("line", { className: "structura-hero-floor-dim", x1: 404, y1: 290, x2: 404, y2: 302, strokeWidth: 0.5 }),
        ]),
      ]
    );
  }

  /** Landing hero: letter stagger, tagline, CTA — GSAP (CTA opacity only; hover scale via CSS inner) */
  function LandingHeroBlock({ navToggles, tagline, openLabel, onOpenToolkit }) {
    const wrapRef = useRef(null);
    useGSAP(
      () => {
        const root = wrapRef.current;
        if (!root) return;
        const letters = root.querySelectorAll(".structura-hero-char");
        const taglineEl = root.querySelector("[data-hero-tagline]");
        const ctaEl = root.querySelector("[data-hero-cta]");
        if (!letters.length || !taglineEl || !ctaEl) return;

        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce) {
          gsap.set(letters, { opacity: 1, y: 0, clearProps: "transform" });
          gsap.set([taglineEl, ctaEl], { opacity: 1, y: 0, clearProps: "transform" });
          return;
        }

        gsap.killTweensOf([letters, taglineEl, ctaEl]);
        gsap.set(letters, { opacity: 0, y: 24 });
        gsap.set(taglineEl, { opacity: 0, y: 16 });
        gsap.set(ctaEl, { opacity: 0 });

        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
        tl.to(letters, { opacity: 1, y: 0, duration: 0.45, stagger: 0.03 })
          .to(taglineEl, { opacity: 1, y: 0, duration: 0.45 }, ">")
          .to(ctaEl, { opacity: 1, duration: 0.35 }, ">");
      },
      { scope: wrapRef, dependencies: [tagline, openLabel] }
    );

    const title = "STRUCTURA";
    const titleSpans = [...title].map((ch, i) =>
      h(
        "span",
        {
          key: i,
          className: "structura-hero-char inline-block",
          style: { willChange: "transform, opacity" },
        },
        ch
      )
    );

    return h("div", { ref: wrapRef, className: "relative z-[1] max-w-6xl mx-auto w-full min-w-0 px-4 sm:px-6 flex flex-col flex-1 min-h-0" }, [
      h("header", { className: "pt-6 flex justify-end shrink-0" }, navToggles),
      h(
        "section",
        { className: "structura-hero-main-section flex-1 flex flex-col min-h-0 w-full max-md:pb-5 md:pb-5" },
        h("div", {
          className:
            "grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 lg:gap-16 flex-1 min-h-0 w-full items-stretch",
        }, [
          h("div", { className: "min-w-0 order-1 flex flex-col justify-center" }, [
            h("div", { className: "min-w-0" }, [
              h(
                "h1",
                {
                  className:
                    "font-display uppercase whitespace-nowrap text-[48px] md:text-[64px] lg:text-[80px] font-extrabold tracking-tight leading-[1.02] text-[var(--st-fg)]",
                },
                titleSpans
              ),
              h("div", { className: "structura-hero-title-line", "aria-hidden": true }),
            ]),
            h(
              "p",
              {
                "data-hero-tagline": true,
                className: "mt-6 text-[17px] md:text-[18px] text-[var(--st-muted)] font-normal max-w-xl leading-relaxed",
                style: { willChange: "transform, opacity" },
              },
              tagline
            ),
            h(
              "button",
              {
                "data-hero-cta": true,
                type: "button",
                className: "structura-hero-cta mt-10 rounded-2xl border-0 cursor-pointer bg-transparent p-0",
                style: { willChange: "opacity" },
                onClick: onOpenToolkit,
              },
              h("span", { className: "structura-hero-cta-scale" }, [
                openLabel,
                h("span", { className: "structura-hero-cta-arrow", "aria-hidden": true }, "→"),
              ])
            ),
          ]),
          h("div", { className: "order-2 flex justify-center md:justify-end items-center min-h-[160px] md:min-h-0 py-4 md:py-0 min-w-0 overflow-hidden" }, [
            h("div", { className: "structura-hero-floorplan-wrap w-full" }, [h(LandingHeroFloorPlanSvg, null)]),
          ]),
        ])
      ),
    ]);
  }

  /** Tool cards: ScrollTrigger stagger 80ms */
  function LandingToolGridSection({ title, landingToolsList, navigateToTool, LandingToolIcon, lang }) {
    const sectionRef = useRef(null);
    const toolsKey = `${lang}:${landingToolsList.map(({ tool }) => tool.id).join(",")}`;

    useGSAP(
      () => {
        const section = sectionRef.current;
        if (!section) return;
        const cards = section.querySelectorAll(".landing-tool-card");
        if (!cards.length) return;

        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        ScrollTrigger.getAll().forEach((st) => {
          if (st.trigger === section) st.kill();
        });

        if (reduce) {
          gsap.set(cards, { opacity: 1, y: 0, clearProps: "transform" });
          return;
        }

        gsap.set(cards, { opacity: 0, y: 24 });
        gsap.to(cards, {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: {
            trigger: section,
            start: "top 88%",
            once: true,
          },
        });
      },
      { scope: sectionRef, dependencies: [toolsKey] }
    );

    return h(
      "section",
      { id: "structura-tool-grid", ref: sectionRef, className: "max-w-6xl mx-auto w-full px-4 pb-16 md:pb-24" },
      [
        h("h2", { className: "font-display text-xl md:text-2xl font-bold text-[var(--st-fg)] mb-8" }, title),
        h(
          "div",
          { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" },
          landingToolsList.map(({ tool, category }) =>
            h(
              "button",
              {
                key: tool.id,
                type: "button",
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
                      className:
                        "text-[15px] font-semibold text-[var(--st-fg)] group-hover:text-[var(--st-accent)] transition-colors duration-150 font-sans",
                    },
                    tool.label
                  ),
                  h("div", { className: "mt-1 text-sm text-[var(--st-muted)] leading-snug font-sans" }, tool.description),
                ]),
              ])
            )
          )
        ),
      ]
    );
  }

  /** About columns: ScrollTrigger stagger */
  function LandingAboutSection({ aboutHeading, columnsContent, depsKey }) {
    const sectionRef = useRef(null);

    useGSAP(
      () => {
        const section = sectionRef.current;
        if (!section) return;
        const cols = section.querySelectorAll("[data-about-col]");
        if (!cols.length) return;

        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        ScrollTrigger.getAll().forEach((st) => {
          if (st.trigger === section) st.kill();
        });

        if (reduce) {
          gsap.set(cols, { opacity: 1, y: 0, clearProps: "transform" });
          return;
        }

        gsap.fromTo(
          cols,
          { opacity: 0, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: 0.55,
            stagger: 0.09,
            ease: "power2.out",
            scrollTrigger: {
              trigger: section,
              start: "top 85%",
              once: true,
            },
          }
        );
      },
      { scope: sectionRef, dependencies: [depsKey] }
    );

    return h(
      "section",
      {
        id: "structura-about",
        "aria-labelledby": "structura-about-heading",
        ref: sectionRef,
        className: "max-w-6xl mx-auto w-full px-4 pt-0 pb-12 md:pb-16 border-t border-[var(--st-border)] bg-[var(--st-bg)]",
      },
      [h("h2", { id: "structura-about-heading", className: "sr-only" }, aboutHeading), columnsContent]
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
      case "gridCalculator":
        return h(
          "svg",
          c,
          h("rect", { ...stroke, x: "4", y: "4", width: "16", height: "16", rx: "1" }),
          h("path", { ...stroke, d: "M4 10h16M10 4v16" }),
          h("circle", { ...stroke, fill: "currentColor", cx: "10", cy: "10", r: "1.25" }),
          h("circle", { ...stroke, fill: "currentColor", cx: "16", cy: "10", r: "1.25" }),
          h("circle", { ...stroke, fill: "currentColor", cx: "10", cy: "16", r: "1.25" }),
          h("circle", { ...stroke, fill: "currentColor", cx: "16", cy: "16", r: "1.25" })
        );
      case "loadCalculator":
        return h(
          "svg",
          c,
          h("path", { ...stroke, d: "M8 4v16M5 8h6M5 12h6M5 16h6" }),
          h("path", { ...stroke, d: "M14 6v2M14 10v2M14 14v2" })
        );
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

  function Field({ label, hint, children }) {
    return h("label", { className: "block" }, [
      h("div", { className: "text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--st-muted)] mb-2.5" }, label),
      hint ? h("div", { className: "text-[10px] font-semibold text-[var(--st-muted)] mb-2 -mt-1 leading-relaxed" }, hint) : null,
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

  function ValueBlock({ label, valueText, unitText, big, integerValue, decimals, children }) {
    return h("div", { className: "border border-[var(--st-border)] rounded-3xl bg-[var(--st-bg)]" }, [
      h("div", { className: "p-6" }, [
        h("div", { className: "text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--st-muted)] mb-4" }, label),
        h(
          "div",
          { className: classNames("flex items-baseline gap-3 flex-wrap", big ? "pt-1" : "") },
          [
            h(AnimatedNumberText, {
              valueText: valueText || "—",
              integer: integerValue,
              decimals: decimals,
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

  /** Module-level components so React does not remount the scale UI on every App render (fixes input focus loss). */
  function ScaleConverterLenInput({ value, onChange, placeholder, isFt }) {
    return h(InputBase, {
      value,
      onChange,
      placeholder,
      type: isFt ? "text" : "number",
      step: "any",
      min: 0,
    });
  }

  function ScaleConverterAreaInput({ value, onChange, placeholder }) {
    return h(InputBase, {
      value,
      onChange,
      placeholder,
      type: "number",
      step: "any",
      min: 0,
    });
  }

  function ScaleConverterResultHeader({ t, statusState, statusText, localizeStatus, computed, denomSafe, unit }) {
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
        h("div", { className: "text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--st-muted)]" }, t(computed.titleKey)),
        h(
          "div",
          { className: "mt-1.5 text-xs text-[var(--st-muted)] font-semibold" },
          `${t("common.scale")} 1:${denomSafe} • ${t("common.unit")} ${unitLabel(unit)}`
        ),
      ]),
      h("div", { className: pillClasses }, localizeStatus(statusText)),
    ]);
  }

  function ScaleConverterResultsPanel({ tab, computed, unit, onCopy, exportHistoryCSV, onOpenPdfModal, t }) {
    if (tab === "paper") {
      return h("div", {}, [
        h("div", { className: "grid grid-cols-1 gap-5" }, [
          h(ValueBlock, {
            label: t("common.paperAreaModel"),
            valueText: computed.paperAreaOut || "—",
            unitText: areaUnitLabel(unit),
            big: true,
          }),
          h(ValueBlock, {
            label: t("common.realAreaFits"),
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
              t("common.copyAsText")
            ),
            h(
              "button",
              { type: "button", onClick: exportHistoryCSV, className: "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150" },
              t("common.exportCsv")
            ),
            h(
              "button",
              {
                type: "button",
                onClick: onOpenPdfModal,
                className: "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150",
              },
              t("common.exportPdf")
            ),
          ]),
        ]),
      ]);
    }

    const isConvert = tab === "convert";
    const lenLabel = isConvert ? t("common.scaledLength") : t("common.realLength");
    const areaLabel = isConvert ? t("common.scaledArea") : t("common.realArea");
    const dimsLabel = isConvert ? t("common.scaledDims") : t("common.realDims");
    const volLabel = isConvert ? t("common.scaledVolume") : t("common.realVolume");

    const dimsText = [computed.wOut ?? "—", computed.hOut ?? "—", computed.dOut ?? "—"].join(" × ");

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
            t("common.copyAsText")
          ),
          h(
            "button",
            { type: "button", onClick: exportHistoryCSV, className: "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150" },
            t("common.exportCsv")
          ),
          h(
            "button",
            {
              type: "button",
              onClick: onOpenPdfModal,
              className: "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150",
            },
            t("common.exportPdf")
          ),
        ]),
      ]),
    ]);
  }

  function ScaleConverterTabBar({ tab, setTab, t }) {
    const tabs = [
      { id: "convert", label: t("common.convert") },
      { id: "reverse", label: t("common.reverse") },
      { id: "paper", label: t("common.paperTab") },
    ];
    return h("div", { className: "flex gap-2 bg-[var(--st-bg)] border border-[var(--st-border)] rounded-2xl p-2 mb-4" }, [
      tabs.map((tabItem) =>
        h(ValueButton, {
          key: tabItem.id,
          active: tab === tabItem.id,
          onClick: () => setTab(tabItem.id),
        }, tabItem.label)
      ),
    ]);
  }

  function ScaleConverterScaleSelector({
    t,
    customDenom,
    setCustomDenom,
    setDenom,
    applyCustomDenom,
    applyScalePreset,
    denomSafe,
  }) {
    return h("div", { className: "bg-[var(--st-bg)] border border-[var(--st-border)] rounded-3xl p-5 mb-5" }, [
      h("div", { className: "flex items-end justify-between gap-4 mb-3" }, [
        h("div", {}, [
          h("div", { className: "text-[10px] font-bold tracking-[.24em] uppercase text-[var(--st-muted)]" }, t("common.scale")),
          h("div", { className: "mt-1 text-xs text-[var(--st-muted)] font-semibold" }, t("common.customRatio")),
        ]),
        h("div", { className: "text-right" }, [
          h("div", { className: "text-[11px] font-semibold tracking-[.22em] uppercase text-[var(--st-muted)] mb-2" }, "1 :"),
          h("div", { className: "flex items-center gap-2 justify-end" }, [
            h("input", {
              key: "scale-custom-denom",
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
              t("common.apply")
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

  function ScaleConverterUnitSwitcher({ unit, setUnit, t }) {
    return h("div", { className: "bg-[var(--st-bg)] border border-[var(--st-border)] rounded-3xl p-5 mb-5" }, [
      h("div", { className: "mb-3" }, [
        h("div", { className: "text-[11px] font-semibold tracking-[.22em] uppercase text-[var(--st-muted)]" }, t("common.unit")),
        h("div", { className: "mt-1 text-xs text-[var(--st-muted)] font-semibold" }, t("common.affectsUnit")),
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

  function ScaleConverterHistoryPanel({ t, history, onSelect }) {
    return h("div", {}, [
      h("div", { className: "text-[11px] font-semibold tracking-[.22em] uppercase text-[var(--st-muted)] mb-3" }, t("common.historyLast6")),
      history.length === 0
        ? h("div", { className: "text-xs text-[var(--st-muted)] font-semibold" }, t("common.pressEnterHistory"))
        : h("div", { className: "flex flex-col gap-2" }, history.map((it, idx) => {
            const label =
              it.tab === "paper"
                ? `${t("common.paperShort")} ${it.inputs.paperSize} • 1:${it.denom}`
                : `${it.tab === "convert" ? t("common.convert") : t("common.reverse")} • 1:${it.denom}`;
            return h(
              "button",
              {
                key: `${it.ts}_${idx}`,
                type: "button",
                onClick: () => onSelect(it),
                className:
                  "text-left rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] px-4 py-3 transition-colors",
              },
              [
                h("div", { key: "t", className: "text-xs font-extrabold tracking-wide text-[var(--st-fg)]" }, label),
                h("div", { key: "s", className: "text-[11px] mt-1 text-[var(--st-muted)] font-semibold" }, `${t("common.unit")} ${it.unit}`),
              ]
            );
          })),
    ]);
  }

  function ScaleConverterQuickChips({ quickChips }) {
    return h("div", { className: "flex flex-wrap gap-2 mt-3" }, quickChips.map((c) =>
      h(ChipButton, { key: c.label, label: c.label, onClick: c.apply })
    ));
  }

  function ScaleConverterInputsPanel({
    tab,
    setTab,
    t,
    customDenom,
    setCustomDenom,
    setDenom,
    applyCustomDenom,
    applyScalePreset,
    denomSafe,
    unit,
    setUnit,
    history,
    onHistorySelect,
    quickChips,
    isFt,
    realLen,
    realArea,
    realW,
    realH,
    realD,
    setRealLen,
    setRealArea,
    setRealW,
    setRealH,
    setRealD,
    modelLen,
    modelArea,
    modelW,
    modelH,
    modelD,
    setModelLen,
    setModelArea,
    setModelW,
    setModelH,
    setModelD,
    paperSize,
    setPaperSize,
    onReset,
  }) {
    return h("div", {}, [
      h(ScaleConverterTabBar, { tab, setTab, t }),
      h(ScaleConverterScaleSelector, {
        t,
        customDenom,
        setCustomDenom,
        setDenom,
        applyCustomDenom,
        applyScalePreset,
        denomSafe,
      }),
      h(ScaleConverterUnitSwitcher, { unit, setUnit, t }),

      tab !== "paper"
        ? h("div", { className: "bg-[var(--st-bg)] border border-[var(--st-border)] rounded-3xl p-5" }, [
            h(SectionTitle, {
              label: tab === "convert" ? t("common.twoDRealToModel") : t("common.twoDModelToReal"),
              hint: t("common.twoDHint"),
            }),
            h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-5" }, [
              h(Field, {
                key: "scale-field-2d-len",
                label:
                  tab === "convert"
                    ? `${t("common.realLenLabel")} (${unitLabel(unit)})`
                    : `${t("common.modelLenLabel")} (${unitLabel(unit)})`,
                children: h(ScaleConverterLenInput, {
                  key: "scale-input-2d-len",
                  value: tab === "convert" ? realLen : modelLen,
                  onChange: tab === "convert" ? setRealLen : setModelLen,
                  placeholder: isFt ? "e.g., 5-10" : "e.g., 4.2",
                  isFt,
                }),
              }),
              h(Field, {
                key: "scale-field-2d-area",
                label:
                  tab === "convert"
                    ? `${t("common.realAreaField")} (${areaUnitLabel(unit)})`
                    : `${t("common.modelAreaField")} (${areaUnitLabel(unit)})`,
                children: h(ScaleConverterAreaInput, {
                  key: "scale-input-2d-area",
                  value: tab === "convert" ? realArea : modelArea,
                  onChange: tab === "convert" ? setRealArea : setModelArea,
                  placeholder: "e.g., 12.5",
                }),
              }),
            ]),
            h(ScaleConverterQuickChips, { quickChips }),

            h("div", { className: "h-px bg-[var(--st-border)] my-6" }),

            h(SectionTitle, { label: t("common.dimensionsVolume"), hint: t("common.threeDHint") }),
            h("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4" }, [
              h(Field, {
                key: "scale-field-3d-w",
                label: `${t("common.width")} (${unitLabel(unit)})`,
                children: h(ScaleConverterLenInput, {
                  key: "scale-input-3d-w",
                  value: tab === "convert" ? realW : modelW,
                  onChange: tab === "convert" ? setRealW : setModelW,
                  placeholder: "e.g., 3",
                  isFt,
                }),
              }),
              h(Field, {
                key: "scale-field-3d-h",
                label: `${t("common.height")} (${unitLabel(unit)})`,
                children: h(ScaleConverterLenInput, {
                  key: "scale-input-3d-h",
                  value: tab === "convert" ? realH : modelH,
                  onChange: tab === "convert" ? setRealH : setModelH,
                  placeholder: "e.g., 2.7",
                  isFt,
                }),
              }),
              h(Field, {
                key: "scale-field-3d-d",
                label: `${t("common.depth")} (${unitLabel(unit)})`,
                children: h(ScaleConverterLenInput, {
                  key: "scale-input-3d-d",
                  value: tab === "convert" ? realD : modelD,
                  onChange: tab === "convert" ? setRealD : setModelD,
                  placeholder: "e.g., 1.5",
                  isFt,
                }),
              }),
            ]),
          ])
        : h("div", { className: "bg-[var(--st-bg)] border border-[var(--st-border)] rounded-3xl p-5" }, [
            h(SectionTitle, { label: t("common.paperSizeCalculator"), hint: t("common.paperAreaFitsHint") }),
            h(Field, {
              key: "scale-field-paper",
              label: t("common.selectPaper"),
              children: h("select", {
                key: "scale-paper-select",
                value: paperSize,
                onChange: (e) => setPaperSize(e.target.value),
                className:
                  "w-full h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 text-[var(--st-fg)]",
              }, Object.keys(PAPER_SIZES).map((k) => h("option", { key: k, value: k }, k))),
            }),
            h("div", { className: "mt-4 text-xs text-[var(--st-muted)] font-semibold" }, t("common.tipPaper")),
          ]),

      h("div", { className: "mt-5" }, [h(ScaleConverterHistoryPanel, { t, history, onSelect: onHistorySelect })]),

      h("div", { className: "mt-5 flex gap-3" }, [
        h(
          "button",
          {
            type: "button",
            onClick: onReset,
            className: "w-full h-12 rounded-2xl bg-[var(--st-bg)] border border-[var(--st-border)] text-[var(--st-fg)] font-extrabold hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors",
          },
          t("common.reset")
        ),
      ]),
    ]);
  }

  function App() {
    const { t, mergeToolMeta, lang } = useI18n();

    /** Interpolate `{key}` placeholders in translated strings */
    const ti = useCallback(
      (path, vars) => {
        let s = t(path);
        if (vars && typeof vars === "object") {
          for (const [k, v] of Object.entries(vars)) {
            s = s.split(`{${k}}`).join(String(v));
          }
        }
        return s;
      },
      [t]
    );

    const localizeStatus = useCallback(
      (text) => {
        const key = STATUS_TEXT_TO_KEY[text];
        return key ? t(key) : text;
      },
      [t]
    );

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
        id: "gridCalculator",
        label: "Structural Grid Calculator",
        description: "Axis grid and structural bay planner",
        intro: "Divide a rectangular footprint into structural bays, count columns, and check indicative slab span and span-to-depth efficiency.",
      },
      {
        id: "loadCalculator",
        label: "Building Load Calculator",
        description: "Floor load and structural weight estimator",
        intro: "Estimate indicative dead and live floor loads from EN 1991-style tables, total building weight, and per-column foundation load using optional grid spacing.",
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

    const TOOL_GROUPS = useMemo(
      () => [
        {
          id: "geometry",
          label: t("nav.geometry"),
          toolIds: ["scale", "stair", "ramp", "span", "gridCalculator", "loadCalculator", "siteCoverage", "parking", "room"],
        },
        { id: "compliance", label: t("nav.compliance"), toolIds: ["fireEscape"] },
        { id: "environment", label: t("nav.environment"), toolIds: ["daylight", "uValue"] },
      ],
      [t]
    );

    const TOOL_PATHS = {
      landing: "/",
      scale: "/scale-converter",
      stair: "/stair-calculator",
      ramp: "/ramp-calculator",
      span: "/span-calculator",
      gridCalculator: "/grid-calculator",
      loadCalculator: "/load-calculator",
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
      if (p === "/grid-calculator") return "gridCalculator";
      if (p === "/load-calculator") return "loadCalculator";
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
    const themeTweenRef = useRef(null);

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

    const [gridBuildingWidthM, setGridBuildingWidthM] = useState("24");
    const [gridBuildingDepthM, setGridBuildingDepthM] = useState("18");
    const [gridPrefBayWidthM, setGridPrefBayWidthM] = useState("8");
    const [gridPrefBayDepthM, setGridPrefBayDepthM] = useState("6");
    const [gridStructureType, setGridStructureType] = useState("rc"); // rc | steel | timber

    const [loadNumFloors, setLoadNumFloors] = useState("4");
    const [loadFloorAreaM2, setLoadFloorAreaM2] = useState("500");
    const [loadBuildingUse, setLoadBuildingUse] = useState("office");
    const [loadFloorSystem, setLoadFloorSystem] = useState("rc_flat");
    const [loadFacadeType, setLoadFacadeType] = useState("medium");
    const [loadIncludeRoof, setLoadIncludeRoof] = useState(true);
    const [loadGridSpacingXm, setLoadGridSpacingXm] = useState("");
    const [loadGridSpacingYm, setLoadGridSpacingYm] = useState("");

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
        const tag = t("landing.tagline");
        return { id: "landing", label: "Structura", description: tag, intro: tag };
      }
      const base = TOOL_ITEMS.find((x) => x.id === activeTool) ?? TOOL_ITEMS[0];
      return mergeToolMeta(base);
    }, [activeTool, mergeToolMeta, t]);

    useEffect(() => {
      if (activeTool === "landing") {
        document.title = `Structura — ${t("landing.tagline")}`;
      } else {
        document.title = `${activeToolMeta.label} — Structura`;
      }
    }, [activeTool, activeToolMeta.label, t]);

    const roomProgramTotal = useMemo(() => {
      const s = roomProgramRows.reduce((acc, r) => acc + r.userAreaM2, 0);
      return Math.round(s * 10) / 10;
    }, [roomProgramRows]);

    useEffect(() => {
      const roomType = ROOM_PROGRAM_TYPES.find((r) => r.id === roomProgramTypeId);
      if (roomType) setRoomProgramAreaStr(formatSmartNumber(roomType.minAreaM2));
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
      try {
        localStorage.setItem("structura-theme", nextTheme);
      } catch {
        // ignore
      }
    }

    /** Initial DOM sync (matches inline script in index.html) */
    useLayoutEffect(() => {
      applyTheme(theme);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleThemeToggle = useCallback(() => {
      const next = theme === "dark" ? "light" : "dark";
      const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        setTheme(next);
        applyTheme(next);
        return;
      }
      setTheme(next);
      const el = document.documentElement;
      const cs = getComputedStyle(el);
      const from = {
        "--st-bg": cs.getPropertyValue("--st-bg").trim() || "#ffffff",
        "--st-fg": cs.getPropertyValue("--st-fg").trim() || "#0a0a0a",
        "--st-muted": cs.getPropertyValue("--st-muted").trim() || "#525252",
        "--st-border": cs.getPropertyValue("--st-border").trim() || "#e5e5e5",
      };
      const target =
        next === "dark"
          ? { "--st-bg": "#0a0a0a", "--st-fg": "#ffffff", "--st-muted": "#a3a3a3", "--st-border": "#262626" }
          : { "--st-bg": "#ffffff", "--st-fg": "#0a0a0a", "--st-muted": "#525252", "--st-border": "#e5e5e5" };

      gsap.fromTo(el, from, {
        ...target,
        duration: 0.55,
        ease: "power2.inOut",
        onComplete: () => {
          el.classList.toggle("dark", next === "dark");
          el.style.colorScheme = next === "dark" ? "dark" : "light";
          gsap.set(el, { clearProps: "--st-bg,--st-fg,--st-muted,--st-border" });
          try {
            localStorage.setItem("structura-theme", next);
          } catch (e) {
            /* ignore */
          }
          ScrollTrigger.refresh();
        },
      });
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

      const IBC_MAX_RISER_CM = 17.8;
      const IBC_MIN_TREAD_CM = 27.9;
      const ibcRiserCompliant = actualRiserCm <= IBC_MAX_RISER_CM + 1e-9;
      const ibcTreadCompliant = suggestedTreadCm >= IBC_MIN_TREAD_CM - 1e-9;

      return {
        steps,
        actualRiserCm,
        suggestedTreadCm,
        totalRunM,
        ibcRiserCompliant,
        ibcTreadCompliant,
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

      const ADA_MAX_SLOPE_PCT = 100 / 12; // 1:12 ≈ 8.333%
      let accessBadgeKey = "full"; // full | enLimit | fail
      if (slopePct > ADA_MAX_SLOPE_PCT + 1e-6) accessBadgeKey = "fail";
      else if (slopePct > 5 + 1e-9) accessBadgeKey = "enLimit";

      return {
        slopePct,
        lengthM,
        heightM: hM,
        accessBadgeKey,
      };
    }, [rampTotalHeightM, rampDesiredSlopePct, rampLengthM, rampInputMode]);

    function steelProfileSuggestionTranslated(span, tFn) {
      if (span < 4) return tFn("span.steel.i200");
      if (span < 6) return tFn("span.steel.i270");
      if (span < 9) return tFn("span.steel.i360");
      if (span < 12) return tFn("span.steel.i450");
      return tFn("span.steel.heavy");
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
        memberSuggestion = ti("span.memberRc", { side: formatSmartNumber(side) });
      } else if (spanSystem === "steel") {
        memberSuggestion = steelProfileSuggestionTranslated(span, t);
      } else {
        const w = Math.round(Math.max(20, Math.min(60, span * 8)) * 10) / 10;
        memberSuggestion = ti("span.memberTimber", { w: formatSmartNumber(w) });
      }

      let spanWarnLevel = "green";
      let spanWarnKey = null;
      if (spanSystem === "rc_flat") {
        if (span > 12) {
          spanWarnLevel = "red";
          spanWarnKey = "rcFlatRed";
        } else if (span > 10) {
          spanWarnLevel = "yellow";
          spanWarnKey = "rcFlatYellow";
        }
      } else if (spanSystem === "rc_beam") {
        if (span > 18) {
          spanWarnLevel = "red";
          spanWarnKey = "rcBeamRed";
        } else if (span > 15) {
          spanWarnLevel = "yellow";
          spanWarnKey = "rcBeamYellow";
        }
      }

      let designStatus = "efficient";
      if (spanWarnLevel === "red") {
        designStatus = "review";
      } else if (spanWarnLevel === "yellow") {
        designStatus = "acceptable";
      } else if (
        (spanSystem === "rc_flat" || spanSystem === "rc_beam") &&
        spanLoad === "heavy" &&
        span > 8
      ) {
        designStatus = "acceptable";
      }

      const designLabel = t(`span.design.${designStatus}`);
      const spanWarnText = spanWarnKey ? t(`span.warn.${spanWarnKey}`) : null;

      const systemLabel = t(`options.spanSystem.${spanSystem}`);
      const loadLabel = t(`options.spanLoad.${spanLoad}`);

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
    }, [spanLengthM, spanSystem, spanLoad, t, ti]);

    const gridResult = useMemo(() => {
      const W = Number(gridBuildingWidthM);
      const D = Number(gridBuildingDepthM);
      const bx = Number(gridPrefBayWidthM);
      const by = Number(gridPrefBayDepthM);
      if (![W, D, bx, by].every((n) => Number.isFinite(n) && n > 0)) return null;

      const nx = Math.max(1, Math.round(W / bx));
      const ny = Math.max(1, Math.round(D / by));
      const rawAx = W / nx;
      const rawAy = D / ny;
      const round1 = (x) => Math.round(x * 10) / 10;
      const actualBayW = round1(rawAx);
      const actualBayD = round1(rawAy);
      const totalColumns = (nx + 1) * (ny + 1);
      const slabSpanM = round1(Math.max(actualBayW, actualBayD));

      const ldDivisor = gridStructureType === "rc" ? 28 : gridStructureType === "steel" ? 20 : 15;
      const indicativeDepthCm = round1((slabSpanM * 100) / ldDivisor);
      const ldRatioUsed = ldDivisor;

      const meanBayRelErr =
        (Math.abs(actualBayW - bx) / bx + Math.abs(actualBayD - by) / by) / 2;

      const spanLimits = {
        rc: { opt: 7.5, acc: 11 },
        steel: { opt: 12, acc: 16 },
        timber: { opt: 5, acc: 7.5 },
      };
      const lim = spanLimits[gridStructureType] || spanLimits.rc;
      let tier = 0;
      if (slabSpanM > lim.acc) tier = 2;
      else if (slabSpanM > lim.opt) tier = 1;
      if (meanBayRelErr > 0.35) tier = 2;
      else if (meanBayRelErr > 0.18) tier = Math.min(2, tier + 1);

      const efficiencyKeys = ["optimal", "acceptable", "review"];
      const efficiencyKey = efficiencyKeys[tier];
      const efficiencyLabel = t(`gridCalc.efficiency.${efficiencyKey}`);

      const structureLabel = t(`options.gridStructure.${gridStructureType}`);

      return {
        widthM: W,
        depthM: D,
        prefBayW: bx,
        prefBayD: by,
        nx,
        ny,
        actualBayW,
        actualBayD,
        totalColumns,
        slabSpanM,
        ldRatioUsed,
        indicativeDepthCm,
        efficiencyKey,
        efficiencyLabel,
        structureLabel,
        meanBayRelErr,
      };
    }, [
      gridBuildingWidthM,
      gridBuildingDepthM,
      gridPrefBayWidthM,
      gridPrefBayDepthM,
      gridStructureType,
      t,
    ]);

    const loadResult = useMemo(() => {
      const nF = Math.floor(Number(loadNumFloors));
      const A = Number(loadFloorAreaM2);
      if (!Number.isFinite(nF) || nF < 1 || !Number.isFinite(A) || A <= 0) return null;

      const liveRaw = LOAD_CALC_LIVE_KNM2[loadBuildingUse];
      const floorDeadRaw = LOAD_CALC_FLOOR_DEAD_KNM2[loadFloorSystem];
      const facadeRaw = LOAD_CALC_FACADE_KNM2[loadFacadeType];
      if (!Number.isFinite(liveRaw) || !Number.isFinite(floorDeadRaw) || !Number.isFinite(facadeRaw)) return null;

      const round2 = (x) => Math.round(x * 100) / 100;
      const round1w = (x) => Math.round(x * 10) / 10;

      const deadPerFloorKnM2 = round2(floorDeadRaw + facadeRaw);
      const livePerFloorKnM2 = round2(liveRaw);
      const totalFloorKnM2 = round2(deadPerFloorKnM2 + livePerFloorKnM2);

      const roofDead = round2(LOAD_CALC_ROOF_DEAD_KNM2);
      const roofLive = round2(LOAD_CALC_ROOF_LIVE_KNM2);
      const roofTotalKnM2 = round2(roofDead + roofLive);

      let totalKnRaw = nF * A * totalFloorKnM2;
      if (loadIncludeRoof) totalKnRaw += A * (roofDead + roofLive);
      const totalBuildingKn = round1w(totalKnRaw);
      const tonnes = round1w(totalBuildingKn / 9.80665);

      const sx = Number(loadGridSpacingXm);
      const sy = Number(loadGridSpacingYm);
      let tributaryM2 = LOAD_CALC_DEFAULT_TRIBUTARY_M2;
      let usedGridForFoundation = false;
      if (Number.isFinite(sx) && Number.isFinite(sy) && sx > 0 && sy > 0) {
        tributaryM2 = round2(sx * sy);
        usedGridForFoundation = true;
      }
      const numColumnsApprox = Math.max(1, Math.round(A / tributaryM2));
      const foundationKnPerColumn = round1w(totalBuildingKn / numColumnsApprox);

      let loadCategory = "light";
      if (totalFloorKnM2 >= 13) loadCategory = "veryHeavy";
      else if (totalFloorKnM2 >= 9) loadCategory = "heavy";
      else if (totalFloorKnM2 >= 6.5) loadCategory = "medium";

      return {
        numFloors: nF,
        floorAreaM2: A,
        deadPerFloorKnM2,
        livePerFloorKnM2,
        totalFloorKnM2,
        totalBuildingKn,
        tonnes,
        foundationKnPerColumn,
        numColumnsApprox,
        usedGridForFoundation,
        tributaryM2,
        loadCategory,
        loadCategoryLabel: t(`loadCalc.category.${loadCategory}`),
        roofIncluded: loadIncludeRoof,
        roofTotalKnM2: loadIncludeRoof ? roofTotalKnM2 : null,
        useLabel: t(`options.loadBuildingUse.${loadBuildingUse}`),
        floorSystemLabel: t(`options.loadFloorSystem.${loadFloorSystem}`),
        facadeLabel: t(`options.loadFacadeType.${loadFacadeType}`),
      };
    }, [
      loadNumFloors,
      loadFloorAreaM2,
      loadBuildingUse,
      loadFloorSystem,
      loadFacadeType,
      loadIncludeRoof,
      loadGridSpacingXm,
      loadGridSpacingYm,
      t,
    ]);

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
      if (efficiencyPct < 50) {
        effLevel = "poor";
      } else if (efficiencyPct < 65) {
        effLevel = "acceptable";
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
        rampRequired,
        layoutKey: parkingLayout,
        usageKey: parkingUsage,
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
      const roomName = t(`options.daylightRoom.${room.id}`);
      const facadeName = t(`options.facade.${daylightFacade}`);

      let complianceLevel = "green";
      let complianceLabel = t("daylight.compliance.green");
      if (dfPct + 1e-9 >= enDfMin) {
        complianceLevel = "green";
        complianceLabel = t("daylight.compliance.green");
      } else if (dfPct + 1e-9 >= lowBand) {
        complianceLevel = "yellow";
        complianceLabel = t("daylight.compliance.yellow");
      } else {
        complianceLevel = "red";
        complianceLabel = t("daylight.compliance.red");
      }

      const recommendations = [];
      if (complianceLevel === "red" || (complianceLevel === "yellow" && !enOk)) {
        if (dfPct > 0.05) {
          const targetWfr = wfrPct * (enDfMin / dfPct);
          const needWinE = (targetWfr / 100) * floor - win;
          if (needWinE > 0.05) {
            recommendations.push(
              ti("daylight.recIncreaseWin", {
                need: formatSmartNumber(needWinE),
                enDf: formatInteger(enDfMin),
                room: roomName,
              })
            );
          } else {
            recommendations.push(
              ti("daylight.recRooflights", {
                df: formatSmartNumber(dfPct),
                enDf: formatInteger(enDfMin),
                room: roomName,
              })
            );
          }
        } else {
          recommendations.push(
            ti("daylight.recSubstantial", {
              enDf: formatInteger(enDfMin),
              room: roomName,
            })
          );
        }
      }
      if (complianceLevel !== "green" && depth > penetrationM * 1.12) {
        recommendations.push(
          ti("daylight.recPenetration", {
            pen: formatSmartNumber(penetrationM),
            depth: formatSmartNumber(depth),
          })
        );
      }
      if (recommendations.length === 0 && complianceLevel === "green") {
        recommendations.push(t("daylight.recOkGreen"));
      }

      return {
        floorM2: floor,
        windowM2: win,
        depthM: depth,
        roomLabel: roomName,
        facadeLabel: facadeName,
        wfrPct,
        dfPct,
        penetrationM,
        enDfMin,
        enOk,
        complianceLevel,
        complianceLabel,
        recommendations,
      };
    }, [daylightRoomType, daylightFloorM2, daylightWindowM2, daylightDepthM, daylightFacade, t, ti]);

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
      const buildingName = t(`options.fireBuilding.${bt.id}`);
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
          ti("fire.failureTravel", {
            travel: formatSmartNumber(travel),
            maxTravel: formatSmartNumber(maxTravelM),
            building: buildingName,
            sprinkler: fireSprinkler ? t("fire.sprinklered") : t("fire.nonSprinklered"),
          })
        );
      }
      if (!exitsOk) {
        failures.push(
          ti("fire.failureExits", {
            exits: formatInteger(exitsN),
            min: formatInteger(requiredMinExits),
            floor: formatSmartNumber(floor),
          })
        );
      }

      let complianceLevel = "full";
      let complianceLabel = t("fire.compliance.full");
      if (failures.length > 0) {
        complianceLevel = "fail";
        complianceLabel = t("fire.compliance.fail");
      } else if (marginalTravel || marginalExits) {
        complianceLevel = "marginal";
        if (marginalTravel && marginalExits) {
          complianceLabel = t("fire.compliance.marginalBoth");
        } else if (marginalTravel) {
          complianceLabel = t("fire.compliance.marginalTravel");
        } else {
          complianceLabel = t("fire.compliance.marginalExits");
        }
      }

      return {
        buildingLabel: buildingName,
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
    }, [fireBuildingType, fireFloorM2, fireNumExits, fireTravelM, fireFloors, fireSprinkler, t, ti]);

    const uValueResult = useMemo(() => {
      const getMat = (id) => U_VALUE_MATERIALS.find((m) => m.id === id) || U_VALUE_MATERIALS[0];
      let totalThicknessMm = 0;
      let RsumLayers = 0;
      const layerRows = [];
      for (let i = 0; i < uLayers.length; i++) {
        const layer = uLayers[i];
        const thickMm = Number(layer.thicknessMm);
        if (!Number.isFinite(thickMm) || thickMm <= 0) return null;
        const mat = getMat(layer.materialId);
        let rLayer;
        if (mat.fixedR != null) {
          rLayer = mat.fixedR;
        } else if (mat.lambda != null && mat.lambda > 0) {
          rLayer = (thickMm / 1000) / mat.lambda;
        } else {
          return null;
        }
        totalThicknessMm += thickMm;
        RsumLayers += rLayer;
        layerRows.push({
          uid: layer.uid,
          materialId: layer.materialId,
          materialLabel: t(`options.uMaterial.${mat.id}`),
          thicknessMm: thickMm,
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
      const climateLabelLoc = t(`options.uClimate.${climate.id}`);
      const constructionLabelLoc = t(`options.uConstruction.${constr.id}`);
      const thresholds = U_VALUE_THRESHOLDS[uConstructionType] || U_VALUE_THRESHOLDS.external_wall;
      const uMax = thresholds[uClimateZone] ?? thresholds.C;

      let complianceLevel = "green";
      let complianceLabel = t("uValue.compliance.green");
      if (uRounded <= uMax + 1e-9) {
        complianceLevel = "green";
        complianceLabel = t("uValue.compliance.green");
      } else if (uRounded <= uMax * 1.15 + 1e-9) {
        complianceLevel = "yellow";
        complianceLabel = t("uValue.compliance.yellow");
      } else {
        complianceLevel = "red";
        complianceLabel = t("uValue.compliance.red");
      }

      const improvementWm2K = uRounded > uMax ? Math.round((uRounded - uMax) * 100) / 100 : 0;

      return {
        totalThicknessMm: Math.round(totalThicknessMm * 10) / 10,
        U: uRounded,
        Rtotal: RtotalRounded,
        uMax,
        climateLabel: climateLabelLoc,
        constructionLabel: constructionLabelLoc,
        complianceLevel,
        complianceLabel,
        improvementWm2K,
        layerRows,
        uLayersSnapshot: uLayers.map((l) => ({ ...l })),
      };
    }, [uClimateZone, uConstructionType, uLayers, t]);

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
      let complianceLabel = t("site.compliance.ok");
      if (exceedsFar) {
        complianceLevel = "red";
        complianceLabel = ti("site.compliance.exceed", {
          over: formatSmartNumber(overGfaM2),
          floorsEq: formatSmartNumber(floorsOver),
        });
      } else if (gfaDemandM2 > maxTotalGfaM2 * 0.85 + 1e-6) {
        complianceLevel = "yellow";
        complianceLabel = ti("site.compliance.near", { headroom: formatSmartNumber(headroomM2) });
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
    }, [sitePlotM2, siteScrStr, siteFarStr, siteFloorsStr, siteBasement, t, ti]);

    const computed = useMemo(() => {
      if (tab === "convert") {
        return {
          mode: "Convert",
          titleKey: "common.scaledOutputs",
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
          titleKey: "common.realWorldOutputs",
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
        titleKey: "common.paperSizeCalculator",
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
        return [t("export.span.title"), "", t("common.statusValidSpanLength")].join("\n");
      }
      const r = spanResult;
      const parts = [
        t("export.span.title"),
        "",
        ti("export.span.systemLine", { v: r.systemLabel }),
        ti("export.span.loadLine", { v: r.loadLabel }),
        ti("export.span.spanLine", { v: formatSmartNumber(r.spanM) }),
        "",
        t("export.resultsHeader"),
        ti("export.span.depthLine", { v: formatSmartNumber(r.depthCm) }),
        ti("export.span.ldLine", { v: formatSmartNumber(r.ldRatio) }),
        ti("export.span.memberLine", { v: r.memberSuggestion }),
        ti("export.span.designLine", { v: r.designLabel }),
      ];
      if (r.spanWarnText) parts.push(ti("export.span.validationLine", { v: r.spanWarnText }));
      return parts.join("\n");
    }

    function formatStairCopyText() {
      if (!stairResult) {
        return [t("tools.stair.label"), "", t("common.noValidInputs")].join("\n");
      }
      const r = stairResult;
      return [
        t("tools.stair.label"),
        "",
        t("export.resultsHeader"),
        ti("export.stair.stepsLine", { v: formatInteger(r.steps) }),
        ti("export.stair.riserLine", { v: formatSmartNumber(r.actualRiserCm) }),
        ti("export.stair.runLine", { v: formatSmartNumber(r.totalRunM) }),
        ti("export.stair.treadLine", { v: formatSmartNumber(r.suggestedTreadCm) }),
      ].join("\n");
    }

    function formatRampCopyText() {
      if (!rampResult) {
        return [t("tools.ramp.label"), "", t("common.awaitingRampInput")].join("\n");
      }
      const r = rampResult;
      return [
        t("tools.ramp.label"),
        "",
        t("export.resultsHeader"),
        ti("export.ramp.accessLine", { v: t(`ramp.access.${r.accessBadgeKey}`) }),
        ti("export.ramp.slopeLine", { v: formatSmartNumber(r.slopePct) }),
        ti("export.ramp.lengthLine", { v: formatSmartNumber(r.lengthM) }),
        ti("export.ramp.heightLine", { v: formatSmartNumber(r.heightM) }),
      ].join("\n");
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
      if (activeTool === "stair") {
        const text = formatStairCopyText();
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
      if (activeTool === "ramp") {
        const text = formatRampCopyText();
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
      if (activeTool === "gridCalculator") {
        const text = formatGridCalculatorCopyText();
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
      if (activeTool === "loadCalculator") {
        const text = formatLoadCalculatorCopyText();
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
      const roomType = ROOM_PROGRAM_TYPES.find((r) => r.id === roomProgramTypeId);
      if (!roomType) return;
      const a = Number(roomProgramAreaStr);
      if (!Number.isFinite(a) || a <= 0) {
        setStatus({ state: "warn", text: "Enter a valid area (m²)." });
        return;
      }
      setRoomProgramRows((prev) => [
        ...prev,
        {
          uid: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          typeId: roomType.id,
          name: roomType.name,
          minAreaM2: roomType.minAreaM2,
          minDimM: roomType.minDimM,
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
        r.typeId ? t(`options.roomProgram.${r.typeId}`) : r.name,
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
        return [t("export.parking.title"), "", t("common.statusValidParkingArea")].join("\n");
      }
      const r = parkingResult;
      return [
        t("export.parking.title"),
        "",
        ti("export.parking.totalAreaLine", { v: formatSmartNumber(r.totalAreaM2) }),
        ti("export.parking.layoutLine", { v: t(`options.parkingLayout.${r.layoutKey}`) }),
        ti("export.parking.usageLine", { v: t(`options.parkingUsage.${r.usageKey}`) }),
        "",
        t("export.resultsHeader"),
        ti("export.parking.spacesLine", { v: formatInteger(r.spaces) }),
        ti("export.parking.aisleLine", { v: formatSmartNumber(r.aisleM) }),
        ti("export.parking.spaceDimLine", { w: formatSmartNumber(r.spaceDimW), d: formatSmartNumber(r.spaceDimD) }),
        ti("export.parking.rampLine", { v: r.rampRequired ? t("common.yes") : t("common.no") }),
        ti("export.parking.efficiencyLine", { v: formatSmartNumber(r.efficiencyPct) }),
        ti("export.parking.assessmentLine", { v: t(`badges.parkingEfficiency.${r.effLevel}`) }),
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
        `- EN 17037 (min DF ${formatInteger(r.enDfMin)}% for ${r.roomLabel}): ${r.enOk ? "Pass" : "Fail"}`,
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
        `Number of exits: ${formatInteger(r.numExits)}`,
        `Travel distance to nearest exit: ${formatSmartNumber(r.travelM)} m`,
        `Number of floors: ${formatInteger(r.floors)}`,
        `Sprinkler system: ${r.sprinkler ? "Yes" : "No"}`,
        "",
        "Results (IBC 2021 — indicative):",
        `- Maximum allowed travel distance: ${formatSmartNumber(r.maxTravelM)} m`,
        `- Required minimum number of exits: ${formatInteger(r.requiredMinExits)}`,
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
      lines.push(`- Number of floors: ${formatInteger(r.floors)}`);
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

    function formatGridCalculatorCopyText() {
      const lines = [t("tools.gridCalculator.label"), "", `Timestamp: ${new Date().toLocaleString()}`, ""];
      if (!gridResult) {
        lines.push(t("gridCalc.enterValid"));
        return lines.join("\n");
      }
      const r = gridResult;
      lines.push(t("common.inputs"));
      lines.push(`- ${t("gridCalc.buildingWidthM")}: ${formatSmartNumber(r.widthM)} m`);
      lines.push(`- ${t("gridCalc.buildingDepthM")}: ${formatSmartNumber(r.depthM)} m`);
      lines.push(`- ${t("gridCalc.prefBayWidthM")}: ${formatSmartNumber(r.prefBayW)} m`);
      lines.push(`- ${t("gridCalc.prefBayDepthM")}: ${formatSmartNumber(r.prefBayD)} m`);
      lines.push(`- ${t("gridCalc.structureType")}: ${r.structureLabel}`);
      lines.push("");
      lines.push(t("common.autoCalculate"));
      lines.push(ti("export.gridCalc.baysXLine", { v: formatInteger(r.nx) }));
      lines.push(ti("export.gridCalc.baysYLine", { v: formatInteger(r.ny) }));
      lines.push(ti("export.gridCalc.actualBayWLine", { v: formatSmartNumber(r.actualBayW) }));
      lines.push(ti("export.gridCalc.actualBayDLine", { v: formatSmartNumber(r.actualBayD) }));
      lines.push(ti("export.gridCalc.columnsLine", { v: formatInteger(r.totalColumns) }));
      lines.push(ti("export.gridCalc.slabSpanLine", { v: formatSmartNumber(r.slabSpanM) }));
      lines.push(ti("export.gridCalc.ldLine", { v: formatSmartNumber(r.ldRatioUsed) }));
      lines.push(ti("export.gridCalc.depthLine", { v: formatSmartNumber(r.indicativeDepthCm) }));
      lines.push(ti("export.gridCalc.efficiencyLine", { v: r.efficiencyLabel }));
      lines.push("");
      lines.push(t("gridCalc.note"));
      return lines.join("\n");
    }

    function formatLoadCalculatorCopyText() {
      const lines = [t("tools.loadCalculator.label"), "", `Timestamp: ${new Date().toLocaleString()}`, ""];
      if (!loadResult) {
        lines.push(t("loadCalc.enterValid"));
        return lines.join("\n");
      }
      const r = loadResult;
      lines.push(t("common.inputs"));
      lines.push(ti("export.loadCalc.floorsLine", { v: formatInteger(r.numFloors) }));
      lines.push(ti("export.loadCalc.areaLine", { v: formatSmartNumber(r.floorAreaM2) }));
      lines.push(ti("export.loadCalc.useLine", { v: r.useLabel }));
      lines.push(ti("export.loadCalc.floorSystemLine", { v: r.floorSystemLabel }));
      lines.push(ti("export.loadCalc.facadeLine", { v: r.facadeLabel }));
      lines.push(
        ti("export.loadCalc.roofLine", {
          v: r.roofIncluded ? t("common.yes") : t("common.no"),
        })
      );
      lines.push("");
      lines.push(t("common.autoCalculate"));
      lines.push(ti("export.loadCalc.deadLine", { v: formatLoadKnM2(r.deadPerFloorKnM2) }));
      lines.push(ti("export.loadCalc.liveLine", { v: formatLoadKnM2(r.livePerFloorKnM2) }));
      lines.push(ti("export.loadCalc.totalFloorLine", { v: formatLoadKnM2(r.totalFloorKnM2) }));
      lines.push(ti("export.loadCalc.totalKnLine", { v: formatSmartNumber(r.totalBuildingKn) }));
      lines.push(ti("export.loadCalc.tonnesLine", { v: formatSmartNumber(r.tonnes) }));
      lines.push(ti("export.loadCalc.foundationLine", { v: formatSmartNumber(r.foundationKnPerColumn) }));
      lines.push(ti("export.loadCalc.categoryLine", { v: r.loadCategoryLabel }));
      lines.push(ti("export.loadCalc.columnsApproxLine", { v: formatInteger(r.numColumnsApprox) }));
      lines.push(
        ti("export.loadCalc.tributaryLine", {
          v: formatSmartNumber(r.tributaryM2),
          basis: r.usedGridForFoundation ? t("loadCalc.tributaryFromGrid") : t("loadCalc.tributaryDefault"),
        })
      );
      lines.push("");
      lines.push(t("loadCalc.referenceLine"));
      lines.push(t("loadCalc.roofNote"));
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
        lines.push(`- Number of exits: ${formatInteger(r.numExits)}`);
        lines.push(`- Travel distance to nearest exit: ${formatSmartNumber(r.travelM)} m`);
        lines.push(`- Number of floors: ${formatInteger(r.floors)}`);
        lines.push(`- Sprinkler system: ${r.sprinkler ? "Yes" : "No"}`);
        lines.push("");
        lines.push("Results");
        lines.push(`- Maximum allowed travel distance: ${formatSmartNumber(r.maxTravelM)} m`);
        lines.push(`- Required minimum number of exits: ${formatInteger(r.requiredMinExits)}`);
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
        lines.push(`- EN 17037 (min DF ${formatInteger(r.enDfMin)}% for ${r.roomLabel}): ${r.enOk ? "Pass" : "Fail"}`);
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
        lines.push(t("common.inputs"));
        lines.push(`- ${t("common.totalParkingArea")}: ${formatSmartNumber(r.totalAreaM2)} m²`);
        lines.push(`- ${t("common.parkingType")}: ${t(`options.parkingLayout.${r.layoutKey}`)}`);
        lines.push(`- ${t("common.usageType")}: ${t(`options.parkingUsage.${r.usageKey}`)}`);
        lines.push("");
        lines.push(t("common.results"));
        lines.push(`- ${t("common.parkingSpaces")}: ${formatInteger(r.spaces)}`);
        lines.push(`- ${t("common.requiredAisleWidth")}: ${formatSmartNumber(r.aisleM)} m`);
        lines.push(`- ${t("common.singleSpaceWxD")}: ${formatSmartNumber(r.spaceDimW)} × ${formatSmartNumber(r.spaceDimD)} m`);
        lines.push(`- ${t("common.rampRequired")}: ${r.rampRequired ? t("common.yes") : t("common.no")}`);
        lines.push(`- ${t("common.efficiency")}: ${formatSmartNumber(r.efficiencyPct)} %`);
        lines.push(`- ${t("export.parking.assessmentShort")}: ${t(`badges.parkingEfficiency.${r.effLevel}`)}`);
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
      if (activeTool === "gridCalculator") {
        const timestamp = new Date().toLocaleString();
        const lines = [];
        lines.push(projectName ? projectName : "Project (untitled)");
        lines.push(t("tools.gridCalculator.label"));
        lines.push(`Timestamp: ${timestamp}`);
        lines.push("");
        if (!gridResult) {
          lines.push(t("gridCalc.enterValid"));
          return lines;
        }
        const r = gridResult;
        lines.push(t("common.inputs"));
        lines.push(`- ${t("gridCalc.buildingWidthM")}: ${formatSmartNumber(r.widthM)} m`);
        lines.push(`- ${t("gridCalc.buildingDepthM")}: ${formatSmartNumber(r.depthM)} m`);
        lines.push(`- ${t("gridCalc.prefBayWidthM")}: ${formatSmartNumber(r.prefBayW)} m`);
        lines.push(`- ${t("gridCalc.prefBayDepthM")}: ${formatSmartNumber(r.prefBayD)} m`);
        lines.push(`- ${t("gridCalc.structureType")}: ${r.structureLabel}`);
        lines.push("");
        lines.push(t("common.autoCalculate"));
        lines.push(ti("export.gridCalc.baysXLine", { v: formatInteger(r.nx) }));
        lines.push(ti("export.gridCalc.baysYLine", { v: formatInteger(r.ny) }));
        lines.push(ti("export.gridCalc.actualBayWLine", { v: formatSmartNumber(r.actualBayW) }));
        lines.push(ti("export.gridCalc.actualBayDLine", { v: formatSmartNumber(r.actualBayD) }));
        lines.push(ti("export.gridCalc.columnsLine", { v: formatInteger(r.totalColumns) }));
        lines.push(ti("export.gridCalc.slabSpanLine", { v: formatSmartNumber(r.slabSpanM) }));
        lines.push(ti("export.gridCalc.ldLine", { v: formatSmartNumber(r.ldRatioUsed) }));
        lines.push(ti("export.gridCalc.depthLine", { v: formatSmartNumber(r.indicativeDepthCm) }));
        lines.push(ti("export.gridCalc.efficiencyLine", { v: r.efficiencyLabel }));
        lines.push("");
        lines.push(t("gridCalc.note"));
        return lines;
      }
      if (activeTool === "loadCalculator") {
        const timestamp = new Date().toLocaleString();
        const lines = [];
        lines.push(projectName ? projectName : "Project (untitled)");
        lines.push(t("tools.loadCalculator.label"));
        lines.push(`Timestamp: ${timestamp}`);
        lines.push("");
        if (!loadResult) {
          lines.push(t("loadCalc.enterValid"));
          return lines;
        }
        const r = loadResult;
        lines.push(t("common.inputs"));
        lines.push(ti("export.loadCalc.floorsLine", { v: formatInteger(r.numFloors) }));
        lines.push(ti("export.loadCalc.areaLine", { v: formatSmartNumber(r.floorAreaM2) }));
        lines.push(ti("export.loadCalc.useLine", { v: r.useLabel }));
        lines.push(ti("export.loadCalc.floorSystemLine", { v: r.floorSystemLabel }));
        lines.push(ti("export.loadCalc.facadeLine", { v: r.facadeLabel }));
        lines.push(
          ti("export.loadCalc.roofLine", {
            v: r.roofIncluded ? t("common.yes") : t("common.no"),
          })
        );
        lines.push("");
        lines.push(t("common.autoCalculate"));
        lines.push(ti("export.loadCalc.deadLine", { v: formatLoadKnM2(r.deadPerFloorKnM2) }));
        lines.push(ti("export.loadCalc.liveLine", { v: formatLoadKnM2(r.livePerFloorKnM2) }));
        lines.push(ti("export.loadCalc.totalFloorLine", { v: formatLoadKnM2(r.totalFloorKnM2) }));
        lines.push(ti("export.loadCalc.totalKnLine", { v: formatSmartNumber(r.totalBuildingKn) }));
        lines.push(ti("export.loadCalc.tonnesLine", { v: formatSmartNumber(r.tonnes) }));
        lines.push(ti("export.loadCalc.foundationLine", { v: formatSmartNumber(r.foundationKnPerColumn) }));
        lines.push(ti("export.loadCalc.categoryLine", { v: r.loadCategoryLabel }));
        lines.push(ti("export.loadCalc.columnsApproxLine", { v: formatInteger(r.numColumnsApprox) }));
        lines.push(
          ti("export.loadCalc.tributaryLine", {
            v: formatSmartNumber(r.tributaryM2),
            basis: r.usedGridForFoundation ? t("loadCalc.tributaryFromGrid") : t("loadCalc.tributaryDefault"),
          })
        );
        lines.push("");
        lines.push(t("loadCalc.referenceLine"));
        lines.push(t("loadCalc.roofNote"));
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
        lines.push(`- Floors: ${formatInteger(r.floors)}`);
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
          activeTool === "gridCalculator" ||
          activeTool === "loadCalculator" ||
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

        if (activeTool === "gridCalculator" && gridResult) {
          y += 10;
          if (y < 640) {
            const gr = gridResult;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text(t("gridCalc.planDiagram"), marginX, y);
            y += 16;
            doc.setFont("helvetica", "normal");
            const sx = marginX;
            const sy = y;
            const maxSide = 210;
            const sc = maxSide / Math.max(gr.widthM, gr.depthM);
            const bw = gr.widthM * sc;
            const bh = gr.depthM * sc;
            doc.setDrawColor(40);
            doc.setLineWidth(2.5);
            doc.rect(sx, sy, bw, bh);
            doc.setLineWidth(0.4);
            doc.setDrawColor(120);
            for (let i = 1; i < gr.nx; i++) {
              const xi = sx + (i * bw) / gr.nx;
              doc.line(xi, sy, xi, sy + bh);
            }
            for (let j = 1; j < gr.ny; j++) {
              const yj = sy + (j * bh) / gr.ny;
              doc.line(sx, yj, sx + bw, yj);
            }
            doc.setFillColor(220, 38, 38);
            for (let ix = 0; ix <= gr.nx; ix++) {
              for (let iy = 0; iy <= gr.ny; iy++) {
                const cx = sx + (ix * bw) / gr.nx;
                const cy = sy + (iy * bh) / gr.ny;
                doc.circle(cx, cy, 4.4, "F");
              }
            }
            doc.setDrawColor(0);
            doc.setTextColor(55);
            doc.setFontSize(7);
            doc.text(ti("gridCalc.dimXLabel", { n: gr.nx, v: formatSmartNumber(gr.actualBayW) }), sx, sy + bh + 14);
            doc.text(ti("gridCalc.dimYLabel", { n: gr.ny, v: formatSmartNumber(gr.actualBayD) }), sx + bw + 6, sy + bh / 2);
            doc.setTextColor(0);
            y += bh + 26;
          }
        }

        if (activeTool === "loadCalculator" && loadResult) {
          y += 10;
          if (y < 640) {
            const lr = loadResult;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text(t("loadCalc.sectionDiagram"), marginX, y);
            y += 16;
            doc.setFont("helvetica", "normal");
            const sx = marginX + 70;
            const sy = y;
            const bw = 72;
            const bh = 138;
            const nRoof = lr.roofIncluded ? 1 : 0;
            const nLv = lr.numFloors + nRoof;
            const hSeg = bh / Math.max(nLv, 1);
            const qs = [];
            if (lr.roofIncluded && lr.roofTotalKnM2 != null) qs.push(lr.roofTotalKnM2);
            for (let i = 0; i < lr.numFloors; i++) qs.push(lr.totalFloorKnM2);
            const maxQ = Math.max(...qs.map((q) => (Number.isFinite(q) ? q : 0)), 0.01);
            doc.setDrawColor(55);
            doc.setLineWidth(1.2);
            doc.rect(sx, sy, bw, bh);
            doc.setLineWidth(0.6);
            for (let i = 0; i < nLv; i++) {
              const y0 = sy + i * hSeg;
              const ySlab = y0 + hSeg;
              const q = qs[i] || 0;
              const alen = 10 + (q / maxQ) * 30;
              const xMid = sx + bw / 2;
              const yArrowTop = y0 + 5;
              const yArrowBottom = Math.min(yArrowTop + alen, ySlab - 5);
              doc.setDrawColor(200, 70, 70);
              doc.setLineWidth(1.4);
              doc.line(xMid, yArrowTop, xMid, yArrowBottom);
              doc.line(xMid - 4, yArrowBottom - 1, xMid, yArrowBottom + 5);
              doc.line(xMid + 4, yArrowBottom - 1, xMid, yArrowBottom + 5);
              doc.setDrawColor(55);
              doc.setLineWidth(1.2);
              doc.line(sx + 3, ySlab - 1, sx + bw - 3, ySlab - 1);
            }
            doc.setDrawColor(0);
            doc.setLineWidth(0.3);
            y += bh + 22;
          }
        }

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
            const memH = 34;
            const supW = 18;
            const supH = 36;
            const conc = [82, 82, 91];
            const concStroke = [39, 39, 42];
            doc.setDrawColor(concStroke[0], concStroke[1], concStroke[2]);
            doc.setFillColor(conc[0], conc[1], conc[2]);
            doc.rect(sx, sy + memH, supW, supH, "FD");
            doc.rect(sx + spanW - supW, sy + memH, supW, supH, "FD");
            doc.rect(sx + supW, sy, spanW - 2 * supW, memH, "FD");
            doc.setFontSize(8);
            doc.setTextColor(60);
            doc.text(`Span ${formatSmartNumber(spanResult.spanM)} m`, sx + spanW / 2 - 22, sy + memH + supH + 14);
            doc.setDrawColor(100);
            doc.setLineWidth(0.35);
            doc.line(sx + supW, sy + memH + supH + 4, sx + spanW - supW, sy + memH + supH + 4);
            doc.line(sx + supW, sy + memH + supH + 1, sx + supW, sy + memH + supH + 7);
            doc.line(sx + spanW - supW, sy + memH + supH + 1, sx + spanW - supW, sy + memH + supH + 7);
            const dimX = sx - 6;
            doc.line(dimX, sy, dimX, sy + memH);
            doc.line(sx + supW - 2, sy, dimX, sy);
            doc.line(sx + supW - 2, sy + memH, dimX, sy + memH);
            doc.text(`d = ${formatSmartNumber(spanResult.depthCm)} cm`, dimX - 2, sy + memH / 2 + 2, { angle: 90 });
            doc.setTextColor(0);
            doc.setDrawColor(0);
            doc.setLineWidth(0.2);
            y += memH + supH + 28;
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
            : activeTool === "gridCalculator"
              ? "grid-calculator"
              : activeTool === "loadCalculator"
              ? "load-calculator"
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
    const quickChips = useMemo(
      () => [
        { label: t("common.quickChipDoor09"), apply: () => (tab === "convert" ? setRealLen(metersToLengthDisplay(0.9, unit)) : setModelLen(metersToLengthDisplay(0.9, unit))) },
        { label: t("common.quickChipFloor30"), apply: () => (tab === "convert" ? setRealH(metersToLengthDisplay(3.0, unit)) : setModelH(metersToLengthDisplay(3.0, unit))) },
        { label: t("common.quickChipRoomW45"), apply: () => (tab === "convert" ? setRealW(metersToLengthDisplay(4.5, unit)) : setModelW(metersToLengthDisplay(4.5, unit))) },
        { label: t("common.quickChipRoomD60"), apply: () => (tab === "convert" ? setRealD(metersToLengthDisplay(6.0, unit)) : setModelD(metersToLengthDisplay(6.0, unit))) },
      ],
      [t, unit, tab]
    );

    const isFt = unit === "ft-in";

    const onScaleHistorySelect = useCallback((it) => {
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
    }, []);

    const onOpenScalePdfModal = useCallback(() => {
      setPdfModalOpen(true);
    }, []);

    function renderMainToolContent() {
      if (activeTool === "room") {
        const rt = ROOM_PROGRAM_TYPES.find((r) => r.id === roomProgramTypeId) ?? ROOM_PROGRAM_TYPES[0];
        return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
          h(Card, {
            title: t("tools.room.label"),
            hint: t("common.inputs"),
            children: h("div", { className: "space-y-4" }, [
              h(SectionTitle, {
                label: t("common.roomType"),
                hint: t("common.roomTypeHint"),
              }),
              h(Field, {
                label: t("common.select"),
                children: h(
                  "select",
                  {
                    value: roomProgramTypeId,
                    onChange: (e) => setRoomProgramTypeId(e.target.value),
                    className:
                      "w-full h-[52px] rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 text-sm font-semibold text-[var(--st-fg)] focus:outline-none focus:border-[var(--st-accent)]",
                  },
                  ROOM_PROGRAM_TYPES.map((opt) => h("option", { key: opt.id, value: opt.id }, t(`options.roomProgram.${opt.id}`)))
                ),
              }),
              h(
                "div",
                {
                  className:
                    "rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)]/30 px-4 py-3 text-xs font-semibold text-[var(--st-muted)] space-y-1",
                },
                [
                  h("div", { key: "a" }, `${t("common.recommendedMinArea")}: ${formatSmartNumber(rt.minAreaM2)} m²`),
                  h("div", { key: "d" }, `${t("common.recommendedMinDim")}: ${formatSmartNumber(rt.minDimM)} m`),
                ]
              ),
              h(Field, {
                label: t("common.areaOverride"),
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
                t("common.addToList")
              ),
            ]),
          }),
          h(Card, {
            title: t("common.roomList"),
            hint: t("common.programAndExport"),
            tone: "results",
            children: h("div", { className: "space-y-4" }, [
              roomProgramRows.length === 0
                ? h(
                    "div",
                    { className: "text-sm font-semibold text-[var(--st-muted)]" },
                    t("common.noRoomsYet")
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
                            h("th", { className: "px-4 py-3 border-b border-[var(--st-border)]" }, t("common.name")),
                            h("th", { className: "px-4 py-3 border-b border-[var(--st-border)]" }, t("common.minArea")),
                            h("th", { className: "px-4 py-3 border-b border-[var(--st-border)]" }, t("common.yourArea")),
                            h("th", { className: "px-4 py-3 border-b border-[var(--st-border)] w-24" }, ""),
                          ])
                        ),
                        h(
                          "tbody",
                          {},
                          roomProgramRows.map((row) =>
                            h("tr", { key: row.uid, className: "border-b border-[var(--st-border)] last:border-0 bg-[var(--st-bg)]/50" }, [
                              h(
                                "td",
                                { className: "px-4 py-3 font-bold text-[var(--st-fg)]" },
                                row.typeId ? t(`options.roomProgram.${row.typeId}`) : row.name
                              ),
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
                                  t("common.delete")
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
                  t("common.totalProgramArea")
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
                  t("common.copyAsText")
                ),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: exportRoomProgramCSV,
                    className:
                      "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150",
                  },
                  t("common.exportCsv")
                ),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: () => setPdfModalOpen(true),
                    className:
                      "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150",
                  },
                  t("common.exportPdf")
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
                  `${t("common.aisleM")} ${formatSmartNumber(pr.aisleM)} m`
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
              t("common.enterValidParkingPreview")
            );

        return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
          h(Card, {
            title: t("tools.parking.label"),
            hint: t("common.inputs"),
            children: h("div", { className: "space-y-4" }, [
              h(SectionTitle, {
                label: t("common.parkingArea"),
                hint: t("common.parkingAreaHint"),
              }),
              h(Field, {
                label: t("common.totalParkingArea"),
                children: h(InputBase, {
                  value: parkingAreaM2,
                  onChange: setParkingAreaM2,
                  placeholder: "e.g., 1000",
                  type: "number",
                  step: "any",
                  min: 0,
                }),
              }),
              h(SectionTitle, { label: t("common.parkingType"), hint: t("common.parkingTypeHint") }),
              h("div", { className: "flex flex-wrap gap-2" }, [
                h(ValueButton, { active: parkingLayout === "parallel", onClick: () => setParkingLayout("parallel") }, t("options.parkingLayout.parallel")),
                h(ValueButton, { active: parkingLayout === "perpendicular", onClick: () => setParkingLayout("perpendicular") }, t("options.parkingLayout.perpendicular")),
                h(ValueButton, { active: parkingLayout === "angled", onClick: () => setParkingLayout("angled") }, t("options.parkingLayout.angled")),
              ]),
              h(SectionTitle, { label: t("common.usageType"), hint: t("common.usageTypeHint") }),
              h("div", { className: "flex flex-wrap gap-2" }, [
                h(ValueButton, { active: parkingUsage === "residential", onClick: () => setParkingUsage("residential") }, t("options.parkingUsage.residential")),
                h(ValueButton, { active: parkingUsage === "office", onClick: () => setParkingUsage("office") }, t("options.parkingUsage.office")),
                h(ValueButton, { active: parkingUsage === "hospital", onClick: () => setParkingUsage("hospital") }, t("options.parkingUsage.hospital")),
                h(ValueButton, { active: parkingUsage === "mall", onClick: () => setParkingUsage("mall") }, t("options.parkingUsage.mall")),
              ]),
              h(
                "div",
                {
                  className:
                    "rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)]/30 px-4 py-3 text-[11px] font-semibold text-[var(--st-muted)] leading-relaxed",
                },
                t("common.parkingModulesNote")
              ),
            ]),
          }),
          h(Card, {
            title: t("common.results"),
            hint: t("common.capacityAndEfficiency"),
            tone: "results",
            children: h("div", { className: "space-y-5" }, [
              h(
                "div",
                { className: classNames("inline-flex items-center h-9 px-4 rounded-full text-[10px] font-extrabold tracking-[.18em] uppercase", effBadgeClass) },
                pr ? t(`badges.parkingEfficiency.${pr.effLevel}`) : "—"
              ),
              layoutSvg,
              pr
                ? h("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, [
                    h(ValueBlock, {
                      label: t("common.parkingSpaces"),
                      valueText: formatInteger(pr.spaces),
                      unitText: t("common.spacesUnit"),
                      big: true,
                      integerValue: true,
                    }),
                    h(ValueBlock, {
                      label: t("common.requiredAisleWidth"),
                      valueText: formatSmartNumber(pr.aisleM),
                      unitText: "m",
                      big: true,
                    }),
                    h(ValueBlock, {
                      label: t("common.singleSpaceWxD"),
                      valueText: `${formatSmartNumber(pr.spaceDimW)} × ${formatSmartNumber(pr.spaceDimD)}`,
                      unitText: "m",
                      big: false,
                    }),
                    h(ValueBlock, {
                      label: t("common.efficiency"),
                      valueText: formatSmartNumber(pr.efficiencyPct),
                      unitText: "%",
                      big: false,
                    }),
                  ])
                : null,
              pr
                ? h("div", { className: "rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 py-3 text-sm font-semibold text-[var(--st-fg)]" }, [
                    h("span", { className: "text-[var(--st-muted)] font-bold uppercase text-[10px] tracking-[.2em] mr-2" }, t("common.rampRequired")),
                    pr.rampRequired ? t("common.rampRequiredYes") : t("common.rampRequiredNo"),
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
                  t("common.copyAsText")
                ),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: () => setPdfModalOpen(true),
                    className:
                      "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150 sm:col-span-1",
                  },
                  t("common.exportPdf")
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
                  ti("daylight.zoneDepthSvg", { v: formatSmartNumber(dr.penetrationM) })
                ),
              ]
            )
          : h(
              "div",
              {
                className:
                  "rounded-2xl border border-dashed border-[var(--st-border)] bg-[color-mix(in_srgb,var(--st-fg)_4%,var(--st-bg))] p-10 text-center text-xs font-semibold text-[var(--st-muted)]",
              },
              t("daylight.enterValidPreview")
            );

        return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
          h(Card, {
            title: t("tools.daylight.label"),
            hint: t("common.inputs"),
            children: h("div", { className: "space-y-4" }, [
              h(SectionTitle, {
                label: t("daylight.sectionRoom"),
                hint: t("daylight.sectionRoomHint"),
              }),
              h(Field, {
                label: t("daylight.roomType"),
                children: h(
                  "select",
                  {
                    value: daylightRoomType,
                    onChange: (e) => setDaylightRoomType(e.target.value),
                    className:
                      "w-full h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 text-[var(--st-fg)]",
                  },
                  DAYLIGHT_ROOM_TYPES.map((d) => h("option", { key: d.id, value: d.id }, t(`options.daylightRoom.${d.id}`)))
                ),
              }),
              h(Field, {
                label: t("daylight.floorAreaM2"),
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
                label: t("daylight.windowAreaM2"),
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
                label: t("daylight.roomDepthM"),
                children: h(InputBase, {
                  value: daylightDepthM,
                  onChange: setDaylightDepthM,
                  placeholder: "e.g., 5",
                  type: "number",
                  step: "any",
                  min: 0,
                }),
              }),
              h(SectionTitle, { label: t("daylight.facadeTitle"), hint: t("daylight.facadeHint") }),
              h("div", { className: "flex flex-wrap gap-2" }, [
                h(ValueButton, { active: daylightFacade === "north", onClick: () => setDaylightFacade("north") }, t("options.facade.north")),
                h(ValueButton, { active: daylightFacade === "south", onClick: () => setDaylightFacade("south") }, t("options.facade.south")),
                h(ValueButton, { active: daylightFacade === "east", onClick: () => setDaylightFacade("east") }, t("options.facade.east")),
                h(ValueButton, { active: daylightFacade === "west", onClick: () => setDaylightFacade("west") }, t("options.facade.west")),
              ]),
              h(
                "div",
                {
                  className:
                    "rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)]/30 px-4 py-3 text-[11px] font-semibold text-[var(--st-muted)] leading-relaxed",
                },
                ti("daylight.en17037Note", { two: formatInteger(2), three: formatInteger(3) })
              ),
            ]),
          }),
          h(Card, {
            title: t("common.results"),
            hint: t("common.enIesNotes"),
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
                      label: t("daylight.wfr"),
                      valueText: formatSmartNumber(dr.wfrPct),
                      unitText: "%",
                      big: true,
                    }),
                    h(ValueBlock, {
                      label: t("daylight.dfEstimate"),
                      valueText: formatSmartNumber(dr.dfPct),
                      unitText: "%",
                      big: true,
                    }),
                    h(ValueBlock, {
                      label: t("daylight.penetrationDepth"),
                      valueText: formatSmartNumber(dr.penetrationM),
                      unitText: t("common.unitM"),
                      big: false,
                    }),
                    h(ValueBlock, {
                      label: t("daylight.enMinDf"),
                      valueText: formatInteger(dr.enDfMin),
                      unitText: "%",
                      big: false,
                      integerValue: true,
                    }),
                  ])
                : null,
              dr
                ? h("div", { className: "space-y-2 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 py-3" }, [
                    h("div", { className: "text-[10px] font-bold tracking-[.2em] uppercase text-[var(--st-muted)]" }, t("daylight.complianceBlockTitle")),
                    h("div", { className: "text-xs font-semibold text-[var(--st-muted)] mb-1" }, t("daylight.complianceBlockSubtitle")),
                    h("div", { className: "text-sm font-semibold text-[var(--st-fg)]" }, [
                      ti("daylight.enLine", { enDf: formatInteger(dr.enDfMin), room: dr.roomLabel }),
                      h("span", { className: dr.enOk ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400" }, dr.enOk ? t("common.pass") : t("common.fail")),
                    ]),
                  ])
                : null,
              dr
                ? h("div", { className: "space-y-2" }, [
                    h("div", { className: "text-[10px] font-bold tracking-[.2em] uppercase text-[var(--st-muted)]" }, t("daylight.recommendationsTitle")),
                    h(
                      "ul",
                      { className: "list-disc space-y-1.5 pl-5 text-sm font-semibold text-[var(--st-muted)]" },
                      dr.recommendations.length
                        ? dr.recommendations.map((s, i) => h("li", { key: i }, s))
                        : [h("li", { key: "ok" }, t("daylight.recNone"))]
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
                  t("common.copyAsText")
                ),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: () => setPdfModalOpen(true),
                    className:
                      "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150",
                  },
                  t("common.exportPdf")
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
                h("text", { x: 70, y: 162, className: "fill-current text-[7px] font-bold" }, t("fire.svgExit")),
                h("text", { x: 238, y: 162, className: "fill-current text-[7px] font-bold" }, t("fire.svgExit")),
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
                  ti("fire.travelSvg", { travel: formatSmartNumber(fr.travelM), max: formatSmartNumber(fr.maxTravelM) })
                ),
              ]
            )
          : h(
              "div",
              {
                className:
                  "rounded-2xl border border-dashed border-[var(--st-border)] bg-[color-mix(in_srgb,var(--st-fg)_4%,var(--st-bg))] p-10 text-center text-xs font-semibold text-[var(--st-muted)]",
              },
              t("fire.enterValidPreview")
            );

        return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
          h(Card, {
            title: t("tools.fireEscape.label"),
            hint: t("common.inputs"),
            children: h("div", { className: "space-y-4" }, [
              h(SectionTitle, {
                label: t("fire.sectionBuilding"),
                hint: t("fire.sectionBuildingHint"),
              }),
              h(Field, {
                label: t("fire.buildingUseType"),
                children: h(
                  "select",
                  {
                    value: fireBuildingType,
                    onChange: (e) => setFireBuildingType(e.target.value),
                    className:
                      "w-full h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 text-[var(--st-fg)]",
                  },
                  FIRE_BUILDING_TYPES.map((f) => h("option", { key: f.id, value: f.id }, t(`options.fireBuilding.${f.id}`)))
                ),
              }),
              h(Field, {
                label: t("fire.floorAreaM2"),
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
                label: t("fire.numExits"),
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
                label: t("fire.maxTravelM"),
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
                label: t("fire.numFloors"),
                children: h(InputBase, {
                  value: fireFloors,
                  onChange: setFireFloors,
                  placeholder: "e.g., 1",
                  type: "number",
                  step: 1,
                  min: 1,
                }),
              }),
              h(SectionTitle, { label: t("fire.sprinklerTitle"), hint: t("fire.sprinklerHint") }),
              h("div", { className: "flex flex-wrap gap-2" }, [
                h(ValueButton, { active: fireSprinkler === true, onClick: () => setFireSprinkler(true) }, t("common.yes")),
                h(ValueButton, { active: fireSprinkler === false, onClick: () => setFireSprinkler(false) }, t("common.no")),
              ]),
              h(
                "div",
                {
                  className:
                    "rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)]/30 px-4 py-3 text-[11px] font-semibold text-[var(--st-muted)] leading-relaxed",
                },
                ti("fire.ibcNote", { w: formatSmartNumber(FIRE_EXIT_WIDTH_M), area: formatInteger(FIRE_AREA_TWO_EXIT_M2) })
              ),
            ]),
          }),
          h(Card, {
            title: t("common.results"),
            hint: t("common.ibcTravel"),
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
                      label: t("fire.maxAllowedTravel"),
                      valueText: formatSmartNumber(fr.maxTravelM),
                      unitText: t("common.unitM"),
                      big: true,
                    }),
                    h(ValueBlock, {
                      label: t("fire.requiredMinExits"),
                      valueText: formatInteger(fr.requiredMinExits),
                      unitText: t("common.exitsUnit"),
                      big: true,
                      integerValue: true,
                    }),
                    h(ValueBlock, {
                      label: t("fire.exitWidthTotal"),
                      valueText: formatSmartNumber(fr.exitWidthTotalMin),
                      unitText: t("common.unitM"),
                      big: false,
                    }),
                    h(ValueBlock, {
                      label: t("fire.yourTravelDistance"),
                      valueText: formatSmartNumber(fr.travelM),
                      unitText: t("common.unitM"),
                      big: false,
                    }),
                  ])
                : null,
              fr
                ? h("div", { className: "rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 py-3 text-sm font-semibold text-[var(--st-fg)]" }, [
                    h("span", { className: "text-[var(--st-muted)] font-bold uppercase text-[10px] tracking-[.2em] mr-2" }, t("common.reference")),
                    t("fire.referenceIbc"),
                  ])
                : null,
              fr && fr.failures.length
                ? h("div", { className: "space-y-2 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/30 px-4 py-3" }, [
                    h("div", { className: "text-[10px] font-bold tracking-[.2em] uppercase text-red-700 dark:text-red-300" }, t("fire.whatFails")),
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
                  t("common.copyAsText")
                ),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: () => setPdfModalOpen(true),
                    className:
                      "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150",
                  },
                  t("common.exportPdf")
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
              t("uValue.enterValidPreview")
            );

        return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
          h(Card, {
            title: t("tools.uValue.label"),
            hint: t("common.inputs"),
            children: h("div", { className: "space-y-4" }, [
              h(SectionTitle, { label: t("uValue.climateSection"), hint: t("uValue.climateSectionHint") }),
              h(Field, {
                label: t("uValue.climateZone"),
                children: h(
                  "select",
                  {
                    value: uClimateZone,
                    onChange: (e) => setUClimateZone(e.target.value),
                    className:
                      "w-full h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 text-[var(--st-fg)]",
                  },
                  U_VALUE_CLIMATES.map((c) => h("option", { key: c.id, value: c.id }, t(`options.uClimate.${c.id}`)))
                ),
              }),
              h(SectionTitle, { label: t("uValue.constructionSection"), hint: t("uValue.constructionSectionHint") }),
              h("div", { className: "flex flex-wrap gap-2" }, [
                h(ValueButton, { active: uConstructionType === "external_wall", onClick: () => setUConstructionType("external_wall") }, t("options.uConstruction.external_wall")),
                h(ValueButton, { active: uConstructionType === "roof", onClick: () => setUConstructionType("roof") }, t("options.uConstruction.roof")),
                h(ValueButton, { active: uConstructionType === "floor", onClick: () => setUConstructionType("floor") }, t("options.uConstruction.floor")),
                h(ValueButton, { active: uConstructionType === "window", onClick: () => setUConstructionType("window") }, t("options.uConstruction.window")),
              ]),
              h(SectionTitle, { label: t("uValue.layerBuilderSection"), hint: t("uValue.layerBuilderHint") }),
              ...uLayers.map((layer) =>
                h(
                  "div",
                  { key: layer.uid, className: "rounded-2xl border border-[var(--st-border)] bg-[color-mix(in_srgb,var(--st-fg)_4%,var(--st-bg))] p-3 space-y-3" },
                  [
                    h("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" }, [
                      h(Field, {
                        label: t("uValue.material"),
                        children: h(
                          "select",
                          {
                            value: layer.materialId,
                            onChange: (e) => updateULayer(layer.uid, { materialId: e.target.value }),
                            className:
                              "w-full h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 text-[var(--st-fg)] text-sm",
                          },
                          U_VALUE_MATERIALS.map((m) => h("option", { key: m.id, value: m.id }, t(`options.uMaterial.${m.id}`)))
                        ),
                      }),
                      h(Field, {
                        label: t("uValue.thicknessMm"),
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
                      t("common.removeLayer")
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
                t("common.addLayer")
              ),
              h(
                "div",
                {
                  className:
                    "rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)]/30 px-4 py-3 text-[11px] font-semibold text-[var(--st-muted)] leading-relaxed",
                },
                t("uValue.lambdaNote")
              ),
            ]),
          }),
          h(Card, {
            title: t("common.results"),
            hint: t("common.ashraeEpbd"),
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
                      label: t("uValue.totalThickness"),
                      valueText: formatSmartNumber(ur.totalThicknessMm),
                      unitText: t("common.unitMm"),
                      big: true,
                    }),
                    h(ValueBlock, {
                      label: t("uValue.uValueLabel"),
                      valueText: formatUValue(ur.U),
                      unitText: t("common.unitWm2K"),
                      big: true,
                    }),
                    h(ValueBlock, {
                      label: t("uValue.rValueTotal"),
                      valueText: formatSmartNumber(ur.Rtotal),
                      unitText: t("common.unitM2KW"),
                      big: false,
                    }),
                    h(ValueBlock, {
                      label: t("uValue.maxUClimate"),
                      valueText: formatUValue(ur.uMax),
                      unitText: t("common.unitWm2K"),
                      big: false,
                    }),
                  ])
                : null,
              ur && ur.improvementWm2K > 0
                ? h("div", { className: "rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 text-sm font-semibold text-amber-950 dark:text-amber-100" }, [
                    h("span", { className: "text-[10px] font-bold uppercase tracking-[.2em] text-amber-800 dark:text-amber-300 mr-2" }, t("uValue.improvement")),
                    ti("uValue.improvementBody", { du: formatUValue(ur.improvementWm2K), umax: formatUValue(ur.uMax) }),
                  ])
                : null,
              ur
                ? h("div", { className: "text-[11px] font-semibold text-[var(--st-muted)]" }, t("uValue.referenceBlurb"))
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
                  t("common.copyAsText")
                ),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: () => setPdfModalOpen(true),
                    className:
                      "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150",
                  },
                  t("common.exportPdf")
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
                  ti("site.svgOpen", { v: formatSmartNumber(sr.openSpaceRatioPct) })
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
                      ti("site.svgBuilding", { v: formatSmartNumber(sr.footprintPct) })
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
                        ti("site.svgBasement", { v: formatSmartNumber(sr.basementAreaM2 ?? 0) })
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
                  t("common.sitePlanProportions")
                ),
              ]
            )
          : h(
              "div",
              {
                className:
                  "rounded-2xl border border-dashed border-[var(--st-border)] bg-[color-mix(in_srgb,var(--st-fg)_4%,var(--st-bg))] p-10 text-center text-xs font-semibold text-[var(--st-muted)]",
              },
              t("common.enterValidPlot")
            );

        return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
          h(Card, {
            title: t("tools.siteCoverage.label"),
            hint: t("common.inputs"),
            children: h("div", { className: "space-y-4" }, [
              h(SectionTitle, {
                label: t("site.sectionPlotRatios"),
                hint: t("site.sectionPlotRatiosHint"),
              }),
              h(Field, {
                label: t("site.totalPlotM2"),
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
                label: t("site.scrField"),
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
                label: t("site.farField"),
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
                label: t("site.numFloors"),
                children: h(InputBase, {
                  value: siteFloorsStr,
                  onChange: setSiteFloorsStr,
                  placeholder: "e.g., 3",
                  type: "number",
                  step: 1,
                  min: 1,
                }),
              }),
              h(SectionTitle, { label: t("site.basementTitle"), hint: t("site.basementHint") }),
              h("div", { className: "flex flex-wrap gap-2" }, [
                h(ValueButton, { active: siteBasement === false, onClick: () => setSiteBasement(false) }, t("common.no")),
                h(ValueButton, { active: siteBasement === true, onClick: () => setSiteBasement(true) }, t("common.yes")),
              ]),
              h(
                "div",
                {
                  className:
                    "rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)]/30 px-4 py-3 text-[11px] font-semibold text-[var(--st-muted)] leading-relaxed",
                },
                t("site.policyNote")
              ),
            ]),
          }),
          h(Card, {
            title: t("common.autoCalculate"),
            hint: t("common.footprintGfa"),
            tone: "results",
            children: h("div", { className: "space-y-5" }, [
              h(
                "div",
                { className: classNames("inline-flex items-center min-h-9 px-4 py-2 rounded-full text-[10px] font-extrabold tracking-[.12em] uppercase", siteBadgeClass) },
                sr ? sr.complianceLabel : t("common.noValidInputs")
              ),
              siteSvg,
              sr
                ? h("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, [
                    h(ValueBlock, {
                      label: t("site.maxFootprint"),
                      valueText: formatSmartNumber(sr.maxFootprintM2),
                      unitText: t("common.unitM2"),
                      big: true,
                    }),
                    h(ValueBlock, {
                      label: t("site.maxTotalGfa"),
                      valueText: formatSmartNumber(sr.maxTotalGfaM2),
                      unitText: t("common.unitM2"),
                      big: true,
                    }),
                    h(ValueBlock, {
                      label: t("site.maxGfaPerFloor"),
                      valueText: formatSmartNumber(sr.maxGfaPerFloorM2),
                      unitText: t("common.unitM2"),
                      big: false,
                    }),
                    h(ValueBlock, {
                      label: t("site.remainingOpenPlot"),
                      valueText: formatSmartNumber(sr.remainingPlotM2),
                      unitText: t("common.unitM2"),
                      big: false,
                    }),
                    h(ValueBlock, {
                      label: t("site.openSpaceRatio"),
                      valueText: formatSmartNumber(sr.openSpaceRatioPct),
                      unitText: "%",
                      big: false,
                    }),
                    h(ValueBlock, {
                      label: t("site.gfaDemand"),
                      valueText: formatSmartNumber(sr.gfaDemandM2),
                      unitText: t("common.unitM2"),
                      big: false,
                    }),
                  ])
                : null,
              sr && sr.basementIncluded && sr.basementAreaM2 != null
                ? h("div", { className: "rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/40 px-4 py-3" }, [
                    h("div", { className: "text-[10px] font-extrabold tracking-[.2em] uppercase text-slate-600 dark:text-slate-400 mb-1" }, t("site.basementBelowGrade")),
                    h("div", { className: "text-lg font-black text-[var(--st-fg)]" }, `${formatSmartNumber(sr.basementAreaM2)} ${t("common.unitM2")}`),
                  ])
                : null,
              sr && sr.exceedsFar
                ? h("div", { className: "rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-950 dark:text-red-100" }, [
                    h("span", { className: "text-[10px] font-bold uppercase tracking-[.2em] text-red-800 dark:text-red-300 mr-2" }, t("site.farExceedance")),
                    ti("site.farExceedBody", { over: formatSmartNumber(sr.overGfaM2) }),
                  ])
                : null,
              sr && sr.complianceLevel === "yellow"
                ? h("div", { className: "rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 text-sm font-semibold text-amber-950 dark:text-amber-100 space-y-2" }, [
                    h("div", {}, [
                      h("span", { className: "text-[10px] font-bold uppercase tracking-[.2em] text-amber-800 dark:text-amber-300 mr-2" }, t("site.headroom")),
                      ti("site.headroomBody", { headroom: formatSmartNumber(sr.headroomM2) }),
                    ]),
                    sr.scr > 1e-6 && Number.isFinite(sr.maxFloorsAtScr)
                      ? h(
                          "div",
                          { className: "text-xs font-semibold text-amber-900/90 dark:text-amber-200/95" },
                          ti("site.maxFloorsHint", {
                            maxF: formatSmartNumber(sr.maxFloorsAtScr),
                            have: formatInteger(sr.floors),
                          })
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
                  t("common.copyAsText")
                ),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: () => setPdfModalOpen(true),
                    className:
                      "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150",
                  },
                  t("common.exportPdf")
                ),
              ]),
            ]),
          }),
        ]);
      }

      if (activeTool === "span") {
        const SPAN_SYSTEM_IDS = ["rc_flat", "rc_beam", "steel", "timber"];

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
                viewBox: "0 0 384 208",
                className: "w-full h-auto rounded-2xl border border-[var(--st-border)] bg-[color-mix(in_srgb,var(--st-fg)_3%,var(--st-bg))] text-[var(--st-fg)]",
                "aria-hidden": true,
              },
              [
                // Ground / datum (technical drawing)
                h("line", {
                  x1: 72,
                  y1: 162,
                  x2: 352,
                  y2: 162,
                  stroke: "currentColor",
                  strokeWidth: 0.85,
                  opacity: 0.22,
                }),
                // Column supports (30×60 px), same concrete fill as slab
                h("rect", {
                  x: 92,
                  y: 98,
                  width: 30,
                  height: 60,
                  rx: 1.5,
                  fill: "#52525b",
                  stroke: "#27272a",
                  strokeWidth: 1.25,
                }),
                h("rect", {
                  x: 310,
                  y: 98,
                  width: 30,
                  height: 60,
                  rx: 1.5,
                  fill: "#52525b",
                  stroke: "#27272a",
                  strokeWidth: 1.25,
                }),
                // Beam / slab (thick, on top of columns)
                h("rect", {
                  x: 92,
                  y: 40,
                  width: 248,
                  height: 58,
                  rx: 2,
                  fill: "#52525b",
                  stroke: "#27272a",
                  strokeWidth: 1.25,
                }),
                // Depth dimension — extension lines
                h("line", {
                  x1: 92,
                  y1: 40,
                  x2: 66,
                  y2: 40,
                  stroke: "currentColor",
                  strokeWidth: 0.75,
                  opacity: 0.4,
                  strokeDasharray: "4 3",
                }),
                h("line", {
                  x1: 92,
                  y1: 98,
                  x2: 66,
                  y2: 98,
                  stroke: "currentColor",
                  strokeWidth: 0.75,
                  opacity: 0.4,
                  strokeDasharray: "4 3",
                }),
                // Depth dimension line (left)
                h("line", { x1: 54, y1: 40, x2: 54, y2: 98, stroke: "currentColor", strokeWidth: 1.1, opacity: 0.85 }),
                h("path", {
                  d: "M 54 40 L 50 46 L 58 46 Z",
                  fill: "currentColor",
                  opacity: 0.85,
                }),
                h("path", {
                  d: "M 54 98 L 50 92 L 58 92 Z",
                  fill: "currentColor",
                  opacity: 0.85,
                }),
                h(
                  "text",
                  {
                    x: 26,
                    y: 69,
                    transform: "rotate(-90 26 69)",
                    textAnchor: "middle",
                    dominantBaseline: "middle",
                    className: "fill-current text-[11px] font-extrabold",
                    style: { fontFamily: "system-ui, sans-serif" },
                  },
                  ti("span.diagramDepth", { v: formatSmartNumber(spanResult.depthCm) })
                ),
                // Span dimension — extension lines
                h("line", {
                  x1: 92,
                  y1: 98,
                  x2: 92,
                  y2: 168,
                  stroke: "currentColor",
                  strokeWidth: 0.75,
                  opacity: 0.4,
                  strokeDasharray: "4 3",
                }),
                h("line", {
                  x1: 340,
                  y1: 98,
                  x2: 340,
                  y2: 168,
                  stroke: "currentColor",
                  strokeWidth: 0.75,
                  opacity: 0.4,
                  strokeDasharray: "4 3",
                }),
                h("line", { x1: 92, y1: 176, x2: 340, y2: 176, stroke: "currentColor", strokeWidth: 1.1, opacity: 0.85 }),
                h("path", {
                  d: "M 92 176 L 98 172 L 98 180 Z",
                  fill: "currentColor",
                  opacity: 0.85,
                }),
                h("path", {
                  d: "M 340 176 L 334 172 L 334 180 Z",
                  fill: "currentColor",
                  opacity: 0.85,
                }),
                h(
                  "text",
                  {
                    x: 216,
                    y: 198,
                    textAnchor: "middle",
                    className: "fill-current text-[11px] font-extrabold",
                    style: { fontFamily: "system-ui, sans-serif" },
                  },
                  ti("span.diagramSpan", { v: formatSmartNumber(spanResult.spanM) })
                ),
              ]
            )
          : h(
              "div",
              {
                className:
                  "rounded-2xl border border-dashed border-[var(--st-border)] bg-[color-mix(in_srgb,var(--st-fg)_4%,var(--st-bg))] p-10 text-center text-xs font-semibold text-[var(--st-muted)]",
              },
              t("span.enterValidPreview")
            );

        return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
          h(Card, {
            title: t("tools.span.label"),
            hint: t("common.inputs"),
            children: h("div", { className: "space-y-4" }, [
              h(SectionTitle, {
                label: t("span.sectionSpanSystem"),
                hint: t("span.sectionSpanSystemHint"),
              }),
              h(Field, {
                label: t("span.spanLengthM"),
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
                label: t("span.structuralSystem"),
                children: h(
                  "select",
                  {
                    value: spanSystem,
                    onChange: (e) => setSpanSystem(e.target.value),
                    className:
                      "w-full h-[52px] rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 text-sm font-semibold text-[var(--st-fg)] focus:outline-none focus:border-[var(--st-accent)]",
                  },
                  SPAN_SYSTEM_IDS.map((id) => h("option", { key: id, value: id }, t(`options.spanSystem.${id}`)))
                ),
              }),
              h(SectionTitle, {
                label: t("span.loadType"),
                hint: spanSystem === "steel" || spanSystem === "timber" ? t("span.loadHintSteelTimber") : t("span.loadHintRc"),
              }),
              h("div", { className: "flex flex-wrap gap-2" }, [
                h(ValueButton, { active: spanLoad === "light", onClick: () => setSpanLoad("light") }, t("options.spanLoad.light")),
                h(ValueButton, { active: spanLoad === "medium", onClick: () => setSpanLoad("medium") }, t("options.spanLoad.medium")),
                h(ValueButton, { active: spanLoad === "heavy", onClick: () => setSpanLoad("heavy") }, t("options.spanLoad.heavy")),
              ]),
              h("div", { className: "text-[11px] font-semibold text-[var(--st-muted)] leading-relaxed" }, [
                h("div", {}, t("span.loadExplainerLight")),
                h("div", {}, t("span.loadExplainerMedium")),
                h("div", {}, t("span.loadExplainerHeavy")),
              ]),
            ]),
          }),
          h(Card, {
            title: t("common.results"),
            hint: t("common.spanAndDepth"),
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
                      ? t("span.checkOk")
                      : spanResult.spanWarnLevel === "yellow"
                        ? t("span.checkCaution")
                        : t("span.checkLimit")
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
                label: t("span.estimatedDepth"),
                valueText: spanResult ? formatSmartNumber(spanResult.depthCm) : "—",
                unitText: t("common.unitCm"),
                big: true,
              }),
              h("div", { className: "border border-[var(--st-border)] rounded-3xl bg-[var(--st-bg)]" }, [
                h("div", { className: "p-6" }, [
                  h("div", { className: "text-[10px] font-bold tracking-[.24em] uppercase text-[var(--st-muted)] mb-3" }, t("span.memberSuggestionTitle")),
                  h(
                    "div",
                    { className: "text-lg md:text-xl font-black tracking-tight text-[var(--st-fg)] leading-snug" },
                    spanResult ? spanResult.memberSuggestion : "—"
                  ),
                ]),
              ]),
              h(ValueBlock, {
                label: t("span.ldRatio"),
                valueText: spanResult ? formatSmartNumber(spanResult.ldRatio) : "—",
                unitText: "L/d",
                big: false,
              }),
              h(
                "div",
                {
                  className:
                    "text-[11px] font-semibold text-[var(--st-muted)] leading-relaxed pt-3 mt-1 border-t border-[var(--st-border)]",
                },
                t("span.standardsReference")
              ),
              h("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2" }, [
                h(
                  "button",
                  {
                    type: "button",
                    onClick: onCopy,
                    className:
                      "h-12 rounded-2xl bg-[var(--st-accent)] text-white font-extrabold tracking-wide hover:brightness-110 transition-colors duration-150",
                  },
                  t("common.copyAsText")
                ),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: () => setPdfModalOpen(true),
                    className:
                      "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150",
                  },
                  t("common.exportPdf")
                ),
              ]),
            ]),
          }),
        ]);
      }

      if (activeTool === "ramp") {
        const accessBadgeClass = rampResult
          ? rampResult.accessBadgeKey === "full"
            ? "border-[#16A34A]/45 bg-[#16A34A]/12 text-[#166534] dark:text-[#86EFAC]"
            : rampResult.accessBadgeKey === "enLimit"
              ? "border-[#CA8A04]/45 bg-[#CA8A04]/12 text-[#854D0E] dark:text-[#FDE047]"
              : "border-[#DC2626]/45 bg-[#DC2626]/12 text-[#991B1B] dark:text-[#FCA5A5]"
          : "border-[var(--st-border)] bg-[color-mix(in_srgb,var(--st-fg)_8%,var(--st-bg))] text-[var(--st-muted)]";
        const meterWidth = rampResult
          ? rampResult.accessBadgeKey === "full"
            ? "w-1/3"
            : rampResult.accessBadgeKey === "enLimit"
              ? "w-2/3"
              : "w-full"
          : "w-0";
        const meterTone = rampResult
          ? rampResult.accessBadgeKey === "full"
            ? "bg-[#16A34A]"
            : rampResult.accessBadgeKey === "enLimit"
              ? "bg-[#CA8A04]"
              : "bg-[#DC2626]"
          : "bg-transparent";

        return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
          h(Card, {
            title: t("tools.ramp.label"),
            hint: t("common.inputs"),
            children: h("div", { className: "space-y-4" }, [
              h(SectionTitle, {
                label: t("common.inputs"),
                hint: t("common.rampFieldHint"),
              }),
              h(Field, {
                label: t("common.rampTotalHeightM"),
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
                label: t("common.rampDesiredSlopePct"),
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
                  t("common.useSlope")
                ),
                h("div", { className: "text-center text-xs font-bold tracking-[.22em] uppercase text-[var(--st-muted)]" }, t("common.or")),
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
                  t("common.useLength")
                ),
              ]),
              h(Field, {
                label: t("common.rampLengthM"),
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
                t("common.rampLogicNote")
              ),
            ]),
          }),
          h(Card, {
            title: t("common.results"),
            hint: t("common.geometryAndValidation"),
            tone: "results",
            children: h("div", { className: "flex flex-col gap-5" }, [
              h(
                "div",
                {
                  className: classNames(
                    "inline-flex self-start items-center min-h-9 max-w-full px-4 py-2 rounded-full border text-[10px] font-extrabold tracking-wide leading-snug",
                    accessBadgeClass
                  ),
                },
                rampResult ? t(`ramp.access.${rampResult.accessBadgeKey}`) : t("common.awaitingRampStatus")
              ),
              h("div", { className: "border border-[var(--st-border)] rounded-2xl bg-[color-mix(in_srgb,var(--st-fg)_5%,var(--st-bg))] p-4" }, [
                h("div", { className: "text-[10px] font-bold tracking-[.24em] uppercase text-[var(--st-muted)] mb-2" }, t("common.slopeQuality")),
                h("div", { className: "h-2 rounded-full bg-[var(--st-border)] overflow-hidden" }, [
                  h("div", { className: `h-full rounded-full transition-all duration-200 ${meterWidth} ${meterTone}` }),
                ]),
                h(
                  "div",
                  { className: "mt-2 text-xs font-semibold text-[var(--st-muted)]" },
                  rampResult
                    ? `${t(`ramp.access.${rampResult.accessBadgeKey}`)} (${formatSmartNumber(rampResult.slopePct)}%)`
                    : t("common.awaitingRampInput")
                ),
              ]),
              h(ValueBlock, {
                label: t("common.calculatedSlope"),
                valueText:
                  rampResult && Number.isFinite(rampResult.slopePct)
                    ? formatSmartNumber(rampResult.slopePct)
                    : "—",
                unitText: "%",
                big: true,
              }),
              h(ValueBlock, {
                label: t("common.requiredRampLength"),
                valueText:
                  rampResult && Number.isFinite(rampResult.lengthM)
                    ? formatSmartNumber(rampResult.lengthM)
                    : "—",
                unitText: "m",
                big: true,
              }),
              h(ValueBlock, {
                label: t("common.heightConfirmation"),
                valueText:
                  rampResult && Number.isFinite(rampResult.heightM)
                    ? formatSmartNumber(rampResult.heightM)
                    : "—",
                unitText: "m",
                big: true,
              }),
              h(
                "div",
                {
                  className:
                    "text-[11px] font-semibold text-[var(--st-muted)] leading-relaxed pt-3 mt-1 border-t border-[var(--st-border)]",
                },
                t("ramp.standardsReference")
              ),
            ]),
          }),
        ]);
      }

      if (activeTool === "stair") {
        return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
          h(Card, {
            title: t("tools.stair.label"),
            hint: t("common.inputs"),
            children: h("div", { className: "space-y-4" }, [
              h(SectionTitle, {
                label: t("common.inputs"),
                hint: t("common.stairFieldHint"),
              }),
              h(Field, {
                label: t("common.stairTotalHeightM"),
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
                label: t("common.stairDesiredRiserCm"),
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
                t("common.stairRuleShort")
              ),
            ]),
          }),
          h(Card, {
            title: t("common.results"),
            hint: t("common.stairGeometry"),
            tone: "results",
            children: h("div", { className: "flex flex-col gap-4" }, [
              h(ValueBlock, {
                label: t("common.numberOfSteps"),
                valueText: stairResult ? formatInteger(stairResult.steps) : "—",
                unitText: t("common.stepsUnit"),
                big: true,
                integerValue: true,
              }),
              h(ValueBlock, {
                label: t("common.actualRiserHeight"),
                valueText:
                  stairResult && Number.isFinite(stairResult.actualRiserCm)
                    ? formatSmartNumber(stairResult.actualRiserCm)
                    : "—",
                unitText: t("common.unitCm"),
                big: true,
              }),
              h(ValueBlock, {
                label: t("common.totalRunLength"),
                valueText:
                  stairResult && Number.isFinite(stairResult.totalRunM)
                    ? formatSmartNumber(stairResult.totalRunM)
                    : "—",
                unitText: t("common.unitM"),
                big: true,
              }),
              h(ValueBlock, {
                label: t("common.suggestedTreadDepth"),
                valueText:
                  stairResult && Number.isFinite(stairResult.suggestedTreadCm)
                    ? formatSmartNumber(stairResult.suggestedTreadCm)
                    : "—",
                unitText: t("common.unitCm"),
                big: true,
              }),
              stairResult
                ? h("div", { className: "flex flex-wrap gap-2 pt-1" }, [
                    h(
                      "div",
                      {
                        className: classNames(
                          "inline-flex items-center min-h-9 px-3 rounded-full text-[10px] font-extrabold tracking-wide",
                          stairResult.ibcRiserCompliant
                            ? "border border-[#16A34A]/45 bg-[#16A34A]/12 text-[#166534] dark:text-[#86EFAC]"
                            : "border border-[#DC2626]/45 bg-[#DC2626]/12 text-[#991B1B] dark:text-[#FCA5A5]"
                        ),
                      },
                      stairResult.ibcRiserCompliant ? t("stair.ibcRiserOk") : t("stair.ibcRiserFail")
                    ),
                    h(
                      "div",
                      {
                        className: classNames(
                          "inline-flex items-center min-h-9 px-3 rounded-full text-[10px] font-extrabold tracking-wide",
                          stairResult.ibcTreadCompliant
                            ? "border border-[#16A34A]/45 bg-[#16A34A]/12 text-[#166534] dark:text-[#86EFAC]"
                            : "border border-[#DC2626]/45 bg-[#DC2626]/12 text-[#991B1B] dark:text-[#FCA5A5]"
                        ),
                      },
                      stairResult.ibcTreadCompliant ? t("stair.ibcTreadOk") : t("stair.ibcTreadFail")
                    ),
                  ])
                : null,
              h(
                "div",
                {
                  className:
                    "text-[11px] font-semibold text-[var(--st-muted)] leading-relaxed pt-3 mt-1 border-t border-[var(--st-border)]",
                },
                t("stair.standardsReference")
              ),
            ]),
          }),
        ]);
      }

      if (activeTool === "gridCalculator") {
        const gr = gridResult;
        const efficiencyBadgeClass =
          gr && gr.efficiencyKey === "optimal"
            ? "border border-[#16A34A]/45 bg-[#16A34A]/12 text-[#166534] dark:text-[#86EFAC]"
            : gr && gr.efficiencyKey === "acceptable"
              ? "border border-[#CA8A04]/45 bg-[#CA8A04]/12 text-[#854D0E] dark:text-[#FDE047]"
              : gr
                ? "border border-[#DC2626]/45 bg-[#DC2626]/12 text-[#991B1B] dark:text-[#FCA5A5]"
                : "border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-muted)]";

        const padL = 56;
        const padT = 32;
        const padR = 56;
        const padB = 52;
        const drawW = 288;
        const drawH = 200;
        let diagramEl = null;
        if (gr) {
          const W = gr.widthM;
          const D = gr.depthM;
          const nx = gr.nx;
          const ny = gr.ny;
          const s = Math.min(drawW / W, drawH / D);
          const rw = W * s;
          const rh = D * s;
          const ox = padL + (drawW - rw) / 2;
          const oy = padT + (drawH - rh) / 2;
          const vbW = padL + drawW + padR;
          const vbH = padT + drawH + padB;
          const gridLineEls = [];
          for (let i = 1; i < nx; i++) {
            const xi = ox + (i * rw) / nx;
            gridLineEls.push(
              h("line", {
                key: `gv${i}`,
                x1: xi,
                y1: oy,
                x2: xi,
                y2: oy + rh,
                stroke: "currentColor",
                strokeWidth: 1,
                opacity: 0.35,
              })
            );
          }
          for (let j = 1; j < ny; j++) {
            const yj = oy + (j * rh) / ny;
            gridLineEls.push(
              h("line", {
                key: `gh${j}`,
                x1: ox,
                y1: yj,
                x2: ox + rw,
                y2: yj,
                stroke: "currentColor",
                strokeWidth: 1,
                opacity: 0.35,
              })
            );
          }
          const dotEls = [];
          for (let ix = 0; ix <= nx; ix++) {
            for (let iy = 0; iy <= ny; iy++) {
              const cx = ox + (ix * rw) / nx;
              const cy = oy + (iy * rh) / ny;
              dotEls.push(
                h("circle", {
                  key: `c${ix}-${iy}`,
                  cx,
                  cy,
                  r: 8,
                  fill: "#DC2626",
                })
              );
            }
          }
          diagramEl = h(
            "svg",
            {
              viewBox: `0 0 ${vbW} ${vbH}`,
              className: "w-full h-auto rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)]/40 text-[var(--st-fg)]",
              "aria-hidden": true,
            },
            [
              ...gridLineEls,
              h("rect", {
                x: ox,
                y: oy,
                width: rw,
                height: rh,
                fill: "none",
                stroke: "currentColor",
                strokeWidth: 5,
                rx: 1,
              }),
              ...dotEls,
              h(
                "text",
                {
                  x: ox + rw / 2,
                  y: oy + rh + 28,
                  textAnchor: "middle",
                  className: "fill-current text-[10px] font-extrabold",
                  style: { fontFamily: "system-ui, sans-serif" },
                },
                ti("gridCalc.dimXLabel", { n: nx, v: formatSmartNumber(gr.actualBayW) })
              ),
              h(
                "text",
                {
                  x: padL - 8,
                  y: oy + rh / 2,
                  textAnchor: "middle",
                  transform: `rotate(-90 ${padL - 8} ${oy + rh / 2})`,
                  className: "fill-current text-[10px] font-extrabold",
                  style: { fontFamily: "system-ui, sans-serif" },
                },
                ti("gridCalc.dimYLabel", { n: ny, v: formatSmartNumber(gr.actualBayD) })
              ),
            ]
          );
        } else {
          diagramEl = h(
            "div",
            {
              className:
                "rounded-2xl border border-dashed border-[var(--st-border)] bg-[color-mix(in_srgb,var(--st-fg)_4%,var(--st-bg))] p-10 text-center text-xs font-semibold text-[var(--st-muted)]",
            },
            t("gridCalc.enterValid")
          );
        }

        return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
          h(Card, {
            title: t("tools.gridCalculator.label"),
            hint: t("common.inputs"),
            children: h("div", { className: "space-y-4" }, [
              h(SectionTitle, {
                label: t("gridCalc.sectionFootprint"),
                hint: t("gridCalc.sectionFootprintHint"),
              }),
              h(Field, {
                label: t("gridCalc.buildingWidthM"),
                children: h(InputBase, {
                  value: gridBuildingWidthM,
                  onChange: setGridBuildingWidthM,
                  placeholder: "e.g., 24",
                  type: "number",
                  step: "any",
                  min: 0,
                }),
              }),
              h(Field, {
                label: t("gridCalc.buildingDepthM"),
                children: h(InputBase, {
                  value: gridBuildingDepthM,
                  onChange: setGridBuildingDepthM,
                  placeholder: "e.g., 18",
                  type: "number",
                  step: "any",
                  min: 0,
                }),
              }),
              h(SectionTitle, {
                label: t("gridCalc.sectionBays"),
                hint: t("gridCalc.sectionBaysHint"),
              }),
              h(Field, {
                label: t("gridCalc.prefBayWidthM"),
                hint: t("gridCalc.prefBayWidthHint"),
                children: h(InputBase, {
                  value: gridPrefBayWidthM,
                  onChange: setGridPrefBayWidthM,
                  placeholder: "e.g., 8",
                  type: "number",
                  step: "any",
                  min: 0,
                }),
              }),
              h(Field, {
                label: t("gridCalc.prefBayDepthM"),
                hint: t("gridCalc.prefBayDepthHint"),
                children: h(InputBase, {
                  value: gridPrefBayDepthM,
                  onChange: setGridPrefBayDepthM,
                  placeholder: "e.g., 6",
                  type: "number",
                  step: "any",
                  min: 0,
                }),
              }),
              h(SectionTitle, {
                label: t("gridCalc.structureType"),
                hint: t("gridCalc.structureTypeHint"),
              }),
              h("div", { className: "flex flex-wrap gap-2" }, [
                h(ValueButton, { active: gridStructureType === "rc", onClick: () => setGridStructureType("rc") }, t("options.gridStructure.rc")),
                h(ValueButton, { active: gridStructureType === "steel", onClick: () => setGridStructureType("steel") }, t("options.gridStructure.steel")),
                h(ValueButton, { active: gridStructureType === "timber", onClick: () => setGridStructureType("timber") }, t("options.gridStructure.timber")),
              ]),
            ]),
          }),
          h(Card, {
            title: t("common.results"),
            hint: t("common.autoCalculate"),
            tone: "results",
            children: h("div", { className: "space-y-5" }, [
              h("div", { className: "space-y-2" }, [
                h(
                  "div",
                  { className: "text-[10px] font-bold tracking-[.24em] uppercase text-[var(--st-muted)]" },
                  t("gridCalc.planDiagram")
                ),
                diagramEl,
              ]),
              h("div", { className: "flex flex-wrap gap-2" }, [
                h(
                  "div",
                  {
                    className: classNames(
                      "inline-flex items-center h-9 px-4 rounded-full text-[10px] font-extrabold tracking-[.18em] uppercase",
                      efficiencyBadgeClass
                    ),
                  },
                  gr ? gr.efficiencyLabel : "—"
                ),
              ]),
              gr
                ? h("div", { className: "text-[11px] font-semibold text-[var(--st-muted)] leading-relaxed" }, [
                    h("div", {}, ti("gridCalc.ldIndicative", { v: formatSmartNumber(gr.ldRatioUsed) })),
                    h("div", {}, t("gridCalc.note")),
                  ])
                : null,
              h(ValueBlock, {
                label: t("gridCalc.baysX"),
                valueText: gr ? formatInteger(gr.nx) : "—",
                big: true,
                integerValue: true,
              }),
              h(ValueBlock, {
                label: t("gridCalc.baysY"),
                valueText: gr ? formatInteger(gr.ny) : "—",
                big: true,
                integerValue: true,
              }),
              h(ValueBlock, {
                label: t("gridCalc.actualBayWidth"),
                valueText: gr ? formatSmartNumber(gr.actualBayW) : "—",
                unitText: t("common.unitM"),
                big: true,
              }),
              h(ValueBlock, {
                label: t("gridCalc.actualBayDepth"),
                valueText: gr ? formatSmartNumber(gr.actualBayD) : "—",
                unitText: t("common.unitM"),
                big: true,
              }),
              h(ValueBlock, {
                label: t("gridCalc.totalColumns"),
                valueText: gr ? formatInteger(gr.totalColumns) : "—",
                big: true,
                integerValue: true,
              }),
              h(ValueBlock, {
                label: t("gridCalc.recommendedSlabSpan"),
                valueText: gr ? formatSmartNumber(gr.slabSpanM) : "—",
                unitText: t("common.unitM"),
                big: true,
              }),
              h(ValueBlock, {
                label: t("gridCalc.indicativeDepth"),
                valueText: gr ? formatSmartNumber(gr.indicativeDepthCm) : "—",
                unitText: t("common.unitCm"),
                big: true,
              }),
              h(
                "div",
                {
                  className:
                    "text-[11px] font-semibold text-[var(--st-muted)] leading-relaxed pt-3 mt-1 border-t border-[var(--st-border)]",
                },
                t("gridCalc.standardsReference")
              ),
              h("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2" }, [
                h(
                  "button",
                  {
                    type: "button",
                    onClick: onCopy,
                    className:
                      "h-12 rounded-2xl bg-[var(--st-accent)] text-white font-extrabold tracking-wide hover:brightness-110 transition-colors duration-150",
                  },
                  t("common.copyAsText")
                ),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: () => setPdfModalOpen(true),
                    className:
                      "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150",
                  },
                  t("common.exportPdf")
                ),
              ]),
            ]),
          }),
        ]);
      }

      if (activeTool === "loadCalculator") {
        const lr = loadResult;
        const LOAD_BUILDING_USE_IDS = ["residential", "office", "retail", "hospital", "industrial", "education"];
        const LOAD_FLOOR_SYSTEM_IDS = ["rc_flat", "rc_beam", "steel_composite", "timber"];
        const LOAD_FACADE_IDS = ["light", "medium", "heavy"];

        const categoryBadgeClass =
          lr && lr.loadCategory === "light"
            ? "border border-[#16A34A]/45 bg-[#16A34A]/12 text-[#166534] dark:text-[#86EFAC]"
            : lr && lr.loadCategory === "medium"
              ? "border border-[#2563EB]/45 bg-[#2563EB]/12 text-[#1D4ED8] dark:text-[#93C5FD]"
              : lr && lr.loadCategory === "heavy"
                ? "border border-[#CA8A04]/45 bg-[#CA8A04]/12 text-[#854D0E] dark:text-[#FDE047]"
                : lr
                  ? "border border-[#DC2626]/45 bg-[#DC2626]/12 text-[#991B1B] dark:text-[#FCA5A5]"
                  : "border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-muted)]";

        let diagramEl = null;
        if (lr) {
          const nRoof = lr.roofIncluded ? 1 : 0;
          const nLv = lr.numFloors + nRoof;
          const qs = [];
          if (lr.roofIncluded && lr.roofTotalKnM2 != null) qs.push(lr.roofTotalKnM2);
          for (let i = 0; i < lr.numFloors; i++) qs.push(lr.totalFloorKnM2);
          const maxQ = Math.max(...qs.map((q) => (Number.isFinite(q) ? q : 0)), 0.01);
          const vbW = 300;
          const vbH = 272;
          const sx = (vbW - 84) / 2;
          const sy = 28;
          const bw = 84;
          const bh = 190;
          const hSeg = bh / Math.max(nLv, 1);
          const slabEls = [];
          const arrowEls = [];
          for (let i = 0; i < nLv; i++) {
            const y0 = sy + i * hSeg;
            const ySlab = y0 + hSeg;
            const q = qs[i] || 0;
            const alen = 10 + (q / maxQ) * 38;
            const xMid = sx + bw / 2;
            const yTop = y0 + 7;
            const yBot = Math.min(yTop + alen, ySlab - 9);
            slabEls.push(
              h("line", {
                key: `s${i}`,
                x1: sx + 5,
                y1: ySlab - 1,
                x2: sx + bw - 5,
                y2: ySlab - 1,
                stroke: "currentColor",
                strokeWidth: 3,
                strokeLinecap: "round",
              })
            );
            arrowEls.push(
              h("g", { key: `a${i}` }, [
                h("line", {
                  x1: xMid,
                  y1: yTop,
                  x2: xMid,
                  y2: yBot,
                  stroke: "#DC2626",
                  className: "dark:stroke-red-400",
                  strokeWidth: 2.4,
                  strokeLinecap: "round",
                }),
                h("path", {
                  d: `M ${xMid - 5.5} ${yBot - 1} L ${xMid} ${yBot + 7} L ${xMid + 5.5} ${yBot - 1} Z`,
                  className: "fill-red-600 dark:fill-red-400",
                }),
              ])
            );
          }
          diagramEl = h(
            "svg",
            {
              viewBox: `0 0 ${vbW} ${vbH}`,
              className:
                "w-full h-auto rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)]/40 text-[var(--st-fg)] overflow-hidden",
              style: { overflow: "hidden" },
              "aria-hidden": true,
            },
            [
              h("rect", {
                x: sx,
                y: sy,
                width: bw,
                height: bh,
                fill: "none",
                stroke: "currentColor",
                strokeWidth: 2.2,
                rx: 2,
              }),
              ...slabEls,
              ...arrowEls,
              h(
                "text",
                {
                  x: vbW / 2,
                  y: Math.min(sy + bh + 22, vbH - 6),
                  textAnchor: "middle",
                  className: "fill-current text-[9px] font-bold",
                  style: { fontFamily: "system-ui, sans-serif" },
                },
                t("loadCalc.sectionHint")
              ),
            ]
          );
        } else {
          diagramEl = h(
            "div",
            {
              className:
                "rounded-2xl border border-dashed border-[var(--st-border)] bg-[color-mix(in_srgb,var(--st-fg)_4%,var(--st-bg))] p-10 text-center text-xs font-semibold text-[var(--st-muted)]",
            },
            t("loadCalc.enterValid")
          );
        }

        return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
          h(Card, {
            title: t("tools.loadCalculator.label"),
            hint: t("common.inputs"),
            children: h("div", { className: "space-y-4" }, [
              h(SectionTitle, {
                label: t("loadCalc.sectionBuilding"),
                hint: t("loadCalc.sectionBuildingHint"),
              }),
              h(Field, {
                label: t("loadCalc.numFloors"),
                children: h(InputBase, {
                  value: loadNumFloors,
                  onChange: setLoadNumFloors,
                  placeholder: "e.g., 4",
                  type: "number",
                  step: "1",
                  min: 1,
                }),
              }),
              h(Field, {
                label: t("loadCalc.floorAreaM2"),
                children: h(InputBase, {
                  value: loadFloorAreaM2,
                  onChange: setLoadFloorAreaM2,
                  placeholder: "e.g., 500",
                  type: "number",
                  step: "any",
                  min: 0,
                }),
              }),
              h(Field, {
                label: t("loadCalc.buildingUse"),
                children: h(
                  "select",
                  {
                    value: loadBuildingUse,
                    onChange: (e) => setLoadBuildingUse(e.target.value),
                    className:
                      "w-full h-[52px] rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 text-sm font-semibold text-[var(--st-fg)] focus:outline-none focus:border-[var(--st-accent)]",
                  },
                  LOAD_BUILDING_USE_IDS.map((id) => h("option", { key: id, value: id }, t(`options.loadBuildingUse.${id}`)))
                ),
              }),
              h(Field, {
                label: t("loadCalc.floorSystem"),
                children: h(
                  "select",
                  {
                    value: loadFloorSystem,
                    onChange: (e) => setLoadFloorSystem(e.target.value),
                    className:
                      "w-full h-[52px] rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 text-sm font-semibold text-[var(--st-fg)] focus:outline-none focus:border-[var(--st-accent)]",
                  },
                  LOAD_FLOOR_SYSTEM_IDS.map((id) => h("option", { key: id, value: id }, t(`options.loadFloorSystem.${id}`)))
                ),
              }),
              h(Field, {
                label: t("loadCalc.facadeType"),
                children: h(
                  "select",
                  {
                    value: loadFacadeType,
                    onChange: (e) => setLoadFacadeType(e.target.value),
                    className:
                      "w-full h-[52px] rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] px-4 text-sm font-semibold text-[var(--st-fg)] focus:outline-none focus:border-[var(--st-accent)]",
                  },
                  LOAD_FACADE_IDS.map((id) => h("option", { key: id, value: id }, t(`options.loadFacadeType.${id}`)))
                ),
              }),
              h(SectionTitle, {
                label: t("loadCalc.sectionRoof"),
                hint: t("loadCalc.sectionRoofHint"),
              }),
              h("div", { className: "flex flex-wrap gap-2" }, [
                h(ValueButton, { active: loadIncludeRoof === true, onClick: () => setLoadIncludeRoof(true) }, t("common.yes")),
                h(ValueButton, { active: loadIncludeRoof === false, onClick: () => setLoadIncludeRoof(false) }, t("common.no")),
              ]),
              h(SectionTitle, {
                label: t("loadCalc.sectionFoundation"),
                hint: t("loadCalc.sectionFoundationHint"),
              }),
              h(Field, {
                label: t("loadCalc.gridSpacingXm"),
                hint: t("loadCalc.gridSpacingXmHint"),
                children: h(InputBase, {
                  value: loadGridSpacingXm,
                  onChange: setLoadGridSpacingXm,
                  placeholder: t("loadCalc.gridSpacingPlaceholder"),
                  type: "number",
                  step: "any",
                  min: 0,
                }),
              }),
              h(Field, {
                label: t("loadCalc.gridSpacingYm"),
                hint: t("loadCalc.gridSpacingYmHint"),
                children: h(InputBase, {
                  value: loadGridSpacingYm,
                  onChange: setLoadGridSpacingYm,
                  placeholder: t("loadCalc.gridSpacingPlaceholder"),
                  type: "number",
                  step: "any",
                  min: 0,
                }),
              }),
            ]),
          }),
          h(Card, {
            title: t("common.results"),
            hint: t("common.autoCalculate"),
            tone: "results",
            children: h("div", { className: "space-y-5" }, [
              h("div", { className: "space-y-2" }, [
                h(
                  "div",
                  { className: "text-[10px] font-bold tracking-[.24em] uppercase text-[var(--st-muted)]" },
                  t("loadCalc.sectionDiagram")
                ),
                diagramEl,
              ]),
              h("div", { className: "flex flex-wrap gap-2" }, [
                h(
                  "div",
                  {
                    className: classNames(
                      "inline-flex items-center h-9 px-4 rounded-full text-[10px] font-extrabold tracking-[.18em] uppercase",
                      categoryBadgeClass
                    ),
                  },
                  lr ? lr.loadCategoryLabel : "—"
                ),
              ]),
              lr
                ? h("div", { className: "text-[11px] font-semibold text-[var(--st-muted)] leading-relaxed space-y-1" }, [
                    h("div", {}, t("loadCalc.referenceLine")),
                    h("div", {}, t("loadCalc.roofNote")),
                  ])
                : null,
              h(ValueBlock, {
                label: t("loadCalc.deadPerFloor"),
                valueText: lr ? formatLoadKnM2(lr.deadPerFloorKnM2) : "—",
                unitText: t("loadCalc.unitKnM2"),
                big: true,
                decimals: 2,
              }),
              h(ValueBlock, {
                label: t("loadCalc.livePerFloor"),
                valueText: lr ? formatLoadKnM2(lr.livePerFloorKnM2) : "—",
                unitText: t("loadCalc.unitKnM2"),
                big: true,
                decimals: 2,
              }),
              h(ValueBlock, {
                label: t("loadCalc.totalFloorLoad"),
                valueText: lr ? formatLoadKnM2(lr.totalFloorKnM2) : "—",
                unitText: t("loadCalc.unitKnM2"),
                big: true,
                decimals: 2,
              }),
              h(ValueBlock, {
                label: t("loadCalc.totalBuildingKn"),
                valueText: lr ? formatSmartNumber(lr.totalBuildingKn) : "—",
                unitText: t("loadCalc.unitKn"),
                big: true,
              }),
              h(ValueBlock, {
                label: t("loadCalc.totalTonnes"),
                valueText: lr ? formatSmartNumber(lr.tonnes) : "—",
                unitText: t("loadCalc.unitT"),
                big: true,
              }),
              h(ValueBlock, {
                label: t("loadCalc.foundationPerColumn"),
                valueText: lr ? formatSmartNumber(lr.foundationKnPerColumn) : "—",
                unitText: t("loadCalc.unitKn"),
                big: true,
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
                  t("common.copyAsText")
                ),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: () => setPdfModalOpen(true),
                    className:
                      "h-12 rounded-2xl border border-[var(--st-border)] bg-[var(--st-bg)] text-[var(--st-fg)] font-extrabold tracking-wide hover:bg-[color-mix(in_srgb,var(--st-fg)_6%,var(--st-bg))] transition-colors duration-150",
                  },
                  t("common.exportPdf")
                ),
              ]),
            ]),
          }),
        ]);
      }

      return h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 items-start" }, [
        h(Card, {
          title: t("common.inputs"),
          hint:
            tab === "paper" ? t("common.paperSizeMode") : tab === "reverse" ? t("common.modelToRealMode") : t("common.realToModelMode"),
          children: h(ScaleConverterInputsPanel, {
            tab,
            setTab,
            t,
            customDenom,
            setCustomDenom,
            setDenom,
            applyCustomDenom,
            applyScalePreset,
            denomSafe,
            unit,
            setUnit,
            history,
            onHistorySelect: onScaleHistorySelect,
            quickChips,
            isFt,
            realLen,
            realArea,
            realW,
            realH,
            realD,
            setRealLen,
            setRealArea,
            setRealW,
            setRealH,
            setRealD,
            modelLen,
            modelArea,
            modelW,
            modelH,
            modelD,
            setModelLen,
            setModelArea,
            setModelW,
            setModelH,
            setModelD,
            paperSize,
            setPaperSize,
            onReset,
          }),
        }),
        h(Card, {
          title: t("common.results"),
          hint: t("common.instantOutputsHint"),
          right: null,
          tone: "results",
          children: [
            h(ScaleConverterResultHeader, {
              t,
              statusState,
              statusText: status.text,
              localizeStatus,
              computed,
              denomSafe,
              unit,
            }),
            h(ScaleConverterResultsPanel, {
              tab,
              computed,
              unit,
              onCopy,
              exportHistoryCSV,
              onOpenPdfModal: onOpenScalePdfModal,
              t,
            }),
          ],
        }),
      ]);
    }

    const LANDING_TOOL_ORDER = [
      "scale",
      "stair",
      "ramp",
      "span",
      "gridCalculator",
      "loadCalculator",
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
      const tool = TOOL_ITEMS.find((x) => x.id === tid);
      if (!tool) return null;
      return { tool: mergeToolMeta(tool), category: LANDING_CATEGORY_BY_ID[tid] || "geometry" };
    }).filter(Boolean);

    if (activeTool === "landing") {
      const aboutGrid = h("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 lg:gap-14" }, [
        h(
          "div",
          {
            "data-about-col": "1",
            className: "pt-6 md:pt-8 border-t border-[var(--st-border)]",
          },
          [
            h("div", { key: "l", className: "text-[11px] font-extrabold tracking-[0.22em] text-[var(--st-accent)] mb-3" }, t("landing.about.col1Label")),
            h("h3", { key: "h", className: "font-display text-lg md:text-xl font-bold text-[var(--st-fg)] mb-3 tracking-tight" }, t("landing.about.col1Title")),
            h("p", { key: "p", className: "text-[15px] text-[var(--st-muted)] leading-relaxed font-medium" }, t("landing.about.col1Body")),
          ]
        ),
        h(
          "div",
          {
            "data-about-col": "2",
            className: "pt-6 md:pt-8 border-t border-[var(--st-border)]",
          },
          [
            h("div", { key: "l", className: "text-[11px] font-extrabold tracking-[0.22em] text-[var(--st-accent)] mb-3" }, t("landing.about.col2Label")),
            h("h3", { key: "h", className: "font-display text-lg md:text-xl font-bold text-[var(--st-fg)] mb-3 tracking-tight" }, t("landing.about.col2Title")),
            h("p", { key: "p", className: "text-[15px] text-[var(--st-muted)] leading-relaxed font-medium" }, t("landing.about.col2Body")),
          ]
        ),
        h(
          "div",
          {
            "data-about-col": "3",
            className: "pt-6 md:pt-8 border-t border-[var(--st-border)]",
          },
          [
            h("div", { key: "l", className: "text-[11px] font-extrabold tracking-[0.22em] text-[var(--st-accent)] mb-3" }, t("landing.about.col3Label")),
            h("h3", { key: "h", className: "font-display text-lg md:text-xl font-bold text-[var(--st-fg)] mb-3 tracking-tight" }, t("landing.about.col3Title")),
            h("p", { key: "p", className: "text-[15px] text-[var(--st-muted)] leading-relaxed font-medium" }, t("landing.about.col3Body")),
          ]
        ),
      ]);

      return h("div", { className: "min-h-screen flex flex-col bg-[var(--st-bg)] text-[var(--st-fg)]" }, [
        h("div", { className: "structura-hero-shell" }, [
          h("div", { className: "structura-hero-grid-bg", "aria-hidden": true }),
          h(LandingHeroBackgroundScene, null),
          h(LandingHeroConstructionBuilding, null),
          h(LandingHeroWireframe3D, null),
          h(LandingHeroSheetDecor, null),
          h(LandingHeroEdgeCrane, null),
          h(LandingHeroBlock, {
            navToggles: h(NavToggles, { theme, onThemeToggle: handleThemeToggle }),
            tagline: t("landing.tagline"),
            openLabel: t("landing.openToolkit"),
            onOpenToolkit: () => document.getElementById("structura-tool-grid")?.scrollIntoView({ behavior: "smooth" }),
          }),
        ]),
        h(LandingAboutSection, {
          aboutHeading: t("landing.aboutSr"),
          columnsContent: aboutGrid,
          depsKey: lang,
        }),
        h(LandingToolGridSection, {
          title: t("landing.allTools"),
          landingToolsList,
          navigateToTool,
          LandingToolIcon,
          lang,
        }),
        h("footer", { className: "mt-auto pt-10 pb-8 text-center px-4 border-t border-[var(--st-border)]" }, [
          h("div", { className: "text-[12px] font-medium text-[var(--st-muted)]" }, t("footer.designedBy")),
          h(
            "div",
            { className: "mt-3 text-[11px] text-[var(--st-muted)] max-w-xl mx-auto leading-relaxed opacity-95" },
            t("footer.rights")
          ),
          h("div", { className: "mt-2 text-[10px] font-medium text-[var(--st-muted)] opacity-80" }, t("footer.yearLine")),
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
                  "STRUCTURA"
                ),
                h(
                  "h1",
                  { className: "font-display text-3xl md:text-4xl font-bold tracking-tight text-[var(--st-fg)] leading-tight" },
                  activeToolMeta.label
                ),
                h(
                  "div",
                  { className: "mt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--st-muted)]" },
                  t("landing.tagline")
                ),
              ]),
              h(NavToggles, { theme, onThemeToggle: handleThemeToggle }),
            ]),
            h("p", { className: "mt-5 max-w-3xl text-[15px] text-[var(--st-muted)] font-medium leading-relaxed" }, activeToolMeta.intro),
          ]),

          h("div", { className: "grid grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)] gap-7 items-start" }, [
            h(
              "aside",
              { className: "border border-[var(--st-border)] rounded-3xl bg-[var(--st-bg)] p-4 lg:sticky lg:top-6" },
              [
                h("div", { className: "text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--st-muted)] mb-3 px-2" }, t("nav.tools")),
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
                          const baseTool = TOOL_ITEMS.find((x) => x.id === tid);
                          if (!baseTool) return null;
                          const tool = mergeToolMeta(baseTool);
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
                  h("div", { className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--st-muted)] mb-3" }, t("common.exportAsPdf")),
                  h("div", { className: "text-sm text-[var(--st-fg)] font-semibold" }, t("common.projectNameOptional")),
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
                      t("common.cancel")
                    ),
                    h(
                      "button",
                      {
                        type: "button",
                        onClick: exportCurrentToPDF,
                        className:
                          "flex-1 h-12 rounded-2xl bg-[var(--st-accent)] text-white font-extrabold tracking-wide hover:brightness-110 transition-colors duration-150",
                      },
                      t("common.exportPdf")
                    ),
                  ]),
                  h(
                    "div",
                    { className: "mt-3 text-xs text-[var(--st-muted)]" },
                    activeTool === "span"
                      ? t("pdf.spanCross")
                      : activeTool === "gridCalculator"
                        ? t("pdf.gridPlan")
                        : activeTool === "loadCalculator"
                          ? t("pdf.loadCalc")
                          : activeTool === "room"
                            ? t("pdf.roomTable")
                            : activeTool === "parking"
                              ? t("pdf.parkingTop")
                              : activeTool === "daylight"
                                ? t("pdf.daylight")
                                : activeTool === "fireEscape"
                                  ? t("pdf.firePlan")
                                  : activeTool === "uValue"
                                    ? t("pdf.uValueLayers")
                                    : activeTool === "siteCoverage"
                                      ? t("pdf.sitePlan")
                                      : t("pdf.default")
                  ),
                ]),
              ])
            : null,
        ]
      ),
      h("footer", { className: "mt-auto pt-12 pb-6 text-center px-4 border-t border-[var(--st-border)]" }, [
        h("div", { className: "text-[12px] font-medium text-[var(--st-muted)]" }, t("footer.designedBy")),
        h(
          "div",
          { className: "mt-3 text-[11px] text-[var(--st-muted)] max-w-2xl mx-auto leading-relaxed" },
          t("footer.rights")
        ),
        h("div", { className: "mt-2 text-[10px] font-medium text-[var(--st-muted)] opacity-80" }, t("footer.yearLine")),
      ]),
    ]);
  }

createRoot(document.getElementById("root")).render(h(LanguageProvider, null, h(App)));
