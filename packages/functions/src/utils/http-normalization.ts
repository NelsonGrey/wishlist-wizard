import { Request } from "express";

export function normalizeText(value: unknown): string {
  if (Array.isArray(value)) {
    return normalizeText(value[0]);
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "object") {
    return "";
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

export function getBearerTokenFromHeaders(headers: Request["headers"]): string | null {
  const headerValue = getNormalizedHeader(headers, "authorization");
  const authHeader = normalizeText(headerValue);
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  return token || null;
}

export function getNormalizedHeader(
  headers: Request["headers"],
  headerName: string
): string | null {
  const directValue = headers[headerName.toLowerCase()] ?? headers[headerName];
  const normalized = normalizeText(directValue);
  return normalized || null;
}

export function getRequestIdentifier(
  req: Request,
  pathIndex: number,
  queryKey: string,
  bodyKey: string
): string {
  const pathSegments = (req.path || "").split("/");
  const fromPath = normalizeText(pathSegments[pathIndex]);
  if (fromPath) return fromPath;

  const queryRecord = req.query as Record<string, unknown>;
  const fromQuery = normalizeText(queryRecord?.[queryKey]);
  if (fromQuery) return fromQuery;

  const bodyRecord = req.body as Record<string, unknown> | undefined;
  return normalizeText(bodyRecord?.[bodyKey]);
}
