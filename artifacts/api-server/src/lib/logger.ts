import fs from "fs";
import path from "path";

const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFile = path.join(logDir, "server.log");

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

export interface LogEntry {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
}

export let logBuffer: LogEntry[] = [];
const MAX_BUFFER = 500;

// Load existing logs from file on startup
try {
  if (fs.existsSync(logFile)) {
    const content = fs.readFileSync(logFile, "utf8");
    const lines = content.split("\n").filter(line => line.trim());
    const lastLines = lines.slice(-MAX_BUFFER);
    for (const line of lastLines) {
      const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s+\[(INFO|WARN|ERROR)\]\s+(.*)$/);
      if (match) {
        logBuffer.push({
          timestamp: match[1],
          level: match[2] as "INFO" | "WARN" | "ERROR",
          message: match[3],
        });
      } else {
        logBuffer.push({
          timestamp: new Date().toISOString(),
          level: "INFO",
          message: line,
        });
      }
    }
  }
} catch (err) {
  originalError("Erro ao carregar logs existentes:", err);
}

function appendLog(level: "INFO" | "WARN" | "ERROR", args: any[]) {
  const message = args.map(arg => {
    if (arg instanceof Error) {
      return arg.stack || arg.message;
    }
    if (typeof arg === "object") {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(" ");

  const timestamp = new Date().toISOString();
  const entry: LogEntry = { timestamp, level, message };

  logBuffer.push(entry);
  if (logBuffer.length > MAX_BUFFER) {
    logBuffer.shift();
  }

  try {
    fs.appendFileSync(logFile, `${timestamp} [${level}] ${message}\n`, "utf8");
  } catch (err) {
    originalError("Erro ao gravar log no arquivo:", err);
  }
}

export function initLogger() {
  console.log = (...args: any[]) => {
    originalLog(...args);
    appendLog("INFO", args);
  };

  console.error = (...args: any[]) => {
    originalError(...args);
    appendLog("ERROR", args);
  };

  console.warn = (...args: any[]) => {
    originalWarn(...args);
    appendLog("WARN", args);
  };
}

export function clearLogs() {
  logBuffer = [];
  try {
    fs.writeFileSync(logFile, "", "utf8");
  } catch (err) {
    originalError("Erro ao limpar arquivo de logs:", err);
  }
}
