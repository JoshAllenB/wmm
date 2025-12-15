import jwt from "jsonwebtoken";

// Minimal, color-coded token logging utility.
// Does NOT print full tokens. Shows small prefix and jti for traceability.

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  fgGreen: "\x1b[32m",
  fgYellow: "\x1b[33m",
  fgRed: "\x1b[31m",
  fgCyan: "\x1b[36m",
  fgMagenta: "\x1b[35m",
};

const actionColor = {
  ISSUE: COLORS.fgGreen,
  REFRESH: COLORS.fgCyan,
  VERIFY_OK: COLORS.fgYellow,
  VERIFY_EXPIRED: COLORS.fgRed,
  VERIFY_INVALID: COLORS.fgRed,
  REVOKE: COLORS.fgRed,
  RESTORE_SESSION: COLORS.fgMagenta,
};

// Only log high-value actions to reduce noise
// We keep lifecycle and error events, skip routine VERIFY_OK, RESTORE_SESSION, etc.
const LOGGED_ACTIONS = new Set([
  "ISSUE",
  "REFRESH",
  "REVOKE",
  "VERIFY_EXPIRED",
  "VERIFY_INVALID",
]);

const maskToken = (token) => {
  if (!token || typeof token !== "string") return "<no-token>";
  const prefix = token.slice(0, 10);
  return `${prefix}…`;
};

const safeDecode = (token) => {
  try {
    return jwt.decode(token) || {};
  } catch {
    return {};
  }
};

export const formatManila = (date) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (t) => parts.find((p) => p.type === t)?.value || "";
  const yy = get("year");
  const mm = get("month");
  const dd = get("day");
  const HH = get("hour");
  const MM = get("minute");
  const SS = get("second");
  return `${mm}/${dd}/${yy} ${HH}:${MM}:${SS}`;
};

const formatTs = () => formatManila(new Date());

/**
 * Log a token event in a compact, colorized format.
 * @param {Object} params
 * @param {string} params.action - One of ISSUE | REFRESH | VERIFY_OK | VERIFY_EXPIRED | VERIFY_INVALID | REVOKE | RESTORE_SESSION
 * @param {string} [params.userId]
 * @param {string} [params.username]
 * @param {string} [params.token]
 * @param {Object} [params.meta]
 */
export const logTokenEvent = ({
  action,
  userId,
  username,
  token,
  meta = {},
}) => {
  // Short-circuit if this action is not in our whitelist
  if (!LOGGED_ACTIONS.has(action)) {
    return;
  }

  const color = actionColor[action] || COLORS.dim;
  const masked = maskToken(token);
  const { jti, exp } = safeDecode(token);
  const expFormatted = exp ? formatManila(new Date(exp * 1000)) : undefined;

  const base = `${color}[Token]${COLORS.reset} ${action}`;
  const who = ` user=${username || "<unknown>"}(${userId || "-"})`;
  const id = jti ? ` jti=${jti}` : "";
  const tok = token ? ` tok=${masked}` : "";
  const ex = expFormatted ? ` exp=${expFormatted}` : "";
  const reason = meta?.reason ? ` reason=${meta.reason}` : "";

  // Keep to one line, compact and easy to grep
  console.log(`${formatTs()} ${base}${who}${id}${tok}${ex}${reason}`);
};

export default { logTokenEvent };
