import test from "ava";
import { sanitizeDateToIso } from "../src/utils/dateUtils.js";
import moment from "moment";


test("sanitizeDateToIso should handle YYYY-MM-DD format", (t) => {
  const result = sanitizeDateToIso("2025-12-08");
  t.is(result, "2025-12-08");
});

test("sanitizeDateToIso should handle MM/DD/YYYY format (US format)", (t) => {
  // The function interprets 08/12/2025 as MM/DD/YYYY (August 12, 2025)
  const result = sanitizeDateToIso("08/12/2025");
  t.is(result, "2025-08-12");
});

test("sanitizeDateToIso should handle MM-DD-YYYY format (US format)", (t) => {
  // The function interprets 08-12-2025 as MM-DD-YYYY (August 12, 2025)
  const result = sanitizeDateToIso("08-12-2025");
  t.is(result, "2025-08-12");
});

test("sanitizeDateToIso should handle D MMMM YYYY format", (t) => {
  const result = sanitizeDateToIso("8 December 2025");
  t.is(result, "2025-12-08");
});

test("sanitizeDateToIso should handle DD MMMM YYYY format", (t) => {
  const result = sanitizeDateToIso("08 December 2025");
  t.is(result, "2025-12-08");
});

test("sanitizeDateToIso should handle MMMM DD, YYYY format", (t) => {
  const result = sanitizeDateToIso("December 8, 2025");
  t.is(result, "2025-12-08");
});

test("sanitizeDateToIso should throw error for invalid date", (t) => {
  const error = t.throws(() => {
    sanitizeDateToIso("invalid-date");
  });
  t.truthy(error);
  t.true(error.message.includes("Invalid date format"));
});

test("sanitizeDateToIso should return null for null input", (t) => {
  const result = sanitizeDateToIso(null);
  t.is(result, null);
});

test("sanitizeDateToIso should return null for undefined input", (t) => {
  const result = sanitizeDateToIso(undefined);
  t.is(result, null);
});

test("sanitizeDateToIso should return null for empty string", (t) => {
  const result = sanitizeDateToIso("");
  t.is(result, null);
});

test("sanitizeDateToIso should handle Date objects", (t) => {
  const date = new Date("2025-12-08T00:00:00Z");
  const result = sanitizeDateToIso(date);
  t.is(result, "2025-12-08");
});

test("sanitizeDateToIso should handle ISO strings with time", (t) => {
  const result = sanitizeDateToIso("2025-12-08T10:30:00Z");
  t.is(result, "2025-12-08");
});

test("sanitizeDateToIso should convert moment to string first", (t) => {
  // If using moment, convert to ISO string format first
  const momentDate = moment("2025-12-08");
  const result = sanitizeDateToIso(momentDate.format("YYYY-MM-DD"));
  t.is(result, "2025-12-08");
});

test("sanitizeDateToIso should throw for timestamp numbers", (t) => {
  const timestamp = new Date("2025-12-08").getTime();
  const error = t.throws(() => {
    sanitizeDateToIso(timestamp);
  });
  t.truthy(error);
  t.true(error.message.includes("Invalid date format"));
});

test("sanitizeDateToIso should handle various valid date strings", (t) => {
  // Test multiple valid formats
  const formats = [
    { input: "2025-01-15", expected: "2025-01-15" },
    { input: "15 January 2025", expected: "2025-01-15" },
    { input: "January 15, 2025", expected: "2025-01-15" },
  ];

  formats.forEach(({ input, expected }) => {
    const result = sanitizeDateToIso(input);
    t.is(result, expected, `Failed for input: ${input}`);
  });
});

test("Time format validation - valid HH:mm:ss", (t) => {
  t.true(moment("09:00:00", "HH:mm:ss", true).isValid());
  t.true(moment("23:59:59", "HH:mm:ss", true).isValid());
  t.true(moment("00:00:00", "HH:mm:ss", true).isValid());
  t.true(moment("12:30:45", "HH:mm:ss", true).isValid());
});

test("Time format validation - invalid HH:mm:ss", (t) => {
  t.false(moment("25:00:00", "HH:mm:ss", true).isValid());
  t.false(moment("09:60:00", "HH:mm:ss", true).isValid());
  t.false(moment("09:00:60", "HH:mm:ss", true).isValid());
  t.false(moment("invalid", "HH:mm:ss", true).isValid());
  t.false(moment("9:0:0", "HH:mm:ss", true).isValid()); // Missing leading zeros
});

test("Time format validation - valid HH:mm", (t) => {
  t.true(moment("09:00", "HH:mm", true).isValid());
  t.true(moment("23:59", "HH:mm", true).isValid());
  t.true(moment("00:00", "HH:mm", true).isValid());
  t.true(moment("12:30", "HH:mm", true).isValid());
});

test("Time format validation - invalid HH:mm", (t) => {
  t.false(moment("25:00", "HH:mm", true).isValid());
  t.false(moment("09:60", "HH:mm", true).isValid());
  t.false(moment("invalid", "HH:mm", true).isValid());
  t.false(moment("9:0", "HH:mm", true).isValid()); // Missing leading zeros
});

test("Time format validation - flexible parsing (HH:mm:ss or HH:mm)", (t) => {
  // Test the pattern used in services: moment(time, ["HH:mm:ss", "HH:mm"])
  t.true(moment("09:00:00", ["HH:mm:ss", "HH:mm"], true).isValid());
  t.true(moment("09:00", ["HH:mm:ss", "HH:mm"], true).isValid());
  t.false(moment("9:00", ["HH:mm:ss", "HH:mm"], true).isValid());
  t.false(moment("25:00", ["HH:mm:ss", "HH:mm"], true).isValid());
});

test("sanitizeDateToIso should handle leading/trailing whitespace", (t) => {
  const result = sanitizeDateToIso("  2025-12-08  ");
  t.is(result, "2025-12-08");
});

test("sanitizeDateToIso should handle single digit day and month", (t) => {
  const result = sanitizeDateToIso("8 December 2025");
  t.is(result, "2025-12-08");
});

test("sanitizeDateToIso should throw for ambiguous dates", (t) => {
  // Test that clearly invalid formats throw errors
  const error = t.throws(() => {
    sanitizeDateToIso("not-a-date-at-all");
  });
  t.truthy(error);
});