import assert from "node:assert/strict";
import {
  computeUserStats,
  isAdminUser,
  parseAdminEmails,
} from "../netlify/functions/lib/admin-stats-core.mjs";
import {
  detectCountryCode,
  detectDeviceType,
} from "../netlify/functions/lib/analytics-core.mjs";

assert.deepEqual(parseAdminEmails(" Ada@Example.com , bob@x.com "), [
  "ada@example.com",
  "bob@x.com",
]);

assert.equal(
  isAdminUser({ email: "ada@example.com" }, ["ada@example.com"]),
  true,
);
assert.equal(
  isAdminUser({ email: "other@example.com", app_metadata: { role: "admin" } }, []),
  true,
);
assert.equal(isAdminUser({ email: "other@example.com" }, []), false);

const now = new Date();
const today = now.toISOString();
const weekAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
const stats = computeUserStats([
  { created_at: today, last_sign_in_at: today },
  { created_at: weekAgo, last_sign_in_at: null },
]);
assert.equal(stats.totalUsers, 2);
assert.equal(stats.activeToday, 1);
assert.equal(stats.newUsersThisWeek, 2);
assert.equal(stats.dailyGrowth.length, 14);

assert.equal(detectDeviceType("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"), "ios");
assert.equal(detectDeviceType("Mozilla/5.0 (Linux; Android 14)"), "android");
assert.equal(detectCountryCode({ "x-nf-country": "us" }), "US");
assert.equal(detectCountryCode({ "cf-ipcountry": "xx" }), null);

console.log("admin stats checks passed");
