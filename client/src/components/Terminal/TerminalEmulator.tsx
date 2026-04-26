/**
 * TerminalEmulator.tsx
 *
 * xterm.js-backed terminal emulator component.
 * Handles both Platform mode (text I/O via tRPC) and VPS/Local mode
 * (raw PTY data via WebSocket).
 *
 * Props:
 *   mode           — "platform" | "vps" | "local"
 *   sessionId      — current CLI session ID (from cli.openSession)
 *   onClose        — called when the user requests to close the terminal
 *
 * In platform mode, the component handles command parsing locally, calls
 * cli.execute via tRPC, and renders the result.
 *
 * In vps/local mode, all input/output is forwarded to the WebSocket relay.
 */

import { useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useCliHistory } from "@/hooks/useCliHistory";
import { useTerminalSession, type SessionMode } from "@/hooks/useTerminalSession";

interface TerminalEmulatorProps {
  mode: SessionMode;
  sessionId?: number;
  vpsId?: number;
  agentToken?: string;
  /** Called when session transitions to error or is manually closed. */
  onStatusChange?: (status: string) => void;
}

// ── Platform-mode built-in autocomplete suggestions ──────────────────────────
const AUTOCOMPLETE_COMMANDS = [
  "help",
  "status",
  "tenant info",
  "orders list",
  "orders get",
  "products list",
  "analytics summary",
  "logs",
  "logs --tail",
  "clear",
];

// ── ANSI helpers ──────────────────────────────────────────────────────────────
const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  clearLine: "\x1b[2K\r",
  cursorLeft: "\r",
};

function colorize(text: string, color: keyof typeof ANSI): string {
  return `${ANSI[color]}${text}${ANSI.reset}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TerminalEmulator({
  mode,
  sessionId,
  vpsId,
  agentToken,
  onStatusChange,
}: TerminalEmulatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  const fitAddonRef = useRef<import("@xterm/addon-fit").FitAddon | null>(null);
  const inputBufferRef = useRef<string>("");
  const isReadyRef = useRef(false);

  const { pushCommand, navigate } = useCliHistory();
  const executeCommand = trpc.cli.execute.useMutation();

  // ── WebSocket session (used for vps/local mode) ───────────────────────────
  const { status, send, resize, disconnect } = useTerminalSession({
    mode,
    vpsId,
    agentToken,
    onData: data => {
      if (xtermRef.current) {
        if (typeof data === "string") {
          xtermRef.current.write(data);
        } else {
          xtermRef.current.write(new Uint8Array(data));
        }
      }
    },
    onMessage: msg => {
      const term = xtermRef.current;
      if (!term) return;
      if (msg.type === "connected") {
        term.write(colorize(`\r\n✓ ${msg.payload.message ?? "Connected"}\r\n\r\n`, "green"));
        if (mode === "platform") writePrompt(term);
      } else if (msg.type === "error") {
        term.write(colorize(`\r\n✗ ${msg.payload.message ?? "Error"}\r\n`, "red"));
      } else if (msg.type === "info" || msg.type === "awaiting_agent") {
        term.write(colorize(`\r\n${msg.payload.message ?? ""}\r\n`, "yellow"));
      }
    },
  });

  // Notify parent of status changes
  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  // ── Write the interactive prompt ──────────────────────────────────────────
  const writePrompt = useCallback((term: import("@xterm/xterm").Terminal) => {
    term.write(colorize("\r\nunifyone", "cyan") + colorize(" $ ", "bold"));
  }, []);

  // ── Execute a platform command ────────────────────────────────────────────
  const runPlatformCommand = useCallback(
    async (cmd: string, term: import("@xterm/xterm").Terminal) => {
      pushCommand(cmd);
      if (cmd.trim() === "clear") {
        term.clear();
        writePrompt(term);
        return;
      }
      term.write("\r\n");
      try {
        const result = await executeCommand.mutateAsync({
          command: cmd,
          sessionId,
        });
        const lines = result.output.split("\n");
        for (const line of lines) {
          const colored =
            result.exitCode !== 0 ? colorize(line, "red") : line;
          term.write(colored + "\r\n");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Command failed";
        term.write(colorize(`Error: ${msg}`, "red") + "\r\n");
      }
      writePrompt(term);
    },
    [executeCommand, pushCommand, sessionId, writePrompt]
  );

  // ── Autocomplete ──────────────────────────────────────────────────────────
  const autocomplete = useCallback(
    (partial: string, term: import("@xterm/xterm").Terminal): string => {
      const matches = AUTOCOMPLETE_COMMANDS.filter(c => c.startsWith(partial));
      if (matches.length === 1) {
        const completion = matches[0].slice(partial.length);
        term.write(completion);
        return partial + completion;
      }
      if (matches.length > 1) {
        term.write("\r\n" + matches.join("  ") + "\r\n");
        writePrompt(term);
        term.write(partial);
      }
      return partial;
    },
    [writePrompt]
  );

  // ── Initialise xterm ──────────────────────────────────────────────────────
  useEffect(() => {
    let disposed = false;

    const initTerminal = async () => {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      const { WebLinksAddon } = await import("@xterm/addon-web-links");

      if (disposed || !containerRef.current) return;

      const term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: '"Fira Code", "Cascadia Code", Menlo, monospace',
        theme: {
          background: "#0a0a0a",
          foreground: "#e2e8f0",
          cursor: "#38bdf8",
          selectionBackground: "#1e40af44",
          black: "#000",
          red: "#f87171",
          green: "#4ade80",
          yellow: "#facc15",
          blue: "#60a5fa",
          magenta: "#c084fc",
          cyan: "#38bdf8",
          white: "#e2e8f0",
        },
        allowTransparency: false,
        scrollback: 5000,
        convertEol: true,
      });

      const fitAddon = new FitAddon();
      const webLinks = new WebLinksAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(webLinks);
      term.open(containerRef.current!);
      fitAddon.fit();

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;
      isReadyRef.current = true;

      // Welcome banner
      term.write(
        colorize("UnifyOne CLI", "cyan") +
          colorize(` — mode: ${mode}`, "gray") +
          "\r\n" +
          colorize("─".repeat(50), "gray") +
          "\r\n"
      );

      if (mode === "platform") {
        term.write(
          colorize("Platform mode ready. Commands execute against the UnifyOne API.", "green") +
            "\r\n"
        );
        writePrompt(term);
      }

      // Key handler (platform mode)
      if (mode === "platform") {
        term.onKey(({ key, domEvent }) => {
          const term_ = xtermRef.current!;
          const input = inputBufferRef.current;

          // Enter
          if (domEvent.key === "Enter") {
            if (input.trim()) {
              void runPlatformCommand(input.trim(), term_);
            } else {
              term_.write("\r\n");
              writePrompt(term_);
            }
            inputBufferRef.current = "";
            return;
          }

          // Backspace
          if (domEvent.key === "Backspace") {
            if (input.length > 0) {
              inputBufferRef.current = input.slice(0, -1);
              term_.write("\b \b");
            }
            return;
          }

          // Tab — autocomplete
          if (domEvent.key === "Tab") {
            domEvent.preventDefault();
            inputBufferRef.current = autocomplete(input, term_);
            return;
          }

          // Arrow Up/Down — history navigation
          if (domEvent.key === "ArrowUp") {
            const prev = navigate("up");
            if (prev !== null) {
              term_.write(ANSI.clearLine);
              writePrompt(term_);
              term_.write(prev);
              inputBufferRef.current = prev;
            }
            return;
          }
          if (domEvent.key === "ArrowDown") {
            const next = navigate("down");
            if (next !== null) {
              term_.write(ANSI.clearLine);
              writePrompt(term_);
              term_.write(next);
              inputBufferRef.current = next;
            }
            return;
          }

          // Ctrl+C — cancel current input
          if (domEvent.ctrlKey && domEvent.key === "c") {
            term_.write("^C\r\n");
            inputBufferRef.current = "";
            writePrompt(term_);
            return;
          }

          // Ctrl+L — clear screen
          if (domEvent.ctrlKey && domEvent.key === "l") {
            term_.clear();
            inputBufferRef.current = "";
            writePrompt(term_);
            return;
          }

          // Printable characters
          if (key && !domEvent.ctrlKey && !domEvent.altKey && !domEvent.metaKey) {
            inputBufferRef.current += key;
            term_.write(key);
          }
        });
      } else {
        // VPS / Local mode — forward all key input to the WebSocket
        term.onKey(({ key }) => {
          send(key);
        });
        term.onData(data => {
          send(data);
        });
      }

      // Resize observer
      const observer = new ResizeObserver(() => {
        try {
          fitAddonRef.current?.fit();
          const dims = fitAddonRef.current?.proposeDimensions();
          if (dims) resize(dims.cols, dims.rows);
        } catch {
          // Ignore resize errors
        }
      });
      if (containerRef.current) observer.observe(containerRef.current);

      return () => observer.disconnect();
    };

    void initTerminal();

    return () => {
      disposed = true;
      disconnect();
      xtermRef.current?.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      isReadyRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[300px] rounded-b-md overflow-hidden"
      style={{ background: "#0a0a0a" }}
      aria-label="Terminal emulator"
      role="application"
    />
  );
}
