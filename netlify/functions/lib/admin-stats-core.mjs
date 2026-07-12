/** @param {string | undefined} raw */
export function parseAdminEmails(raw) {
  return (raw || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
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
  /** @type {Array<{ created_at: string }>} */
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
export async function fetchInventoryStats(supabaseUrl, serviceKey) {
  const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/admin_inventory_stats`, {
    method: "POST",
    headers: serviceHeaders(serviceKey),
    body: "{}",
    signal: AbortSignal.timeout(8000),
  });

  if (rpcRes.ok) {
    const data = await rpcRes.json();
    return {
      totalItems: Number(data.total_items ?? 0),
      usersWithInventory: Number(data.users_with_inventory ?? 0),
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
    totalItems: Number.isFinite(totalItems) ? totalItems : 0,
    usersWithInventory: null,
  };
}

/** @param {Array<{ created_at: string }>} users */
export function computeUserStats(users) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * dayMs;
  const thirtyDaysAgo = now - 30 * dayMs;

  let signupsLast7Days = 0;
  let signupsLast30Days = 0;
  /** @type {Map<string, number>} */
  const byDate = new Map();

  for (const user of users) {
    const created = new Date(user.created_at).getTime();
    if (created >= sevenDaysAgo) signupsLast7Days += 1;
    if (created >= thirtyDaysAgo) signupsLast30Days += 1;

    const dateKey = user.created_at.slice(0, 10);
    byDate.set(dateKey, (byDate.get(dateKey) || 0) + 1);
  }

  const recentSignups = [...byDate.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 14)
    .map(([date, count]) => ({ date, count }));

  return {
    totalUsers: users.length,
    signupsLast7Days,
    signupsLast30Days,
    recentSignups,
  };
}

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

  const email = user.email.toLowerCase();
  if (!opts.adminEmails.includes(email)) {
    return { status: 403, body: { error: "Admin access required." } };
  }

  const [users, inventory] = await Promise.all([
    listAllUsers(opts.supabaseUrl, opts.serviceKey),
    fetchInventoryStats(opts.supabaseUrl, opts.serviceKey),
  ]);

  return {
    status: 200,
    body: {
      ok: true,
      generatedAt: new Date().toISOString(),
      adminEmail: email,
      ...computeUserStats(users),
      totalInventoryItems: inventory.totalItems,
      usersWithInventory: inventory.usersWithInventory,
    },
  };
}
