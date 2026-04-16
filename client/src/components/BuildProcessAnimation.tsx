import { useState, useEffect, useRef } from "react";

interface BuildLine {
  type: "cmd" | "success" | "info" | "sale" | "celebrate";
  text: string;
  delay: number;
}

const BUILD_SEQUENCE: BuildLine[] = [
  // Phase 1: Scaffold
  {
    type: "cmd",
    text: "npx create-next-app@latest my-store --typescript --tailwind",
    delay: 600,
  },
  { type: "success", text: "✓  Created Next.js 14 app", delay: 1800 },
  // Phase 2: Install
  {
    type: "cmd",
    text: "pnpm add @1commerce/headless-sdk stripe shopify-api-node",
    delay: 2700,
  },
  { type: "info", text: "   Installing 47 packages...", delay: 3700 },
  { type: "success", text: "✓  Dependencies installed in 3.2s", delay: 5100 },
  // Phase 3: Connect
  {
    type: "cmd",
    text: "1commerce init --connect stripe shopify",
    delay: 5900,
  },
  { type: "success", text: "✓  Stripe API → LIVE", delay: 6800 },
  {
    type: "success",
    text: "✓  Shopify sync → 47 products imported",
    delay: 7400,
  },
  { type: "success", text: "✓  Commerce SDK initialized", delay: 8000 },
  // Phase 4: Build
  { type: "cmd", text: "pnpm run build", delay: 8900 },
  { type: "info", text: "   Compiling 12 routes...", delay: 9700 },
  { type: "success", text: "✓  Build complete in 8.4s", delay: 10700 },
  // Phase 5: Deploy
  {
    type: "cmd",
    text: "1commerce deploy --target 1commerce.shop",
    delay: 11600,
  },
  { type: "info", text: "   Provisioning edge network...", delay: 12400 },
  { type: "success", text: "✓  SSL certificate issued", delay: 13200 },
  {
    type: "success",
    text: "✓  Live → yourstore.1commerce.shop",
    delay: 14000,
  },
  // Phase 6: First sale
  {
    type: "sale",
    text: "💳  New order #1001 · Apparel Bundle · $79.00",
    delay: 15400,
  },
  { type: "success", text: "✓  Stripe: $79.00 captured", delay: 16200 },
  {
    type: "success",
    text: "✓  Fulfillment workflow triggered",
    delay: 16800,
  },
  {
    type: "celebrate",
    text: "🎉  Your first sale is in the bank!",
    delay: 17600,
  },
];

const TOTAL_DURATION = 21000; // ms before looping

const PHASES = [
  { label: "Scaffold", color: "#6EE7B7", lineIndices: [0, 1] },
  { label: "Install", color: "#93C5FD", lineIndices: [2, 3, 4] },
  { label: "Connect", color: "#FCA5A5", lineIndices: [5, 6, 7, 8] },
  { label: "Build", color: "#F0D080", lineIndices: [9, 10, 11] },
  { label: "Deploy", color: "#C4B5FD", lineIndices: [12, 13, 14, 15] },
  { label: "First Sale", color: "#D4A843", lineIndices: [16, 17, 18, 19] },
];

function lineColor(type: BuildLine["type"]): string {
  switch (type) {
    case "cmd":
      return "#93C5FD";
    case "success":
      return "#6EE7B7";
    case "info":
      return "#6A6A6A";
    case "sale":
      return "#F0D080";
    case "celebrate":
      return "#D4A843";
    default:
      return "#F0E8D0";
  }
}

function activePhaseIndex(visibleCount: number): number {
  for (let i = PHASES.length - 1; i >= 0; i--) {
    const phase = PHASES[i];
    if (phase.lineIndices.some(idx => idx < visibleCount)) return i;
  }
  return 0;
}

export default function BuildProcessAnimation() {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [running, setRunning] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const runAnimation = () => {
    clearTimeouts();
    setVisibleLines(0);
    setRunning(true);

    BUILD_SEQUENCE.forEach((line, i) => {
      const t = setTimeout(() => {
        setVisibleLines(i + 1);
        if (i === BUILD_SEQUENCE.length - 1) {
          setRunning(false);
        }
      }, line.delay);
      timeoutsRef.current.push(t);
    });
  };

  useEffect(() => {
    // Initial start with a small delay
    const startT = setTimeout(runAnimation, 800);
    // Loop
    const loopT = setInterval(runAnimation, TOTAL_DURATION);
    return () => {
      clearTimeout(startT);
      clearInterval(loopT);
      clearTimeouts();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentPhase = activePhaseIndex(visibleLines);

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-5"
          style={{
            border: "1px solid rgba(212,168,67,0.3)",
            backgroundColor: "rgba(212,168,67,0.05)",
            color: "#D4A843",
            fontFamily: "Cinzel, serif",
            letterSpacing: "0.12em",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: "#D4A843",
              animation: running ? "pulse 1s infinite" : "none",
            }}
          />
          LIVE BUILD DEMO
        </div>
        <h2
          className="font-cinzel font-black mb-4"
          style={{
            fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
            color: "#F0E8D0",
            lineHeight: 1.1,
          }}
        >
          From zero to first sale<br />in under 10 minutes.
        </h2>
        <p
          className="font-crimson text-lg mx-auto"
          style={{
            color: "#6A6A6A",
            fontStyle: "italic",
            maxWidth: 520,
            lineHeight: 1.7,
          }}
        >
          Watch a full Next.js headless commerce store boot up on{" "}
          <a
            href="https://1commerce.shop"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#D4A843", textDecoration: "underline" }}
          >
            1commerce.shop
          </a>{" "}
          — powered by{" "}
          <a
            href="https://1commerce.online"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#D4A843", textDecoration: "underline" }}
          >
            1commerce.online
          </a>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Phase sidebar */}
        <div className="lg:col-span-1 flex lg:flex-col flex-row flex-wrap gap-2 lg:gap-3">
          {PHASES.map((phase, i) => {
            const isDone =
              phase.lineIndices[phase.lineIndices.length - 1] < visibleLines;
            const isActive = i === currentPhase && visibleLines > 0;
            return (
              <div
                key={phase.label}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-500"
                style={{
                  backgroundColor: isActive
                    ? phase.color + "15"
                    : isDone
                      ? phase.color + "08"
                      : "transparent",
                  border: `1px solid ${isActive ? phase.color + "60" : isDone ? phase.color + "30" : "#242424"}`,
                  opacity: visibleLines === 0 ? 0.35 : isDone || isActive ? 1 : 0.4,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0 transition-all duration-300"
                  style={{
                    backgroundColor: isDone
                      ? phase.color
                      : isActive
                        ? phase.color
                        : "#333",
                    boxShadow: isActive ? `0 0 8px ${phase.color}80` : "none",
                    animation: isActive ? "pulse 1s infinite" : "none",
                  }}
                />
                <span
                  className="text-xs font-medium"
                  style={{
                    color: isDone || isActive ? phase.color : "#444",
                    fontFamily: "Cinzel, serif",
                    letterSpacing: "0.08em",
                    fontSize: "0.65rem",
                  }}
                >
                  {isDone ? "✓ " : ""}
                  {phase.label}
                </span>
              </div>
            );
          })}

          {/* Replay button */}
          <button
            onClick={runAnimation}
            disabled={running}
            className="mt-auto px-3 py-2 rounded-lg text-xs transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "transparent",
              border: "1px solid #333",
              color: "#6A6A6A",
              fontFamily: "Cinzel, serif",
              letterSpacing: "0.08em",
              fontSize: "0.65rem",
              cursor: running ? "not-allowed" : "pointer",
            }}
            onMouseEnter={e => {
              if (!running)
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "#D4A843";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#333";
            }}
          >
            {running ? "RUNNING..." : "▶ REPLAY"}
          </button>
        </div>

        {/* Terminal window */}
        <div
          className="lg:col-span-3 rounded-xl overflow-hidden"
          style={{
            backgroundColor: "#080808",
            border: "1px solid #242424",
            boxShadow: "0 0 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Terminal title bar */}
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{
              backgroundColor: "#111",
              borderBottom: "1px solid #1a1a1a",
            }}
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "#FF5F56" }}
            />
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "#FFBD2E" }}
            />
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "#27C93F" }}
            />
            <span
              className="ml-3 text-xs flex-1 text-center"
              style={{
                color: "#3a3a3a",
                fontFamily: "monospace",
                letterSpacing: "0.04em",
              }}
            >
              1commerce — my-store — zsh
            </span>
            <span
              className="text-xs"
              style={{ color: running ? "#27C93F" : "#333", fontFamily: "monospace" }}
            >
              {running ? "● running" : "● idle"}
            </span>
          </div>

          {/* Terminal body */}
          <div
            className="p-5 min-h-72 overflow-y-auto"
            style={{ fontFamily: "monospace", fontSize: "0.8rem", lineHeight: 1.75 }}
          >
            {/* Static prompt line at top */}
            <div className="mb-1" style={{ color: "#3a3a3a" }}>
              Last login: Wed Apr 16 07:00:00 on ttys001
            </div>

            {BUILD_SEQUENCE.slice(0, visibleLines).map((line, i) => (
              <div
                key={i}
                className="flex items-start gap-0"
                style={{
                  color: lineColor(line.type),
                  animation: "fadeSlideIn 0.25s ease forwards",
                  fontWeight: line.type === "celebrate" ? 700 : 400,
                  fontSize:
                    line.type === "celebrate" ? "0.9rem" : "0.8rem",
                }}
              >
                {line.type === "cmd" && (
                  <span style={{ color: "#D4A843", marginRight: 8 }}>
                    ❯
                  </span>
                )}
                <span>{line.text}</span>
              </div>
            ))}

            {/* Blinking cursor when running */}
            {running && (
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: "1em",
                  backgroundColor: "#D4A843",
                  verticalAlign: "text-bottom",
                  animation: "blink 0.8s step-end infinite",
                  marginLeft: 2,
                  opacity: 0.8,
                }}
              />
            )}

            {/* Final state: empty prompt */}
            {!running && visibleLines === BUILD_SEQUENCE.length && (
              <div className="mt-1 flex items-center gap-2">
                <span style={{ color: "#D4A843" }}>❯</span>
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: "1em",
                    backgroundColor: "#D4A843",
                    verticalAlign: "text-bottom",
                    animation: "blink 0.8s step-end infinite",
                    opacity: 0.8,
                  }}
                />
              </div>
            )}
          </div>

          {/* Terminal footer */}
          <div
            className="px-5 py-2 flex items-center justify-between"
            style={{
              backgroundColor: "#0d0d0d",
              borderTop: "1px solid #1a1a1a",
            }}
          >
            <div className="flex items-center gap-4">
              <span
                className="text-xs"
                style={{ color: "#3a3a3a", fontFamily: "monospace" }}
              >
                node v22 · pnpm 10
              </span>
              <span
                className="text-xs"
                style={{ color: "#3a3a3a", fontFamily: "monospace" }}
              >
                Next.js 14 · TypeScript
              </span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://1commerce.online"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs transition-colors"
                style={{
                  color: "#D4A843",
                  fontFamily: "Cinzel, serif",
                  letterSpacing: "0.1em",
                  fontSize: "0.6rem",
                  opacity: 0.7,
                  textDecoration: "none",
                }}
                onMouseEnter={e =>
                  ((e.currentTarget as HTMLAnchorElement).style.opacity = "1")
                }
                onMouseLeave={e =>
                  ((e.currentTarget as HTMLAnchorElement).style.opacity = "0.7")
                }
              >
                1COMMERCE.ONLINE
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-xs"
            style={{
              color: "#3a3a3a",
              fontFamily: "Cinzel, serif",
              letterSpacing: "0.08em",
              fontSize: "0.6rem",
            }}
          >
            BUILD PROGRESS
          </span>
          <span
            className="text-xs"
            style={{
              color: "#D4A843",
              fontFamily: "monospace",
              fontSize: "0.7rem",
            }}
          >
            {visibleLines}/{BUILD_SEQUENCE.length} steps
          </span>
        </div>
        <div
          className="h-px rounded-full overflow-hidden"
          style={{ backgroundColor: "#1a1a1a" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(visibleLines / BUILD_SEQUENCE.length) * 100}%`,
              background:
                "linear-gradient(90deg, #6EE7B7, #93C5FD, #C4B5FD, #D4A843)",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
