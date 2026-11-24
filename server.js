import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pg from "pg";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 10000);
const COOKIE = "shlomo_session";
const SESSION_TTL = 60 * 60 * 24 * 10;
const USERNAME = process.env.APP_LOGIN_ID || "shlomock";
const PASSWORD_SALT = process.env.APP_PASSWORD_SALT || "";
const PASSWORD_HASH = process.env.APP_PASSWORD_HASH || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "";
const DATABASE_URL = process.env.DATABASE_URL || "";

if (!DATABASE_URL || !PASSWORD_SALT || !PASSWORD_HASH || !SESSION_SECRET) {
  console.error("Required server secrets are missing: DATABASE_URL, APP_PASSWORD_SALT, APP_PASSWORD_HASH, SESSION_SECRET.");
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
  max: 8,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: "1mb" }));

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
function verifyPassword(password) {
  if (!PASSWORD_SALT || !PASSWORD_HASH) return false;
  const calculated = crypto.scryptSync(String(password), Buffer.from(PASSWORD_SALT, "hex"), 64);
  return safeEqual(calculated.toString("hex"), PASSWORD_HASH);
}
function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}
function makeSession() {
  const body = Buffer.from(JSON.stringify({
    sub: USERNAME,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL,
    nonce: crypto.randomBytes(18).toString("base64url")
  })).toString("base64url");
  return body + "." + sign(body);
}
function readCookie(req) {
  const header = req.headers.cookie || "";
  const item = header.split(";").map(s => s.trim()).find(s => s.startsWith(COOKIE + "="));
  return item ? decodeURIComponent(item.slice(COOKIE.length + 1)) : "";
}
function validSession(req) {
  try {
    const [body, signature] = readCookie(req).split(".");
    if (!body || !signature) return false;
    if (!safeEqual(signature, sign(body))) return false;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return payload.sub === USERNAME && payload.exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
}
function setSessionCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true, secure: true, sameSite: "lax",
    path: "/", maxAge: SESSION_TTL * 1000
  });
}
function clearSessionCookie(res) {
  res.clearCookie(COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
}
function requireAuth(req, res, next) {
  if (!validSession(req)) return res.status(401).json({ error: "Your session has expired. Please sign in again." });
  next();
}
function requireSameOrigin(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  const host = req.get("host");
  if (origin) {
    try {
      const u = new URL(origin);
      if (u.host !== host) return res.status(403).json({ error: "Request origin rejected." });
    } catch { return res.status(403).json({ error: "Request origin rejected." }); }
  }
  next();
}
app.use("/api", requireSameOrigin);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: "draft-7", legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Please wait 15 minutes and try again." }
});

app.post("/api/auth/login", loginLimiter, (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  if (!safeEqual(username, USERNAME) || !verifyPassword(password)) {
    return res.status(401).json({ error: "That login ID and password don't match." });
  }
  setSessionCookie(res, makeSession());
  res.set("Cache-Control", "no-store").json({ ok: true });
});
app.get("/api/auth/session", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ authenticated: validSession(req), username: validSession(req) ? USERNAME : null });
});
app.post("/api/auth/logout", (req, res) => {
  clearSessionCookie(res);
  res.set("Cache-Control", "no-store").json({ ok: true });
});

async function initDatabase() {
  const client = await pool.connect();
  try {
    const schema = fs.readFileSync(path.join(__dirname, "db/schema.sql"), "utf8");
    await client.query(schema);
  } finally { client.release(); }
}

app.get("/api/bootstrap", requireAuth, async (_req, res, next) => {
  try {
    const [businesses, categories, tasks] = await Promise.all([
      pool.query("SELECT * FROM businesses ORDER BY position, lower(name)"),
      pool.query("SELECT * FROM categories ORDER BY position, lower(name)"),
      pool.query("SELECT * FROM tasks ORDER BY updated_at DESC")
    ]);
    res.set("Cache-Control", "no-store").json({
      businesses: businesses.rows, categories: categories.rows, tasks: tasks.rows
    });
  } catch (e) { next(e); }
});

app.post("/api/businesses", requireAuth, async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name || name.length > 60) return res.status(400).json({ error: "Business name must be between 1 and 60 characters." });
    const result = await pool.query(
      "INSERT INTO businesses (name, position) VALUES ($1, COALESCE((SELECT max(position)+1 FROM businesses),1)) RETURNING *",
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "A business with that name already exists." });
    next(e);
  }
});
app.patch("/api/businesses/:id", requireAuth, async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    const archived = typeof req.body?.archived === "boolean" ? req.body.archived : null;
    if (req.body?.name !== undefined && (!name || name.length > 60)) return res.status(400).json({ error: "Business name must be between 1 and 60 characters." });
    const result = await pool.query(
      "UPDATE businesses SET name=COALESCE($2,name), archived=COALESCE($3,archived) WHERE id=$1 RETURNING *",
      [req.params.id, req.body?.name === undefined ? null : name, archived]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Business not found." });
    res.json(result.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "A business with that name already exists." });
    next(e);
  }
});
app.delete("/api/businesses/:id", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query("DELETE FROM businesses WHERE id=$1 RETURNING id", [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: "Business not found." });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

app.post("/api/categories", requireAuth, async (req, res, next) => {
  try {
    const businessId = String(req.body?.business_id || "");
    const name = String(req.body?.name || "").trim();
    const icon = String(req.body?.icon || "Tag").slice(0, 40);
    const color = String(req.body?.color || "#668575").slice(0, 30);
    if (!businessId || !name || name.length > 40) return res.status(400).json({ error: "Choose a business and enter a category name (1–40 characters)." });
    const result = await pool.query(
      "INSERT INTO categories (business_id,name,icon,color,position) VALUES ($1,$2,$3,$4,COALESCE((SELECT max(position)+1 FROM categories WHERE business_id=$1),1)) RETURNING *",
      [businessId,name,icon,color]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "That category already exists in this business." });
    if (e.code === "23503") return res.status(400).json({ error: "The selected business does not exist." });
    next(e);
  }
});
app.patch("/api/categories/:id", requireAuth, async (req, res, next) => {
  try {
    const name = req.body?.name === undefined ? null : String(req.body.name).trim();
    if (name !== null && (!name || name.length > 40)) return res.status(400).json({ error: "Category name must be between 1 and 40 characters." });
    const result = await pool.query(
      "UPDATE categories SET name=COALESCE($2,name), icon=COALESCE($3,icon), color=COALESCE($4,color) WHERE id=$1 RETURNING *",
      [req.params.id,name,req.body?.icon ?? null,req.body?.color ?? null]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Category not found." });
    res.json(result.rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "That category already exists in this business." });
    next(e);
  }
});
app.delete("/api/categories/:id", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query("DELETE FROM categories WHERE id=$1 RETURNING id", [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: "Category not found." });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

const taskFields = ["business_id","category_id","title","description","notes","status","priority","created_date","start_date","deadline"];
function normalizeTask(body) {
  const v = {
    business_id: String(body.business_id || ""),
    category_id: body.category_id || null,
    title: String(body.title || "").trim(),
    description: String(body.description || ""),
    notes: String(body.notes || ""),
    status: body.status || "todo",
    priority: body.priority || "normal",
    created_date: body.created_date || new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Dhaka"}),
    start_date: body.start_date || null,
    deadline: body.deadline || null
  };
  if (!v.business_id) throw Object.assign(new Error("Choose a business."),{status:400});
  if (!v.title || v.title.length > 200) throw Object.assign(new Error("Task title must be between 1 and 200 characters."),{status:400});
  if (v.description.length > 5000 || v.notes.length > 5000) throw Object.assign(new Error("Description and notes must be under 5,000 characters."),{status:400});
  if (!["todo","in_progress","done"].includes(v.status)) throw Object.assign(new Error("Invalid task status."),{status:400});
  if (!["low","normal","high","urgent"].includes(v.priority)) throw Object.assign(new Error("Invalid task priority."),{status:400});
  if (v.start_date && v.deadline && v.deadline < v.start_date) throw Object.assign(new Error("Deadline cannot be before the start date."),{status:400});
  return v;
}
app.post("/api/tasks", requireAuth, async (req, res, next) => {
  try {
    const v = normalizeTask(req.body || {});
    const result = await pool.query(
      `INSERT INTO tasks (business_id,category_id,title,description,notes,status,priority,created_date,start_date,deadline,completed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CASE WHEN $6='done' THEN now() ELSE NULL END) RETURNING *`,
      [v.business_id,v.category_id,v.title,v.description,v.notes,v.status,v.priority,v.created_date,v.start_date,v.deadline]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    if (e.code === "23503") return res.status(400).json({ error: "That category does not belong to the selected business." });
    if (e.code === "23514") return res.status(400).json({ error: "Task details failed validation." });
    next(e);
  }
});
app.patch("/api/tasks/:id", requireAuth, async (req, res, next) => {
  try {
    const v = normalizeTask(req.body || {});
    const result = await pool.query(
      `UPDATE tasks SET business_id=$2,category_id=$3,title=$4,description=$5,notes=$6,status=$7,priority=$8,created_date=$9,start_date=$10,deadline=$11,
       completed_at=CASE WHEN $7='done' THEN COALESCE(completed_at,now()) ELSE NULL END
       WHERE id=$1 RETURNING *`,
      [req.params.id,v.business_id,v.category_id,v.title,v.description,v.notes,v.status,v.priority,v.created_date,v.start_date,v.deadline]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Task not found." });
    res.json(result.rows[0]);
  } catch (e) {
    if (e.code === "23503") return res.status(400).json({ error: "That category does not belong to the selected business." });
    if (e.code === "23514") return res.status(400).json({ error: "Task details failed validation." });
    next(e);
  }
});
app.delete("/api/tasks/:id", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query("DELETE FROM tasks WHERE id=$1 RETURNING id", [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: "Task not found." });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

app.get("/api/health", async (_req, res) => {
  try { await pool.query("SELECT 1"); res.json({ ok: true, service: "shlomo-task-manager" }); }
  catch { res.status(503).json({ ok: false }); }
});

app.use(express.static(path.join(__dirname, "dist"), { index: false, maxAge: "1h" }));
app.get("*", (_req, res) => {
  const index = path.join(__dirname, "dist", "index.html");
  if (fs.existsSync(index)) return res.sendFile(index);
  res.status(503).send("Application is building. Please retry shortly.");
});
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : "Something went wrong. Please try again." });
});

initDatabase().then(() => {
  app.listen(PORT, "0.0.0.0", () => console.log(`Shlomo Tasks listening on ${PORT}`));
}).catch(error => {
  console.error("Database initialization failed:", error);
  process.exit(1);
});

process.on("SIGTERM", async () => { await pool.end(); process.exit(0); });