/**
 * In-browser reference implementation of the ShareShelf FastAPI contract.
 *
 * It exists so the UI is fully explorable inside Lovable's preview, where the
 * Python backend (see /backend) cannot run. Every route below mirrors the real
 * FastAPI route in path, payload shape, validation and permission checks.
 * Set VITE_API_BASE_URL to point the app at the real FastAPI server instead.
 */
import { ApiError } from "./errors";
import { calculateDistanceKm, DEFAULT_CENTER } from "../utils/geo";
import type {
  AdminStats,
  ChatMessage,
  Conversation,
  DashboardStats,
  Item,
  ItemQuery,
  OwnerPublic,
  Paginated,
  Report,
  Transaction,
  User,
} from "../types";

interface DbUser extends User {
  password_hash: string;
}
interface DbTransaction extends Omit<Transaction, "item" | "pickup_pin"> {
  pickup_pin_hash: string | null;
  pin_plain: string | null; // revealed to the borrower only, cleared after verification
}

interface Db {
  users: DbUser[];
  items: Item[];
  transactions: DbTransaction[];
  messages: ChatMessage[];
  reports: Report[];
  seq: Record<string, number>;
}

const KEY = "shareshelf.demo.db.v1";

const hash = (value: string) => `demo$${btoa(unescape(encodeURIComponent(value)))}`;
const verify = (value: string, hashed: string | null) => !!hashed && hash(value) === hashed;
const now = () => new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

function seed(): Db {
  const users: DbUser[] = [
    ["aisha", "aisha@example.com", "Clifton, Karachi", 24.8138, 67.0301, "user"],
    ["bilal", "bilal@example.com", "Gulshan-e-Iqbal, Karachi", 24.9204, 67.0971, "user"],
    ["hina", "hina@example.com", "DHA Phase 5, Karachi", 24.8, 67.05, "user"],
    ["omar", "omar@example.com", "North Nazimabad, Karachi", 24.94, 67.04, "user"],
    ["admin", "admin@shareshelf.app", "Saddar, Karachi", 24.8607, 67.0011, "admin"],
  ].map((u, i) => ({
    id: i + 1,
    username: u[0] as string,
    email: u[1] as string,
    password_hash: hash(u[0] === "admin" ? "admin12345" : "password123"),
    role: u[5] as "user" | "admin",
    is_banned: false,
    area_name: u[2] as string,
    latitude: u[3] as number,
    longitude: u[4] as number,
    total_transactions: [4, 2, 7, 1, 0][i],
    created_at: daysAgo(200 - i * 20),
    updated_at: now(),
  }));

  const rawItems: Array<Partial<Item> & { title: string }> = [
    {
      title: "Cordless Drill Kit (18V)",
      description:
        "Full 18V cordless drill set with two batteries, charger and a 40-piece bit case. Great for shelf mounting and small repairs. Borrow it for a weekend instead of buying one.",
      category: "Tools",
      item_condition: "Good",
      listing_type: "RENT",
      price: 450,
      max_rental_days: 7,
      owner_id: 1,
      area_name: "Clifton, Karachi",
      latitude: 24.8138,
      longitude: 67.0301,
    },
    {
      title: "IELTS & GRE Prep Book Bundle",
      description:
        "Six preparation books including official guides and practice tests. Lightly annotated in pencil. Donating to any student who needs them — first come, first served.",
      category: "Books",
      item_condition: "Good",
      listing_type: "DONATE",
      price: 0,
      owner_id: 3,
      area_name: "DHA Phase 5, Karachi",
      latitude: 24.8,
      longitude: 67.05,
    },
    {
      title: "Canon EOS 200D DSLR + 18-55mm",
      description:
        "Compact DSLR in excellent condition, shutter count under 9k. Comes with the kit lens, strap, battery and 32GB card. Perfect for a weekend shoot or a student project.",
      category: "Electronics",
      item_condition: "Like New",
      listing_type: "RENT",
      price: 1200,
      max_rental_days: 5,
      owner_id: 2,
      area_name: "Gulshan-e-Iqbal, Karachi",
      latitude: 24.9204,
      longitude: 67.0971,
    },
    {
      title: "Study Desk with Bookshelf",
      description:
        "Solid wood study desk with a three-tier shelf. Some scratches on the surface but completely sturdy. Selling because I am moving apartments this month.",
      category: "Home",
      item_condition: "Fair",
      listing_type: "SELL",
      price: 6500,
      owner_id: 4,
      area_name: "North Nazimabad, Karachi",
      latitude: 24.94,
      longitude: 67.04,
    },
    {
      title: "Winter Jacket (Unisex, Large)",
      description:
        "Warm padded jacket, worn one season only. Water resistant shell with a detachable hood. Free to a good home — better on someone's shoulders than in my closet.",
      category: "Fashion",
      item_condition: "Like New",
      listing_type: "DONATE",
      price: 0,
      owner_id: 1,
      area_name: "Clifton, Karachi",
      latitude: 24.816,
      longitude: 67.028,
    },
    {
      title: "Portable Projector 1080p",
      description:
        "Bright little projector with HDMI and USB-C input, ideal for movie nights or a class presentation. Includes a carry case and remote.",
      category: "Electronics",
      item_condition: "Good",
      listing_type: "RENT",
      price: 900,
      max_rental_days: 3,
      owner_id: 3,
      area_name: "DHA Phase 5, Karachi",
      latitude: 24.803,
      longitude: 67.058,
    },
    {
      title: "Camping Tent (4 Person)",
      description:
        "Weatherproof four person dome tent with a footprint and repair kit. Used on three trips, cleaned and dried after each one.",
      category: "Other",
      item_condition: "Good",
      listing_type: "RENT",
      price: 700,
      max_rental_days: 10,
      owner_id: 2,
      area_name: "Gulshan-e-Iqbal, Karachi",
      latitude: 24.918,
      longitude: 67.09,
    },
    {
      title: "Mechanical Keyboard (Brown Switches)",
      description:
        "Tenkeyless mechanical keyboard, brown tactile switches, PBT keycaps. Barely used since I switched to a laptop-only setup.",
      category: "Electronics",
      item_condition: "Brand New",
      listing_type: "SELL",
      price: 8200,
      owner_id: 4,
      area_name: "North Nazimabad, Karachi",
      latitude: 24.943,
      longitude: 67.038,
    },
    {
      title: "Sewing Machine (Manual)",
      description:
        "Reliable manual sewing machine, serviced last month. Happy to lend it to neighbours who need quick alterations.",
      category: "Home",
      item_condition: "Good",
      listing_type: "RENT",
      price: 350,
      max_rental_days: 14,
      owner_id: 3,
      area_name: "DHA Phase 5, Karachi",
      latitude: 24.797,
      longitude: 67.047,
    },
    {
      title: "Children's Story Book Set",
      description:
        "Twenty illustrated story books for ages 4-9. My kids have outgrown them and they deserve a new reader.",
      category: "Books",
      item_condition: "Good",
      listing_type: "DONATE",
      price: 0,
      owner_id: 1,
      area_name: "Clifton, Karachi",
      latitude: 24.812,
      longitude: 67.033,
    },
  ];

  const items: Item[] = rawItems.map((raw, i) => ({
    id: i + 1,
    owner_id: raw.owner_id!,
    title: raw.title,
    description: raw.description!,
    category: raw.category!,
    item_condition: raw.item_condition!,
    listing_type: raw.listing_type!,
    price: raw.price ?? 0,
    max_rental_days: raw.max_rental_days ?? null,
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    area_name: raw.area_name!,
    image_path: null,
    status: "Available",
    created_at: daysAgo(i * 2 + 1),
    updated_at: daysAgo(i * 2 + 1),
  }));

  const messages: ChatMessage[] = [
    {
      id: 1,
      item_id: 1,
      sender_id: 2,
      receiver_id: 1,
      message: "Salam! Is the drill free this weekend?",
      is_read: true,
      timestamp: daysAgo(1),
    },
    {
      id: 2,
      item_id: 1,
      sender_id: 1,
      receiver_id: 2,
      message: "Yes it is. Saturday afternoon works for pickup.",
      is_read: false,
      timestamp: daysAgo(0.9),
    },
  ];

  return {
    users,
    items,
    transactions: [],
    messages,
    reports: [],
    seq: {
      items: items.length,
      users: users.length,
      transactions: 0,
      messages: messages.length,
      reports: 0,
    },
  };
}

let cache: Db | null = null;

function db(): Db {
  if (cache) return cache;
  if (typeof window === "undefined") {
    cache = seed();
    return cache;
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Db) : seed();
  } catch {
    cache = seed();
  }
  return cache!;
}

function save() {
  if (typeof window === "undefined" || !cache) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage full or unavailable — demo data stays in memory */
  }
}

export function resetDemoData() {
  cache = seed();
  save();
}

const nextId = (table: keyof Db["seq"]) => {
  const d = db();
  d.seq[table] = (d.seq[table] ?? 0) + 1;
  return d.seq[table];
};

const publicUser = (u: DbUser): User => {
  const { password_hash: _ph, ...rest } = u;
  return rest;
};

function ownerPublic(id: number): OwnerPublic | undefined {
  const d = db();
  const u = d.users.find((x) => x.id === id);
  if (!u) return undefined;
  return {
    id: u.id,
    username: u.username,
    area_name: u.area_name,
    created_at: u.created_at,
    total_transactions: u.total_transactions,
    active_listings: d.items.filter((i) => i.owner_id === u.id && i.status === "Available").length,
  };
}

const withOwner = (item: Item): Item => ({ ...item, owner: ownerPublic(item.owner_id) });

function requireUser(token: string | null): DbUser {
  const d = db();
  const id = token?.startsWith("demo.") ? Number(token.slice(5)) : NaN;
  const user = d.users.find((u) => u.id === id);
  if (!user) throw new ApiError(401, "Your session has expired. Please sign in again.");
  if (user.is_banned)
    throw new ApiError(403, "This account has been suspended by an administrator.");
  return user;
}

function requireAdmin(token: string | null): DbUser {
  const user = requireUser(token);
  if (user.role !== "admin")
    throw new ApiError(403, "You do not have permission to perform this action.");
  return user;
}

function findItem(id: number): Item {
  const item = db().items.find((i) => i.id === id);
  if (!item) throw new ApiError(404, "This listing no longer exists.");
  return item;
}

function conversationId(itemId: number, partnerId: number) {
  return `${itemId}-${partnerId}`;
}

function listItems(query: ItemQuery): Paginated<Item> {
  const d = db();
  const page = query.page ?? 1;
  const pageSize = query.page_size ?? 12;
  let rows = d.items.slice();

  if (query.owner_id) rows = rows.filter((i) => i.owner_id === query.owner_id);
  if (!query.include_unavailable) rows = rows.filter((i) => i.status === "Available");
  if (query.q) {
    const q = query.q.toLowerCase();
    rows = rows.filter(
      (i) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q),
    );
  }
  if (query.listing_type) rows = rows.filter((i) => i.listing_type === query.listing_type);
  if (query.category) rows = rows.filter((i) => i.category === query.category);
  if (query.item_condition) rows = rows.filter((i) => i.item_condition === query.item_condition);
  if (query.area) {
    const a = query.area.toLowerCase();
    rows = rows.filter((i) => i.area_name.toLowerCase().includes(a));
  }
  if (typeof query.min_price === "number") rows = rows.filter((i) => i.price >= query.min_price!);
  if (typeof query.max_price === "number") rows = rows.filter((i) => i.price <= query.max_price!);

  const lat = query.lat ?? DEFAULT_CENTER.lat;
  const lng = query.lng ?? DEFAULT_CENTER.lng;
  let withDistance = rows.map((i) => ({
    ...withOwner(i),
    distance_km:
      i.latitude !== null && i.longitude !== null
        ? Number(calculateDistanceKm(lat, lng, i.latitude, i.longitude).toFixed(2))
        : null,
  }));

  if (query.radius_km) {
    withDistance = withDistance.filter(
      (i) => i.distance_km !== null && i.distance_km <= query.radius_km!,
    );
  }

  switch (query.sort) {
    case "nearest":
      withDistance.sort((a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9));
      break;
    case "price_asc":
      withDistance.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      withDistance.sort((a, b) => b.price - a.price);
      break;
    default:
      withDistance.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }

  const total = withDistance.length;
  const start = (page - 1) * pageSize;
  return { results: withDistance.slice(start, start + pageSize), total, page, page_size: pageSize };
}

function hydrateTransaction(t: DbTransaction, viewerId: number): Transaction {
  const d = db();
  const item = d.items.find((i) => i.id === t.item_id);
  const { pickup_pin_hash: _h, pin_plain, ...rest } = t;
  return {
    ...rest,
    item: item ? withOwner(item) : undefined,
    owner_username: d.users.find((u) => u.id === t.owner_id)?.username,
    borrower_username: d.users.find((u) => u.id === t.borrower_id)?.username,
    // The PIN is only ever visible to the approved borrower, and only until used.
    pickup_pin: viewerId === t.borrower_id && !t.pin_verified && pin_plain ? pin_plain : undefined,
  };
}

function validateItemPayload(body: Record<string, unknown>) {
  const required = [
    "title",
    "description",
    "category",
    "item_condition",
    "listing_type",
    "area_name",
  ];
  for (const field of required) {
    if (!body[field] || String(body[field]).trim() === "") {
      throw new ApiError(422, `The field "${field.replace("_", " ")}" is required.`);
    }
  }
  const type = body.listing_type as string;
  const price = Number(body.price ?? 0);
  if (type === "DONATE" && price !== 0)
    throw new ApiError(422, "Donated items must have a price of zero.");
  if (type === "SELL" && !(price > 0))
    throw new ApiError(422, "Selling requires a price greater than zero.");
  if (type === "RENT") {
    if (!(price > 0)) throw new ApiError(422, "Renting requires a daily rental price.");
    if (!Number(body.max_rental_days))
      throw new ApiError(422, "Renting requires a maximum rental period.");
  }
}

const delay = () => new Promise((r) => setTimeout(r, 160 + Math.random() * 180));

/** Routes the request the same way FastAPI would. */
export async function demoRequest<T>(
  method: string,
  path: string,
  body: Record<string, unknown> | undefined,
  token: string | null,
): Promise<T> {
  await delay();
  const d = db();
  const [rawPath, rawQuery] = path.split("?");
  const search = new URLSearchParams(rawQuery ?? "");
  const segments = rawPath.replace(/^\/+|\/+$/g, "").split("/");
  const key = `${method} /${segments.join("/")}`;
  const num = (v: string | null) => (v === null || v === "" ? undefined : Number(v));
  const result = (value: unknown) => {
    save();
    return value as T;
  };

  /* ---------------- auth ---------------- */
  if (key === "POST /auth/register") {
    const username = String(body?.username ?? "").trim();
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body?.password ?? "");
    if (username.length < 3) throw new ApiError(422, "Username must be at least 3 characters.");
    if (!/^\S+@\S+\.\S+$/.test(email))
      throw new ApiError(422, "Please enter a valid email address.");
    if (password.length < 8) throw new ApiError(422, "Password must be at least 8 characters.");
    if (d.users.some((u) => u.username.toLowerCase() === username.toLowerCase()))
      throw new ApiError(409, "That username is already taken.");
    if (d.users.some((u) => u.email === email))
      throw new ApiError(409, "An account with that email already exists.");
    const user: DbUser = {
      id: nextId("users"),
      username,
      email,
      password_hash: hash(password),
      role: "user",
      is_banned: false,
      latitude: (body?.latitude as number) ?? DEFAULT_CENTER.lat,
      longitude: (body?.longitude as number) ?? DEFAULT_CENTER.lng,
      area_name: (body?.area_name as string) ?? null,
      total_transactions: 0,
      created_at: now(),
      updated_at: now(),
    };
    d.users.push(user);
    return result({
      access_token: `demo.${user.id}`,
      token_type: "bearer",
      user: publicUser(user),
    });
  }

  if (key === "POST /auth/login") {
    const identifier = String(body?.username ?? "")
      .trim()
      .toLowerCase();
    const user = d.users.find(
      (u) => u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier,
    );
    if (!user || !verify(String(body?.password ?? ""), user.password_hash))
      throw new ApiError(401, "Incorrect username or password.");
    if (user.is_banned)
      throw new ApiError(403, "This account has been suspended by an administrator.");
    return result({
      access_token: `demo.${user.id}`,
      token_type: "bearer",
      user: publicUser(user),
    });
  }

  if (key === "POST /auth/logout") return result({ detail: "Signed out." });

  if (key === "GET /users/me") return result(publicUser(requireUser(token)));

  if (key === "PUT /users/me") {
    const user = requireUser(token);
    if (body?.username) {
      const name = String(body.username).trim();
      if (d.users.some((u) => u.id !== user.id && u.username.toLowerCase() === name.toLowerCase()))
        throw new ApiError(409, "That username is already taken.");
      user.username = name;
    }
    if (body?.area_name !== undefined) user.area_name = String(body.area_name);
    if (body?.latitude !== undefined) user.latitude = Number(body.latitude);
    if (body?.longitude !== undefined) user.longitude = Number(body.longitude);
    user.updated_at = now();
    return result(publicUser(user));
  }

  if (
    segments[0] === "users" &&
    segments.length === 2 &&
    segments[1] !== "me" &&
    method === "GET"
  ) {
    const owner = ownerPublic(Number(segments[1]));
    if (!owner) throw new ApiError(404, "That member does not exist.");
    return result(owner);
  }

  if (key === "GET /users/me/stats") {
    const user = requireUser(token);
    const mine = d.items.filter((i) => i.owner_id === user.id);
    const asBorrower = d.transactions.filter((t) => t.borrower_id === user.id);
    const asOwner = d.transactions.filter((t) => t.owner_id === user.id);
    const stats: DashboardStats = {
      active_listings: mine.filter((i) => i.status === "Available").length,
      pending_requests: asOwner.filter((t) => t.status === "Pending").length,
      active_transactions: [...asBorrower, ...asOwner].filter((t) => t.status === "Active").length,
      completed_transactions: [...asBorrower, ...asOwner].filter(
        (t) => t.status === "Completed" || t.status === "Returned",
      ).length,
      unread_messages: d.messages.filter((m) => m.receiver_id === user.id && !m.is_read).length,
    };
    return result({ ...stats, total_listings: mine.length });
  }

  /* ---------------- items ---------------- */
  if (key === "GET /items") {
    return result(
      listItems({
        q: search.get("q") ?? undefined,
        listing_type: (search.get("listing_type") as ItemQuery["listing_type"]) ?? undefined,
        category: (search.get("category") as ItemQuery["category"]) ?? undefined,
        item_condition: (search.get("item_condition") as ItemQuery["item_condition"]) ?? undefined,
        area: search.get("area") ?? undefined,
        min_price: num(search.get("min_price")),
        max_price: num(search.get("max_price")),
        lat: num(search.get("lat")),
        lng: num(search.get("lng")),
        radius_km: num(search.get("radius_km")),
        sort: (search.get("sort") as ItemQuery["sort"]) ?? "newest",
        page: num(search.get("page")) ?? 1,
        page_size: num(search.get("page_size")) ?? 12,
        owner_id: num(search.get("owner_id")),
        include_unavailable: search.get("include_unavailable") === "true",
      }),
    );
  }

  if (key === "POST /items") {
    const user = requireUser(token);
    validateItemPayload(body ?? {});
    const type = body!.listing_type as Item["listing_type"];
    const item: Item = {
      id: nextId("items"),
      owner_id: user.id,
      title: String(body!.title).trim(),
      description: String(body!.description).trim(),
      category: body!.category as Item["category"],
      item_condition: body!.item_condition as Item["item_condition"],
      listing_type: type,
      price: type === "DONATE" ? 0 : Number(body!.price ?? 0),
      max_rental_days: type === "RENT" ? Number(body!.max_rental_days) : null,
      latitude: body!.latitude !== undefined ? Number(body!.latitude) : user.latitude,
      longitude: body!.longitude !== undefined ? Number(body!.longitude) : user.longitude,
      area_name: String(body!.area_name).trim(),
      image_path: (body!.image_path as string) ?? null,
      status: "Available",
      created_at: now(),
      updated_at: now(),
    };
    d.items.push(item);
    return result(withOwner(item));
  }

  if (segments[0] === "items" && segments.length === 2) {
    const item = findItem(Number(segments[1]));
    if (method === "GET") return result(withOwner(item));
    const user = requireUser(token);
    if (item.owner_id !== user.id && user.role !== "admin")
      throw new ApiError(403, "You can only manage your own listings.");
    if (method === "PUT") {
      validateItemPayload({ ...item, ...body });
      const type = (body?.listing_type as Item["listing_type"]) ?? item.listing_type;
      Object.assign(item, body, {
        listing_type: type,
        price: type === "DONATE" ? 0 : Number(body?.price ?? item.price),
        max_rental_days:
          type === "RENT" ? Number(body?.max_rental_days ?? item.max_rental_days) : null,
        updated_at: now(),
      });
      return result(withOwner(item));
    }
    if (method === "DELETE") {
      const active = d.transactions.some(
        (t) => t.item_id === item.id && ["Pending", "Active"].includes(t.status),
      );
      if (active)
        throw new ApiError(
          409,
          "This listing has an active request or transaction and cannot be deleted.",
        );
      d.items = d.items.filter((i) => i.id !== item.id);
      return result({ detail: "Listing deleted." });
    }
  }

  if (segments[0] === "items" && segments[2] === "image" && method === "POST") {
    const user = requireUser(token);
    const item = findItem(Number(segments[1]));
    if (item.owner_id !== user.id)
      throw new ApiError(403, "You can only manage your own listings.");
    item.image_path = String(body?.image_path ?? "");
    item.updated_at = now();
    return result(withOwner(item));
  }

  /* ---------------- transactions ---------------- */
  if (key === "POST /transactions/request") {
    const user = requireUser(token);
    const item = findItem(Number(body?.item_id));
    if (item.owner_id === user.id) throw new ApiError(400, "You cannot request your own item.");
    if (item.status !== "Available") throw new ApiError(409, "This item is no longer available.");
    if (
      d.transactions.some(
        (t) => t.item_id === item.id && t.borrower_id === user.id && t.status === "Pending",
      )
    )
      throw new ApiError(409, "You already have a pending request for this item.");
    const t: DbTransaction = {
      id: nextId("transactions"),
      item_id: item.id,
      borrower_id: user.id,
      owner_id: item.owner_id,
      pickup_pin_hash: null,
      pin_plain: null,
      pin_verified: false,
      status: "Pending",
      start_date: null,
      due_date: null,
      return_date: null,
      created_at: now(),
      updated_at: now(),
    };
    d.transactions.push(t);
    return result(hydrateTransaction(t, user.id));
  }

  if (key === "GET /transactions/my" || key === "GET /transactions/incoming") {
    const user = requireUser(token);
    const mine = d.transactions.filter((t) =>
      key.endsWith("my") ? t.borrower_id === user.id : t.owner_id === user.id,
    );
    return result(
      mine
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        .map((t) => hydrateTransaction(t, user.id)),
    );
  }

  if (key === "GET /transactions/all") {
    const user = requireUser(token);
    return result(
      d.transactions
        .filter((t) => t.owner_id === user.id || t.borrower_id === user.id)
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        .map((t) => hydrateTransaction(t, user.id)),
    );
  }

  if (segments[0] === "transactions" && segments.length === 3) {
    const user = requireUser(token);
    const t = d.transactions.find((x) => x.id === Number(segments[1]));
    if (!t) throw new ApiError(404, "That request could not be found.");
    const item = findItem(t.item_id);
    const action = segments[2];
    const isOwner = t.owner_id === user.id;
    const isBorrower = t.borrower_id === user.id;

    if (action === "approve") {
      if (!isOwner) throw new ApiError(403, "Only the owner can approve this request.");
      if (t.status !== "Pending") throw new ApiError(409, "This request has already been handled.");
      if (item.status !== "Available") throw new ApiError(409, "This item is no longer available.");
      const pin = String(Math.floor(1000 + Math.random() * 9000));
      t.pin_plain = pin;
      t.pickup_pin_hash = hash(pin);
      t.updated_at = now();
      item.status = "Reserved";
      item.updated_at = now();
      // Any other pending request for this item is closed out.
      d.transactions
        .filter((x) => x.item_id === item.id && x.id !== t.id && x.status === "Pending")
        .forEach((x) => {
          x.status = "Rejected";
          x.updated_at = now();
        });
      return result(hydrateTransaction(t, user.id));
    }

    if (action === "reject") {
      if (!isOwner) throw new ApiError(403, "Only the owner can reject this request.");
      if (t.status !== "Pending") throw new ApiError(409, "This request has already been handled.");
      t.status = "Rejected";
      t.updated_at = now();
      return result(hydrateTransaction(t, user.id));
    }

    if (action === "verify-pin") {
      if (!isOwner) throw new ApiError(403, "Only the owner verifies the handover PIN.");
      if (t.pin_verified) throw new ApiError(409, "This PIN has already been used.");
      if (t.status !== "Pending" || !t.pickup_pin_hash)
        throw new ApiError(409, "This request is not ready for handover.");
      if (!verify(String(body?.pin ?? ""), t.pickup_pin_hash))
        throw new ApiError(400, "Incorrect pickup PIN.");
      t.pin_verified = true;
      t.pickup_pin_hash = null;
      t.pin_plain = null;
      t.start_date = now();
      t.updated_at = now();
      if (item.listing_type === "RENT") {
        t.status = "Active";
        t.due_date = new Date(Date.now() + (item.max_rental_days ?? 7) * 86400000).toISOString();
        item.status = "Rented";
      } else {
        t.status = "Completed";
        item.status = item.listing_type === "SELL" ? "Sold" : "Reserved";
        d.users.forEach((u) => {
          if (u.id === t.owner_id || u.id === t.borrower_id) u.total_transactions += 1;
        });
      }
      item.updated_at = now();
      return result(hydrateTransaction(t, user.id));
    }

    if (action === "return") {
      if (!isOwner) throw new ApiError(403, "Only the owner can confirm a return.");
      if (t.status !== "Active") throw new ApiError(409, "This rental is not active.");
      t.status = "Returned";
      t.return_date = now();
      t.updated_at = now();
      item.status = "Available";
      item.updated_at = now();
      d.users.forEach((u) => {
        if (u.id === t.owner_id || u.id === t.borrower_id) u.total_transactions += 1;
      });
      return result(hydrateTransaction(t, user.id));
    }

    if (action === "cancel") {
      if (!isOwner && !isBorrower)
        throw new ApiError(403, "You do not have permission to perform this action.");
      if (!["Pending", "Active"].includes(t.status))
        throw new ApiError(409, "This transaction can no longer be cancelled.");
      t.status = "Cancelled";
      t.updated_at = now();
      if (item.status === "Reserved" || item.status === "Rented") item.status = "Available";
      item.updated_at = now();
      return result(hydrateTransaction(t, user.id));
    }
  }

  /* ---------------- chat ---------------- */
  if (key === "GET /messages/conversations") {
    const user = requireUser(token);
    const map = new Map<string, Conversation>();
    d.messages
      .filter((m) => m.sender_id === user.id || m.receiver_id === user.id)
      .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))
      .forEach((m) => {
        const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        const item = d.items.find((i) => i.id === m.item_id);
        const id = conversationId(m.item_id, partnerId);
        const existing = map.get(id);
        map.set(id, {
          id,
          item_id: m.item_id,
          item_title: item?.title ?? "Removed listing",
          item_image: item?.image_path ?? null,
          partner_id: partnerId,
          partner_username: d.users.find((u) => u.id === partnerId)?.username ?? "user",
          last_message: m.message,
          last_timestamp: m.timestamp,
          unread: (existing?.unread ?? 0) + (m.receiver_id === user.id && !m.is_read ? 1 : 0),
        });
      });
    return result(
      [...map.values()].sort((a, b) => +new Date(b.last_timestamp) - +new Date(a.last_timestamp)),
    );
  }

  if (segments[0] === "messages" && segments.length === 2 && method === "GET") {
    const user = requireUser(token);
    const itemId = Number(segments[1]);
    const partnerId = num(search.get("partner_id"));
    const item = findItem(itemId);
    const rows = d.messages.filter(
      (m) =>
        m.item_id === itemId &&
        ((m.sender_id === user.id && m.receiver_id === (partnerId ?? m.receiver_id)) ||
          (m.receiver_id === user.id && m.sender_id === (partnerId ?? m.sender_id))),
    );
    if (item.owner_id !== user.id && partnerId && partnerId !== item.owner_id && rows.length === 0)
      throw new ApiError(403, "You do not have access to this conversation.");
    return result(rows.sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp)));
  }

  if (key === "POST /messages") {
    const user = requireUser(token);
    const item = findItem(Number(body?.item_id));
    const receiverId = Number(body?.receiver_id ?? item.owner_id);
    if (receiverId === user.id) throw new ApiError(400, "You cannot message yourself.");
    if (item.owner_id !== user.id && receiverId !== item.owner_id)
      throw new ApiError(403, "You do not have access to this conversation.");
    const text = String(body?.message ?? "").trim();
    if (!text) throw new ApiError(422, "Message cannot be empty.");
    if (text.length > 1000) throw new ApiError(422, "Message must be under 1000 characters.");
    const msg: ChatMessage = {
      id: nextId("messages"),
      item_id: item.id,
      sender_id: user.id,
      receiver_id: receiverId,
      message: text,
      is_read: false,
      timestamp: now(),
    };
    d.messages.push(msg);
    return result(msg);
  }

  if (segments[0] === "messages" && segments[2] === "read" && method === "PATCH") {
    const user = requireUser(token);
    const msg = d.messages.find((m) => m.id === Number(segments[1]));
    if (!msg) throw new ApiError(404, "Message not found.");
    if (msg.receiver_id !== user.id)
      throw new ApiError(403, "You do not have permission to perform this action.");
    msg.is_read = true;
    return result(msg);
  }

  /* ---------------- reports ---------------- */
  if (key === "POST /reports") {
    const user = requireUser(token);
    if (!body?.reason) throw new ApiError(422, "Please choose a reason for the report.");
    const report: Report = {
      id: nextId("reports"),
      reported_by: user.id,
      reported_by_username: user.username,
      reported_user_id: body.reported_user_id ? Number(body.reported_user_id) : null,
      reported_item_id: body.reported_item_id ? Number(body.reported_item_id) : null,
      reason: String(body.reason),
      description: body.description ? String(body.description) : null,
      status: "Pending",
      reviewed_by: null,
      reviewed_at: null,
      created_at: now(),
    };
    d.reports.push(report);
    return result(report);
  }

  /* ---------------- admin ---------------- */
  if (key === "GET /admin/stats") {
    requireAdmin(token);
    const stats: AdminStats = {
      total_users: d.users.length,
      total_listings: d.items.length,
      available_listings: d.items.filter((i) => i.status === "Available").length,
      active_transactions: d.transactions.filter((t) => t.status === "Active").length,
      completed_transactions: d.transactions.filter((t) =>
        ["Completed", "Returned"].includes(t.status),
      ).length,
      pending_reports: d.reports.filter((r) => r.status === "Pending").length,
    };
    return result(stats);
  }

  if (key === "GET /admin/users") {
    requireAdmin(token);
    return result(d.users.map(publicUser));
  }

  if (segments[0] === "admin" && segments[1] === "users" && method === "PATCH") {
    const admin = requireAdmin(token);
    const target = d.users.find((u) => u.id === Number(segments[2]));
    if (!target) throw new ApiError(404, "User not found.");
    if (target.id === admin.id) throw new ApiError(400, "You cannot ban your own account.");
    target.is_banned = segments[3] === "ban";
    target.updated_at = now();
    return result(publicUser(target));
  }

  if (key === "GET /admin/items") {
    requireAdmin(token);
    return result(d.items.map(withOwner).sort((a, b) => b.id - a.id));
  }

  if (segments[0] === "admin" && segments[1] === "items" && method === "DELETE") {
    requireAdmin(token);
    const id = Number(segments[2]);
    if (!d.items.some((i) => i.id === id)) throw new ApiError(404, "Listing not found.");
    d.items = d.items.filter((i) => i.id !== id);
    return result({ detail: "Listing removed." });
  }

  if (key === "GET /admin/reports") {
    requireAdmin(token);
    return result(d.reports.slice().sort((a, b) => b.id - a.id));
  }

  if (segments[0] === "admin" && segments[1] === "reports" && method === "PATCH") {
    const admin = requireAdmin(token);
    const report = d.reports.find((r) => r.id === Number(segments[2]));
    if (!report) throw new ApiError(404, "Report not found.");
    report.status = segments[3] === "review" ? "Reviewed" : "Dismissed";
    report.reviewed_by = admin.id;
    report.reviewed_at = now();
    return result(report);
  }

  if (key === "GET /admin/transactions") {
    requireAdmin(token);
    return result(d.transactions.map((t) => hydrateTransaction(t, -1)).sort((a, b) => b.id - a.id));
  }

  throw new ApiError(404, `No route matches ${key}`);
}
