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
    return rounded.toFixed(1).replace(/\.0$/, "");
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
        ? "bg-zinc-50/80 dark:bg-zinc-900/40 border-zinc-300 dark:border-zinc-700 shadow-[0_10px_30px_rgba(0,0,0,0.09)]"
        : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-[0_6px_22px_rgba(0,0,0,0.06)]";
    return h(
      "section",
      {
        className:
          `border rounded-3xl p-6 text-zinc-900 dark:text-zinc-100 ${cardTone}`,
      },
      [
        title
          ? h("div", { key: "head", className: "flex items-start justify-between gap-3 mb-4" }, [
              h("div", { key: "th" }, [
              h("div", { key: "ey", className: "text-[11px] font-semibold tracking-[.22em] uppercase text-zinc-600 dark:text-zinc-400" }, title),
                hint
                  ? h(
                      "div",
                      { key: "hi", className: "mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-semibold" },
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
      h("div", { className: "text-[10px] font-bold tracking-[.24em] uppercase text-zinc-700 dark:text-zinc-300" }, label),
      hint
        ? h("div", { className: "mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-semibold leading-relaxed" }, hint)
        : null,
    ]);
  }

  function Field({ label, children }) {
    return h("label", { className: "block" }, [
      h("div", { className: "text-[10px] font-bold tracking-[.24em] uppercase text-zinc-600 dark:text-zinc-400 mb-2.5" }, label),
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
      className:
        classNames(
          "w-full h-[52px] rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50/90 dark:bg-zinc-900 px-4 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-0 focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors",
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
          "h-10 px-3 rounded-full border text-xs font-extrabold tracking-[.16em] uppercase transition-colors",
          active
            ? "bg-zinc-900 border-zinc-900 text-white"
            : "bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900"
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
          "h-9 px-3 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-bold text-zinc-800 dark:text-zinc-100 transition-colors",
      },
      label
    );
  }

  function ValueBlock({ label, valueText, unitText, big, children }) {
    return h("div", { className: "border border-zinc-300 dark:border-zinc-700 rounded-3xl bg-white dark:bg-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]" }, [
      h("div", { className: "p-6" }, [
        h("div", { className: "text-[10px] font-bold tracking-[.24em] uppercase text-zinc-600 dark:text-zinc-400 mb-4" }, label),
        h(
          "div",
          { className: classNames("flex items-baseline gap-3 flex-wrap", big ? "pt-1" : "") },
          [
            h(
              "div",
              {
                className: classNames(
                  "font-black tracking-tight text-zinc-900 dark:text-zinc-50 leading-none",
                  big ? "text-7xl md:text-8xl" : "text-4xl"
                ),
              },
              valueText || "—"
            ),
            unitText
              ? h(
                  "div",
                  { className: classNames("text-zinc-600 dark:text-zinc-300 font-extrabold tracking-[.22em] uppercase", big ? "text-xs" : "text-[11px]") },
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
    ];

    const TOOL_PATHS = {
      scale: "/",
      stair: "/stair-calculator",
      ramp: "/ramp-calculator",
      span: "/span-calculator",
    };

    function pathToTool(pathname) {
      const p = String(pathname || "").replace(/\/$/, "") || "/";
      if (p === "/span-calculator") return "span";
      if (p === "/stair-calculator") return "stair";
      if (p === "/ramp-calculator") return "ramp";
      return "scale";
    }

    const [activeTool, setActiveTool] = useState(() => pathToTool(typeof window !== "undefined" ? window.location.pathname : "/"));
    const [tab, setTab] = useState("convert"); // convert | reverse | paper
    const [denom, setDenom] = useState(50);
    const [unit, setUnit] = useState("m");
    const [customDenom, setCustomDenom] = useState("50");
    const [paperSize, setPaperSize] = useState("A3");

    const getInitialTheme = () => {
      try {
        const saved = localStorage.getItem("arch-theme");
        if (saved === "light" || saved === "dark") return saved;
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

    // Tool 02 — Stair Calculator
    const [stairTotalHeightM, setStairTotalHeightM] = useState("3.0");
    const [stairDesiredRiserCm, setStairDesiredRiserCm] = useState("17");

    // Tool 03 — Ramp Calculator
    const [rampTotalHeightM, setRampTotalHeightM] = useState("0.9");
    const [rampDesiredSlopePct, setRampDesiredSlopePct] = useState("6");
    const [rampLengthM, setRampLengthM] = useState("");
    const [rampInputMode, setRampInputMode] = useState("slope"); // slope | length

    // Column & Beam Span Calculator
    const [spanLengthM, setSpanLengthM] = useState("6");
    const [spanSystem, setSpanSystem] = useState("rc_flat"); // rc_flat | rc_beam | steel | timber
    const [spanLoad, setSpanLoad] = useState("medium"); // light | medium | heavy

    const [status, setStatus] = useState({ state: "idle", text: "Ready" });
    const statusState = status.state;

    const [history, setHistory] = useState([]);
    const calcKeyRef = useRef("");
    const lastAddedRef = useRef(null);

    const activeToolMeta = useMemo(() => TOOL_ITEMS.find((t) => t.id === activeTool) ?? TOOL_ITEMS[0], [activeTool]);

    useEffect(() => {
      document.title = `${activeToolMeta.label} — Architecture Toolkit`;
    }, [activeToolMeta.label]);

    function navigateToTool(toolId) {
      setActiveTool(toolId);
      const path = TOOL_PATHS[toolId] ?? "/";
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
      document.body.classList.add("theme-transition");
      try {
        localStorage.setItem("arch-theme", nextTheme);
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
          "Scale Converter",
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
          "Scale Converter",
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
        "Scale Converter",
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

    function buildPDFLines(projectName) {
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

      const timestamp = new Date().toLocaleString();
      const scale = `1:${denomSafe}`;
      const unitStr = unitLabel(unit);

      const lines = [];
      lines.push(projectName ? projectName : "Project (untitled)");
      lines.push(`Scale Converter`);
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
        lines.forEach((line) => {
          if (y > (activeTool === "span" ? 520 : 780)) return;
          const chunks = doc.splitTextToSize(line, maxWidth);
          chunks.forEach((chunk) => {
            if (y > (activeTool === "span" ? 520 : 780)) return;
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

        const safeName = (pdfProjectName.trim() || "Untitled").replace(/[\\/:*?"<>|]+/g, "-");
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        const suffix = activeTool === "span" ? "span-calculator" : "scale-converter";
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
        "inline-flex items-center justify-center h-8 px-3.5 rounded-full border text-[10px] font-extrabold tracking-[.18em] uppercase transition-colors",
        statusState === "ok"
          ? "bg-zinc-900 border-zinc-900 text-white"
          : statusState === "warn"
            ? "bg-white border-zinc-300 text-zinc-900 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100"
            : "bg-white border-zinc-200 text-zinc-600 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-200"
      );
      return h("div", { className: "flex items-start justify-between gap-3 mb-5 pb-4 border-b border-zinc-200/80 dark:border-zinc-800/80" }, [
        h("div", {}, [
          h("div", { className: "text-[10px] font-bold tracking-[.24em] uppercase text-zinc-600 dark:text-zinc-400" }, computed.title),
          h("div", { className: "mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-semibold" }, `Scale 1:${denomSafe} • Unit ${unitLabel(unit)}`),
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
              { type: "button", onClick: onCopy, className: "h-12 rounded-2xl bg-zinc-900 text-white font-extrabold tracking-wide hover:bg-black transition-colors shadow-sm" },
              "Copy as text"
            ),
            h(
              "button",
              { type: "button", onClick: exportHistoryCSV, className: "h-12 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-extrabold tracking-wide hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors" },
              "Export CSV"
            ),
            h(
              "button",
              {
                type: "button",
                onClick: () => setPdfModalOpen(true),
                className: "h-12 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-extrabold tracking-wide hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors",
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
          h("div", { className: "border border-zinc-300 dark:border-zinc-700 rounded-3xl bg-zinc-50/70 dark:bg-zinc-900/40 p-6" }, [
            h("div", { className: "text-[11px] font-semibold tracking-[.22em] uppercase text-zinc-600 dark:text-zinc-400 mb-3" }, dimsLabel),
            h("div", { className: "flex items-baseline gap-3 flex-wrap" }, [
              h("div", { className: "font-black tracking-tight text-zinc-900 dark:text-zinc-50 text-4xl" }, computed.wOut && computed.hOut && computed.dOut ? dimsText : "—"),
              h("div", { className: "text-xs font-extrabold tracking-[.22em] uppercase text-zinc-600 dark:text-zinc-300" }, unitLabel(unit)),
            ]),
            h("div", { className: "mt-4 border-t border-zinc-200 dark:border-zinc-800 pt-4" }, [
              h("div", { className: "text-[11px] font-semibold tracking-[.22em] uppercase text-zinc-600 dark:text-zinc-400 mb-2" }, volLabel),
              h("div", { className: "flex items-baseline gap-3" }, [
                h("div", { className: "font-black tracking-tight text-zinc-900 dark:text-zinc-50 text-3xl" }, computed.volOut || "—"),
                h("div", { className: "text-xs font-extrabold tracking-[.22em] uppercase text-zinc-600 dark:text-zinc-300" }, volumeUnitLabel(unit)),
              ]),
            ]),
          ]),
        ]),
        h("div", { className: "mt-5" }, [
          h("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3 w-full" }, [
            h(
              "button",
              { type: "button", onClick: onCopy, className: "h-12 rounded-2xl bg-zinc-900 text-white font-extrabold tracking-wide hover:bg-black transition-colors shadow-sm" },
              "Copy as text"
            ),
            h(
              "button",
              { type: "button", onClick: exportHistoryCSV, className: "h-12 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-extrabold tracking-wide hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors" },
              "Export CSV"
            ),
            h(
              "button",
              {
                type: "button",
                onClick: () => setPdfModalOpen(true),
                className: "h-12 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-extrabold tracking-wide hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors",
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
      return h("div", { className: "flex gap-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-2 mb-4" }, [
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
      return h("div", { className: "bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-3xl p-5 mb-5 shadow-[0_6px_20px_rgba(0,0,0,0.04)]" }, [
        h("div", { className: "flex items-end justify-between gap-4 mb-3" }, [
          h("div", {}, [
            h("div", { className: "text-[10px] font-bold tracking-[.24em] uppercase text-zinc-600 dark:text-zinc-400" }, "Scale"),
            h("div", { className: "mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-semibold" }, "Preset buttons + custom ratio"),
          ]),
          h("div", { className: "text-right" }, [
            h("div", { className: "text-[11px] font-semibold tracking-[.22em] uppercase text-zinc-600 dark:text-zinc-400 mb-2" }, "1 :"),
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
                className: "h-11 w-28 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 text-zinc-900 dark:text-zinc-100",
                onKeyDown: (e) => {
                  if (e.key === "Enter") applyCustomDenom();
                },
              }),
              h(
                "button",
                { type: "button", onClick: applyCustomDenom, className: "h-11 px-4 rounded-2xl bg-zinc-900 text-white font-extrabold hover:bg-black transition-colors" },
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
                    ? "bg-zinc-900 border-zinc-900 text-white"
                    : "bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                ),
              },
              `1:${p}`
            )
          ),
        ]),
      ]);
    }

    function UnitSwitcher() {
      return h("div", { className: "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 mb-5" }, [
        h("div", { className: "mb-3" }, [
          h("div", { className: "text-[11px] font-semibold tracking-[.22em] uppercase text-zinc-600 dark:text-zinc-400" }, "Unit"),
          h("div", { className: "mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-semibold" }, "Affects input + output display"),
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
                    ? "bg-zinc-900 border-zinc-900 text-white"
                    : "bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900"
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
        h("div", { className: "text-[11px] font-semibold tracking-[.22em] uppercase text-zinc-600 dark:text-zinc-400 mb-3" }, "History (last 6)"),
        history.length === 0
          ? h("div", { className: "text-xs text-zinc-500 dark:text-zinc-400 font-semibold" }, "Press Enter to add a calculation.")
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
                    "text-left rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 px-4 py-3 transition-colors",
                },
                [
                  h("div", { key: "t", className: "text-xs font-extrabold tracking-wide text-zinc-900 dark:text-zinc-50" }, label),
                  h("div", { key: "s", className: "text-[11px] mt-1 text-zinc-500 dark:text-zinc-400 font-semibold" }, `Unit ${it.unit}`),
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
          ? h("div", { className: "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5" }, [
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
              h("div", { className: "h-px bg-zinc-300/80 dark:bg-zinc-700/80 my-6" }),

              // 3D
              h(SectionTitle, { label: "3D (dimensions + volume)", hint: "Width × height × depth" }),
              h("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4" }, [
                h(Field, { label: tab === "convert" ? `Width (${unitLabel(unit)})` : `Width (${unitLabel(unit)})`, children: h(LenInput, { value: tab === "convert" ? realW : modelW, onChange: tab === "convert" ? setRealW : setModelW, placeholder: "e.g., 3" }) }),
                h(Field, { label: tab === "convert" ? `Height (${unitLabel(unit)})` : `Height (${unitLabel(unit)})`, children: h(LenInput, { value: tab === "convert" ? realH : modelH, onChange: tab === "convert" ? setRealH : setModelH, placeholder: "e.g., 2.7" }) }),
                h(Field, { label: tab === "convert" ? `Depth (${unitLabel(unit)})` : `Depth (${unitLabel(unit)})`, children: h(LenInput, { value: tab === "convert" ? realD : modelD, onChange: tab === "convert" ? setRealD : setModelD, placeholder: "e.g., 1.5" }) }),
              ]),
            ])
          : h("div", { className: "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5" }, [
              h(SectionTitle, { label: "Paper size calculator", hint: "How much real area fits at your scale" }),
              h(Field, {
                label: "Select paper size (A0–A4)",
                children: h("select", {
                  value: paperSize,
                  onChange: (e) => setPaperSize(e.target.value),
                  className:
                    "w-full h-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 text-zinc-900 dark:text-zinc-100",
                }, Object.keys(PAPER_SIZES).map((k) => h("option", { key: k, value: k }, k))),
              }),
              h("div", { className: "mt-4 text-xs text-zinc-500 dark:text-zinc-400 font-semibold" }, "Tip: change scale presets and instantly see the real area that fits."),
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
              className: "w-full h-12 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-extrabold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors",
            },
            "Reset"
          ),
        ]),
      ]);
    }

    function renderMainToolContent() {
      if (activeTool === "span") {
        const SPAN_SYSTEM_OPTIONS = [
          { value: "rc_flat", label: "Reinforced Concrete Flat Slab" },
          { value: "rc_beam", label: "Reinforced Concrete Beam & Slab" },
          { value: "steel", label: "Steel Beam" },
          { value: "timber", label: "Timber Beam" },
        ];

        const designBadgeClass =
          spanResult && spanResult.designStatus === "efficient"
            ? "border border-emerald-500/45 bg-emerald-500/[0.12] text-emerald-900 dark:text-emerald-100"
            : spanResult && spanResult.designStatus === "acceptable"
              ? "border border-amber-500/45 bg-amber-500/[0.12] text-amber-950 dark:text-amber-100"
              : spanResult
                ? "border border-red-500/45 bg-red-500/[0.12] text-red-900 dark:text-red-100"
                : "border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300";

        const spanLimitBadgeClass =
          spanResult && spanResult.spanWarnLevel === "green"
            ? "border border-emerald-500/45 bg-emerald-500/[0.12] text-emerald-900 dark:text-emerald-100"
            : spanResult && spanResult.spanWarnLevel === "yellow"
              ? "border border-amber-500/45 bg-amber-500/[0.12] text-amber-950 dark:text-amber-100"
              : spanResult && spanResult.spanWarnLevel === "red"
                ? "border border-red-500/45 bg-red-500/[0.12] text-red-900 dark:text-red-100"
                : "border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300";

        const diagramEl = spanResult
          ? h(
              "svg",
              {
                viewBox: "0 0 440 152",
                className: "w-full h-auto rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/90 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-200",
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
                  "rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-600 bg-zinc-50/50 dark:bg-zinc-900/30 p-10 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400",
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
                      "w-full h-[52px] rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50/90 dark:bg-zinc-900 px-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500",
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
              h("div", { className: "text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 leading-relaxed" }, [
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
                        "rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-3 text-xs font-semibold text-zinc-700 dark:text-zinc-200",
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
              h("div", { className: "border border-zinc-300 dark:border-zinc-700 rounded-3xl bg-white dark:bg-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]" }, [
                h("div", { className: "p-6" }, [
                  h("div", { className: "text-[10px] font-bold tracking-[.24em] uppercase text-zinc-600 dark:text-zinc-400 mb-3" }, "Column / profile suggestion"),
                  h(
                    "div",
                    { className: "text-lg md:text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 leading-snug" },
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
                      "h-12 rounded-2xl bg-zinc-900 text-white font-extrabold tracking-wide hover:bg-black transition-colors shadow-sm",
                  },
                  "Copy as text"
                ),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: () => setPdfModalOpen(true),
                    className:
                      "h-12 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-extrabold tracking-wide hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors",
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
            ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700"
            : rampResult.statusTone === "high"
              ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-200"
              : "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700"
          : "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800";
        const meterWidth = rampResult
          ? rampResult.statusTone === "low"
            ? "w-1/3"
            : rampResult.statusTone === "mid"
              ? "w-2/3"
              : "w-full"
          : "w-0";
        const meterTone = rampResult
          ? rampResult.statusTone === "low"
            ? "bg-zinc-400 dark:bg-zinc-500"
            : rampResult.statusTone === "mid"
              ? "bg-zinc-600 dark:bg-zinc-400"
              : "bg-zinc-900 dark:bg-zinc-100"
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
                        ? "bg-zinc-900 border-zinc-900 text-white"
                        : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
                    ),
                  },
                  "Use slope"
                ),
                h("div", { className: "text-center text-xs font-bold tracking-[.22em] uppercase text-zinc-400 dark:text-zinc-500" }, "or"),
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
                        ? "bg-zinc-900 border-zinc-900 text-white"
                        : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
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
                    "rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-300 leading-relaxed",
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
              h("div", { className: "border border-zinc-300 dark:border-zinc-700 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/50 p-4" }, [
                h("div", { className: "text-[10px] font-bold tracking-[.24em] uppercase text-zinc-600 dark:text-zinc-400 mb-2" }, "Slope quality"),
                h("div", { className: "h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden" }, [
                  h("div", { className: `h-full rounded-full transition-all duration-200 ${meterWidth} ${meterTone}` }),
                ]),
                h("div", { className: "mt-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300" }, rampResult ? `${rampResult.status} (${formatSmartNumber(rampResult.slopePct)}%)` : "Enter height and slope or length"),
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
                    "rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-300 leading-relaxed",
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
                valueText: stairResult ? String(stairResult.steps) : "—",
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

    return h("div", { className: "min-h-screen flex flex-col px-4 py-12 md:py-14" }, [
      h(
        "div",
        { className: "flex-1 max-w-7xl mx-auto w-full space-y-8" },
        [
            h("header", { className: "pb-7 border-b border-zinc-200 dark:border-zinc-800" }, [
              h("div", { className: "text-[11px] font-bold tracking-[.30em] uppercase text-zinc-700 dark:text-zinc-300 mb-3" }, "Architecture Toolkit"),
              h("div", { className: "flex items-end justify-between gap-4 flex-wrap" }, [
                h("div", {}, [
                  h("h1", { className: "text-4xl md:text-5xl font-black tracking-tight text-zinc-900 leading-[1.03] dark:text-zinc-50" }, "Architecture Toolkit"),
                  h("div", { className: "mt-3 text-[11px] font-extrabold tracking-[.24em] uppercase text-zinc-700 dark:text-zinc-300" }, activeToolMeta.label),
                ]),
                h(
                  "button",
                  {
                    type: "button",
                    onClick: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
                    className:
                      "w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-center shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors",
                    "aria-label": "Toggle dark mode",
                  },
                  theme === "dark"
                    ? h(
                        "svg",
                        { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
                        h("path", { d: "M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" })
                      )
                    : h(
                        "svg",
                        { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
                        h("path", { d: "M12 2v2", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round" }),
                        h("path", { d: "M12 20v2", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round" }),
                        h("path", { d: "M4.93 4.93l1.41 1.41", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round" }),
                        h("path", { d: "M17.66 17.66l1.41 1.41", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round" }),
                        h("path", { d: "M2 12h2", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round" }),
                        h("path", { d: "M20 12h2", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round" }),
                        h("path", { d: "M4.93 19.07l1.41-1.41", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round" }),
                        h("path", { d: "M17.66 6.34l1.41-1.41", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round" }),
                        h("circle", { cx: "12", cy: "12", r: "4", stroke: "currentColor", "stroke-width": "2" })
                      )
                  )
              ]),
            h("p", { className: "mt-5 max-w-3xl text-[15px] text-zinc-600 dark:text-zinc-300 font-semibold leading-relaxed" }, activeToolMeta.intro),
          ]),

          h("div", { className: "grid grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)] gap-7 items-start" }, [
            h("aside", { className: "bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-4 lg:sticky lg:top-6" }, [
              h("div", { className: "text-[10px] font-bold tracking-[.24em] uppercase text-zinc-600 dark:text-zinc-400 mb-3 px-2" }, "Tools"),
              h("nav", { className: "flex flex-col gap-2" }, TOOL_ITEMS.map((tool) =>
                h(
                  "button",
                  {
                    key: tool.id,
                    type: "button",
                    onClick: () => navigateToTool(tool.id),
                    className: classNames(
                      "w-full text-left rounded-2xl border-l-4 px-3.5 py-3.5 transition-colors",
                      activeTool === tool.id
                        ? "bg-zinc-900 border-zinc-900 border-l-zinc-300 text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)]"
                        : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 border-l-zinc-200 dark:border-l-zinc-800 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                    ),
                  },
                  [
                    h("div", { key: "l", className: "text-sm font-extrabold tracking-tight" }, tool.label),
                    h(
                      "div",
                      {
                        key: "d",
                        className: classNames(
                          "mt-1 text-[11px] font-semibold leading-relaxed",
                          activeTool === tool.id ? "text-zinc-300" : "text-zinc-500 dark:text-zinc-400"
                        ),
                      },
                      tool.description
                    ),
                  ]
                )
              )),
            ]),
            h("main", { className: "min-w-0" }, [
              renderMainToolContent(),
            ]),
          ]),
          pdfModalOpen
            ? h("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4" }, [
                h("div", { className: "absolute inset-0 bg-black/40 dark:bg-black/50", onClick: () => setPdfModalOpen(false) }),
                h("div", { className: "relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xl p-5" }, [
                  h("div", { className: "text-[11px] font-semibold tracking-[.22em] uppercase text-zinc-600 dark:text-zinc-300 mb-3" }, "Export as PDF"),
                  h("div", { className: "text-sm text-zinc-900 dark:text-zinc-100 font-semibold" }, "Project name (optional)"),
                  h("input", {
                    value: pdfProjectName,
                    onChange: (e) => setPdfProjectName(e.target.value),
                    placeholder: "e.g., Studio Model Set 01",
                    className:
                      "mt-3 w-full h-11 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-300 dark:focus:border-zinc-700",
                  }),
                  h("div", { className: "mt-5 flex gap-3" }, [
                    h(
                      "button",
                      {
                        type: "button",
                        onClick: () => setPdfModalOpen(false),
                        className:
                          "flex-1 h-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-extrabold tracking-wide hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors",
                      },
                      "Cancel"
                    ),
                    h(
                      "button",
                      {
                        type: "button",
                        onClick: exportCurrentToPDF,
                        className:
                          "flex-1 h-12 rounded-2xl bg-zinc-900 text-white font-extrabold tracking-wide hover:bg-black transition-colors shadow-sm",
                      },
                      "Export PDF"
                    ),
                  ]),
                  h(
                    "div",
                    { className: "mt-3 text-xs text-zinc-500 dark:text-zinc-400" },
                    activeTool === "span"
                      ? "PDF includes values and a schematic cross-section diagram."
                      : "PDF is generated as a clean single-page layout."
                  )
                ]),
              ])
            : null,
        ]
      ),
      h(
        "footer",
        {
          className: "mt-auto pt-12 pb-2 text-center",
        },
        [
          h(
            "div",
            { className: "text-[12px] font-medium text-zinc-500 dark:text-zinc-400" },
            "Designed & developed by Melih Özdemir"
          ),
          h(
            "div",
            { className: "mt-1 text-[10px] font-medium text-zinc-400 dark:text-zinc-500" },
            "Architecture Toolkit — 2025"
          ),
        ]
      ),
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
