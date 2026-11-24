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
app.use(express.json({ limit: "1mb", verify:(req,res,buf)=>{req.rawBody=Buffer.from(buf);} }));

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
    const saved=await pool.query(
      `INSERT INTO activity_log
       (actor_id,actor_username,actor_display_name,event_type,entity_type,entity_id,business_id,title,details)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
       RETURNING id`,
      [auth.id?String(auth.id):null,auth.username||"unknown",auth.displayName||auth.username||"Unknown",
       event.event_type,event.entity_type,event.entity_id?String(event.entity_id):null,
       event.business_id?String(event.business_id):null,event.title||"Workspace change",
       JSON.stringify(event.details||{})]
    );
    const activityId=saved.rows[0]?.id;
    // Owner actions remain in the in-app activity history but do not email the owner.
    // Only authenticated team-member actions generate owner activity emails.
    if(activityId&&auth.role==="member"){
      void sendOwnerActivityEmail(auth,event,String(activityId))
        .catch(error=>console.error("Owner activity email failed:",error.message));
    }
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
app.get("/api/account",requireAuth,async(req,res,next)=>{
  try{
    const gateway=await getWhatsAppGatewayStatus();
    if(req.auth.role==="owner"){
      const [whatsappResult,preferences]=await Promise.all([
        pool.query("SELECT setting_value FROM workspace_settings WHERE setting_key='owner_whatsapp' LIMIT 1"),
        getOwnerNotificationPreferences()
      ]);
      const whatsapp=whatsappResult.rows[0]?.setting_value||{};
      return res.set("Cache-Control","no-store").json({
        ...preferences,
        whatsapp_number:whatsapp.whatsapp_number||"",
        whatsapp_notifications_enabled:Boolean(whatsapp.whatsapp_notifications_enabled),
        whatsapp_configured:gateway.connected,
        role:"owner"
      });
    }
    const result=await pool.query("SELECT whatsapp_number,whatsapp_notifications_enabled FROM users WHERE id=$1",[req.auth.id]);
    if(!result.rowCount)return res.status(404).json({error:"Account not found."});
    res.set("Cache-Control","no-store").json({...result.rows[0],whatsapp_configured:gateway.connected,role:"member"});
  }catch(e){next(e);}
});
app.patch("/api/account",requireAuth,async(req,res,next)=>{
  try{
    const body=req.body||{};
    if(req.auth.role==="owner"){
      const hasWhatsApp=Object.prototype.hasOwnProperty.call(body,"whatsapp_number")
        ||Object.prototype.hasOwnProperty.call(body,"whatsapp_notifications_enabled");
      if(hasWhatsApp){
        const current=await pool.query("SELECT setting_value FROM workspace_settings WHERE setting_key='owner_whatsapp' LIMIT 1");
        const previous=current.rows[0]?.setting_value||{};
        const phone=Object.prototype.hasOwnProperty.call(body,"whatsapp_number")
          ? normalizeWhatsAppNumber(body.whatsapp_number)
          : (previous.whatsapp_number||null);
        const enabled=typeof body.whatsapp_notifications_enabled==="boolean"
          ? body.whatsapp_notifications_enabled
          : Boolean(previous.whatsapp_notifications_enabled);
        const value={whatsapp_number:phone||"",whatsapp_notifications_enabled:enabled};
        await pool.query(
          "INSERT INTO workspace_settings(setting_key,setting_value,updated_at) VALUES ('owner_whatsapp',$1::jsonb,now()) ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_at=now()",
          [JSON.stringify(value)]
        );
      }
      const preferenceKeys=["activity_email","activity_email_enabled","deadline_reminders_enabled","timezone"];
      if(preferenceKeys.some(key=>Object.prototype.hasOwnProperty.call(body,key))){
        const current=await getOwnerNotificationPreferences();
        const next={...current};
        if(Object.prototype.hasOwnProperty.call(body,"activity_email")){
          const email=String(body.activity_email||"").trim();
          if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:"Enter one valid owner email address."});
          next.activity_email=email;
        }
        if(Object.prototype.hasOwnProperty.call(body,"activity_email_enabled")){
          if(typeof body.activity_email_enabled!=="boolean")return res.status(400).json({error:"Invalid activity email setting."});
          next.activity_email_enabled=body.activity_email_enabled;
        }
        if(Object.prototype.hasOwnProperty.call(body,"deadline_reminders_enabled")){
          if(typeof body.deadline_reminders_enabled!=="boolean")return res.status(400).json({error:"Invalid deadline reminder setting."});
          next.deadline_reminders_enabled=body.deadline_reminders_enabled;
        }
        if(Object.prototype.hasOwnProperty.call(body,"timezone")){
          const requested=String(body.timezone||"").trim();
          try{new Intl.DateTimeFormat("en-US",{timeZone:requested}).format(new Date());}
          catch{return res.status(400).json({error:"Choose a valid time zone."});}
          next.timezone=requested;
        }
        await pool.query(
          "INSERT INTO workspace_settings(setting_key,setting_value,updated_at) VALUES ('owner_notification_preferences',$1::jsonb,now()) ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_at=now()",
          [JSON.stringify(next)]
        );
      }
      const [whatsappResult,preferences]=await Promise.all([
        pool.query("SELECT setting_value FROM workspace_settings WHERE setting_key='owner_whatsapp' LIMIT 1"),
        getOwnerNotificationPreferences()
      ]);
      const whatsapp=whatsappResult.rows[0]?.setting_value||{};
      return res.json({
        ...preferences,
        whatsapp_number:whatsapp.whatsapp_number||"",
        whatsapp_notifications_enabled:Boolean(whatsapp.whatsapp_notifications_enabled)
      });
    }
    const phone=normalizeWhatsAppNumber(body.whatsapp_number);
    const enabled=typeof body.whatsapp_notifications_enabled==="boolean"?body.whatsapp_notifications_enabled:false;
    const result=await pool.query("UPDATE users SET whatsapp_number=$2,whatsapp_notifications_enabled=$3,updated_at=now() WHERE id=$1 RETURNING whatsapp_number,whatsapp_notifications_enabled",[req.auth.id,phone,enabled]);
    if(!result.rowCount)return res.status(404).json({error:"Account not found."});
    res.json(result.rows[0]);
  }catch(e){next(e);}
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
function normalizeWhatsAppNumber(raw) {
  const value=String(raw||"").trim();
  if(!value)return null;
  const normalized=value.replace(/[\s().-]/g,"");
  if(!/^\+[1-9]\d{7,14}$/.test(normalized))throw Object.assign(new Error("Enter a WhatsApp number in international format, e.g. +8801XXXXXXXXX."),{status:400});
  return normalized;
}

const DEFAULT_OWNER_TIMEZONE="America/New_York";
function normalizeTimeZone(raw){
  const value=String(raw||DEFAULT_OWNER_TIMEZONE).trim();
  try{new Intl.DateTimeFormat("en-US",{timeZone:value}).format(new Date());return value;}
  catch{return DEFAULT_OWNER_TIMEZONE;}
}
async function getOwnerNotificationPreferences(){
  const result=await pool.query("SELECT setting_value FROM workspace_settings WHERE setting_key='owner_notification_preferences' LIMIT 1");
  const value=result.rows[0]?.setting_value||{};
  return {
    activity_email:String(value.activity_email||"shakilxvs@gmail.com").trim(),
    activity_email_enabled:value.activity_email_enabled!==false,
    deadline_reminders_enabled:value.deadline_reminders_enabled!==false,
    timezone:normalizeTimeZone(value.timezone)
  };
}
function getZonedDateParts(timeZone,instant=new Date()){
  const parts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{
    timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hourCycle:"h23"
  }).formatToParts(instant).map(part=>[part.type,part.value]));
  return {date:`${parts.year}-${parts.month}-${parts.day}`,hour:Number(parts.hour||0)};
}
function addIsoDays(isoDate,days){
  const [year,month,day]=String(isoDate).split("-").map(Number);
  return new Date(Date.UTC(year,month-1,day+days)).toISOString().slice(0,10);
}
function formatIsoDate(isoDate,timeZone="UTC"){
  if(!isoDate)return "No deadline set";
  return new Intl.DateTimeFormat("en-US",{timeZone,month:"long",day:"numeric",year:"numeric"})
    .format(new Date(String(isoDate).slice(0,10)+"T12:00:00Z"));
}
async function getWhatsAppGatewayStatus() {
  const result=await pool.query(
    "SELECT status,qr_data_url,phone_number,last_seen_at,last_error,updated_at FROM whatsapp_gateway.gateway_state WHERE id=true LIMIT 1"
  );
  const row=result.rows[0]||{};
  const lastSeen=row.last_seen_at?new Date(row.last_seen_at).getTime():0;
  const fresh=lastSeen>0&&(Date.now()-lastSeen)<45*60*1000;
  const effectiveStatus=row.status==="connected"&&!fresh?"disconnected":(row.status||"disconnected");
  const reconnectReady=String(row.last_error||"").startsWith("RECONNECT_READY:");
  const storedError=reconnectReady
    ? String(row.last_error).slice("RECONNECT_READY:".length).trim()
    : (row.last_error||"");
  const lastError=row.status==="logged_out"&&/Stream Errored \\(conflict\\)/i.test(storedError)
    ? "WhatsApp session conflict. Another linked session replaced this connection. Close any other active TaskXVS worker, then choose Reconnect WhatsApp to create a fresh QR code."
    : storedError;
  return {
    status:effectiveStatus,
    connected:row.status==="connected"&&fresh,
    reconnect_required:row.status==="logged_out",
    reconnect_ready:reconnectReady,
    qr_data_url:row.qr_data_url||"",
    phone_number:row.phone_number||"",
    last_seen_at:row.last_seen_at||null,
    last_error:lastError,
    updated_at:row.updated_at||null
  };
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
async function sendResendEmail(payload,idempotencyKey){
  if(!RESEND_API_KEY||!RESEND_FROM)throw new Error("Resend is not configured for TaskXVS.");
  const response=await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{
      Authorization:`Bearer ${RESEND_API_KEY}`,
      "Content-Type":"application/json",
      ...(idempotencyKey?{"Idempotency-Key":String(idempotencyKey).slice(0,256)}:{})
    },
    body:JSON.stringify({...payload,from:payload.from||RESEND_FROM}),
    signal:AbortSignal.timeout(20000)
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(`Resend returned ${response.status}: ${result.message||result.name||"email request failed"}`);
  return result.id||null;
}
const ACTIVITY_EMAIL_LABELS={
  task_created:"Task created",task_updated:"Task updated",task_status_changed:"Task status changed",task_deleted:"Task deleted",
  business_created:"Business created",business_updated:"Business updated",business_archived:"Business archived",
  business_restored:"Business restored",business_deleted:"Business deleted",
  category_created:"Category created",category_updated:"Category updated",category_deleted:"Category deleted",
  team_member_created:"Team member created",team_member_updated:"Team member updated",
  team_member_disabled:"Team member disabled",team_member_enabled:"Team member enabled",team_member_deleted:"Team member deleted"
};
const ACTIVITY_FIELD_LABELS={
  title:"Task title",description:"Description",notes:"Notes",category_id:"Category",deadline:"Deadline",
  priority:"Priority",created_date:"Created date",start_date:"Start date",business_id:"Business",
  status:"Status",name:"Name",notification_email:"Notification email",
  email_notifications:"Business email notifications",active:"Account active",display_name:"Display name",
  assignments:"Business access",from:"Previous status",to:"New status"
};
function activityValueLabel(key,value){
  if(value===null||value===undefined||value==="")return "Not set";
  if(key==="email_notifications"||key==="active")return value?"Enabled":"Disabled";
  if(key==="priority")return String(value).charAt(0).toUpperCase()+String(value).slice(1);
  if(["status","from","to"].includes(key))return ({todo:"To do",in_progress:"In progress",done:"Done"})[value]||String(value);
  if(Array.isArray(value))return value.map(item=>typeof item==="object"?JSON.stringify(item):String(item)).join(", ");
  if(typeof value==="object")return JSON.stringify(value);
  return String(value);
}
async function sendOwnerActivityEmail(auth,event,activityId){
  try{
    if(auth?.role!=="member")return false;
    const prefs=await getOwnerNotificationPreferences();
    if(!prefs.activity_email_enabled||!prefs.activity_email||!RESEND_API_KEY||!RESEND_FROM)return false;
    const businessResult=event.business_id
      ? await pool.query("SELECT id::text,name FROM businesses WHERE id::text=$1 LIMIT 1",[String(event.business_id)])
      : {rows:[]};
    const business=businessResult.rows[0]||null;
    const details=event.details||{};
    const changes=[];
    if(details.before&&details.after&&typeof details.before==="object"&&typeof details.after==="object"){
      for(const key of Object.keys(details.after)){
        if(JSON.stringify(details.before[key]??null)===JSON.stringify(details.after[key]??null))continue;
        changes.push({
          key,
          label:ACTIVITY_FIELD_LABELS[key]||key.replaceAll("_"," ").replace(/^./,x=>x.toUpperCase()),
          before:activityValueLabel(key,details.before[key]),
          after:activityValueLabel(key,details.after[key])
        });
      }
    }
    if(details.from!==undefined&&details.to!==undefined){
      changes.push({key:"status",label:"Status",before:activityValueLabel("from",details.from),after:activityValueLabel("to",details.to)});
    }
    if(!changes.length){
      for(const key of ["status","priority","deadline","description","icon","color","notification_email","email_notifications","assigned_business_count"]){
        if(details[key]!==undefined)changes.push({
          key,label:ACTIVITY_FIELD_LABELS[key]||key,
          before:"",after:activityValueLabel(key,details[key])
        });
      }
      if(Array.isArray(details.assignments)){
        const assignmentIds=[...new Set(details.assignments.map(item=>String(item.business_id||"")).filter(value=>/^[0-9a-f-]{36}$/i.test(value)))];
        const assignmentNames=new Map();
        if(assignmentIds.length){
          const rows=await pool.query("SELECT id::text,name FROM businesses WHERE id=ANY($1::uuid[])",[assignmentIds]);
          for(const row of rows.rows)assignmentNames.set(row.id,row.name);
        }
        changes.push({
          key:"assignments",label:"Business access",before:"",
          after:details.assignments.map(item=>`${assignmentNames.get(String(item.business_id))||item.business_name||"Business"}: ${item.permission}`).join(", ")
        });
      }
    }
    const categoryIds=[...new Set(changes.filter(item=>item.key==="category_id")
      .flatMap(item=>[item.before,item.after]).filter(value=>/^[0-9a-f-]{36}$/i.test(value)))];
    if(categoryIds.length){
      const categories=await pool.query("SELECT id::text,name FROM categories WHERE id=ANY($1::uuid[])",[categoryIds]);
      const names=new Map(categories.rows.map(row=>[row.id,row.name]));
      for(const item of changes)if(item.key==="category_id"){
        item.before=names.get(item.before)||item.before;
        item.after=names.get(item.after)||item.after;
      }
    }
    const actorName=String(auth.displayName||auth.username||"Workspace member");
    const actorUsername=String(auth.username||"unknown");
    const eventLabel=ACTIVITY_EMAIL_LABELS[event.event_type]||String(event.event_type||"Workspace updated").replaceAll("_"," ").replace(/^./,x=>x.toUpperCase());
    const businessName=business?.name||"Workspace";
    const when=new Intl.DateTimeFormat("en-US",{timeZone:prefs.timezone,dateStyle:"medium",timeStyle:"short"}).format(new Date());
    const subject=`[TaskXVS] ${businessName} · ${eventLabel}`.slice(0,180);
    const esc=escapeHtml;
    const rows=changes.slice(0,14).map(item=>`<tr><td style="padding:11px 12px;border-bottom:1px solid #eee;color:#68716a;font-size:12px;width:31%">${esc(item.label)}</td><td style="padding:11px 12px;border-bottom:1px solid #eee;color:#777;font-size:12px">${item.before?esc(item.before)+" &nbsp;→&nbsp; ":""}<b style="color:#222">${esc(item.after)}</b></td></tr>`).join("");
    const note=details.note?String(details.note):"";
    const text=[
      `TASKXVS · ${eventLabel}`,
      `Business: ${businessName}`,
      `Changed by: ${actorName} (@${actorUsername})`,
      `Action: ${event.title||eventLabel}`,
      ...changes.slice(0,14).map(item=>`${item.label}: ${item.before?item.before+" → ":""}${item.after}`),
      note?`Note: ${note}`:"",
      `Time: ${when}`,
      business?.id?`https://task.shakilxvs.com/?business=${business.id}`:"https://task.shakilxvs.com"
    ].filter(Boolean).join("\n\n");
    const businessUrl=business?.id?`https://task.shakilxvs.com/?business=${encodeURIComponent(business.id)}`:"https://task.shakilxvs.com";
    const html=`<!doctype html><html><body style="margin:0;padding:30px 12px;background:#f4f4f1;font-family:Arial,sans-serif;color:#171717">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:auto;background:#fff;border:1px solid #e5e5e0;border-radius:18px;overflow:hidden">
        <tr><td style="padding:22px 26px;border-bottom:1px solid #eee"><b style="display:inline-block;padding:9px 11px;border-radius:9px;background:#e60023;color:#fff">✓</b><b style="margin-left:10px;letter-spacing:2px">TASKXVS</b><span style="float:right;color:#888;font-size:12px;padding-top:10px">${esc(businessName)}</span></td></tr>
        <tr><td style="padding:29px 26px">
          <span style="font-size:10px;font-weight:700;letter-spacing:1.4px;color:#b85a35">WORKSPACE ACTIVITY</span>
          <h1 style="margin:12px 0 8px;font-size:25px;line-height:1.2">${esc(eventLabel)}</h1>
          <p style="margin:0 0 21px;color:#777;font-size:13px;line-height:1.6">${esc(event.title||"A workspace change was recorded.")}</p>
          <div style="padding:14px 16px;background:#fafaf8;border:1px solid #eee;border-radius:12px;margin-bottom:18px">
            <div style="font-size:10px;color:#96968f;letter-spacing:1px">CHANGED BY</div>
            <div style="font-size:14px;font-weight:700;margin-top:5px">${esc(actorName)}</div>
            <div style="font-size:11px;color:#888;margin-top:3px">@${esc(actorUsername)} · ${esc(when)}</div>
          </div>
          ${rows?'<div style="border:1px solid #eaeae6;border-radius:12px;overflow:hidden"><div style="padding:12px 13px;background:#fafaf8;font-size:10px;font-weight:700;letter-spacing:1px;color:#8b8b83">WHAT CHANGED</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0">'+rows+'</table></div>':""}
          ${note?'<div style="margin-top:16px;padding:13px 15px;background:#f7f8f5;border-radius:10px;color:#555;font-size:12px;line-height:1.6"><b>Note</b><br>'+esc(note)+'</div>':""}
          <p style="margin:24px 0 0"><a href="${businessUrl}" style="display:inline-block;padding:12px 19px;border-radius:999px;background:#e60023;color:#fff;text-decoration:none;font-size:12px;font-weight:700">Open TaskXVS</a></p>
        </td></tr>
        <tr><td style="padding:17px 26px;background:#fafaf8;border-top:1px solid #eee;color:#999;font-size:10px;line-height:1.5">You receive this owner-only activity email because workspace activity notifications are enabled in My account.</td></tr>
      </table></body></html>`;
    await sendResendEmail({to:[prefs.activity_email],subject,html,text},`taskxvs-activity-${activityId}`);
    return true;
  }catch(error){
    console.error("Owner activity email could not be sent:",error.message);
    return false;
  }
}
function buildDeadlineReminderEmail(tasks,prefs,daysBefore,sendDate,dueDate){
  const groups=new Map();
  for(const task of tasks){
    if(!groups.has(task.business_id))groups.set(task.business_id,{name:task.business_name,id:task.business_id,tasks:[]});
    groups.get(task.business_id).tasks.push(task);
  }
  const esc=escapeHtml;
  const dayLabel=daysBefore===1?"tomorrow":`in ${daysBefore} days`;
  const businessSections=[...groups.values()].map(group=>{
    const items=group.tasks.map(task=>`<tr><td style="padding:13px 14px;border-top:1px solid #eee">
      <a href="https://task.shakilxvs.com/?business=${encodeURIComponent(group.id)}" style="color:#1f2721;font-size:13px;font-weight:700;text-decoration:none">${esc(task.title)}</a>
      <div style="margin-top:5px;color:#777;font-size:11px;line-height:1.5">${esc(task.description||"No description")}</div>
      <div style="margin-top:7px;color:#8b8b83;font-size:10px">${esc(task.status==="in_progress"?"In progress":"To do")} · ${esc(String(task.priority||"normal").toUpperCase())} priority</div>
    </td></tr>`).join("");
    return `<div style="margin-top:16px;border:1px solid #e9e9e5;border-radius:13px;overflow:hidden">
      <div style="padding:13px 15px;background:#fafaf8;font-size:12px;font-weight:700">${esc(group.name)} <span style="float:right;color:#888;font-weight:500">${group.tasks.length} task${group.tasks.length===1?"":"s"}</span></div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${items}</table></div>`;
  }).join("");
  const subject=`[TaskXVS] ${daysBefore} day${daysBefore===1?"":"s"} left · ${tasks.length} deadline task${tasks.length===1?"":"s"}`;
  const text=[
    "TASKXVS · DEADLINE REMINDER",
    `${tasks.length} open task(s) are due ${dayLabel}.`,
    `Deadline: ${formatIsoDate(dueDate,prefs.timezone)}`,
    ...[...groups.values()].flatMap(group=>[`\n${group.name}`,...group.tasks.map(task=>`• ${task.title} | ${task.status} | ${task.priority}${task.description?" | "+task.description:""}`)]),
    "Open TaskXVS: https://task.shakilxvs.com"
  ].join("\n");
  const html=`<!doctype html><html><body style="margin:0;padding:28px 12px;background:#f4f4f1;font-family:Arial,sans-serif;color:#171717">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:auto;background:#fff;border:1px solid #e6e6e1;border-radius:18px;overflow:hidden">
      <tr><td style="padding:22px 26px;border-bottom:1px solid #eee"><b style="display:inline-block;padding:9px 11px;border-radius:9px;background:#e60023;color:#fff">✓</b><b style="margin-left:10px;letter-spacing:2px">TASKXVS</b><span style="float:right;color:#888;font-size:11px;padding-top:10px">OWNER REMINDER</span></td></tr>
      <tr><td style="padding:28px 26px">
        <span style="font-size:10px;letter-spacing:1.4px;font-weight:700;color:#bd713c">DEADLINE APPROACHING</span>
        <h1 style="margin:12px 0 7px;font-size:27px;line-height:1.2">${daysBefore} day${daysBefore===1?"":"s"} left</h1>
        <p style="margin:0;color:#777;font-size:13px;line-height:1.6">${tasks.length} open task${tasks.length===1?"":"s"} across your businesses are due ${dayLabel}, on <b style="color:#333">${esc(formatIsoDate(dueDate,prefs.timezone))}</b>.</p>
        ${businessSections}
        <p style="margin:24px 0 0"><a href="https://task.shakilxvs.com" style="display:inline-block;padding:12px 19px;border-radius:999px;background:#e60023;color:#fff;text-decoration:none;font-size:12px;font-weight:700">Open TaskXVS</a></p>
        <p style="margin:18px 0 0;color:#999;font-size:10px">Reminder date: ${esc(formatIsoDate(sendDate,prefs.timezone))} · Time zone: ${esc(prefs.timezone)}</p>
      </td></tr>
      <tr><td style="padding:16px 26px;background:#fafaf8;border-top:1px solid #eee;color:#999;font-size:10px">Private owner reminder. This email is sent only to your configured owner email address.</td></tr>
    </table></body></html>`;
  return {to:[prefs.activity_email],subject,html,text};
}
async function sendOwnerDeadlineReminder(sendDate,daysBefore,prefs){
  const runKey=`taskxvs-deadline-${sendDate}-${daysBefore}d`;
  const dueDate=addIsoDays(sendDate,daysBefore);
  const client=await pool.connect();
  let inTransaction=false;
  try{
    await client.query("BEGIN");inTransaction=true;
    const lock=await client.query("SELECT pg_try_advisory_xact_lock(hashtext($1)) AS locked",[runKey]);
    if(!lock.rows[0]?.locked){await client.query("ROLLBACK");inTransaction=false;return;}
    const prior=await client.query("SELECT status,email_payload,task_count FROM owner_reminder_email_runs WHERE run_key=$1 FOR UPDATE",[runKey]);
    if(prior.rows[0]?.status==="sent"){await client.query("ROLLBACK");inTransaction=false;return;}
    let payload=prior.rows[0]?.email_payload||null;
    let taskCount=prior.rows[0]?.task_count||0;
    if(!payload){
      const result=await client.query(
        `SELECT t.id::text,t.business_id::text,t.title,t.description,t.status,t.priority,t.deadline::text,
                b.name AS business_name
         FROM tasks t JOIN businesses b ON b.id=t.business_id
         WHERE t.status<>'done' AND t.deadline=$1::date AND b.archived=false
         ORDER BY lower(b.name),lower(t.title),t.created_at`,
        [dueDate]
      );
      if(!result.rowCount){await client.query("ROLLBACK");inTransaction=false;return;}
      taskCount=result.rowCount;
      payload=buildDeadlineReminderEmail(result.rows,prefs,daysBefore,sendDate,dueDate);
      await client.query(
        `INSERT INTO owner_reminder_email_runs(run_key,local_date,days_before,recipient_email,status,task_count,email_payload,updated_at)
         VALUES($1,$2::date,$3,$4,'sending',$5,$6::jsonb,now())
         ON CONFLICT(run_key) DO UPDATE SET status='sending',recipient_email=EXCLUDED.recipient_email,
           task_count=EXCLUDED.task_count,email_payload=EXCLUDED.email_payload,error_message=NULL,updated_at=now()`,
        [runKey,sendDate,daysBefore,prefs.activity_email,taskCount,JSON.stringify(payload)]
      );
    }else{
      await client.query("UPDATE owner_reminder_email_runs SET status='sending',error_message=NULL,updated_at=now() WHERE run_key=$1",[runKey]);
    }
    const providerId=await sendResendEmail(payload,runKey);
    await client.query(
      "UPDATE owner_reminder_email_runs SET status='sent',provider_id=$2,error_message=NULL,sent_at=now(),updated_at=now() WHERE run_key=$1",
      [runKey,providerId]
    );
    await client.query("COMMIT");inTransaction=false;
    console.log(`Owner deadline reminder sent: ${daysBefore} day(s), ${taskCount} task(s).`);
  }catch(error){
    if(inTransaction){
      await client.query(
        "UPDATE owner_reminder_email_runs SET status='failed',error_message=$2,updated_at=now() WHERE run_key=$1",
        [runKey,String(error.message||error).slice(0,700)]
      ).catch(()=>{});
      await client.query("COMMIT").catch(()=>{});
      inTransaction=false;
    }
    console.error("Owner deadline reminder failed:",error.message);
  }finally{
    if(inTransaction)await client.query("ROLLBACK").catch(()=>{});
    client.release();
  }
}
async function checkOwnerDeadlineReminders(){
  try{
    const prefs=await getOwnerNotificationPreferences();
    if(!prefs.deadline_reminders_enabled||!prefs.activity_email||!RESEND_API_KEY||!RESEND_FROM)return;
    const now=getZonedDateParts(prefs.timezone);
    if(now.hour<9)return;
    await sendOwnerDeadlineReminder(now.date,7,prefs);
    await sendOwnerDeadlineReminder(now.date,2,prefs);
    await sendOwnerDeadlineReminder(now.date,1,prefs);
  }catch(error){
    console.error("Owner deadline reminder sweep failed:",error.message);
  }
}
async function sendBusinessWhatsAppNotification(businessId,event,task) {
  try{
    const business=await businessRow(businessId);
    if(!business)return;
    const recipients=[];
    const ownerResult=await pool.query("SELECT setting_value FROM workspace_settings WHERE setting_key='owner_whatsapp' LIMIT 1");
    const owner=ownerResult.rows[0]?.setting_value||{};
    if(owner.whatsapp_number&&owner.whatsapp_notifications_enabled===true)recipients.push({userId:null,number:owner.whatsapp_number});
    const members=await pool.query(
      "SELECT DISTINCT u.id,u.whatsapp_number FROM users u JOIN business_assignments a ON a.user_id=u.id WHERE a.business_id=$1 AND u.active=true AND u.whatsapp_notifications_enabled=true AND u.whatsapp_number IS NOT NULL AND u.whatsapp_number<>''",
      [businessId]
    );
    for(const member of members.rows)recipients.push({userId:member.id,number:member.whatsapp_number});
    const unique=new Map();
    for(const recipient of recipients){
      const normalized=String(recipient.number||"").replace(/\D/g,"");
      if(normalized&&!unique.has(normalized))unique.set(normalized,{...recipient,number:"+"+normalized});
    }
    const labels={"Task added":"Task added","Task updated":"Task updated","Task delayed":"Task delayed","Task done":"Task completed","In progress":"Task in progress","To do":"Task moved to To do","Task deleted":"Task deleted"};
    const eventLabel=labels[event]||event;
    const deadline=task?.deadline?String(task.deadline):"No deadline set";
    const status=task?.status==="done"?"Done":task?.status==="in_progress"?"In progress":event==="Task delayed"?"Delayed":"To do";
    const priority=String(task?.priority||"Normal");
    const title=String(task?.title||"Workspace update");
    const taskUrl="https://task.shakilxvs.com";
    const message=[
      "TASKXVS  |  "+business.name,
      "",
      eventLabel,
      title,
      task?.description?String(task.description).slice(0,500):"",
      "",
      "Status: "+status,
      "Priority: "+priority,
      "Deadline: "+deadline,
      "",
      taskUrl,
      "",
      "You receive this because you opted in to TaskXVS notifications for this workspace."
    ].filter(Boolean).join("\n");
    for(const recipient of unique.values()){
      let logId=null;
      try{
        const log=await pool.query(
          "INSERT INTO whatsapp_notification_logs (recipient_user_id,business_id,task_id,event_type,recipient_number,status) VALUES ($1,$2,$3,$4,$5,'queued') RETURNING id",
          [recipient.userId,businessId,task?.id||null,event,recipient.number]
        );
        logId=log.rows[0].id;
        await pool.query(
          "INSERT INTO whatsapp_gateway.outbound_queue (notification_log_id,recipient_number,message_body) VALUES ($1,$2,$3)",
          [logId,recipient.number,message]
        );
      }catch(error){
        if(logId)await pool.query("UPDATE whatsapp_notification_logs SET status='failed',error_message=$2 WHERE id=$1",[logId,String(error.message).slice(0,1000)]).catch(()=>{});
        console.error("WhatsApp notification queue failed:",error.message);
      }
    }
  }catch(error){console.error("WhatsApp recipient lookup failed:",error.message);}
}
async function businessRow(businessId) {
  const result = await pool.query("SELECT * FROM businesses WHERE id=$1", [businessId]);
  return result.rows[0] || null;
}
async function checkDelayedTaskNotifications() {
  const due=await pool.query(`SELECT t.*,b.name AS business_name,b.notification_email,b.email_notifications
    FROM tasks t JOIN businesses b ON b.id=t.business_id
    WHERE t.status <> 'done' AND t.deadline < (now() AT TIME ZONE 'Asia/Dhaka')::date
      AND t.delayed_notified_at IS NULL`);
  for(const task of due.rows){
    const claim=await pool.query("UPDATE tasks SET delayed_notified_at=now() WHERE id=$1 AND delayed_notified_at IS NULL RETURNING id",[task.id]);
    if(!claim.rowCount)continue;
    await recordSystemActivity({event_type:"task_delayed",entity_type:"task",entity_id:task.id,business_id:task.business_id,title:`Task delayed: ${task.title}`,details:{deadline:task.deadline,status:task.status}});
    sendBusinessWhatsAppNotification(task.business_id,"Task delayed",task);
    if(task.email_notifications&&task.notification_email&&RESEND_API_KEY&&RESEND_FROM){
      const sent=await sendBusinessNotification({name:task.business_name,notification_email:task.notification_email,email_notifications:task.email_notifications},"Task delayed",task);
      if(!sent)console.error("Delayed task email could not be sent for:",task.id);
    }
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
    const whatsapp=await getWhatsAppGatewayStatus();
    res.set("Cache-Control", "no-store").json({
      businesses: businessRows, categories: categories.rows, tasks: tasks.rows,
      user: req.auth,
      emailConfigured: Boolean(RESEND_API_KEY && RESEND_FROM),
      whatsappConfigured: whatsapp.connected
    });
  } catch (e) { next(e); }
});

app.get("/api/admin/whatsapp/status",requireAuth,requireOwner,async(req,res,next)=>{
  try{
    const state=await getWhatsAppGatewayStatus();
    res.set("Cache-Control","no-store").json(state);
  }catch(e){next(e);}
});
app.post("/api/admin/whatsapp/reconnect",requireAuth,requireOwner,async(req,res,next)=>{
  let client=null;
  let transactionOpen=false;
  try{
    client=await pool.connect();
    await client.query("BEGIN");
    transactionOpen=true;
    const current=await client.query(
      "SELECT status,last_seen_at,updated_at FROM whatsapp_gateway.gateway_state WHERE id=true FOR UPDATE"
    );
    if(!current.rowCount){
      await client.query("ROLLBACK");
      transactionOpen=false;
      return res.status(503).json({error:"WhatsApp connection state is not initialized yet. Start the worker once, then retry."});
    }
    const row=current.rows[0];
    const now=Date.now();
    const lastSeen=row.last_seen_at?new Date(row.last_seen_at).getTime():0;
    const updatedAt=row.updated_at?new Date(row.updated_at).getTime():0;
    const connectedFresh=row.status==="connected"&&lastSeen>0&&(now-lastSeen)<45*60*1000;
    const handshakeFresh=["connecting","qr"].includes(row.status)&&updatedAt>0&&(now-updatedAt)<5*60*1000;
    if(connectedFresh||handshakeFresh){
      await client.query("ROLLBACK");
      transactionOpen=false;
      return res.status(409).json({
        error:"The WhatsApp worker still appears active. Cancel its current GitHub Actions run, wait for it to stop, then retry reconnecting."
      });
    }

    // Only the saved WhatsApp Web credentials are removed. Task, business,
    // notification queue, notification history and other workspace data stay untouched.
    await client.query("DELETE FROM whatsapp_gateway.auth_kv");
    await client.query(
      "UPDATE whatsapp_gateway.gateway_state SET status='disconnected',qr_data_url=NULL,phone_number=NULL,last_seen_at=NULL,last_error=$1,updated_at=now() WHERE id=true",
      ["RECONNECT_READY:Previous WhatsApp login cleared. Start the TaskXVS WhatsApp worker workflow to generate a fresh QR code."]
    );
    await client.query("COMMIT");
    transactionOpen=false;

    const state=await getWhatsAppGatewayStatus();
    res.set("Cache-Control","no-store").json({
      ...state,
      message:"The previous WhatsApp login was cleared. Start the TaskXVS WhatsApp worker workflow to generate a fresh QR code."
    });
  }catch(error){
    if(transactionOpen&&client)await client.query("ROLLBACK").catch(()=>{});
    next(error);
  }finally{
    client?.release();
  }
});
app.post("/api/admin/whatsapp/test",requireAuth,requireOwner,async(req,res,next)=>{
  try{
    const ownerResult=await pool.query("SELECT setting_value FROM workspace_settings WHERE setting_key='owner_whatsapp' LIMIT 1");
    const owner=ownerResult.rows[0]?.setting_value||{};
    if(!owner.whatsapp_number||owner.whatsapp_notifications_enabled!==true){
      return res.status(400).json({error:"Save your WhatsApp number and enable notification opt-in under My account first."});
    }
    const message="TASKXVS test message\n\nYour cloud WhatsApp connection is ready.\n\nhttps://task.shakilxvs.com";
    const log=await pool.query(
      "INSERT INTO whatsapp_notification_logs (event_type,recipient_number,status) VALUES ('connection_test',$1,'queued') RETURNING id",
      [owner.whatsapp_number]
    );
    await pool.query(
      "INSERT INTO whatsapp_gateway.outbound_queue (notification_log_id,recipient_number,message_body) VALUES ($1,$2,$3)",
      [log.rows[0].id,owner.whatsapp_number,message]
    );
    res.json({ok:true,queued:true,message:"Test message added to the cloud queue. It will send when the free worker is connected."});
  }catch(e){next(e);}
});
app.get("/api/admin/whatsapp/logs",requireAuth,requireOwner,async(req,res,next)=>{
  try{
    const limit=Math.max(1,Math.min(100,Number.parseInt(req.query.limit,10)||50));
    const result=await pool.query("SELECT l.id,l.event_type,l.recipient_number,COALESCE(q.status,l.status) AS status,COALESCE(q.error_message,l.error_message) AS error_message,l.created_at,COALESCE(q.sent_at,l.sent_at) AS sent_at,l.delivered_at,l.read_at,b.name AS business_name,t.title AS task_title,u.display_name AS recipient_name FROM whatsapp_notification_logs l LEFT JOIN whatsapp_gateway.outbound_queue q ON q.notification_log_id=l.id LEFT JOIN businesses b ON b.id=l.business_id LEFT JOIN tasks t ON t.id=l.task_id LEFT JOIN users u ON u.id=l.recipient_user_id ORDER BY l.created_at DESC LIMIT $1",[limit]);
    res.set("Cache-Control","no-store").json({logs:result.rows});
  }catch(e){next(e);}
});

app.get("/api/admin/activity",requireAuth,requireOwner,async(req,res,next)=>{
  try{
    const limit=Math.max(1,Math.min(100,Number.parseInt(req.query.limit,10)||60));
    const before=req.query.before?String(req.query.before):null;
    const result=await pool.query(
      `SELECT a.*,b.name AS business_name
       FROM activity_log a
       LEFT JOIN businesses b ON b.id::text=a.business_id
       WHERE ($2::timestamptz IS NULL OR a.created_at<$2::timestamptz)
       ORDER BY a.created_at DESC,a.id DESC LIMIT $1`,
      [limit,before]
    );
    res.set("Cache-Control","no-store").json({events:result.rows});
  }catch(e){next(e);}
});


/* Owner-managed users and per-business permissions. */
app.get("/api/admin/users", requireAuth, requireOwner, async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT u.id,u.username,u.display_name,u.email,u.whatsapp_number,u.whatsapp_notifications_enabled,u.active,u.created_at,
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
    const whatsappNumber = normalizeWhatsAppNumber(req.body?.whatsapp_number);
    const whatsappEnabled = req.body?.whatsapp_notifications_enabled === true;
    const password = String(req.body?.password || "");
    const assignments = Array.isArray(req.body?.assignments) ? req.body.assignments : [];
    if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) return res.status(400).json({ error: "Username must be 3–40 characters using letters, numbers, dots, underscores or hyphens." });
    if (password.length < 4) return res.status(400).json({ error: "Use a password with at least 4 characters." });
    if (!displayName || displayName.length > 80) return res.status(400).json({ error: "Enter a display name." });
    if (email && !validEmailList(email)) return res.status(400).json({ error: "Enter a valid email address." });
    const credentials = newPasswordRecord(password);
    await client.query("BEGIN");
    const created = await client.query(
      "INSERT INTO users (username,display_name,email,whatsapp_number,whatsapp_notifications_enabled,password_salt,password_hash) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id,username,display_name,email,whatsapp_number,whatsapp_notifications_enabled,active",
      [username,displayName,email,whatsappNumber,whatsappEnabled,credentials.salt,credentials.hash]
    );
    for (const assignment of assignments) {
      if (!["read","write"].includes(assignment.permission)) throw Object.assign(new Error("Invalid business permission."),{status:400});
      const restricted=await client.query("SELECT id FROM businesses WHERE id=$1 AND created_by_user_id IS NOT NULL AND created_by_user_id<>$2",[assignment.business_id,created.rows[0].id]);
      if(restricted.rowCount)throw Object.assign(new Error("A member-created business is private to its creator and the workspace owner."),{status:403});
      await client.query(
        "INSERT INTO business_assignments (user_id,business_id,permission) VALUES ($1,$2,$3)",
        [created.rows[0].id,assignment.business_id,assignment.permission]
      );
    }
    await client.query("COMMIT");
    res.status(201).json(created.rows[0]);
    recordActivity(req,{event_type:"team_member_created",entity_type:"team_member",entity_id:created.rows[0].id,title:`Created team member ${username}`,details:{username,display_name:displayName,assigned_business_count:assignments.length,assignments:assignments.map(a=>({business_id:a.business_id,permission:a.permission}))}});
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
    if (req.body?.display_name !== undefined || req.body?.email !== undefined || req.body?.active !== undefined || req.body?.whatsapp_number !== undefined || req.body?.whatsapp_notifications_enabled !== undefined) {
      await client.query(
        `UPDATE users SET
          display_name=COALESCE($2,display_name),
          email=CASE WHEN $3::boolean THEN $4 ELSE email END,
          active=COALESCE($5,active),
          whatsapp_number=CASE WHEN $6::boolean THEN $7 ELSE whatsapp_number END,
          whatsapp_notifications_enabled=COALESCE($8,whatsapp_notifications_enabled),
          token_version=CASE WHEN $5=false THEN token_version+1 ELSE token_version END
         WHERE id=$1`,
        [req.params.id,
          req.body.display_name === undefined ? null : String(req.body.display_name).trim(),
          req.body.email !== undefined,
          String(req.body.email || "").trim() || null,
          typeof req.body.active === "boolean" ? req.body.active : null,
          req.body.whatsapp_number !== undefined,
          normalizeWhatsAppNumber(req.body.whatsapp_number),
          typeof req.body.whatsapp_notifications_enabled === "boolean" ? req.body.whatsapp_notifications_enabled : null]
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
      for (const assignment of req.body.assignments) {
        if (!["read","write"].includes(assignment.permission)) throw Object.assign(new Error("Invalid business permission."),{status:400});
        const restricted=await client.query("SELECT id FROM businesses WHERE id=$1 AND created_by_user_id IS NOT NULL AND created_by_user_id<>$2",[assignment.business_id,req.params.id]);
        if(restricted.rowCount)throw Object.assign(new Error("A member-created business is private to its creator and the workspace owner."),{status:403});
      }
      await client.query("DELETE FROM business_assignments WHERE user_id=$1",[req.params.id]);
      for (const assignment of req.body.assignments) {
        await client.query("INSERT INTO business_assignments (user_id,business_id,permission) VALUES ($1,$2,$3)",
          [req.params.id,assignment.business_id,assignment.permission]);
      }
    }
    const result=await client.query("SELECT id,username,display_name,email,whatsapp_number,whatsapp_notifications_enabled,active FROM users WHERE id=$1",[req.params.id]);
    await client.query("COMMIT");
    res.json(result.rows[0]);
    const eventType=typeof req.body.active==="boolean"?(req.body.active?"team_member_enabled":"team_member_disabled"):"team_member_updated";
    recordActivity(req,{event_type:eventType,entity_type:"team_member",entity_id:req.params.id,title:`Updated team member ${result.rows[0].username}`,details:{display_name:result.rows[0].display_name,active:result.rows[0].active,assignments_changed:Array.isArray(req.body?.assignments),assignments:Array.isArray(req.body?.assignments)?req.body.assignments.map(a=>({business_id:a.business_id,permission:a.permission})):undefined}});
  } catch(e) {
    await client.query("ROLLBACK");
    if(e.code==="23503")return res.status(400).json({error:"One of the selected businesses does not exist."});
    next(e);
  } finally { client.release(); }
});
app.delete("/api/admin/users/:id", requireAuth, requireOwner, async (req,res,next) => {
  try {
    const current=await pool.query("SELECT id,username,display_name FROM users WHERE id=$1",[req.params.id]);
    if(!current.rowCount)return res.status(404).json({error:"User not found."});
    await pool.query("DELETE FROM users WHERE id=$1",[req.params.id]);
    res.json({ok:true});
    recordActivity(req,{event_type:"team_member_deleted",entity_type:"team_member",entity_id:req.params.id,title:`Deleted team member ${current.rows[0].username}`,details:{display_name:current.rows[0].display_name}});
  } catch(e){next(e);}
});

/* Business administration is owner-only. */
app.post("/api/businesses", requireAuth, async (req, res, next) => {
  const client=await pool.connect();
  try {
    const name=String(req.body?.name||"").trim();
    const email=String(req.body?.notification_email||"").trim()||null;
    const emailEnabled=Boolean(req.body?.email_notifications);
    if(!name||name.length>60)return res.status(400).json({error:"Business name must be between 1 and 60 characters."});
    if(!validEmailList(email))return res.status(400).json({error:"Enter up to 10 valid notification email addresses separated by commas."});
    if(req.auth.role==="member"){
      const access=await client.query("SELECT 1 FROM business_assignments WHERE user_id=$1 AND permission='write' LIMIT 1",[req.auth.id]);
      if(!access.rowCount)return res.status(403).json({error:"Read & write access is required to create a business."});
    }
    await client.query("BEGIN");
    const created=await client.query(
      "INSERT INTO businesses (name,notification_email,email_notifications,created_by_user_id,position) VALUES ($1,$2,$3,$4,COALESCE((SELECT max(position)+1 FROM businesses),1)) RETURNING *",
      [name,email,emailEnabled,req.auth.role==="member"?req.auth.id:null]
    );
    if(req.auth.role==="member"){
      await client.query("INSERT INTO business_assignments (user_id,business_id,permission) VALUES ($1,$2,'write')",[req.auth.id,created.rows[0].id]);
    }
    await client.query("COMMIT");
    res.status(201).json(created.rows[0]);
    recordActivity(req,{event_type:"business_created",entity_type:"business",entity_id:created.rows[0].id,business_id:created.rows[0].id,title:`Created business ${name}`,details:{notification_email:email,email_notifications:emailEnabled}});
  }catch(e){
    await client.query("ROLLBACK");
    if(e.code==="23505")return res.status(409).json({error:"A business with that name already exists."});
    next(e);
  }finally{client.release();}
});
app.patch("/api/businesses/:id", requireAuth, async (req,res,next)=>{
  try{
    const current=await pool.query("SELECT * FROM businesses WHERE id=$1",[req.params.id]);
    if(!current.rowCount)return res.status(404).json({error:"Business not found."});
    const business=current.rows[0];
    const owner=req.auth.role==="owner";
    const creator=req.auth.role==="member"&&String(business.created_by_user_id||"")===String(req.auth.id);
    if(!owner&&!creator)return res.status(403).json({error:"Only the creator and workspace owner can edit this business."});
    if(!owner&&!await requireBusinessAccess(req,res,business.id,true))return;
    const name=req.body?.name===undefined?null:String(req.body.name).trim();
    const email=req.body?.notification_email===undefined?null:(String(req.body.notification_email||"").trim()||null);
    const enabled=typeof req.body?.email_notifications==="boolean"?req.body.email_notifications:null;
    const archived=typeof req.body?.archived==="boolean"?req.body.archived:null;
    if(name!==null&&(!name||name.length>60))return res.status(400).json({error:"Business name must be between 1 and 60 characters."});
    if(req.body?.notification_email!==undefined&&!validEmailList(email))return res.status(400).json({error:"Enter up to 10 valid notification email addresses."});
    const result=await pool.query(
      `UPDATE businesses SET name=COALESCE($2,name),
       notification_email=CASE WHEN $3::boolean THEN $4 ELSE notification_email END,
       email_notifications=COALESCE($5,email_notifications),
       archived=COALESCE($6,archived)
       WHERE id=$1 RETURNING *`,
      [req.params.id,name,req.body?.notification_email!==undefined,email,enabled,archived]
    );
    res.json(result.rows[0]);
    const eventType=typeof archived==="boolean"?(archived?"business_archived":"business_restored"):"business_updated";
    recordActivity(req,{event_type:eventType,entity_type:"business",entity_id:business.id,business_id:business.id,title:`${eventType==="business_archived"?"Archived":eventType==="business_restored"?"Restored":"Updated"} business ${result.rows[0].name}`,details:{before:{name:business.name,notification_email:business.notification_email,email_notifications:business.email_notifications},after:{name:result.rows[0].name,notification_email:result.rows[0].notification_email,email_notifications:result.rows[0].email_notifications}}});
  }catch(e){
    if(e.code==="23505")return res.status(409).json({error:"A business with that name already exists."});
    next(e);
  }
});
app.delete("/api/businesses/:id", requireAuth, requireOwner, async (req,res,next)=>{
  try{
    const current=await pool.query("SELECT id,name FROM businesses WHERE id=$1",[req.params.id]);
    if(!current.rowCount)return res.status(404).json({error:"Business not found."});
    await pool.query("DELETE FROM businesses WHERE id=$1",[req.params.id]);
    res.json({ok:true});
    recordActivity(req,{event_type:"business_deleted",entity_type:"business",entity_id:current.rows[0].id,business_id:current.rows[0].id,title:`Deleted business ${current.rows[0].name}`,details:{}});
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
    recordActivity(req,{event_type:"category_created",entity_type:"category",entity_id:result.rows[0].id,business_id:businessId,title:`Created category ${name}`,details:{icon,color,business_id:businessId}});
  }catch(e){
    if(e.code==="23505")return res.status(409).json({error:"That category already exists in this business."});
    if(e.code==="23503")return res.status(400).json({error:"The selected business does not exist."});
    next(e);
  }
});
app.patch("/api/categories/:id",requireAuth,async(req,res,next)=>{
  try{
    const current=await pool.query("SELECT business_id,name,icon,color FROM categories WHERE id=$1",[req.params.id]);
    if(!current.rowCount)return res.status(404).json({error:"Category not found."});
    if(!await requireBusinessAccess(req,res,current.rows[0].business_id,true))return;
    const name=req.body?.name===undefined?null:String(req.body.name).trim();
    if(name!==null&&(!name||name.length>50))return res.status(400).json({error:"Category name must be between 1 and 50 characters."});
    const result=await pool.query(
      "UPDATE categories SET name=COALESCE($2,name),icon=COALESCE($3,icon),color=COALESCE($4,color) WHERE id=$1 RETURNING *",
      [req.params.id,name,req.body?.icon??null,req.body?.color??null]
    );
    res.json(result.rows[0]);
    recordActivity(req,{event_type:"category_updated",entity_type:"category",entity_id:req.params.id,business_id:current.rows[0].business_id,title:`Updated category ${result.rows[0].name}`,details:{before:{name:current.rows[0].name,icon:current.rows[0].icon,color:current.rows[0].color},after:{name:result.rows[0].name,icon:result.rows[0].icon,color:result.rows[0].color}}});
  }catch(e){next(e);}
});
app.delete("/api/categories/:id",requireAuth,async(req,res,next)=>{
  try{
    const current=await pool.query("SELECT business_id,name FROM categories WHERE id=$1",[req.params.id]);
    if(!current.rowCount)return res.status(404).json({error:"Category not found."});
    if(!await requireBusinessAccess(req,res,current.rows[0].business_id,true))return;
    await pool.query("DELETE FROM categories WHERE id=$1",[req.params.id]);
    res.json({ok:true});
    recordActivity(req,{event_type:"category_deleted",entity_type:"category",entity_id:req.params.id,business_id:current.rows[0].business_id,title:`Deleted category ${current.rows[0].name}`,details:{}});
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
    sendBusinessWhatsAppNotification(v.business_id,"Task added",result.rows[0]);
    recordActivity(req,{event_type:"task_created",entity_type:"task",entity_id:result.rows[0].id,business_id:v.business_id,title:`Added task ${result.rows[0].title}`,details:{status:result.rows[0].status,priority:result.rows[0].priority,deadline:result.rows[0].deadline,description:result.rows[0].description}});
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
    if(v.status!==existing.rows[0].status)return res.status(400).json({error:"Use the task status control and confirm the change before saving."});
    if(!await requireBusinessAccess(req,res,v.business_id,true))return;
    const result=await pool.query(
      `UPDATE tasks SET business_id=$2,category_id=$3,title=$4,description=$5,notes=$6,status=$7,priority=$8,created_date=$9,start_date=$10,deadline=$11,
       completed_at=CASE WHEN $7='done' THEN COALESCE(completed_at,now()) ELSE NULL END,
       delayed_notified_at=CASE WHEN $7='done' OR $11::date IS NULL OR $11::date >= (now() AT TIME ZONE 'Asia/Dhaka')::date THEN NULL ELSE delayed_notified_at END WHERE id=$1 RETURNING *`,
      [req.params.id,v.business_id,v.category_id,v.title,v.description,v.notes,v.status,v.priority,v.created_date,v.start_date,v.deadline]
    );
    res.json(result.rows[0]);
    if(["title","description","notes","category_id","deadline","priority","created_date","start_date","business_id"].some(key=>String(existing.rows[0][key]??"")!==String(result.rows[0][key]??""))){
      const keys=["title","description","notes","category_id","deadline","priority","created_date","start_date","business_id"];
      const before={},after={};
      for(const key of keys){before[key]=existing.rows[0][key];after[key]=result.rows[0][key];}
      recordActivity(req,{event_type:"task_updated",entity_type:"task",entity_id:result.rows[0].id,business_id:result.rows[0].business_id,title:`Updated task ${result.rows[0].title}`,details:{before,after}});
      sendBusinessWhatsAppNotification(result.rows[0].business_id,"Task updated",result.rows[0]);
    }
    if(existing.rows[0].status!=="in_progress"&&result.rows[0].status==="in_progress"){
      const business=await businessRow(v.business_id);
      sendBusinessNotification(business,"In progress",result.rows[0]);
      sendBusinessWhatsAppNotification(v.business_id,"In progress",result.rows[0]);
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
    if(task.status!==status&&!req.body?.confirm_status_change)return res.status(400).json({error:"Confirm the status change before saving it."});
    if(status==="done"&&task.status!=="done"&&!req.body?.confirm_completion)return res.status(400).json({error:"Confirm completion before marking this task done."});
    const updated=await pool.query(`UPDATE tasks SET status=$2,
      completed_at=CASE WHEN $2='done' THEN COALESCE(completed_at,now()) ELSE NULL END,
      completion_note=CASE WHEN $2='done' THEN NULLIF($3,'') ELSE NULL END,
      delayed_notified_at=CASE WHEN $2='done' THEN NULL ELSE delayed_notified_at END
      WHERE id=$1 RETURNING *`,[req.params.id,status,note]);
    res.json(updated.rows[0]);
    const business=await businessRow(task.business_id);
    if(task.status!==status&&status==="done")sendBusinessNotification(business,"Task done",updated.rows[0]);
    else if(task.status!==status&&status==="in_progress")sendBusinessNotification(business,"In progress",updated.rows[0]);
    if(task.status!==status)sendBusinessWhatsAppNotification(task.business_id,status==="done"?"Task done":status==="in_progress"?"In progress":"To do",updated.rows[0]);
    if(task.status!==status)recordActivity(req,{event_type:"task_status_changed",entity_type:"task",entity_id:task.id,business_id:task.business_id,title:`Changed ${task.title} to ${status==="done"?"Done":status==="in_progress"?"In progress":"To do"}`,details:{from:task.status,to:status,note:status==="done"?note:null}});
  }catch(e){next(e);}
});
app.delete("/api/tasks/:id",requireAuth,async(req,res,next)=>{
  try{
    const current=await pool.query("SELECT * FROM tasks WHERE id=$1",[req.params.id]);
    if(!current.rowCount)return res.status(404).json({error:"Task not found."});
    if(!await requireBusinessAccess(req,res,current.rows[0].business_id,true))return;
    await pool.query("DELETE FROM tasks WHERE id=$1",[req.params.id]);
    res.json({ok:true});
    recordActivity(req,{event_type:"task_deleted",entity_type:"task",entity_id:current.rows[0].id,business_id:current.rows[0].business_id,title:`Deleted task ${current.rows[0].title}`,details:{status:current.rows[0].status,deadline:current.rows[0].deadline}});
    sendBusinessWhatsAppNotification(current.rows[0].business_id,"Task deleted",current.rows[0]);
  }catch(e){next(e);}
});

app.post("/api/internal/notifications/deadlines",async(req,res,next)=>{
  try{
    const result=await pool.query("SELECT token FROM whatsapp_gateway.scheduler_token WHERE id=true LIMIT 1");
    const expected=result.rows[0]?.token||"";
    const supplied=String(req.get("x-taskxvs-scheduler-token")||"");
    if(!expected||!supplied||!safeEqual(supplied,expected)){
      return res.status(401).json({error:"Scheduler authorization failed."});
    }
    await checkOwnerDeadlineReminders();
    res.set("Cache-Control","no-store").json({ok:true,checked_at:new Date().toISOString()});
  }catch(error){next(error);}
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
  checkOwnerDeadlineReminders().catch(error=>console.error("Owner deadline reminder check failed:",error.message));
  const delayedTimer=setInterval(()=>{
    checkDelayedTaskNotifications().catch(error=>console.error("Delayed task check failed:",error.message));
    checkOwnerDeadlineReminders().catch(error=>console.error("Owner deadline reminder check failed:",error.message));
  },5*60*1000);
  delayedTimer.unref();
}).catch(error=>{console.error("Database initialization failed:",error);process.exit(1);});
process.on("SIGTERM",async()=>{await pool.end();process.exit(0);});
