import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

export type ConvertResult = {
  outputPdfAbs: string;
};

function run(command: string, args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        /* ignore */
      }
      reject(new Error("Conversion timed out."));
    }, timeoutMs);
    child.stdout.on("data", (d) => (stdout += String(d)));
    child.stderr.on("data", (d) => (stderr += String(d)));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} failed (${code ?? "unknown"}). ${stderr || stdout}`.trim()));
      }
    });
  });
}

function resolveConverterCommands(): string[] {
  const commands: string[] = [];
  const configured = process.env.LIBREOFFICE_BIN?.trim();
  if (configured) commands.push(configured);

  if (process.platform === "win32") {
    const programFiles = process.env.ProgramFiles || "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    const windowsCandidates = [
      path.join(programFiles, "LibreOffice", "program", "soffice.exe"),
      path.join(programFilesX86, "LibreOffice", "program", "soffice.exe"),
      "soffice.exe",
      "soffice",
      "libreoffice",
    ];
    for (const cmd of windowsCandidates) {
      if (cmd.endsWith(".exe")) {
        if (fs.existsSync(cmd)) commands.push(cmd);
      } else {
        commands.push(cmd);
      }
    }
    return commands;
  }

  commands.push("soffice", "libreoffice");
  return commands;
}

/**
 * Converts DOC/DOCX to PDF using LibreOffice headless.
 * Requires `soffice` (Windows) or `libreoffice` (Linux) on PATH.
 */
export async function convertOfficeToPdf(inputAbs: string): Promise<ConvertResult> {
  if (!fs.existsSync(inputAbs)) {
    throw new Error("Input file not found for conversion.");
  }
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "transactpro-convert-"));
  const outDir = path.join(tmpRoot, "out");
  fs.mkdirSync(outDir, { recursive: true });

  const args = [
    "--headless",
    "--nologo",
    "--nolockcheck",
    "--nodefault",
    "--nofirststartwizard",
    "--convert-to",
    "pdf",
    "--outdir",
    outDir,
    inputAbs,
  ];

  const commands = resolveConverterCommands();
  let lastError: unknown = null;
  for (const command of commands) {
    try {
      await run(command, args, 60_000);
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) {
    throw lastError instanceof Error ? lastError : new Error("Document conversion failed.");
  }

  const produced = fs
    .readdirSync(outDir)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .map((f) => path.join(outDir, f))[0];

  if (!produced || !fs.existsSync(produced)) {
    throw new Error("Conversion produced no PDF.");
  }

  // Move to a stable tmp path so caller can persist it.
  const finalAbs = path.join(tmpRoot, `${randomUUID()}.pdf`);
  fs.renameSync(produced, finalAbs);
  return { outputPdfAbs: finalAbs };
}
