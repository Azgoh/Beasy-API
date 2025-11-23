import moment from "moment";

/**
 * Normalize various incoming date formats into a strict YYYY-MM-DD string
 * suitable for Sequelize DATE / DATEONLY fields.
 * Throws on invalid input.
 */
export function sanitizeDateToIso(input) {
  if (!input) return null;
  // Date instance -> ISO date
  if (input instanceof Date) return moment(input).format("YYYY-MM-DD");
  // If already an ISO string
  if (typeof input === "string") {
    if (moment(input, moment.ISO_8601, true).isValid()) return moment(input).format("YYYY-MM-DD");
    const formats = ["D MMMM YYYY", "DD MMMM YYYY", "D MMM YYYY", "YYYY-MM-DD"];
    for (const fmt of formats) {
      const m = moment(input, fmt, true);
      if (m.isValid()) return m.format("YYYY-MM-DD");
    }
    const fallback = moment(input);
    if (fallback.isValid()) return fallback.format("YYYY-MM-DD");
  }
  throw new Error(`Invalid date format: ${input}`);
}