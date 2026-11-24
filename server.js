import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pg from "pg";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
pg.types.setTypeParser(1082, value => value);
const app = express();
const PORT = Number(process.env.PORT || 10000);
const COOKIE = "taskxvs_session";
const SESSION_TTL = 60 * 60 * 24 * 7;
const OWNER_LOGIN_ID = process.env.OWNER_LOGIN_ID || "shakilxvs";
const OWNER_PASSWORD_SALT = process.env.OWNER_PASSWORD_SALT || "";
const OWNER_PASSWORD_HASH = process.env.OWNER_PASSWORD_HASH || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "";
const DATABASE_URL = process.env.DATABASE_URL || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM = process.env.RESEND_FROM || "";

if (!DATABASE_URL || !OWNER_PASSWORD_SALT || !OWNER_PASSWORD_HASH || !SESSION_SECRET) {
  console.error("Required application secrets are missing.");
}
const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
  max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000
});

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
    imgSrc: ["'self'", "data:"], connectSrc: ["'self'"],
    objectSrc: ["'none'"], frameAncestors: ["'none'"], upgradeInsecureRequests: []
  }},
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: "1mb" }));

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
function derivePassword(password, saltHex) {
  return crypto.scryptSync(String(password), Buffer.from(saltHex, "hex"), 64).toString("hex");
}
function passwordMatches(password, salt, hash) {
  try { return safeEqual(derivePassword(password, salt), hash); } catch { return false; }
}
function newPasswordRecord(password) {
  const salt = crypto.randomBytes(32).toString("hex");
  return { salt, hash: derivePassword(password, salt) };
}
function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}
function makeSession(auth) {
  const body = Buffer.from(JSON.stringify({
    kind: auth.kind, uid: auth.uid || null, username: auth.username,
    tokenVersion: auth.tokenVersion || 1,
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
async function authenticate(req) {
  try {
    const [body, signature] = readCookie(req).split(".");
    if (!body || !signature || !safeEqual(signature, sign(body))) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    if (payload.kind === "owner" && payload.username === OWNER_LOGIN_ID) {
      return { kind: "owner", role: "owner", username: OWNER_LOGIN_ID, displayName: "Shakil" };
    }
    if (payload.kind !== "member" || !payload.uid) return null;
    const result = await pool.query(
      "SELECT id, username, display_name, email, active, token_version FROM users WHERE id=$1",
      [payload.uid]
    );
    const user = result.rows[0];
    if (!user || !user.active || user.token_version !== payload.tokenVersion) return null;
    return { kind: "member", role: "member", id: user.id, uid: user.id,
      username: user.username, displayName: user.display_name, email: user.email };
  } catch { return null; }
}
function setSessionCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/",
    maxAge: SESSION_TTL * 1000
  });
}
function clearSessionCookie(res) {
  res.clearCookie(COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
}
async function requireAuth(req, res, next) {
  const auth = await authenticate(req);
  if (!auth) return res.status(401).json({ error: "Your session has expired. Please sign in again." });
  req.auth = auth;
  next();
}
function requireOwner(req, res, next) {
  if (req.auth?.role !== "owner") return res.status(403).json({ error: "Only the workspace owner can do that." });
  next();
}
async function assignedPermission(userId, businessId) {
  const result = await pool.query(
    "SELECT permission FROM business_assignments WHERE user_id=$1 AND business_id=$2",
    [userId, businessId]
  );
  return result.rows[0]?.permission || null;
}
async function requireBusinessAccess(req, res, businessId, write=false) {
  if (req.auth.role === "owner") return true;
  const permission = await assignedPermission(req.auth.id, businessId);
  if (!permission || (write && permission !== "write")) {
    res.status(403).json({ error: write ? "You have read-only access to this business." : "This business is not assigned to your account." });
    return false;
  }
  return true;
}

async function recordActivity(req,event) {
  try {
    const auth=req?.auth||{};
    await pool.query(
      `INSERT INTO activity_log
       (actor_id,actor_username,actor_display_name,event_type,entity_type,entity_id,business_id,title,details)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
      [auth.id?String(auth.id):null,auth.username||"unknown",auth.displayName||auth.username||"Unknown",
       event.event_type,event.entity_type,event.entity_id?String(event.entity_id):null,
       event.business_id?String(event.business_id):null,event.title||"Workspace change",
       JSON.stringify(event.details||{})]
    );
  } catch(error) { console.error("Activity log write failed:",error.message); }
}
async function recordSystemActivity(event) {
  try {
    await pool.query(
      `INSERT INTO activity_log
       (actor_id,actor_username,actor_display_name,event_type,entity_type,entity_id,business_id,title,details)
       VALUES (NULL,'taskxvs-system','TaskXVS system',$1,$2,$3,$4,$5,$6::jsonb)`,
      [event.event_type,event.entity_type,event.entity_id?String(event.entity_id):null,
       event.business_id?String(event.business_id):null,event.title||"Automatic workspace event",
       JSON.stringify(event.details||{})]
    );
  } catch(error) { console.error("System activity log write failed:",error.message); }
}
async function requireSameOrigin(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  const host = req.get("host");
  if (origin) {
    try { if (new URL(origin).host !== host) return res.status(403).json({ error: "Request origin rejected." }); }
    catch { return res.status(403).json({ error: "Request origin rejected." }); }
  }
  next();
}
app.use("/api", requireSameOrigin);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Please wait before trying again." }
});
app.post("/api/auth/login", loginLimiter, async (req, res, next) => {
  try {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");
    if (safeEqual(username.toLowerCase(), OWNER_LOGIN_ID.toLowerCase()) &&
        passwordMatches(password, OWNER_PASSWORD_SALT, OWNER_PASSWORD_HASH)) {
      setSessionCookie(res, makeSession({ kind: "owner", username: OWNER_LOGIN_ID }));
      return res.set("Cache-Control", "no-store").json({ ok: true });
    }
    const result = await pool.query(
      "SELECT id, username, display_name, email, password_salt, password_hash, active, token_version FROM users WHERE lower(username)=lower($1)",
      [username]
    );
    const user = result.rows[0];
    if (!user || !user.active || !passwordMatches(password, user.password_salt, user.password_hash)) {
      return res.status(401).json({ error: "That username and password don't match." });
    }
    setSessionCookie(res, makeSession({ kind: "member", uid: user.id, username: user.username, tokenVersion: user.token_version }));
    res.set("Cache-Control", "no-store").json({ ok: true });
  } catch (e) { next(e); }
});
app.get("/api/auth/session", async (req, res) => {
  const auth = await authenticate(req);
  res.set("Cache-Control", "no-store").json({
    authenticated: Boolean(auth),
    user: auth ? { id: auth.id || null, username: auth.username, displayName: auth.displayName, role: auth.role } : null
  });
});
app.post("/api/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.set("Cache-Control", "no-store").json({ ok: true });
});

function validEmailList(raw) {
  if (!raw) return true;
  const emails = String(raw).split(/[;,\s]+/).filter(Boolean);
  return emails.length <= 10 && emails.every(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function sendBusinessNotification(business,event,task){
 if(!business?.email_notifications||!business.notification_email||!RESEND_API_KEY||!RESEND_FROM)return false;
 const to=business.notification_email.split(/[;,\s]+/).filter(Boolean);if(!to.length)return false;
 const intro={"Task added":"A new task has been added to your workspace.","Task delayed":"The deadline has passed and this task still needs attention.","Task done":"This task has been marked as done.","In progress":"Work has started on this task."}[event]||"There is an update to your workspace.";
 const esc=escapeHtml,deadline=task.deadline?new Date(task.deadline+"T00:00:00Z").toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}):"No deadline set";
 const status=event==="Task delayed"?"Delayed":task.status==="done"?"Done":task.status==="in_progress"?"In progress":"To do",subject=`[${business.name}] ${event}: ${task.title}`;
 const text=[`TASKXVS · ${event}`,intro,`Business: ${business.name}`,`Task: ${task.title}`,`Deadline: ${deadline}`,`Status: ${status}`,`Priority: ${task.priority||"normal"}`,task.description||"",task.completion_note?`Completion note: ${task.completion_note}`:"","https://taskxvs.onrender.com"].filter(Boolean).join("\n\n");
 const accent=event==="Task delayed"?"#e60023":event==="Task done"?"#287044":"#333333";
 const html=`<!doctype html><html><body style="margin:0;padding:28px 12px;background:#f5f5f3;font-family:Arial,sans-serif;color:#171717"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:auto;background:#fff;border:1px solid #e7e7e3;border-radius:18px"><tr><td style="padding:22px 26px;border-bottom:1px solid #eee"><b style="display:inline-block;padding:9px 12px;background:#e60023;color:white;border-radius:9px">X</b><b style="padding-left:10px;letter-spacing:2px">TASKXVS</b><span style="float:right;color:#777;font-size:12px;padding-top:10px">${esc(business.name)}</span></td></tr><tr><td style="padding:30px 26px"><span style="font-size:11px;font-weight:bold;letter-spacing:1px;color:${accent}">${esc(event.toUpperCase())}</span><h1 style="font-size:26px;line-height:1.2;margin:14px 0 8px">${esc(event)}</h1><p style="font-size:14px;line-height:1.6;color:#666;margin:0 0 22px">${esc(intro)}</p><div style="padding:19px;border:1px solid #e8e8e4;border-radius:13px"><small style="color:#888">TASK</small><h2 style="font-size:19px;margin:8px 0">${esc(task.title)}</h2>${task.description?`<p style="font-size:13px;line-height:1.6;color:#666">${esc(task.description)}</p>`:""}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #eee;margin-top:16px"><tr><td style="padding-top:12px;color:#888;font-size:11px">DEADLINE</td><td align="right" style="padding-top:12px;font-size:12px;font-weight:bold">${esc(deadline)}</td></tr><tr><td style="padding-top:10px;color:#888;font-size:11px">STATUS</td><td align="right" style="padding-top:10px;font-size:12px;font-weight:bold">${esc(status)}</td></tr><tr><td style="padding-top:10px;color:#888;font-size:11px">PRIORITY</td><td align="right" style="padding-top:10px;font-size:12px;font-weight:bold;text-transform:capitalize">${esc(task.priority||"normal")}</td></tr></table>${task.completion_note?`<p style="margin:16px 0 0;padding:13px;background:#f3f6f2;border-radius:9px;font-size:13px;line-height:1.6"><b>Completion note</b><br>${esc(task.completion_note)}</p>`:""}</div><p style="margin:24px 0"><a href="https://taskxvs.onrender.com" style="display:inline-block;padding:13px 20px;border-radius:999px;background:#e60023;color:#fff;text-decoration:none;font-weight:bold;font-size:13px">Open TaskXVS →</a></p></td></tr><tr><td style="padding:18px 26px;background:#fafaf9;border-top:1px solid #eee;color:#888;font-size:11px">Notifications are enabled for ${esc(business.name)}.<br>TaskXVS notifications</td></tr></table></body></html>`;
 try {
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from:RESEND_FROM,to,subject,html,text})});
  if(!response.ok){console.error("Task notification email failed:",response.status,(await response.text()).slice(0,500));return false;}
  return true;
 } catch(error){console.error("Task notification email error:",error.message);return false;}
}
async function businessRow(businessId) {
  const result = await pool.query("SELECT * FROM businesses WHERE id=$1", [businessId]);
  return result.rows[0] || null;
}
async function checkDelayedTaskNotifications() {
  if(!RESEND_API_KEY||!RESEND_FROM)return;
  const due=await pool.query(`SELECT t.*,b.name AS business_name,b.notification_email,b.email_notifications
    FROM tasks t JOIN businesses b ON b.id=t.business_id
    WHERE t.status <> 'done' AND t.deadline < (now() AT TIME ZONE 'Asia/Dhaka')::date
      AND t.delayed_notified_at IS NULL AND b.email_notifications=true
      AND b.notification_email IS NOT NULL AND b.notification_email <> ''`);
  for(const task of due.rows){
    const claim=await pool.query("UPDATE tasks SET delayed_notified_at=now() WHERE id=$1 AND delayed_notified_at IS NULL RETURNING id",[task.id]);
    if(!claim.rowCount)continue;
    const sent=await sendBusinessNotification({name:task.business_name,notification_email:task.notification_email,email_notifications:task.email_notifications},"Task delayed",task);
    if(!sent)await pool.query("UPDATE tasks SET delayed_notified_at=NULL WHERE id=$1",[task.id]);
  }
}
async function initDatabase() {
  await pool.query("SELECT 1");
}

app.get("/api/bootstrap", requireAuth, async (req, res, next) => {
  try {
    let businessRows;
    if (req.auth.role === "owner") {
      const r = await pool.query("SELECT * FROM businesses WHERE archived=false ORDER BY position, lower(name)");
      businessRows = r.rows;
    } else {
      const r = await pool.query(
        `SELECT b.*, a.permission FROM businesses b
         JOIN business_assignments a ON a.business_id=b.id
         WHERE a.user_id=$1 AND b.archived=false ORDER BY b.position, lower(b.name)`,
        [req.auth.id]
      );
      businessRows = r.rows;
    }
    const ids = businessRows.map(b => b.id);
    const [categories, tasks] = ids.length ? await Promise.all([
      pool.query("SELECT * FROM categories WHERE business_id=ANY($1::uuid[]) ORDER BY position, lower(name)", [ids]),
      pool.query("SELECT * FROM tasks WHERE business_id=ANY($1::uuid[]) ORDER BY updated_at DESC", [ids])
    ]) : [{ rows: [] }, { rows: [] }];
    res.set("Cache-Control", "no-store").json({
      businesses: businessRows, categories: categories.rows, tasks: tasks.rows,
      user: req.auth,
      emailConfigured: Boolean(RESEND_API_KEY && RESEND_FROM)
    });
  } catch (e) { next(e); }
});

/* Owner-managed users and per-business permissions. */
app.get("/api/admin/users", requireAuth, requireOwner, async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT u.id,u.username,u.display_name,u.email,u.active,u.created_at,
        COALESCE(json_agg(json_build_object('business_id',a.business_id,'permission',a.permission))
          FILTER (WHERE a.business_id IS NOT NULL),'[]'::json) AS assignments
      FROM users u LEFT JOIN business_assignments a ON a.user_id=u.id
      GROUP BY u.id ORDER BY lower(u.username)`);
    res.set("Cache-Control", "no-store").json({ users: result.rows });
  } catch (e) { next(e); }
});
app.post("/api/admin/users", requireAuth, requireOwner, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const username = String(req.body?.username || "").trim();
    const displayName = String(req.body?.display_name || username).trim();
    const email = String(req.body?.email || "").trim() || null;
    const password = String(req.body?.password || "");
    const assignments = Array.isArray(req.body?.assignments) ? req.body.assignments : [];
    if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) return res.status(400).json({ error: "Username must be 3–40 characters using letters, numbers, dots, underscores or hyphens." });
    if (password.length < 4) return res.status(400).json({ error: "Use a password with at least 4 characters." });
    if (!displayName || displayName.length > 80) return res.status(400).json({ error: "Enter a display name." });
    if (email && !validEmailList(email)) return res.status(400).json({ error: "Enter a valid email address." });
    const credentials = newPasswordRecord(password);
    await client.query("BEGIN");
    const created = await client.query(
      "INSERT INTO users (username,display_name,email,password_salt,password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id,username,display_name,email,active",
      [username,displayName,email,credentials.salt,credentials.hash]
    );
    for (const assignment of assignments) {
      if (!["read","write"].includes(assignment.permission)) throw Object.assign(new Error("Invalid business permission."),{status:400});
      await client.query(
        "INSERT INTO business_assignments (user_id,business_id,permission) VALUES ($1,$2,$3)",
        [created.rows[0].id,assignment.business_id,assignment.permission]
      );
    }
    await client.query("COMMIT");
    res.status(201).json(created.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    if (e.code === "23505") return res.status(409).json({ error: "That username is already in use." });
    if (e.code === "23503") return res.status(400).json({ error: "One of the selected businesses does not exist." });
    next(e);
  } finally { client.release(); }
});
app.patch("/api/admin/users/:id", requireAuth, requireOwner, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query("SELECT id FROM users WHERE id=$1", [req.params.id]);
    if (!existing.rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ error: "User not found." }); }
    if (req.body?.display_name !== undefined || req.body?.email !== undefined || req.body?.active !== undefined) {
      await client.query(
        `UPDATE users SET
          display_name=COALESCE($2,display_name),
          email=CASE WHEN $3::boolean THEN $4 ELSE email END,
          active=COALESCE($5,active),
          token_version=CASE WHEN $5=false THEN token_version+1 ELSE token_version END
         WHERE id=$1`,
        [req.params.id,
          req.body.display_name === undefined ? null : String(req.body.display_name).trim(),
          req.body.email !== undefined,
          String(req.body.email || "").trim() || null,
          typeof req.body.active === "boolean" ? req.body.active : null]
      );
    }
    if (req.body?.password) {
      const password = String(req.body.password);
      if (password.length < 4) throw Object.assign(new Error("Use a password with at least 4 characters."),{status:400});
      const credentials = newPasswordRecord(password);
      await client.query("UPDATE users SET password_salt=$2,password_hash=$3,token_version=token_version+1 WHERE id=$1",
        [req.params.id,credentials.salt,credentials.hash]);
    }
    if (Array.isArray(req.body?.assignments)) {
      await client.query("DELETE FROM business_assignments WHERE user_id=$1",[req.params.id]);
      for (const assignment of req.body.assignments) {
        if (!["read","write"].includes(assignment.permission)) throw Object.assign(new Error("Invalid business permission."),{status:400});
        await client.query("INSERT INTO business_assignments (user_id,business_id,permission) VALUES ($1,$2,$3)",
          [req.params.id,assignment.business_id,assignment.permission]);
      }
    }
    const result=await client.query("SELECT id,username,display_name,email,active FROM users WHERE id=$1",[req.params.id]);
    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch(e) {
    await client.query("ROLLBACK");
    if(e.code==="23503")return res.status(400).json({error:"One of the selected businesses does not exist."});
    next(e);
  } finally { client.release(); }
});
app.delete("/api/admin/users/:id", requireAuth, requireOwner, async (req,res,next) => {
  try {
    const result=await pool.query("DELETE FROM users WHERE id=$1 RETURNING id",[req.params.id]);
    if(!result.rowCount)return res.status(404).json({error:"User not found."});
    res.json({ok:true});
  } catch(e){next(e);}
});

/* Business administration is owner-only. */
app.post("/api/businesses", requireAuth, async (req, res, next) => {
  const client=await pool.connect();
  try {
    const name=String(req.body?.name||"").trim();
    if(!name||name.length>60)return res.status(400).json({error:"Business name must be between 1 and 60 characters."});
    let email=null,emailEnabled=false;
    if(req.auth.role==="owner"){
      email=String(req.body?.notification_email||"").trim()||null;
      emailEnabled=Boolean(req.body?.email_notifications);
      if(!validEmailList(email))return res.status(400).json({error:"Enter up to 10 valid notification email addresses separated by commas."});
    }else{
      const access=await client.query("SELECT 1 FROM business_assignments WHERE user_id=$1 AND permission='write' LIMIT 1",[req.auth.id]);
      if(!access.rowCount)return res.status(403).json({error:"Read & write access is required to create a business."});
    }
    await client.query("BEGIN");
    const created=await client.query(
      "INSERT INTO businesses (name,notification_email,email_notifications,position) VALUES ($1,$2,$3,COALESCE((SELECT max(position)+1 FROM businesses),1)) RETURNING *",
      [name,email,emailEnabled]
    );
    if(req.auth.role==="member"){
      await client.query("INSERT INTO business_assignments (user_id,business_id,permission) VALUES ($1,$2,'write')",[req.auth.id,created.rows[0].id]);
    }
    await client.query("COMMIT");
    res.status(201).json(created.rows[0]);
  }catch(e){
    await client.query("ROLLBACK");
    if(e.code==="23505")return res.status(409).json({error:"A business with that name already exists."});
    next(e);
  }finally{client.release();}
});
app.patch("/api/businesses/:id", requireAuth, requireOwner, async (req,res,next)=>{
  try{
    const name=req.body?.name===undefined?null:String(req.body.name).trim();
    const email=req.body?.notification_email===undefined?null:(String(req.body.notification_email||"").trim()||null);
    const enabled=typeof req.body?.email_notifications==="boolean"?req.body.email_notifications:null;
    const archived=typeof req.body?.archived==="boolean"?req.body.archived:null;
    if(name!==null&&(!name||name.length>60))return res.status(400).json({error:"Business name must be between 1 and 60 characters."});
    if(email!==null&&!validEmailList(email))return res.status(400).json({error:"Enter up to 10 valid notification email addresses."});
    const result=await pool.query(
      `UPDATE businesses SET name=COALESCE($2,name),
       notification_email=CASE WHEN $3::boolean THEN $4 ELSE notification_email END,
       email_notifications=COALESCE($5,email_notifications),
       archived=COALESCE($6,archived)
       WHERE id=$1 RETURNING *`,
      [req.params.id,name,req.body?.notification_email!==undefined,email,enabled,archived]
    );
    if(!result.rowCount)return res.status(404).json({error:"Business not found."});
    res.json(result.rows[0]);
  }catch(e){
    if(e.code==="23505")return res.status(409).json({error:"A business with that name already exists."});
    next(e);
  }
});
app.delete("/api/businesses/:id", requireAuth, requireOwner, async (req,res,next)=>{
  try{
    const result=await pool.query("DELETE FROM businesses WHERE id=$1 RETURNING id",[req.params.id]);
    if(!result.rowCount)return res.status(404).json({error:"Business not found."});
    res.json({ok:true});
  }catch(e){next(e);}
});

app.post("/api/categories", requireAuth, async (req,res,next)=>{
  try{
    const businessId=String(req.body?.business_id||"");
    if(!await requireBusinessAccess(req,res,businessId,true))return;
    const name=String(req.body?.name||"").trim();
    const icon=String(req.body?.icon||"tag").slice(0,50);
    const color=String(req.body?.color||"#d97737").slice(0,30);
    if(!businessId||!name||name.length>50)return res.status(400).json({error:"Choose a business and enter a category name (1–50 characters)."});
    const result=await pool.query(
      "INSERT INTO categories (business_id,name,icon,color,position) VALUES ($1,$2,$3,$4,COALESCE((SELECT max(position)+1 FROM categories WHERE business_id=$1),1)) RETURNING *",
      [businessId,name,icon,color]
    );
    res.status(201).json(result.rows[0]);
  }catch(e){
    if(e.code==="23505")return res.status(409).json({error:"That category already exists in this business."});
    if(e.code==="23503")return res.status(400).json({error:"The selected business does not exist."});
    next(e);
  }
});
app.patch("/api/categories/:id",requireAuth,async(req,res,next)=>{
  try{
    const current=await pool.query("SELECT business_id FROM categories WHERE id=$1",[req.params.id]);
    if(!current.rowCount)return res.status(404).json({error:"Category not found."});
    if(!await requireBusinessAccess(req,res,current.rows[0].business_id,true))return;
    const name=req.body?.name===undefined?null:String(req.body.name).trim();
    if(name!==null&&(!name||name.length>50))return res.status(400).json({error:"Category name must be between 1 and 50 characters."});
    const result=await pool.query(
      "UPDATE categories SET name=COALESCE($2,name),icon=COALESCE($3,icon),color=COALESCE($4,color) WHERE id=$1 RETURNING *",
      [req.params.id,name,req.body?.icon??null,req.body?.color??null]
    );
    res.json(result.rows[0]);
  }catch(e){next(e);}
});
app.delete("/api/categories/:id",requireAuth,async(req,res,next)=>{
  try{
    const current=await pool.query("SELECT business_id FROM categories WHERE id=$1",[req.params.id]);
    if(!current.rowCount)return res.status(404).json({error:"Category not found."});
    if(!await requireBusinessAccess(req,res,current.rows[0].business_id,true))return;
    await pool.query("DELETE FROM categories WHERE id=$1",[req.params.id]);
    res.json({ok:true});
  }catch(e){next(e);}
});

function normalizeTask(body) {
  const v={
    business_id:String(body.business_id||""),category_id:body.category_id||null,
    title:String(body.title||"").trim(),description:String(body.description||""),
    notes:String(body.notes||""),status:body.status||"todo",priority:body.priority||"normal",
    created_date:body.created_date||new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Dhaka"}),
    start_date:body.start_date||null,deadline:body.deadline||null
  };
  if(!v.business_id)throw Object.assign(new Error("Choose a business."),{status:400});
  if(!v.title||v.title.length>200)throw Object.assign(new Error("Task title must be between 1 and 200 characters."),{status:400});
  if(v.description.length>5000||v.notes.length>5000)throw Object.assign(new Error("Description and notes must be under 5,000 characters."),{status:400});
  if(!["todo","in_progress","done"].includes(v.status))throw Object.assign(new Error("Invalid task status."),{status:400});
  if(!["low","normal","high","urgent"].includes(v.priority))throw Object.assign(new Error("Invalid task priority."),{status:400});
  if(v.start_date&&v.deadline&&v.deadline<v.start_date)throw Object.assign(new Error("Deadline cannot be before the start date."),{status:400});
  return v;
}
app.post("/api/tasks",requireAuth,async(req,res,next)=>{
  try{
    const v=normalizeTask(req.body||{});
    if(!await requireBusinessAccess(req,res,v.business_id,true))return;
    const result=await pool.query(
      `INSERT INTO tasks (business_id,category_id,title,description,notes,status,priority,created_date,start_date,deadline,completed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CASE WHEN $6='done' THEN now() ELSE NULL END) RETURNING *`,
      [v.business_id,v.category_id,v.title,v.description,v.notes,v.status,v.priority,v.created_date,v.start_date,v.deadline]
    );
    res.status(201).json(result.rows[0]);
    const business=await businessRow(v.business_id);
    sendBusinessNotification(business,"Task added",result.rows[0]);
  }catch(e){
    if(e.code==="23503")return res.status(400).json({error:"That category does not belong to the selected business."});
    if(e.code==="23514")return res.status(400).json({error:"Task details failed validation."});
    next(e);
  }
});
app.patch("/api/tasks/:id",requireAuth,async(req,res,next)=>{
  try{
    const existing=await pool.query("SELECT * FROM tasks WHERE id=$1",[req.params.id]);
    if(!existing.rowCount)return res.status(404).json({error:"Task not found."});
    if(!await requireBusinessAccess(req,res,existing.rows[0].business_id,true))return;
    const v=normalizeTask(req.body||{});
    if(v.status==="done"&&existing.rows[0].status!=="done")return res.status(400).json({error:"Use the task completion confirmation to mark this task done."});
    if(!await requireBusinessAccess(req,res,v.business_id,true))return;
    const result=await pool.query(
      `UPDATE tasks SET business_id=$2,category_id=$3,title=$4,description=$5,notes=$6,status=$7,priority=$8,created_date=$9,start_date=$10,deadline=$11,
       completed_at=CASE WHEN $7='done' THEN COALESCE(completed_at,now()) ELSE NULL END,
       delayed_notified_at=CASE WHEN $7='done' OR $11::date IS NULL OR $11::date >= (now() AT TIME ZONE 'Asia/Dhaka')::date THEN NULL ELSE delayed_notified_at END WHERE id=$1 RETURNING *`,
      [req.params.id,v.business_id,v.category_id,v.title,v.description,v.notes,v.status,v.priority,v.created_date,v.start_date,v.deadline]
    );
    res.json(result.rows[0]);
    if(existing.rows[0].status!=="in_progress"&&result.rows[0].status==="in_progress"){
      const business=await businessRow(v.business_id);
      sendBusinessNotification(business,"In progress",result.rows[0]);
    }
  }catch(e){
    if(e.code==="23503")return res.status(400).json({error:"That category does not belong to the selected business."});
    if(e.code==="23514")return res.status(400).json({error:"Task details failed validation."});
    next(e);
  }
});
app.patch("/api/tasks/:id/status",requireAuth,async(req,res,next)=>{
  try{
    const current=await pool.query("SELECT * FROM tasks WHERE id=$1",[req.params.id]);
    if(!current.rowCount)return res.status(404).json({error:"Task not found."});
    const task=current.rows[0];
    if(!await requireBusinessAccess(req,res,task.business_id,true))return;
    const status=String(req.body?.status||"");
    const note=String(req.body?.completion_note||"").trim();
    if(!["todo","in_progress","done"].includes(status))return res.status(400).json({error:"Invalid task status."});
    if(note.length>3000)return res.status(400).json({error:"Completion note must be under 3,000 characters."});
    if(status==="done"&&task.status!=="done"&&!req.body?.confirm_completion)return res.status(400).json({error:"Confirm completion before marking this task done."});
    const updated=await pool.query(`UPDATE tasks SET status=$2,
      completed_at=CASE WHEN $2='done' THEN COALESCE(completed_at,now()) ELSE NULL END,
      completion_note=CASE WHEN $2='done' THEN NULLIF($3,'') ELSE completion_note END,
      delayed_notified_at=CASE WHEN $2='done' THEN NULL ELSE delayed_notified_at END
      WHERE id=$1 RETURNING *`,[req.params.id,status,note]);
    res.json(updated.rows[0]);
    const business=await businessRow(task.business_id);
    if(task.status!==status&&status==="done")sendBusinessNotification(business,"Task done",updated.rows[0]);
    else if(task.status!==status&&status==="in_progress")sendBusinessNotification(business,"In progress",updated.rows[0]);
  }catch(e){next(e);}
});
app.delete("/api/tasks/:id",requireAuth,async(req,res,next)=>{
  try{
    const current=await pool.query("SELECT * FROM tasks WHERE id=$1",[req.params.id]);
    if(!current.rowCount)return res.status(404).json({error:"Task not found."});
    if(!await requireBusinessAccess(req,res,current.rows[0].business_id,true))return;
    await pool.query("DELETE FROM tasks WHERE id=$1",[req.params.id]);
    res.json({ok:true});
  }catch(e){next(e);}
});

app.get("/api/health",async(_req,res)=>{
  try{await pool.query("SELECT 1");res.json({ok:true,service:"taskxvs",emailReady:Boolean(RESEND_API_KEY&&RESEND_FROM)});}
  catch{res.status(503).json({ok:false});}
});
app.use(express.static(path.join(__dirname,"dist"),{index:false,maxAge:"1h"}));
app.get("*",(_req,res)=>{
  const index=path.join(__dirname,"dist","index.html");
  if(fs.existsSync(index))return res.sendFile(index);
  res.status(503).send("Application is building. Please retry shortly.");
});
app.use((err,_req,res,_next)=>{
  console.error(err);
  res.status(err.status||500).json({error:err.status?err.message:"Something went wrong. Please try again."});
});
initDatabase().then(()=>{
  app.listen(PORT,"0.0.0.0",()=>console.log(`TaskXVS listening on ${PORT}`));
  checkDelayedTaskNotifications().catch(error=>console.error("Delayed task check failed:",error.message));
  const delayedTimer=setInterval(()=>checkDelayedTaskNotifications().catch(error=>console.error("Delayed task check failed:",error.message)),15*60*1000);
  delayedTimer.unref();
}).catch(error=>{console.error("Database initialization failed:",error);process.exit(1);});
process.on("SIGTERM",async()=>{await pool.end();process.exit(0);});
