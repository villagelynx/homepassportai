/** @param {string | undefined} raw */
export function parseAdminEmails(raw) {
  return (raw || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * @param {Record<string, unknown> | null | undefined} user
 * @param {string[]} adminEmails
 */
export function isAdminUser(user, adminEmails) {
  const email = String(user?.email || "")
    .trim()
    .toLowerCase();
  if (email && adminEmails.includes(email)) return true;

  const appMeta =
    user?.app_metadata && typeof user.app_metadata === "object"
      ? /** @type {Record<string, unknown>} */ (user.app_metadata)
      : {};
  const userMeta =
    user?.user_metadata && typeof user.user_metadata === "object"
      ? /** @type {Record<string, unknown>} */ (user.user_metadata)
      : {};

  if (appMeta.role === "admin" || userMeta.role === "admin") return true;
  if (appMeta.is_admin === true || userMeta.is_admin === true) return true;
  if (appMeta.admin === true || userMeta.admin === true) return true;
  return false;
}

/** @param {string} serviceKey */
function serviceHeaders(serviceKey) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
}

/**
 * @param {string} supabaseUrl
 * @param {string} anonKey
 * @param {string} accessToken
 */
export async function verifyUserToken(supabaseUrl, anonKey, accessToken) {
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * @param {string} supabaseUrl
 * @param {string} serviceKey
 */
export async function listAllUsers(supabaseUrl, serviceKey) {
  /** @type {Array<Record<string, unknown>>} */
  const users = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const res = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
      {
        headers: serviceHeaders(serviceKey),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to list users (${res.status}): ${text}`);
    }
    const data = await res.json();
    const batch = data.users || [];
    users.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }

  return users;
}

/**
 * @param {string} supabaseUrl
 * @param {string} serviceKey
 */
export async function fetchDatabaseStats(supabaseUrl, serviceKey) {
  const rpcRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/admin_dashboard_database_stats`,
    {
      method: "POST",
      headers: serviceHeaders(serviceKey),
      body: "{}",
      signal: AbortSignal.timeout(8000),
    },
  );

  if (rpcRes.ok) {
    const data = await rpcRes.json();
    const rooms =
      data.rooms_with_items ?? data.distinct_rooms ?? null;
    return {
      appliancesAdded: Number(data.appliances_added ?? 0),
      homesWithInventory: Number(data.homes_with_inventory ?? 0),
      roomsWithItems: rooms == null ? null : Number(rooms),
      storageBytes: Number(data.storage_bytes ?? 0),
      source: "admin_dashboard_database_stats",
    };
  }

  const inventoryRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/admin_inventory_stats`,
    {
      method: "POST",
      headers: serviceHeaders(serviceKey),
      body: "{}",
      signal: AbortSignal.timeout(8000),
    },
  );

  if (inventoryRes.ok) {
    const data = await inventoryRes.json();
    return {
      appliancesAdded: Number(data.total_items ?? 0),
      homesWithInventory: Number(data.users_with_inventory ?? 0),
      roomsWithItems: null,
      storageBytes: null,
      source: "admin_inventory_stats",
    };
  }

  const itemsRes = await fetch(`${supabaseUrl}/rest/v1/appliances?select=id`, {
    method: "HEAD",
    headers: {
      ...serviceHeaders(serviceKey),
      Prefer: "count=exact",
    },
    signal: AbortSignal.timeout(8000),
  });

  const range = itemsRes.headers.get("content-range") || "";
  const totalItems = Number(range.split("/")[1] || 0);

  return {
    appliancesAdded: Number.isFinite(totalItems) ? totalItems : 0,
    homesWithInventory: null,
    roomsWithItems: null,
    storageBytes: null,
    source: "appliances_count",
  };
}

/**
 * @param {string} supabaseUrl
 * @param {string} serviceKey
 */
export async function fetchAnalyticsAggregates(supabaseUrl, serviceKey) {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/admin_analytics_aggregates`, {
    method: "POST",
    headers: serviceHeaders(serviceKey),
    body: "{}",
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    return {
      available: false,
      roomsScanned: null,
      manualsLookups: null,
      documentsSaved: null,
      usersByCountry: [],
      mostUsedFeatures: [],
      devices: { ios: null, android: null, other: null },
    };
  }

  const data = await res.json();
  /** @type {Array<{ country_code?: string, count?: number }>} */
  const byCountry = Array.isArray(data.by_country) ? data.by_country : [];
  /** @type {Array<{ event_name?: string, count?: number }>} */
  const byFeature = Array.isArray(data.by_feature) ? data.by_feature : [];
  /** @type {Array<{ device_type?: string, count?: number }>} */
  const byDevice = Array.isArray(data.by_device) ? data.by_device : [];

  const devices = { ios: 0, android: 0, other: 0 };
  for (const row of byDevice) {
    const key = row.device_type === "ios" || row.device_type === "android" ? row.device_type : "other";
    devices[key] += Number(row.count || 0);
  }

  return {
    available: true,
    roomsScanned: Number(data.rooms_scanned ?? 0),
    manualsLookups: Number(data.manual_lookups ?? 0),
    documentsSaved: Number(data.documents_saved ?? 0),
    usersByCountry: byCountry
      .filter((row) => row.country_code)
      .map((row) => ({
        countryCode: String(row.country_code),
        count: Number(row.count || 0),
      })),
    mostUsedFeatures: byFeature.map((row) => ({
      name: String(row.event_name || ""),
      count: Number(row.count || 0),
    })),
    devices,
  };
}

/** @param {Date} date */
function utcDateKey(date) {
  return date.toISOString().slice(0, 10);
}

/** @param {Array<Record<string, unknown>>} users */
export function computeUserStats(users) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const todayKey = utcDateKey(new Date(now));
  const sevenDaysAgo = now - 7 * dayMs;
  const dayStart = now - dayMs;

  let activeToday = 0;
  let newUsersThisWeek = 0;
  /** @type {Map<string, number>} */
  const byDate = new Map();

  for (const user of users) {
    const createdRaw = String(user.created_at || "");
    const created = new Date(createdRaw).getTime();
    if (Number.isFinite(created) && created >= sevenDaysAgo) {
      newUsersThisWeek += 1;
    }
    if (createdRaw.length >= 10) {
      const dateKey = createdRaw.slice(0, 10);
      byDate.set(dateKey, (byDate.get(dateKey) || 0) + 1);
    }

    const lastSignInRaw = String(user.last_sign_in_at || "");
    const lastSignIn = new Date(lastSignInRaw).getTime();
    if (Number.isFinite(lastSignIn) && lastSignIn >= dayStart) {
      activeToday += 1;
    } else if (lastSignInRaw.slice(0, 10) === todayKey) {
      activeToday += 1;
    }
  }

  /** @type {Array<{ date: string, count: number }>} */
  const dailyGrowth = [];
  for (let i = 13; i >= 0; i -= 1) {
    const date = utcDateKey(new Date(now - i * dayMs));
    dailyGrowth.push({ date, count: byDate.get(date) || 0 });
  }

  return {
    totalUsers: users.length,
    activeToday,
    newUsersThisWeek,
    dailyGrowth,
  };
}

export const METRIC_DEFINITIONS = {
  totalUsers: "All accounts in Supabase Auth.",
  activeToday: "Accounts with last_sign_in_at in the past 24 hours.",
  newUsersThisWeek: "Accounts created in the last 7 days (UTC).",
  homesCreated:
    "Users with ≥1 cloud appliance. There is no separate homes table yet.",
  roomsScanned:
    "room_scanned analytics events after a room-scan save. Starts at 0 until migration + deploy.",
  roomsWithItems:
    "Distinct (user, room) pairs that currently contain cloud appliances.",
  appliancesAdded: "Rows in public.appliances.",
  manualsUploaded:
    "Manual lookup clicks (owner-manual search links). Manual files are not uploaded to the cloud.",
  storageUsed: "Sum of storage.objects metadata size for all buckets.",
  usersByCountry:
    "Country codes captured from CDN geo headers on analytics events (not historical).",
  mostUsedFeatures: "Counts of allowed analytics event names since instrumentation began.",
  devices: "Device class inferred server-side from User-Agent on analytics events.",
  dailyGrowth: "New Auth signups per UTC day for the last 14 days.",
};

/**
 * @param {{
 *   supabaseUrl: string;
 *   anonKey: string;
 *   serviceKey: string;
 *   adminEmails: string[];
 *   accessToken: string;
 * }} opts
 */
export async function buildAdminStats(opts) {
  const user = await verifyUserToken(opts.supabaseUrl, opts.anonKey, opts.accessToken);
  if (!user?.email) {
    return { status: 401, body: { error: "Invalid or expired session." } };
  }

  if (!isAdminUser(user, opts.adminEmails)) {
    return { status: 403, body: { error: "Admin access required." } };
  }

  const [users, database, analytics] = await Promise.all([
    listAllUsers(opts.supabaseUrl, opts.serviceKey),
    fetchDatabaseStats(opts.supabaseUrl, opts.serviceKey),
    fetchAnalyticsAggregates(opts.supabaseUrl, opts.serviceKey),
  ]);

  const userStats = computeUserStats(users);

  return {
    status: 200,
    body: {
      ok: true,
      generatedAt: new Date().toISOString(),
      adminEmail: String(user.email).toLowerCase(),
      analyticsAvailable: analytics.available,
      databaseStatsSource: database.source,
      definitions: METRIC_DEFINITIONS,
      totalUsers: userStats.totalUsers,
      activeToday: userStats.activeToday,
      newUsersThisWeek: userStats.newUsersThisWeek,
      homesCreated: database.homesWithInventory,
      roomsScanned: analytics.roomsScanned,
      roomsWithItems: database.roomsWithItems,
      appliancesAdded: database.appliancesAdded,
      manualsUploaded: analytics.manualsLookups,
      documentsSaved: analytics.documentsSaved,
      storageBytes: database.storageBytes,
      storageUsedBytes: database.storageBytes,
      usersByCountry: analytics.usersByCountry,
      mostUsedFeatures: analytics.mostUsedFeatures,
      devices: analytics.devices,
      dailyGrowth: userStats.dailyGrowth,
      signupsLast7Days: userStats.newUsersThisWeek,
      totalInventoryItems: database.appliancesAdded,
      usersWithInventory: database.homesWithInventory,
      recentSignups: [...userStats.dailyGrowth].reverse(),
    },
  };
}
