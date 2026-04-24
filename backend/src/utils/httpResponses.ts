import type { Response } from "express";

export function sendDatabaseUnavailable(res: Response): void {
  res.status(503).json({
    success: false,
    error: {
      code: "DATABASE_UNAVAILABLE",
      message: "Set DATABASE_URL in backend/.env and restart the API.",
    },
  });
}

export function sendUnknownProject(res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Unknown project id." },
  });
}
