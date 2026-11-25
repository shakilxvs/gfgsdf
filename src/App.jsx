import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlarmClock, Archive, ArrowDownWideNarrow, ArrowLeft, ArrowUpRight,
  Bell, BriefcaseBusiness, CalendarDays, Check, CheckCheck, ChevronDown,
  CircleDot, Clock3, Code2, Ellipsis, Eye, Filter, LayoutDashboard, List,
  LogOut, Mail, Megaphone, Menu, MoreHorizontal, Palette, PenLine, Percent,
  Plus, Search, Settings, ShoppingBag, SlidersHorizontal, Tag, Trash2,
  Video, Wallet, X, Pencil, RotateCcw, AlertCircle, CalendarRange,
  Layers3, CircleCheck, CircleAlert, ChevronLeft, ChevronRight, Grid2X2, Sparkles, Lock,
  Terminal, PanelTop, Blocks, Bug, ClipboardCheck, Plug, Workflow, SearchCheck, FileText,
  NotebookPen, Instagram, ChartNoAxesCombined, ChartLine, ListChecks, PackageSearch,
  Truck, Boxes, Warehouse, ShoppingBasket, Headset, Microscope, Shapes, BadgePercent,
  Settings2, ShieldCheck, Users, UserPlus, Building2, CalendarClock, CircleUserRound,
  Send, MessageCircle, UserRound, LockKeyhole, MailCheck, BellRing, Paperclip, Download
} from "lucide-react";

const ICONS = {
  "shopping-bag": ShoppingBag, percent: Percent, tag: Tag, video: Video,
  mail: Mail, megaphone: Megaphone, palette: Palette, code: Code2, "code-2": Code2,
  search: Search, "search-check": SearchCheck, "pen-line": PenLine, "file-text": FileText,
  "notebook-pen": NotebookPen, instagram: Instagram, "chart-no-axes-combined": ChartNoAxesCombined,
  "chart-line": ChartLine, "list-checks": ListChecks, "package-search": PackageSearch,
  truck: Truck, boxes: Boxes, warehouse: Warehouse, "shopping-basket": ShoppingBasket,
  headset: Headset, microscope: Microscope, shapes: Shapes, "badge-percent": BadgePercent,
  "settings-2": Settings2, terminal: Terminal, "panel-top": PanelTop, blocks: Blocks,
  bug: Bug, "clipboard-check": ClipboardCheck, plug: Plug, workflow: Workflow,
  wallet: Wallet, "circle-dot": CircleDot, briefcase: BriefcaseBusiness,
  calendar: CalendarDays, activity: Activity, layers: Layers3, sparkles: Sparkles,
  ShoppingBag, Percent, Tag, Video, Mail, Megaphone, Palette, Code2, Search,
  PenLine, Settings, Wallet, CircleDot, BriefcaseBusiness, CalendarDays,
  Activity, Layers3, Sparkles
};
const COLORS = ["#d97737","#bd6c3f","#aa7955","#b86b45","#c28c49","#788d79","#927a9e","#6b8491"];

const TIME_ZONE_FALLBACK = [
  "America/New_York","America/Detroit","America/Chicago","America/Denver","America/Phoenix",
  "America/Los_Angeles","America/Anchorage","Pacific/Honolulu","America/Toronto","America/Vancouver",
  "America/Sao_Paulo","Europe/London","Europe/Amsterdam","Europe/Paris","Europe/Berlin",
  "Europe/Istanbul","Asia/Dubai","Asia/Dhaka","Asia/Kolkata","Asia/Singapore","Asia/Bangkok",
  "Asia/Shanghai","Asia/Hong_Kong","Asia/Tokyo","Asia/Seoul","Australia/Sydney","Pacific/Auckland"
];
const TIME_ZONE_VALUES = typeof Intl.supportedValuesOf === "function"
  ? Intl.supportedValuesOf("timeZone")
  : TIME_ZONE_FALLBACK;
const TIME_ZONE_OPTIONS = TIME_ZONE_VALUES.map(value=>({
  value,
  label:value==="America/New_York"?"New York · Eastern Time":value.replaceAll("_"," ").replaceAll("/"," / ")
}));
const TIME_ZONE_SEARCH_ALIASES = {
  "America/New_York":"United States USA New York New York State Eastern Eastern Time",
  "America/Detroit":"United States USA Michigan Detroit Eastern",
  "America/Chicago":"United States USA Illinois Texas Central Central Time",
  "America/Denver":"United States USA Colorado Mountain Mountain Time",
  "America/Phoenix":"United States USA Arizona Phoenix Mountain",
  "America/Los_Angeles":"United States USA California Los Angeles Pacific Pacific Time",
  "America/Anchorage":"United States USA Alaska Anchorage",
  "Pacific/Honolulu":"United States USA Hawaii Honolulu",
  "America/Toronto":"Canada Ontario Toronto Eastern",
  "America/Vancouver":"Canada British Columbia Vancouver Pacific",
  "America/Sao_Paulo":"Brazil Brasil Sao Paulo",
  "Europe/London":"United Kingdom UK England London GMT",
  "Europe/Amsterdam":"Netherlands Holland Amsterdam",
  "Europe/Paris":"France Paris",
  "Europe/Berlin":"Germany Deutschland Berlin",
  "Europe/Istanbul":"Turkey Türkiye Istanbul",
  "Asia/Dubai":"United Arab Emirates UAE Dubai",
  "Asia/Jerusalem":"Israel Israeli Jerusalem Tel Aviv Tel-Aviv Israel Standard Time Israel Daylight Time",
  "Asia/Dhaka":"Bangladesh Dhaka",
  "Asia/Kolkata":"India Kolkata Delhi Mumbai Indian Standard Time",
  "Asia/Singapore":"Singapore",
  "Asia/Bangkok":"Thailand Bangkok",
  "Asia/Shanghai":"China Shanghai Beijing",
  "Asia/Hong_Kong":"Hong Kong China",
  "Asia/Tokyo":"Japan Tokyo",
  "Asia/Seoul":"South Korea Korea Seoul",
  "Australia/Sydney":"Australia Sydney New South Wales",
  "Pacific/Auckland":"New Zealand Auckland"
};

const PRIORITIES = [
  { value:"low", label:"Low" }, { value:"normal", label:"Normal" },
  { value:"high", label:"High" }, { value:"urgent", label:"Urgent" }
];
const STATUSES = [
  { value:"todo", label:"To do" }, { value:"in_progress", label:"In progress" },
  { value:"done", label:"Done" }
];
const ICON_OPTIONS = [
  "shopping-bag","percent","badge-percent","tag","video","mail","megaphone","palette",
  "code-2","terminal","panel-top","blocks","bug","clipboard-check","plug","workflow",
  "search-check","file-text","notebook-pen","instagram","chart-no-axes-combined","chart-line",
  "list-checks","package-search","truck","boxes","warehouse","shopping-basket","headset",
  "microscope","settings-2","wallet","shapes"
];
const ICON_LABELS = Object.fromEntries(ICON_OPTIONS.map(k=>[k,k.split("-").map(w=>w[0].toUpperCase()+w.slice(1)).join(" ")]));

function todayDhaka() {
  return new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Dhaka", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
}
function addDays(date, amount) {
  const d = new Date(date + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + amount); return d.toISOString().slice(0,10);
}
function dayDiff(a,b) { return Math.round((Date.parse(a+"T00:00:00Z") - Date.parse(b+"T00:00:00Z")) / 86400000); }
function formatDate(value, year=false) {
  if (!value) return "No date";
  const d = new Date(value + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { timeZone:"UTC", day:"numeric", month:"short", ...(year?{year:"numeric"}:{}) });
}
function relativeDeadline(task, today) {
  if (!task.deadline) return "No deadline";
  const days = dayDiff(task.deadline, today);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `${days} days left`;
}
function isOpen(task) { return task.status !== "done"; }
function isOverdue(task, today) { return isOpen(task) && task.deadline && task.deadline < today; }
function isDueSoon(task, today) {
  return isOpen(task) && task.deadline && task.deadline >= today && task.deadline <= addDays(today,2);
}
function priorityLabel(value) { return PRIORITIES.find(x=>x.value===value)?.label || "Normal"; }
function displayStatus(task,today) {
  if (isOverdue(task,today)) return "Delayed";
  return STATUSES.find(s=>s.value===task.status)?.label || "To do";
}
function shortDateTime(value) {
  if (!value) return "Recently";
  const d = new Date(value);
  return d.toLocaleDateString("en-GB",{day:"numeric",month:"short",timeZone:"Asia/Dhaka"});
}
async function api(path, options={}) {
  const response = await fetch(path, {
    credentials:"same-origin",
    headers:{ "Content-Type":"application/json", ...(options.headers||{}) },
    ...options
  });
  const type = response.headers.get("content-type") || "";
  const body = type.includes("application/json") ? await response.json() : {};
  if (!response.ok) throw new Error(body.error || "Something went wrong.");
  return body;
}

function Brand({collapsed=false,onClick}) {
  return <button type="button" className="brand-lockup brand-toggle" onClick={onClick} aria-label={collapsed?"Expand sidebar":"Collapse sidebar"} title={collapsed?"Expand sidebar":"Collapse sidebar"}><span className="brand-symbol"><ListChecks size={20} strokeWidth={2.4}/></span>{!collapsed&&<span className="brand-name">TASKXVS</span>}</button>;
}
function Button({children, variant="primary", size="normal", className="", ...props}) {
  return <button className={`button button-${variant} button-${size} ${className}`} {...props}>{children}</button>;
}
function IconButton({label, children, className="", ...props}) {
  return <button className={`icon-button ${className}`.trim()} aria-label={label} title={label} {...props}>{children}</button>;
}
function EmptyState({title, description, action}) {
  return <div className="empty-state"><div className="empty-icon"><Layers3 size={19}/></div><h3>{title}</h3><p>{description}</p>{action}</div>;
}
function Modal({title, subtitle, children, onClose, wide=false}) {
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className={`modal ${wide?"modal-wide":""}`} role="dialog" aria-modal="true" aria-label={title}>
      <header className="modal-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><IconButton label="Close" onClick={onClose}><X size={18}/></IconButton></header>
      {children}
    </section>
  </div>;
}
function ConfirmDialog({config,onCancel,onConfirm}) {
  if(!config)return null;
  const destructive=config.tone==="danger";
  return <Modal title={config.heading||"Please confirm"} subtitle={config.subtitle||"Review this action before continuing."} onClose={onCancel}>
    <div className={`confirm-dialog-body ${destructive?"confirm-dialog-danger":"confirm-dialog-neutral"}`}>
      <div className="confirm-dialog-icon">
        {destructive?<Trash2 size={21}/>:<Plug size={21}/>}
      </div>
      <div className="confirm-dialog-copy">
        <h3>{config.title}</h3>
        <p>{config.message}</p>
        {config.detail&&<div className="confirm-dialog-detail">{config.detail}</div>}
      </div>
    </div>
    <div className="confirm-dialog-actions">
      <Button variant="ghost" onClick={onCancel}>{config.cancelLabel||"Cancel"}</Button>
      <Button variant={destructive?"danger":"primary"} onClick={onConfirm}>{config.confirmLabel||"Continue"}</Button>
    </div>
  </Modal>;
}


function Login({onLogin}) {
  const [username,setUsername]=useState("shakilxvs");
  const [password,setPassword]=useState("");
  const [show,setShow]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    try { await onLogin(username,password); }
    catch(err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="login-screen">
    <div className="login-panel">
      <div className="login-brand"><div className="login-mark"><ListChecks size={22} strokeWidth={2.4}/></div><div className="login-wordmark">TASKXVS</div></div>
      <div className="login-copy"><h1>Welcome back.</h1><p>One workspace for all your businesses.</p></div>
      <form onSubmit={submit} className="login-form">
        <label className="field"><span>Login ID</span><div className="input-with-icon"><BriefcaseBusiness size={16}/><input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required /></div></label>
        <label className="field"><span>Password</span><div className="input-with-icon"><Lock size={15}/><input type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" minLength={4} required/><button type="button" className="reveal-button" onClick={()=>setShow(v=>!v)} aria-label={show?"Hide password":"Show password"}><Eye size={16}/></button></div></label>
        {error && <div className="login-error" role="alert"><AlertCircle size={15}/>{error}</div>}
        <Button className="login-submit" disabled={busy}>{busy?"Signing in…":<>Sign in <ArrowUpRight size={16}/></>}</Button>
      </form>
      <div className="login-foot"><span className="secure-dot"/> Secure workspace</div>
    </div>
    <div className="login-aside"><div className="aside-art"><div className="art-card art-card-one"><div className="art-label">TODAY'S FOCUS</div><div className="art-line long"/><div className="art-line medium"/><div className="art-row"><span/><span/><span/></div></div><div className="art-card art-card-two"><div className="art-check"><Check size={15}/></div><div className="art-line medium"/><div className="art-line short"/></div><div className="art-circle"/></div><div className="aside-note"><span>FOCUS BETTER.</span><span>MOVE WITH CLARITY.</span></div></div>
  </main>;
}

function TaskCard({task, category, business, today, onEdit, onDelete, onStatus, onView, canWrite=true}) {
  const Icon = ICONS[category?.icon] || Tag;
  const overdue = isOverdue(task,today);
  const urgent = isDueSoon(task,today);
  return <article className={`task-card ${task.status==="done"?"task-done":""}`}>
    <div className="task-card-top">
      <div className="task-meta-left">{business && <span className="task-business">{business.name}</span>}
        <span className="category-chip" style={{"--chip-color":category?.color||"#668575"}}><Icon size={13}/>{category?.name||"Uncategorized"}</span>
      </div>
      {canWrite&&<div className="task-menu"><IconButton label="Edit task" onClick={onEdit}><Pencil size={15}/></IconButton><IconButton label="Delete task" onClick={onDelete}><MoreHorizontal size={17}/></IconButton></div>}
    </div>
    <div className="task-title-line" role="button" tabIndex={0} onClick={onView} onKeyDown={e=>{if(e.target===e.currentTarget&&(e.key==="Enter"||e.key===" ")){e.preventDefault();onView();}}}>{canWrite&&<button className={`complete-control ${task.status==="done"?"complete-checked":""}`} aria-label={task.status==="done"?"Reopen task":"Mark complete"} onClick={e=>{e.stopPropagation();onStatus(task.status==="done"?"todo":"done");}}>{task.status==="done"&&<Check size={13}/>}</button>}<h3>{task.title}</h3></div>
    {task.description && <p className="task-description">{task.description}</p>}
    <div className="task-badges">
      {canWrite?<select className={`status-select status-${task.status} ${overdue?"status-delayed":""}`} value={overdue?"delayed":task.status} onChange={e=>onStatus(e.target.value)} aria-label="Change task status">{overdue&&<option value="delayed" disabled>Delayed</option>}{STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select>:<span className={`task-card-status ${overdue?"status-delayed":task.status==="done"?"status-done":task.status==="in_progress"?"status-progress":"status-todo"}`}>{displayStatus(task,today)}</span>}
      {task.priority!=="normal" && <span className={`priority-chip priority-${task.priority}`}>{priorityLabel(task.priority)} priority</span>}
      {task.deadline && <DeadlineView value={task.deadline} today={today}/>}
    </div>
    {task.status==="done"&&task.completion_note&&<p className="task-completion-note"><strong>Completion note</strong> {task.completion_note}</p>}
    <div className="task-card-foot"><span><CalendarDays size={13}/>Created {formatDate(task.created_date)}</span>{task.deadline && <span>Due {formatDate(task.deadline,true)}</span>}{(task.attachments?.length||0)>0&&<span className="task-attachment-count"><Paperclip size={13}/>{task.attachments.length} {task.attachments.length===1?"attachment":"attachments"}</span>}</div>
  </article>;
}

function DeadlineView({value,today}) {
  if(!value)return <div className="deadline-view deadline-view-empty">
    <span className="deadline-icon"><CalendarDays size={15}/></span>
    <span className="deadline-copy"><strong>No deadline</strong></span>
  </div>;
  const days=dayDiff(value,today);
  return <div className={`deadline-view ${days<0?"deadline-late":days<=2?"deadline-soon":""}`}>
    <span className="deadline-icon"><CalendarDays size={15}/></span>
    <span className="deadline-copy"><strong>{formatDate(value,true)}</strong><small>{days<0?`${Math.abs(days)}d late`:days===0?"Due today":days===1?"Tomorrow":`${days} days left`}</small></span>
  </div>;
}
function TaskListRow({task,category,business,today,onEdit,onDelete,onStatus,onView,canWrite=true}) {
  const Icon=ICONS[category?.icon]||Tag;
  const delayed=isOverdue(task,today);
  const statusText=displayStatus(task,today);
  return <article className={`task-row ${task.status==="done"?"task-done":""}`} role="button" tabIndex={0} onClick={onView} onKeyDown={e=>{if(e.target===e.currentTarget&&(e.key==="Enter"||e.key===" ")){e.preventDefault();onView();}}} title="Open task details">
    <span className="task-row-category" title={category?.name||"Uncategorized"} style={{"--chip-color":category?.color||"#858585"}}><Icon size={20}/></span>
    <div className="task-row-main">
      <div className="task-row-title-line"><h3>{task.title}</h3>{business&&<span className="task-row-business">{business.name}</span>}</div>
      {task.description&&<p className="task-row-description">{task.description}</p>}
      {(task.attachments?.length||0)>0&&<span className="task-row-attachment-count"><Paperclip size={12}/>{task.attachments.length} {task.attachments.length===1?"attachment":"attachments"}</span>}
      {task.status==="done"&&task.completion_note&&<p className="task-row-completion-note"><strong>Completion note:</strong> {task.completion_note}</p>}
    </div>
    <div className="task-row-deadline"><span className="deadline-label">DEADLINE</span><DeadlineView value={task.deadline} today={today}/></div>
    {canWrite?<div className="task-row-actions" onClick={e=>e.stopPropagation()}>
      <select className={delayed?"task-status-select status-delayed":""} value={delayed?"delayed":task.status} onChange={e=>onStatus(e.target.value)} onClick={e=>e.stopPropagation()} aria-label="Change task status">
        {delayed&&<option value="delayed" disabled>Delayed</option>}
        <option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option>
      </select>
      <IconButton label="Edit task" onClick={e=>{e.stopPropagation();onEdit();}}><Pencil size={16}/></IconButton>
      <IconButton label="Delete task" onClick={e=>{e.stopPropagation();onDelete();}}><Trash2 size={16}/></IconButton>
    </div>:<span className={`task-status-readonly ${delayed?"status-delayed":""}`}>{statusText}</span>}
  </article>;
}

const TASK_ATTACHMENT_ACCEPT=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt";
const TASK_ATTACHMENT_EXTENSIONS=new Set(TASK_ATTACHMENT_ACCEPT.split(","));
function formatAttachmentSize(bytes) { const value=Number(bytes||0); if(value<1024)return value+" B"; if(value<1024*1024)return (value/1024).toFixed(0)+" KB"; return (value/(1024*1024)).toFixed(1)+" MB"; }
function TaskForm({task,businesses,categories,defaultBusiness,onClose,onSave,onUpdate,onAttachmentUpdate,requestConfirmation}) {
  const [draft,setDraft]=useState(()=>({
    business_id:task?.business_id||defaultBusiness||businesses[0]?.id||"",
    category_id:task?.category_id||"",
    title:task?.title||"", description:task?.description||"", notes:task?.notes||"",
    status:task?.status||"todo", priority:task?.priority||"normal",
    created_date:task?.created_date||todayDhaka(), start_date:task?.start_date||"", deadline:task?.deadline||""
  }));
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [existingAttachments,setExistingAttachments]=useState(task?.attachments||[]);
  const [pendingFiles,setPendingFiles]=useState([]);
  const [savedTaskId,setSavedTaskId]=useState(task?.id||"");
  const fileInputRef=useRef(null);
  const available=categories.filter(c=>c.business_id===draft.business_id);
  function set(k,v) { setDraft(d=>{ const next={...d,[k]:v}; if(k==="business_id"&&d.category_id&&!categories.some(c=>c.id===d.category_id&&c.business_id===v))next.category_id=""; return next; }); }
  function addPendingFiles(fileList) {
    const incoming=Array.from(fileList||[]); if(!incoming.length)return;
    const accepted=[]; const rejected=[];
    for(const file of incoming){
      const dot=file.name.lastIndexOf("."); const extension=dot>=0?file.name.slice(dot).toLowerCase():"";
      if(!TASK_ATTACHMENT_EXTENSIONS.has(extension)||file.type.startsWith("video/")||file.type.startsWith("audio/")){rejected.push(file.name||"Unnamed file");continue;}
      if(file.size<=0||file.size>10*1024*1024){rejected.push(file.name+" (over 10 MB or empty)");continue;}
      if(existingAttachments.length+pendingFiles.length+accepted.length>=10){rejected.push(file.name+" (10-file limit)");continue;}
      const duplicate=[...pendingFiles,...accepted].some(item=>item.name===file.name&&item.size===file.size&&item.lastModified===file.lastModified);
      if(!duplicate)accepted.push(file);
    }
    if(accepted.length)setPendingFiles(current=>[...current,...accepted]);
    setError(rejected.length?"Some files were skipped: "+rejected.slice(0,3).join(", "):"");
  }
  function handlePaste(event) {
    const items=Array.from(event.clipboardData?.items||[]);
    const images=items.filter(item=>item.kind==="file"&&item.type.startsWith("image/")).map(item=>item.getAsFile()).filter(Boolean);
    if(!images.length)return;
    event.preventDefault();
    const pasted=images.map((file,index)=>new File([file],file.name||("pasted-screenshot-"+Date.now()+"-"+index+".png"),{type:file.type||"image/png"}));
    addPendingFiles(pasted);
  }
  async function uploadOne(taskId,file) {
    return api("/api/tasks/"+taskId+"/attachments",{method:"POST",headers:{"Content-Type":"application/octet-stream","X-File-Name":encodeURIComponent(file.name),"X-File-Type":file.type||"application/octet-stream"},body:file});
  }
  async function removeExistingAttachment(item) {
    const taskId=task?.id||savedTaskId; if(!taskId)return;
    const confirmed=await requestConfirmation({
      heading:"Remove attachment?",
      title:item.file_name,
      message:"This file will be permanently removed from this task and deleted from Cloudinary.",
      detail:"This cannot be undone.",
      confirmLabel:"Delete attachment",
      tone:"danger"
    });
    if(!confirmed)return;
    try{ await api("/api/tasks/"+taskId+"/attachments/"+item.id,{method:"DELETE"}); setExistingAttachments(current=>current.filter(file=>file.id!==item.id)); onAttachmentUpdate?.(taskId,item,"remove"); }
    catch(err){setError(err.message);}
  }
  async function submit(event) {
    event.preventDefault();setSaving(true);setError("");
    try{
      const payload={...draft,category_id:draft.category_id||null,start_date:draft.start_date||null,deadline:draft.deadline||null};
      let saved;
      if(task)saved=await onSave(payload);
      else if(!savedTaskId){saved=await onSave(payload);setSavedTaskId(saved.id);}
      else saved=await onUpdate({id:savedTaskId},payload);
      const taskId=task?.id||saved?.id||savedTaskId;
      if(pendingFiles.length){
        const failed=[];
        const failureMessages=[];
        for(const file of pendingFiles){
          try{const attachment=await uploadOne(taskId,file);setExistingAttachments(current=>[...current,attachment]);onAttachmentUpdate?.(taskId,attachment,"add");}
          catch(err){failed.push(file);failureMessages.push(file.name+": "+err.message);}
        }
        setPendingFiles(failed);
        if(failed.length){
          const detail=failureMessages.slice(0,2).join(" · ");
          setError(detail+" Your task is saved. Fix the issue, then retry the remaining file"+(failed.length===1?"":"s")+".");
          return;
        }
      }
      onClose();
    }catch(err){setError(err.message);}
    finally{setSaving(false);}
  }
  const targetTaskId=task?.id||savedTaskId;
  return <Modal title={task?"Edit task":savedTaskId?"Finish task attachments":"Create a task"} subtitle="Capture the details, then get back to work." onClose={onClose} wide>
    <form className="task-form" onSubmit={submit} onPaste={handlePaste}>
      <label className="field field-full"><span>Task title <i>Required</i></span><input autoFocus maxLength={200} value={draft.title} onChange={e=>set("title",e.target.value)} placeholder="What needs to get done?" required/></label>
      <label className="field field-full"><span>Description</span><textarea rows={3} maxLength={5000} value={draft.description} onChange={e=>set("description",e.target.value)} placeholder="Add a little context or a clear next step…"/></label>
      <div className="form-grid">
        <label className="field"><span>Business</span><select value={draft.business_id} onChange={e=>set("business_id",e.target.value)} required>{businesses.filter(b=>!b.archived).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label className="field"><span>Category</span><select value={draft.category_id} onChange={e=>set("category_id",e.target.value)}><option value="">Uncategorized</option>{available.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="field"><span>Priority</span><select value={draft.priority} onChange={e=>set("priority",e.target.value)}>{PRIORITIES.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
        <label className="field"><span>Created date</span><input type="date" value={draft.created_date} onChange={e=>set("created_date",e.target.value)}/></label>
        <label className="field"><span>Start date <i>Optional</i></span><input type="date" value={draft.start_date} onChange={e=>set("start_date",e.target.value)}/></label>
        <label className="field field-full"><span>Deadline <i>Optional</i></span><input type="date" value={draft.deadline} min={draft.start_date||undefined} onChange={e=>set("deadline",e.target.value)}/></label>
      </div>
      <label className="field field-full"><span>Notes <i>Private</i></span><textarea rows={2} maxLength={5000} value={draft.notes} onChange={e=>set("notes",e.target.value)} placeholder="Links, references or extra notes…"/></label>
      <section className="task-attachment-section">
        <div className="task-attachment-heading"><div><strong>Attachments</strong><small>Images and documents only · 10 MB each · up to 10 files</small></div><span>{existingAttachments.length+pendingFiles.length}/10</span></div>
        <button type="button" className="task-attachment-dropzone" onClick={()=>fileInputRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();addPendingFiles(e.dataTransfer.files);}}>
          <Paperclip size={19}/><span><strong>Attach files or drop them here</strong><small>Or paste a screenshot with Cmd+V / Ctrl+V</small></span><span className="task-attachment-browse">Browse</span>
        </button>
        <input ref={fileInputRef} className="task-attachment-input" type="file" accept={TASK_ATTACHMENT_ACCEPT} multiple onChange={e=>{addPendingFiles(e.target.files);e.target.value="";}}/>
        {(existingAttachments.length>0||pendingFiles.length>0)&&<div className="task-attachment-list">
          {existingAttachments.map(item=><div className="task-attachment-item" key={item.id}>
            <span className="task-attachment-file-icon"><Paperclip size={15}/></span>
            <span className="task-attachment-file-copy"><strong>{item.file_name}</strong><small>{formatAttachmentSize(item.size_bytes)} · Saved in Cloudinary</small></span>
            <a className="task-attachment-download" href={"/api/tasks/"+(task?.id||savedTaskId)+"/attachments/"+item.id+"/download"} target="_blank" rel="noopener noreferrer" title="Download attachment"><FileText size={15}/></a>
            <button type="button" className="task-attachment-remove" onClick={()=>removeExistingAttachment(item)} title="Delete attachment"><Trash2 size={15}/></button>
          </div>)}
          {pendingFiles.map((file,index)=><div className="task-attachment-item task-attachment-pending" key={file.name+"-"+file.size+"-"+index}>
            <span className="task-attachment-file-icon"><Paperclip size={15}/></span>
            <span className="task-attachment-file-copy"><strong>{file.name}</strong><small>{formatAttachmentSize(file.size)} · Ready to upload</small></span>
            <button type="button" className="task-attachment-remove" onClick={()=>setPendingFiles(current=>current.filter((_,i)=>i!==index))} title="Remove file"><X size={15}/></button>
          </div>)}
        </div>}
      </section>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions"><Button variant="ghost" type="button" onClick={onClose}>Cancel</Button><Button disabled={saving}>{saving?"Saving…":pendingFiles.length?"Save & upload":task||savedTaskId?"Save changes":"Add task"}</Button></div>
    </form>
  </Modal>;
}
function CategoryManager({business,categories,onClose,onAdd,onEdit,onDelete}) {
  const [name,setName]=useState(""); const [icon,setIcon]=useState("shopping-bag"); const [color,setColor]=useState(COLORS[0]); const [error,setError]=useState("");
  const [editing,setEditing]=useState(null);
  const list=categories.filter(c=>c.business_id===business.id);
  async function submit(e) {
    e.preventDefault(); setError("");
    try {
      if(editing) await onEdit(editing.id,{name:name.trim(),icon,color});
      else await onAdd({business_id:business.id,name:name.trim(),icon,color});
      setEditing(null); setName(""); setIcon("shopping-bag"); setColor(COLORS[0]);
    } catch(err){setError(err.message);}
  }
  function startEdit(c){setEditing(c);setName(c.name);setIcon(c.icon||"tag");setColor(c.color||COLORS[0]);}
  const SelectedIcon=ICONS[icon]||Tag;
  return <Modal title="Categories" subtitle={`Organize the work for ${business.name}.`} onClose={onClose} wide>
    <div className="category-manager-list">{list.map(c=>{
      const Icon=ICONS[c.icon]||Tag;
      return <div className="category-manager-row" key={c.id}><span className="category-preview" style={{color:c.color,background:c.color+"18"}}><Icon size={16}/></span><strong>{c.name}</strong><span className="category-row-spacer"/><button className="mini-action" onClick={()=>startEdit(c)}><Pencil size={14}/> Edit</button><button className="mini-action danger-action" onClick={()=>onDelete(c)}><Trash2 size={14}/></button></div>;
    })}</div>
    <form className="category-create" onSubmit={submit}>
      <div className="category-form-heading">{editing?"Edit category":"Add a category"}</div>
      <div className="form-grid category-form-grid">
        <label className="field"><span>Category name</span><input value={name} onChange={e=>setName(e.target.value)} maxLength={40} placeholder="e.g. Product launch" required/></label>
        <label className="field"><span>Icon</span><select value={icon} onChange={e=>setIcon(e.target.value)}>{ICON_OPTIONS.map(k=><option key={k} value={k}>{ICON_LABELS[k]||k}</option>)}</select></label>
      </div>
      <div className="color-palette"><span>Accent</span>{COLORS.map(c=><button type="button" key={c} className={`color-dot ${color===c?"selected":""}`} style={{background:c}} onClick={()=>setColor(c)} aria-label={`Select ${c}`}/>) }<span className="category-preview selected-preview" style={{background:color+"18",color}}><SelectedIcon size={15}/></span></div>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions">{editing&&<Button variant="ghost" type="button" onClick={()=>{setEditing(null);setName("");setIcon("shopping-bag");setColor(COLORS[0]);}}>Cancel edit</Button>}<Button>{editing?"Save category":"Add category"}</Button></div>
    </form>
  </Modal>;
}

function BusinessManager({businesses,emailConfigured,isOwner,currentUserId,onClose,onAdd,onRename,onArchive,onDelete}) {
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [emailEnabled,setEmailEnabled]=useState(false);
  const [error,setError]=useState("");
  const [editing,setEditing]=useState(null);
  const [draft,setDraft]=useState({name:"",notification_email:"",email_notifications:false});
  const [deleting,setDeleting]=useState(null);
  const [confirmation,setConfirmation]=useState("");
  async function add(e){e.preventDefault();setError("");try{await onAdd(name,email,emailEnabled);setName("");setEmail("");setEmailEnabled(false);}catch(err){setError(err.message);}}
  function edit(b){setEditing(b.id);setDraft({name:b.name,notification_email:b.notification_email||"",email_notifications:Boolean(b.email_notifications)});setError("");}
  async function saveEdit(e){e.preventDefault();setError("");try{await onRename(editing,draft);setEditing(null);}catch(err){setError(err.message);}}
  async function confirmDelete(e){e.preventDefault();if(confirmation.trim()!==deleting.name){setError("Enter the exact business name to confirm.");return;}try{await onDelete(deleting);setDeleting(null);setConfirmation("");setError("");}catch(err){setError(err.message);}}
  return <Modal title="Businesses" subtitle={isOwner?"Manage business details and task notifications.":"Manage the businesses you created and their notifications."} onClose={onClose} wide>
    {!emailConfigured&&<div className="email-setup-notice"><MailCheck size={17}/><span><strong>Email delivery not ready</strong><small>Verify shakilxvs.com in Resend DNS to start sending business notifications.</small></span></div>}
    <form className="business-create business-create-rich" onSubmit={add}>
      <div className="category-form-heading">Add a business</div>
      <div className="form-grid">
        <label className="field"><span>Business name</span><input value={name} onChange={e=>setName(e.target.value)} maxLength={60} placeholder="Business name" required/></label>
        <label className="field"><span>Notification email(s)</span><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="team@example.com"/></label>
      </div>
      <label className="inline-check"><input type="checkbox" checked={emailEnabled} onChange={e=>setEmailEnabled(e.target.checked)}/> Email task activity for this business</label>{!isOwner&&<p className="form-hint">Only you and the workspace owner can access a business you create.</p>}
      <div className="modal-actions"><Button disabled={!name.trim()}><Plus size={15}/> Add business</Button></div>
    </form>
    {error&&<div className="form-error">{error}</div>}
    <div className="business-manager-list business-manager-list-rich">{businesses.map(b=>{const canEdit=isOwner||String(b.created_by_user_id||"")===String(currentUserId||"");return <div className="business-manager-row business-manager-row-rich" key={b.id}>
      <div className="business-avatar"><Building2 size={15}/></div>
      <div className="business-manager-name"><strong>{b.name}</strong><small>{b.archived?"Archived":b.notification_email||"No notification email"}{b.email_notifications?" · email on":""}</small></div>
      {canEdit&&<button className="mini-action" onClick={()=>edit(b)}><Pencil size={14}/> Edit</button>}
      {canEdit&&<button className="mini-action" onClick={()=>onArchive(b)}>{b.archived?<RotateCcw size={14}/>:<Archive size={14}/>}</button>}
      {isOwner&&<button className="mini-action danger-action" onClick={()=>{setDeleting(b);setConfirmation("");setError("");}}><Trash2 size={14}/></button>}
      {canEdit&&editing===b.id&&<form className="business-inline-edit" onSubmit={saveEdit}>
        <label className="field"><span>Business name</span><input value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))} required/></label>
        <label className="field"><span>Notification email(s)</span><input value={draft.notification_email} onChange={e=>setDraft(d=>({...d,notification_email:e.target.value}))} placeholder="team@example.com"/></label>
        <label className="inline-check"><input type="checkbox" checked={draft.email_notifications} onChange={e=>setDraft(d=>({...d,email_notifications:e.target.checked}))}/> Send task notifications</label>
        <div className="modal-actions"><Button size="small" variant="ghost" type="button" onClick={()=>setEditing(null)}>Cancel</Button><Button size="small">Save</Button></div>
      </form>}
    </div>;})}</div>
    {isOwner&&deleting&&<Modal title={`Delete ${deleting.name}?`} subtitle="This permanently removes the business, its categories and tasks." onClose={()=>{setDeleting(null);setConfirmation("");}} wide>
      <form onSubmit={confirmDelete} className="delete-confirm-form">
        <p>Type <strong>{deleting.name}</strong> exactly to confirm deletion.</p>
        <label className="field"><span>Business name confirmation</span><input autoFocus value={confirmation} onChange={e=>setConfirmation(e.target.value)} placeholder={deleting.name}/></label>
        {error&&<div className="form-error">{error}</div>}
        <div className="modal-actions"><Button variant="ghost" type="button" onClick={()=>{setDeleting(null);setConfirmation("");}}>Cancel</Button><Button color="danger" variant="danger" disabled={confirmation.trim()!==deleting.name}>Delete business</Button></div>
      </form>
    </Modal>}
  </Modal>;
}

function UserManager({users,businesses,onClose,onSave,onDelete,onToggle}) {
  const [editing,setEditing]=useState(null);
  const [username,setUsername]=useState("");
  const [displayName,setDisplayName]=useState("");
  const [email,setEmail]=useState("");
  const [whatsappNumber,setWhatsappNumber]=useState("");
  const [whatsappEnabled,setWhatsappEnabled]=useState(false);
  const [password,setPassword]=useState("");
  const [assignments,setAssignments]=useState({});
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  function reset(){setEditing(null);setUsername("");setDisplayName("");setEmail("");setWhatsappNumber("");setWhatsappEnabled(false);setPassword("");setAssignments({});setError("");}
  function edit(u){
    setEditing(u);setUsername(u.username);setDisplayName(u.display_name);setEmail(u.email||"");setWhatsappNumber(u.whatsapp_number||"");setWhatsappEnabled(u.whatsapp_notifications_enabled!==false);setPassword("");
    const mapped={};for(const a of (u.assignments||[]))mapped[a.business_id]=a.permission;setAssignments(mapped);setError("");
  }
  async function submit(e){
    e.preventDefault();setBusy(true);setError("");
    const data={username,display_name:displayName,email,whatsapp_number:whatsappNumber,whatsapp_notifications_enabled:whatsappEnabled,password,assignments:Object.entries(assignments).filter(([,p])=>p).map(([business_id,permission])=>({business_id,permission}))};
    if(editing)delete data.username;
    if(!password)delete data.password;
    try{await onSave(editing?.id||null,data);reset();}catch(err){setError(err.message);}finally{setBusy(false);}
  }
  function setPermission(id,value){setAssignments(a=>{const n={...a};if(value)n[id]=value;else delete n[id];return n;});}
  const assignableBusinesses=businesses.filter(b=>!b.created_by_user_id||String(b.created_by_user_id)===String(editing?.id||""));
  return <Modal title="Team access" subtitle="Create accounts and choose which businesses each person can access." onClose={onClose} wide>
    <div className="users-list">{users.map(u=><div className="user-manager-row" key={u.id}>
      <span className="user-avatar"><UserRound size={16}/></span>
      <span className="user-manager-details"><strong>{u.display_name||u.username}</strong><small>@{u.username} · {(u.assignments||[]).length} businesses · {u.whatsapp_number||"No WhatsApp number"}</small></span>
      <span className={`user-active-state ${u.active?"active":"inactive"}`}>{u.active?"Active":"Disabled"}</span>
      <button className="mini-action" onClick={()=>edit(u)}><Pencil size={14}/> Edit</button>
      <button className="mini-action" onClick={()=>onToggle(u)}>{u.active?"Disable":"Enable"}</button>
      <button className="mini-action danger-action" onClick={()=>onDelete(u)}><Trash2 size={14}/></button>
    </div>)}</div>
    <form className="user-create-form" onSubmit={submit}>
      <div className="category-form-heading">{editing?"Edit member":"Add a member"}</div>
      <div className="form-grid">
        <label className="field"><span>Username</span><input value={username} onChange={e=>setUsername(e.target.value)} disabled={Boolean(editing)} minLength={3} maxLength={40} required/></label>
        <label className="field"><span>Display name</span><input value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={80} required/></label>
        <label className="field"><span>Email (optional)</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <label className="field"><span>WhatsApp number</span><input type="tel" inputMode="tel" value={whatsappNumber} onChange={e=>setWhatsappNumber(e.target.value)} placeholder="+8801XXXXXXXXX"/></label>
        <label className="field"><span>{editing?"New password (leave blank to keep current)":"Password (minimum 4 characters)"}</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={4} required={!editing} autoComplete="new-password"/></label>
      </div>
      <label className="inline-check"><input type="checkbox" checked={whatsappEnabled} onChange={e=>setWhatsappEnabled(e.target.checked)}/> Member has opted in to WhatsApp notifications</label>
      <p className="form-hint">Use international format with country code, for example +8801XXXXXXXXX. Only enable notifications when the member has agreed to receive them.</p>
      <div className="assignment-heading">Business access</div>
      <div className="assignment-list">{assignableBusinesses.map(b=><div className="assignment-row" key={b.id}>
        <label><input type="checkbox" checked={Boolean(assignments[b.id])} onChange={e=>setPermission(b.id,e.target.checked?"read":null)}/><span>{b.name}</span></label>
        <select value={assignments[b.id]||""} disabled={!assignments[b.id]} onChange={e=>setPermission(b.id,e.target.value)}><option value="read">Read only</option><option value="write">Read & write</option></select>
      </div>)}</div>
      <p className="form-hint">Read is view-only. Read & write allows task and category changes, plus creating new businesses. A business created by a member stays private to that member and the owner.</p>
      {error&&<div className="form-error">{error}</div>}
      <div className="modal-actions">{editing&&<Button variant="ghost" type="button" onClick={reset}>Cancel edit</Button>}<Button disabled={busy}>{busy?"Saving…":editing?"Save member":"Create member"} <UserPlus size={15}/></Button></div>
    </form>
  </Modal>;
}

function WorkspaceSettings({onClose,notify,emailConfigured,requestConfirmation}) {
  const [status,setStatus]=useState({status:"disconnected",connected:false,qr_data_url:""});
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [timezone,setTimezone]=useState("America/New_York");
  const [clockNow,setClockNow]=useState(()=>new Date());
  const [timezoneSaving,setTimezoneSaving]=useState(false);
  const [timezonePickerOpen,setTimezonePickerOpen]=useState(false);
  const [timezoneSearch,setTimezoneSearch]=useState("");
  const [timezoneActiveIndex,setTimezoneActiveIndex]=useState(0);
  const timezoneSearchInputRef=useRef(null);
  const timezoneOptionListRef=useRef(null);
  const filteredTimezoneOptions=useMemo(()=>{
    const query=timezoneSearch.trim().toLocaleLowerCase();
    if(!query)return TIME_ZONE_OPTIONS;
    return TIME_ZONE_OPTIONS.filter(item=>{
      const city=item.value.split("/").pop().replaceAll("_"," ");
      const searchable=[item.label,item.value,city,TIME_ZONE_SEARCH_ALIASES[item.value]||""].join(" ").toLocaleLowerCase();
      return searchable.includes(query);
    });
  },[timezoneSearch]);
  useEffect(()=>{
    let active=true;
    const refresh=()=>{
      api("/api/admin/whatsapp/status").then(result=>{
        if(active){setStatus(result);setError("");}
      }).catch(err=>{if(active)setError(err.message);}).finally(()=>{if(active)setLoading(false);});
    };
    refresh();
    const timer=setInterval(refresh,5000);
    return ()=>{active=false;clearInterval(timer);};
  },[]);
  useEffect(()=>{
    let active=true;
    api("/api/account").then(result=>{
      if(active)setTimezone(result.timezone||"America/New_York");
    }).catch(err=>{if(active)setError(err.message);});
    return ()=>{active=false;};
  },[]);
  useEffect(()=>{
    const timer=setInterval(()=>setClockNow(new Date()),1000);
    return ()=>clearInterval(timer);
  },[]);
  useEffect(()=>{
    if(timezonePickerOpen){
      setTimezoneActiveIndex(0);
      requestAnimationFrame(()=>timezoneSearchInputRef.current?.focus());
    }
  },[timezonePickerOpen]);
  useEffect(()=>{
    if(!timezonePickerOpen)return;
    const active=timezoneOptionListRef.current?.querySelector("[data-active='true']");
    active?.scrollIntoView({block:"nearest"});
  },[timezoneActiveIndex,timezonePickerOpen,filteredTimezoneOptions]);
  function openTimezonePicker(){
    if(timezoneSaving)return;
    setTimezoneSearch("");
    setTimezonePickerOpen(true);
  }
  function closeTimezonePicker(){
    setTimezonePickerOpen(false);
    setTimezoneSearch("");
  }
  function handleTimezoneSearchKeyDown(event){
    if(event.key==="ArrowDown"){
      event.preventDefault();
      setTimezoneActiveIndex(index=>Math.min(index+1,filteredTimezoneOptions.length-1));
    }else if(event.key==="ArrowUp"){
      event.preventDefault();
      setTimezoneActiveIndex(index=>Math.max(index-1,0));
    }else if(event.key==="Home"&&filteredTimezoneOptions.length){
      event.preventDefault();
      setTimezoneActiveIndex(0);
    }else if(event.key==="End"&&filteredTimezoneOptions.length){
      event.preventDefault();
      setTimezoneActiveIndex(filteredTimezoneOptions.length-1);
    }else if(event.key==="Enter"){
      event.preventDefault();
      const selected=filteredTimezoneOptions[timezoneActiveIndex];
      if(selected)selectTimezone(selected.value);
    }else if(event.key==="Escape"){
      event.preventDefault();
      closeTimezonePicker();
    }
  }
  function selectTimezone(nextTimezone){
    closeTimezonePicker();
    if(nextTimezone!==timezone)changeTimezone(nextTimezone);
  }
  async function changeTimezone(nextTimezone){
    const previous=timezone;
    setTimezone(nextTimezone);
    setTimezoneSaving(true);setError("");
    try{
      const saved=await api("/api/account",{method:"PATCH",body:JSON.stringify({timezone:nextTimezone})});
      setTimezone(saved.timezone||nextTimezone);
      notify("World clock time zone saved");
    }catch(err){
      setTimezone(previous);
      setError(err.message);
    }finally{setTimezoneSaving(false);}
  }
  async function test(){
    setBusy(true);setError("");
    try{
      const result=await api("/api/admin/whatsapp/test",{method:"POST"});
      notify(result.message||"Test message queued.");
    }catch(err){setError(err.message);}
    finally{setBusy(false);}
  }
  async function reconnect(){
    const confirmed=await requestConfirmation({
      heading:"Reconnect WhatsApp?",
      title:"Clear the saved WhatsApp login",
      message:"TaskXVS will disconnect the current linked device. You will need to start the GitHub worker again and scan a fresh QR code.",
      detail:"Your tasks, businesses and notification queue will remain untouched.",
      confirmLabel:"Clear login",
      tone:"warning"
    });
    if(!confirmed)return;
    setBusy(true);setError("");
    try{
      const result=await api("/api/admin/whatsapp/reconnect",{method:"POST"});
      setStatus(result);
      notify(result.message||"WhatsApp login cleared. Start the worker to generate a new QR code.");
    }catch(err){setError(err.message);}
    finally{setBusy(false);}
  }
  const connected=status.status==="connected";
  const pairing=status.status==="qr"&&Boolean(status.qr_data_url);
  const reconnectRequired=Boolean(status.reconnect_required);
  const reconnectReady=Boolean(status.reconnect_ready);
  const paused=Boolean(status.last_error)&&!reconnectReady;
  const dateLabel=new Intl.DateTimeFormat("en-US",{timeZone:timezone,weekday:"long",month:"long",day:"numeric",year:"numeric"}).format(clockNow);
  const timeLabel=new Intl.DateTimeFormat("en-US",{timeZone:timezone,hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true}).format(clockNow);
  const timezoneName=TIME_ZONE_OPTIONS.find(item=>item.value===timezone)?.label||timezone;
  return <Modal title="Settings" subtitle="Manage workspace connections and notification services." onClose={onClose} wide>
    <div className="workspace-settings">
      <div className="settings-section-heading"><strong>World clock</strong><span>See the current day, date and time in the time zone you choose.</span></div>
      <div className="world-clock-card">
        <div className="world-clock-face">
          <span className="world-clock-day">{dateLabel}</span>
          <strong>{timeLabel}</strong>
          <small>{timezoneName}</small>
        </div>
        <div className="field world-clock-select">
          <span>Time zone</span>
          <div className="timezone-picker" onKeyDown={handleTimezoneSearchKeyDown}>
            <button
              type="button"
              className={`timezone-picker-trigger ${timezonePickerOpen?"is-open":""}`}
              onClick={()=>timezonePickerOpen?closeTimezonePicker():openTimezonePicker()}
              disabled={timezoneSaving}
              aria-haspopup="listbox"
              aria-expanded={timezonePickerOpen}
              aria-label={`Selected time zone: ${timezoneName}. Search time zones`}
            >
              <span className="timezone-picker-trigger-copy">
                <Search size={15}/>
                <span>{timezoneName}</span>
              </span>
              <ChevronDown size={15} className={timezonePickerOpen?"timezone-picker-chevron is-open": "timezone-picker-chevron"}/>
            </button>
            {timezonePickerOpen&&<div className="timezone-picker-popover">
              <div className="timezone-picker-search">
                <Search size={15}/>
                <input
                  ref={timezoneSearchInputRef}
                  type="search"
                  value={timezoneSearch}
                  onChange={event=>{setTimezoneSearch(event.target.value);setTimezoneActiveIndex(0);}}
                  placeholder="Search city, country or time zone…"
                  autoComplete="off"
                  spellCheck="false"
                  aria-label="Search time zones"
                  aria-controls="timezone-picker-options"
                  aria-activedescendant={filteredTimezoneOptions[timezoneActiveIndex] ? `timezone-option-${filteredTimezoneOptions[timezoneActiveIndex].value.replaceAll("/","-")}` : undefined}
                />
                {timezoneSearch&&<button type="button" className="timezone-picker-clear" onClick={()=>{setTimezoneSearch("");setTimezoneActiveIndex(0);}} aria-label="Clear search"><X size={14}/></button>}
              </div>
              <div className="timezone-picker-results" id="timezone-picker-options" role="listbox" aria-label="Time zones" ref={timezoneOptionListRef}>
                {filteredTimezoneOptions.length?filteredTimezoneOptions.map((item,index)=>{
                  const city=item.value.split("/").pop().replaceAll("_"," ");
                  const selected=item.value===timezone;
                  const active=index===timezoneActiveIndex;
                  return <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    aria-current={selected?"true":undefined}
                    data-active={active?"true":"false"}
                    id={`timezone-option-${item.value.replaceAll("/","-")}`}
                    className={`timezone-picker-option ${selected?"is-selected":""} ${active?"is-active":""}`}
                    key={item.value}
                    onMouseEnter={()=>setTimezoneActiveIndex(index)}
                    onClick={()=>selectTimezone(item.value)}
                  >
                    <span className="timezone-picker-option-copy">
                      <strong>{item.value==="America/New_York"?"New York · Eastern Time":city}</strong>
                      <small>{item.value}</small>
                    </span>
                    {selected&&<Check size={15}/>}
                  </button>;
                }):<div className="timezone-picker-empty"><Search size={17}/><strong>No matching time zones</strong><span>Try a city name or an IANA zone, such as Asia/Tokyo.</span></div>}
              </div>
              <div className="timezone-picker-hint">Use ↑ ↓ to move · Enter to select · Esc to close</div>
            </div>}
          </div>
          <small>{timezoneSaving?"Saving time zone…":timezonePickerOpen?"Search by city, country or IANA name.":"Default: New York"}</small>
        </div>
      </div>
      <div className="settings-section-heading settings-section-heading-spaced"><strong>Connections</strong><span>Workspace integrations are visible to the owner only.</span></div>
      <div className="settings-integration-card"><span className="settings-integration-icon"><Mail size={19}/></span><div className="settings-integration-copy"><strong>Email notifications</strong><span>Task updates and business notification emails through Resend.</span></div><span className={emailConfigured?"settings-connection-state is-connected":"settings-connection-state"}>{emailConfigured?"Configured":"Not configured"}</span></div>
      <div className="settings-section-heading settings-section-heading-spaced"><strong>WhatsApp notifications</strong><span>Dedicated sender and cloud connection status.</span></div>
      <div className="whatsapp-cloud-settings">
      <div className={connected?"whatsapp-cloud-card connected":"whatsapp-cloud-card pending"}>
        <div className="whatsapp-cloud-symbol"><MessageCircle size={21}/></div>
        <div className="whatsapp-cloud-copy">
          <strong>{connected?"WhatsApp sender connected":pairing?"Scan to connect WhatsApp":reconnectReady?"Ready for a new WhatsApp login":reconnectRequired?"WhatsApp login needs attention":paused?"Connection paused":"Cloud sender waiting"}</strong>
          <span>{loading?"Checking cloud worker…":connected?("Connected "+(status.phone_number||"sender number")+". Messages are sent by the automatic cloud worker."):reconnectReady?(status.last_error||"The previous login was cleared. Start the worker workflow to generate a fresh QR code."):reconnectRequired?(status.last_error||"The linked-device session ended. Generate a fresh QR code to sign in again."):status.last_error||(pairing?"A QR code is ready to scan.":"The free cloud worker will display a QR code when its next run starts.")}</span>
        </div>
        <span className="provider-status">{connected?"Connected":pairing?"Pair device":reconnectReady?"Start worker":reconnectRequired?"Login needed":paused?"Paused":"Waiting"}</span>
      </div>
      {pairing&&<div className="whatsapp-cloud-qr">
        <strong>Link your dedicated sender once</strong>
        <p>Open WhatsApp on the sender phone, go to Linked devices, choose Link a device, then scan this QR code.</p>
        <img src={status.qr_data_url} alt="WhatsApp device pairing QR code"/>
        <small>The phone is only needed for pairing. It does not need to stay online after linking.</small>
      </div>}
      {reconnectReady&&<div className="whatsapp-cloud-steps whatsapp-reconnect-ready">
        <strong>Your old linked-device session has been cleared</strong>
        <p>Start the worker below. TaskXVS will display a fresh QR code here automatically. Keep the GitHub Actions run active while scanning it.</p>
        <a href="https://github.com/shakilxvs/gfgsdf/actions/workflows/taskxvs-whatsapp-worker.yml" target="_blank" rel="noreferrer">Open TaskXVS WhatsApp worker workflow <ArrowUpRight size={13}/></a>
      </div>}
      <div className="whatsapp-cloud-steps">
        <strong>Automatic delivery schedule</strong>
        <p>GitHub starts the worker automatically every 6 hours (UTC). Each session runs for up to 5 hours 45 minutes and checks the message queue every 20 minutes. You do not need to start it manually for normal operation.</p>
        <p>A short gap of about 15 minutes between sessions, plus possible GitHub scheduling delays, is expected. Manual runs are still available when you need an immediate restart. This is not a guaranteed 24/7 connection.</p>
      </div>
      {error&&<div className="form-error">{error}</div>}
      <div className="modal-actions">
        {connected&&<Button variant="secondary" onClick={test} disabled={busy}>{busy?"Queueing…":"Send test message"} <Send size={14}/></Button>}
        {(reconnectRequired||(!connected&&!pairing&&!reconnectReady))&&<Button variant="secondary" onClick={reconnect} disabled={busy}>{busy?"Preparing…":"Reconnect WhatsApp"} <RotateCcw size={14}/></Button>}
        <Button variant="ghost" onClick={()=>{setLoading(true);api("/api/admin/whatsapp/status").then(setStatus).catch(e=>setError(e.message)).finally(()=>setLoading(false));}}>Refresh status</Button>
      </div>
      <div className="whatsapp-cloud-warning"><ShieldCheck size={17}/><p>This connection uses an unofficial WhatsApp Web protocol, not Meta's official API. WhatsApp may restrict the sender account. Use only your dedicated sender number and send notifications only to people who have opted in. Avoid bulk or unsolicited messaging.</p></div>
      </div>
    </div>
  </Modal>;
}

function AccountSettings({account,onClose,onSave}) {
  const isOwner=account?.role==="owner";
  const [number,setNumber]=useState(account?.whatsapp_number||"");
  const [enabled,setEnabled]=useState(Boolean(account?.whatsapp_notifications_enabled));
  const [activityEmail,setActivityEmail]=useState(account?.activity_email||"shakilxvs@gmail.com");
  const [activityEmailEnabled,setActivityEmailEnabled]=useState(account?.activity_email_enabled!==false);
  const [deadlineRemindersEnabled,setDeadlineRemindersEnabled]=useState(account?.deadline_reminders_enabled!==false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function submit(e){
    e.preventDefault();setBusy(true);setError("");
    const patch={whatsapp_number:number,whatsapp_notifications_enabled:enabled};
    if(isOwner){
      patch.activity_email=activityEmail.trim();
      patch.activity_email_enabled=activityEmailEnabled;
      patch.deadline_reminders_enabled=deadlineRemindersEnabled;
    }
    try{
      await onSave(patch);
      onClose();
    }catch(err){setError(err.message);}
    finally{setBusy(false);}
  }
  return <Modal title="My account" subtitle={isOwner?"Manage your owner email and notification preferences.":"Add your WhatsApp contact for TaskXVS notifications."} onClose={onClose}>
    <form className="profile-settings-form" onSubmit={submit}>
      <div className="profile-account-summary"><span className="profile-account-icon"><UserRound size={19}/></span><div><strong>{account?.display_name||account?.displayName||account?.username||"Account"}</strong><small>@{account?.username||"owner"} · {isOwner?"Workspace owner":"Team member"}</small></div></div>
      {isOwner&&<>
        <div className="profile-preference-section">
          <div className="profile-preference-heading"><strong>Owner email notifications</strong><span>Private alerts for you, across every business.</span></div>
          <label className="field"><span>Your notification email</span><input type="email" autoComplete="email" value={activityEmail} onChange={e=>setActivityEmail(e.target.value)} placeholder="shakilxvs@gmail.com" required/></label>
          <label className="inline-check"><input type="checkbox" checked={activityEmailEnabled} onChange={e=>setActivityEmailEnabled(e.target.checked)}/> Email me whenever a task, business, category or team setting is changed</label>
          <p className="form-hint">Activity emails show who made the change, which business was affected and the details that changed. These owner emails are not sent to team members.</p>
          <label className="inline-check"><input type="checkbox" checked={deadlineRemindersEnabled} onChange={e=>setDeadlineRemindersEnabled(e.target.checked)}/> Send me private deadline reminders 7 days, 2 days and 1 day before a task is due</label>
          <p className="form-hint">Each reminder groups all open tasks due on that date across your businesses into one email.</p>
        </div>
        <div className="profile-preference-divider"/>
      </>}
      <div className="profile-preference-heading"><strong>WhatsApp notifications</strong><span>Your personal WhatsApp contact and opt-in.</span></div>
      <label className="field"><span>WhatsApp contact number</span><input type="tel" inputMode="tel" autoComplete="tel" value={number} onChange={e=>setNumber(e.target.value)} placeholder="+8801XXXXXXXXX"/></label>
      <p className="form-hint">Include your country code. Example: +8801XXXXXXXXX.</p>
      <div className={account?.whatsapp_configured?"whatsapp-connection-state connected":"whatsapp-connection-state pending"}>{account?.whatsapp_configured?<><CircleCheck size={16}/><span>The TaskXVS cloud sender is connected. Notifications can be delivered while its scheduled worker session is online.</span></>:<><CircleAlert size={16}/><span>Your contact and opt-in will be saved now. Delivery starts after the owner pairs the dedicated sender with the TaskXVS cloud worker.</span></>}</div>
      <label className="inline-check"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> I agree to receive TaskXVS WhatsApp notifications on this number</label>
      {error&&<div className="form-error">{error}</div>}
      <div className="modal-actions"><Button variant="ghost" type="button" onClick={onClose} disabled={busy}>Cancel</Button><Button disabled={busy}>{busy?"Saving…":isOwner?"Save preferences":"Save contact"}</Button></div>
    </form>
  </Modal>;
}

function parseCsvPreview(text) {
  const rows=[];let row=[],field="",quoted=false;
  for(let i=0;i<text.length;i++){
    const char=text[i],next=text[i+1];
    if(quoted){
      if(char==='"'&&next==='"'){field+='"';i++;}
      else if(char==='"')quoted=false;
      else field+=char;
    }else if(char==='"'&&field.length===0)quoted=true;
    else if(char===","){row.push(field);field="";}
    else if(char==="\n"||char==="\r"){
      if(char==="\r"&&next==="\n")i++;
      row.push(field);field="";
      if(row.some(value=>value!==""))rows.push(row);
      row=[];
      if(rows.length>=300)break;
    }else field+=char;
  }
  if(rows.length<300&&(field!==""||row.length)){row.push(field);if(row.some(value=>value!==""))rows.push(row);}
  return rows.map(values=>values.slice(0,24));
}
function previewCellText(value) {
  if(value===null||value===undefined)return "";
  if(value instanceof Date)return value.toLocaleString();
  if(typeof value==="string"||typeof value==="number"||typeof value==="boolean")return String(value);
  if(Array.isArray(value))return value.map(previewCellText).join("");
  if(typeof value==="object"){
    if(value.text!==undefined)return String(value.text);
    if(value.result!==undefined)return previewCellText(value.result);
    if(value.richText)return value.richText.map(part=>part.text||"").join("");
    if(value.hyperlink)return String(value.text||value.hyperlink);
    if(value.formula)return value.result!==undefined?previewCellText(value.result):"="+value.formula;
    if(value.error)return String(value.error);
  }
  return "";
}
function AttachmentPreviewBody({taskId,attachment}) {
  const extension=String(attachment.file_name||"").split(".").pop().toLowerCase();
  const previewUrl="/api/tasks/"+taskId+"/attachments/"+attachment.id+"/preview";
  const downloadUrl="/api/tasks/"+taskId+"/attachments/"+attachment.id+"/download";
  const [mode,setMode]=useState("loading");
  const [error,setError]=useState("");
  const [sheets,setSheets]=useState([]);
  const [activeSheet,setActiveSheet]=useState(0);
  const [text,setText]=useState("");
  const [showLimit,setShowLimit]=useState(false);
  const documentRef=useRef(null);
  const slidesRef=useRef(null);
  useEffect(()=>{
    let cancelled=false;
    let pptxRenderer=null;
    setMode("loading");setError("");setSheets([]);setText("");setShowLimit(false);
    const isImage=String(attachment.mime_type||"").startsWith("image/");
    if(isImage){setMode("image");return ()=>{};}
    if(extension==="pdf"){setMode("pdf");return ()=>{};}
    async function load(){
      try{
        const response=await fetch(previewUrl,{credentials:"same-origin",headers:{"Accept":"*/*"}});
        if(!response.ok){
          const body=await response.json().catch(()=>({}));
          throw new Error(body.error||"Unable to load this attachment.");
        }
        const bytes=await response.arrayBuffer();
        if(cancelled)return;
        if(extension==="csv"){
          const parsed=parseCsvPreview(new TextDecoder("utf-8").decode(bytes));
          if(cancelled)return;
          setSheets([{name:"CSV",rows:parsed}]);setShowLimit(parsed.length>=300);setMode("spreadsheet");
        }else if(extension==="txt"){
          setText(new TextDecoder("utf-8").decode(bytes));setMode("text");
        }else if(extension==="xlsx"){
          const module=await import("exceljs");
          const ExcelJS=module.default||module;
          const workbook=new ExcelJS.Workbook();
          await workbook.xlsx.load(bytes);
          if(cancelled)return;
          const parsed=workbook.worksheets.map(sheet=>{
            const rows=[];
            sheet.eachRow({includeEmpty:true},row=>{
              if(rows.length>=300)return;
              rows.push(row.values.slice(1,25).map((value,index)=>previewCellText(row.getCell(index+1).value)));
            });
            return {name:sheet.name,rows};
          });
          setSheets(parsed);setShowLimit(parsed.some(sheet=>sheet.rows.length>=300));setMode("spreadsheet");
        }else if(extension==="xls"){
          const module=await import("xls-reader");
          const workbook=module.readXls(new Uint8Array(bytes));
          const parsed=(workbook.sheets||[]).map(sheet=>({
            name:sheet.name,
            rows:(sheet.rows||[]).slice(0,300).map(row=>(row||[]).slice(0,24).map(previewCellText))
          }));
          if(cancelled)return;
          setSheets(parsed);setShowLimit((workbook.sheets||[]).some(sheet=>(sheet.rows||[]).length>300));setMode("spreadsheet");
        }else if(extension==="docx"){
          const module=await import("docx-preview");
          if(cancelled)return;
          await module.renderAsync(bytes,documentRef.current,undefined,{
            breakPages:true,
            ignoreWidth:false,
            ignoreHeight:false,
            ignoreFonts:false,
            renderHeaders:true,
            renderFooters:true
          });
          if(!cancelled)setMode("docx");
        }else if(extension==="pptx"){
          const module=await import("pptx-browser");
          const PptxRenderer=module.PptxRenderer||module.default?.PptxRenderer;
          if(!PptxRenderer)throw new Error("PowerPoint preview is unavailable in this browser.");
          pptxRenderer=new PptxRenderer();
          await pptxRenderer.load(new Uint8Array(bytes));
          if(cancelled)return;
          const total=pptxRenderer.slideCount||0;
          const limit=Math.min(total,60);
          for(let index=0;index<limit;index++){
            if(cancelled)break;
            const canvas=document.createElement("canvas");
            canvas.className="attachment-pptx-slide";
            canvas.setAttribute("aria-label","Slide "+(index+1));
            await pptxRenderer.renderSlide(index,canvas,1100);
            if(cancelled)break;
            slidesRef.current?.appendChild(canvas);
          }
          if(cancelled)return;
          setShowLimit(total>60);setMode("pptx");
        }else{
          setMode("unsupported");
        }
      }catch(err){
        if(!cancelled){setError(err.message||"This file could not be previewed.");setMode("error");}
      }
    }
    load();
    return ()=>{
      cancelled=true;
      pptxRenderer?.destroy?.();
      if(documentRef.current)documentRef.current.replaceChildren();
      if(slidesRef.current)slidesRef.current.replaceChildren();
    };
  },[taskId,attachment.id,attachment.file_name,attachment.mime_type,extension,previewUrl]);
  const activeRows=sheets[activeSheet]?.rows||[];
  return <div className="attachment-viewer">
    <div className="attachment-viewer-toolbar">
      <div className="attachment-viewer-file"><strong>{attachment.file_name}</strong><small>{formatAttachmentSize(attachment.size_bytes)} · Preview</small></div>
      <a className="attachment-viewer-download" href={downloadUrl}><Download size={15}/> Download</a>
    </div>
    {mode==="loading"&&<div className="attachment-viewer-state"><span className="attachment-viewer-spinner"/><strong>Preparing preview…</strong></div>}
    {mode==="error"&&<div className="attachment-viewer-state is-error"><AlertCircle size={22}/><strong>Preview could not be loaded</strong><span>{error}</span></div>}
    {mode==="image"&&<div className="attachment-viewer-image-wrap"><img className="attachment-viewer-image" src={previewUrl} alt={attachment.file_name}/></div>}
    {mode==="pdf"&&<iframe className="attachment-viewer-pdf" src={previewUrl} title={attachment.file_name}/>}
    {mode==="text"&&<pre className="attachment-viewer-text">{text||"This text file is empty."}</pre>}
    {mode==="spreadsheet"&&<div className="attachment-viewer-spreadsheet">
      {sheets.length>1&&<div className="attachment-sheet-tabs">{sheets.map((sheet,index)=><button type="button" className={activeSheet===index?"active":""} key={sheet.name} onClick={()=>setActiveSheet(index)}>{sheet.name}</button>)}</div>}
      <div className="attachment-sheet-scroll"><table><tbody>{activeRows.map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,columnIndex)=>rowIndex===0?<th key={columnIndex}>{cell}</th>:<td key={columnIndex}>{cell}</td>)}</tr>)}</tbody></table></div>
      {showLimit&&<p className="attachment-viewer-limit">Preview limited to the first 300 rows and 24 columns. Download the original file to view all data.</p>}
    </div>}
    <div className="attachment-viewer-docx" style={{display:mode==="docx"?"block":"none"}}><div ref={documentRef}/></div>
    <div className="attachment-viewer-pptx" style={{display:mode==="pptx"?"grid":"none"}}><div ref={slidesRef}/>{showLimit&&<p className="attachment-viewer-limit">Preview limited to the first 60 slides. Download the original presentation to view all slides.</p>}</div>
    {mode==="unsupported"&&<div className="attachment-viewer-state"><FileText size={24}/><strong>Preview is not available for this older Office format</strong><span>Save this file as DOCX or PPTX to preview it inside TaskXVS, or use Download to open the original.</span></div>}
  </div>;
}

function TaskDetails({task,business,category,today,canWrite,onClose,onEdit,onComplete}) {
  const [previewAttachment,setPreviewAttachment]=useState(null);
  const status=displayStatus(task,today);
  const completed=task.completed_at?new Date(task.completed_at).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"}):"Not completed";
  return <Modal title={previewAttachment?"Preview attachment":"Task details"} subtitle={previewAttachment?business?.name||"Workspace task":business?.name||"Workspace task"} onClose={onClose} wide>
    {previewAttachment
      ? <div className="task-detail-content">
          <div className="attachment-viewer-back"><Button variant="ghost" onClick={()=>setPreviewAttachment(null)}><ArrowLeft size={15}/> Back to task</Button></div>
          <AttachmentPreviewBody taskId={task.id} attachment={previewAttachment}/>
        </div>
      : <div className="task-detail-content">
          <div className="task-detail-heading"><div><h2>{task.title}</h2><p>{task.description||"No description added."}</p></div><span className={`task-detail-status ${task.status==="done"?"is-done":isOverdue(task,today)?"is-delayed":task.status==="in_progress"?"is-progress":""}`}>{status}</span></div>
          <div className="task-detail-grid">
            <div><span>Business</span><strong>{business?.name||"Unavailable"}</strong></div>
            <div><span>Category</span><strong>{category?.name||"Uncategorized"}</strong></div>
            <div><span>Priority</span><strong>{priorityLabel(task.priority)}</strong></div>
            <div><span>Created</span><strong>{formatDate(task.created_date,true)}</strong></div>
            <div><span>Start date</span><strong>{formatDate(task.start_date,true)}</strong></div>
            <div><span>Deadline</span><strong>{formatDate(task.deadline,true)}</strong></div>
            <div><span>Completed</span><strong>{completed}</strong></div>
          </div>
          {(task.attachments?.length||0)>0&&<section className="task-detail-section task-detail-attachments">
            <div className="task-detail-attachments-heading"><h3><Paperclip size={15}/> Attachments</h3><span>{task.attachments.length}</span></div>
            <div className="task-detail-attachment-grid">
              {task.attachments.map(item=>{
                const previewUrl="/api/tasks/"+task.id+"/attachments/"+item.id+"/preview";
                const isImage=String(item.mime_type||"").startsWith("image/");
                const downloadUrl="/api/tasks/"+task.id+"/attachments/"+item.id+"/download";
                return <div className="task-detail-attachment-card" key={item.id}>
                  <button type="button" className={isImage?"task-detail-image-preview":"task-detail-document"} onClick={()=>setPreviewAttachment(item)}>
                    {isImage
                      ? <img src={previewUrl} alt={item.file_name} loading="lazy"/>
                      : <span className="task-detail-document-icon"><FileText size={20}/></span>}
                    <span><strong>{item.file_name}</strong><small>{formatAttachmentSize(item.size_bytes)} · Preview</small></span>
                    {!isImage&&<Eye size={15}/>}
                  </button>
                  <a className="task-detail-attachment-download" href={downloadUrl} aria-label={"Download "+item.file_name} title="Download original"><Download size={15}/></a>
                </div>;
              })}
            </div>
          </section>}
          {task.notes&&<section className="task-detail-section"><h3>Task notes</h3><p>{task.notes}</p></section>}
          {task.completion_note&&<section className="task-detail-section task-detail-completion"><h3><CheckCheck size={15}/> Completion note</h3><p>{task.completion_note}</p></section>}
          <div className="task-detail-actions"><Button variant="ghost" onClick={onClose}>Close</Button>{canWrite&&<><Button variant="secondary" onClick={onEdit}><Pencil size={15}/> Edit task</Button>{task.status!=="done"&&<Button onClick={onComplete}><Check size={15}/> Mark as done</Button>}</>}</div>
        </div>}
  </Modal>;
}
function CompleteTaskDialog({task,status,note,setNote,onCancel,onConfirm,busy}) {
  const label=STATUSES.find(item=>item.value===status)?.label||"To do";
  const done=status==="done";
  return <Modal title={done?"Mark task as done?":`Change status to ${label.toLowerCase()}?`} subtitle="Confirm this status change before it is saved." onClose={onCancel}>
    <div className="complete-task-dialog"><div className="complete-task-summary"><span>{done?<CheckCheck size={19}/>:<Activity size={19}/>}</span><div><strong>{task.title}</strong><small>{done?"This task will remain in your list as completed.":`The task will be moved to ${label.toLowerCase()}.`}</small></div></div>
      {done&&<label className="field"><span>Completion note <i>Optional</i></span><textarea rows={4} maxLength={3000} value={note} onChange={e=>setNote(e.target.value)} placeholder="What was completed? Add a result, handover detail or useful context…"/></label>}
      <div className="modal-actions"><Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button><Button onClick={onConfirm} disabled={busy}>{busy?"Saving…":done?"Confirm done":`Confirm ${label.toLowerCase()}`}</Button></div>
    </div>
  </Modal>;
}

function ActivityFeed({items,onClose}) {
  const labels={task_created:"Task added",task_updated:"Task updated",task_status_changed:"Task status changed",task_deleted:"Task deleted",task_delayed:"Task delayed",business_created:"Business created",business_updated:"Business updated",business_archived:"Business archived",business_restored:"Business restored",business_deleted:"Business deleted",category_created:"Category created",category_updated:"Category updated",category_deleted:"Category deleted",team_member_created:"Team member created",team_member_updated:"Team member updated",team_member_disabled:"Team member disabled",team_member_enabled:"Team member enabled",team_member_deleted:"Team member deleted",whatsapp_provider_connected:"WhatsApp provider connected",whatsapp_provider_disconnected:"WhatsApp provider disconnected"};
  return <Modal title="Workspace activity" subtitle="A private timeline of changes across all businesses and team members." onClose={onClose} wide>
    <div className="activity-feed">
      {items.length?items.map(item=>{
        const detail=item.details||{};
        const when=new Date(item.created_at).toLocaleString("en-GB",{timeZone:"Asia/Dhaka",day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
        const fromTo=detail.from&&detail.to?`${detail.from} → ${detail.to}`:"";
        const changed=detail.before&&detail.after?Object.keys(detail.after).filter(key=>JSON.stringify(detail.before[key]??null)!==JSON.stringify(detail.after[key]??null)).map(key=>`${key.replaceAll("_"," ")}: ${detail.before[key]??"none"} → ${detail.after[key]??"none"}`):[];
        const metadata=[
          detail.deadline?`Deadline: ${detail.deadline}`:null,
          detail.priority?`Priority: ${detail.priority}`:null,
          detail.notification_email?`Recipients: ${detail.notification_email}`:null,
          typeof detail.email_notifications==="boolean"?`Email notifications: ${detail.email_notifications?"On":"Off"}`:null,
          typeof detail.assigned_business_count==="number"?`${detail.assigned_business_count} business assignment(s)`:null,
          ...(Array.isArray(detail.assignments)?detail.assignments.map(a=>`${a.business_id}: ${a.permission}`):[])
        ].filter(Boolean);
        const summary=[...changed,...metadata].join(" · ");
        return <article className="activity-item" key={item.id}><span className="activity-item-icon"><BellRing size={16}/></span><div className="activity-item-main"><div className="activity-item-heading"><strong>{labels[item.event_type]||item.event_type.replaceAll("_"," ")}</strong><time>{when}</time></div><p>{item.title}</p><small>{item.actor_display_name||item.actor_username}{item.business_name?` · ${item.business_name}`:""}{fromTo?` · ${fromTo}`:""}</small>{summary&&<div className="activity-item-note">{summary}</div>}{detail.note&&<div className="activity-item-note">{detail.note}</div>}</div></article>;
      }):<div className="activity-empty"><Bell size={20}/><strong>No activity yet</strong><span>Workspace changes will appear here.</span></div>}
    </div>
    <div className="modal-actions"><Button variant="ghost" onClick={onClose}>Close</Button></div>
  </Modal>;
}
function App() {
  const [authenticated,setAuthenticated]=useState(false);
  const [checking,setChecking]=useState(true);
  const [loading,setLoading]=useState(false);
  const [businesses,setBusinesses]=useState([]);
  const [categories,setCategories]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [sessionUser,setSessionUser]=useState(null);
  const [users,setUsers]=useState([]);
  const [emailConfigured,setEmailConfigured]=useState(false);
  const [accountDetails,setAccountDetails]=useState(null);
  const [accountOpen,setAccountOpen]=useState(false);
  const [active,setActive]=useState(()=>{
    try{
      return new URLSearchParams(window.location.search).get("business")||"overview";
    }catch{
      return "overview";
    }
  });
  const [search,setSearch]=useState("");
  const [listMode,setListMode]=useState(true);
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [overviewFiltersOpen,setOverviewFiltersOpen]=useState(false);
  const [overviewFilters,setOverviewFilters]=useState({status:"all",priority:"all",sort:"deadline"});
  const [range,setRange]=useState("7");
  const [customFrom,setCustomFrom]=useState(todayDhaka());
  const [customTo,setCustomTo]=useState(addDays(todayDhaka(),7));
  const [filters,setFilters]=useState({category:"",status:"",priority:"",deadlineState:"",dueFrom:"",dueTo:"",createdFrom:"",createdTo:"",sort:"deadline"});
  const [modal,setModal]=useState(null);
  const [editingTask,setEditingTask]=useState(null);
  const [viewingTask,setViewingTask]=useState(null);
  const [completingTask,setCompletingTask]=useState(null);
  const [requestedStatus,setRequestedStatus]=useState("done");
  const [completionNote,setCompletionNote]=useState("");
  const [activityItems,setActivityItems]=useState([]);
  const [activityOpen,setActivityOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [activitySeenAt,setActivitySeenAt]=useState(()=>{try{return localStorage.getItem("taskxvs_activity_seen")||"";}catch{return "";}});
  const [completionBusy,setCompletionBusy]=useState(false);
  const [toast,setToast]=useState("");
  const [confirmDialog,setConfirmDialog]=useState(null);
  const confirmResolver=useRef(null);
  const [mobileNav,setMobileNav]=useState(false);
  const today=todayDhaka();

  async function refresh() {
    setLoading(true);
    try {
      const result=await api("/api/bootstrap");
      setBusinesses(result.businesses||[]);setCategories(result.categories||[]);setTasks(result.tasks||[]);setSessionUser(result.user||null);setEmailConfigured(Boolean(result.emailConfigured));
      if(result.user?.role==="owner"){const [u,a]=await Promise.all([api("/api/admin/users"),api("/api/admin/activity?limit=60")]);setUsers(u.users||[]);setActivityItems(a.events||[]);}else{setUsers([]);setActivityItems([]);}
    } finally {setLoading(false);}
  }
  useEffect(()=>{
    api("/api/auth/session").then(async s=>{if(s.authenticated){setAuthenticated(true);setSessionUser(s.user||null);await refresh();}}).catch(()=>{}).finally(()=>setChecking(false));
  },[]);
  useEffect(()=>{
    try{
      const url=new URL(window.location.href);
      if(active==="overview")url.searchParams.delete("business");
      else url.searchParams.set("business",active);
      window.history.replaceState(window.history.state,"",url.toString());
    }catch{}
  },[active]);
  useEffect(()=>{
    if(!authenticated||checking||loading)return;
    if(active!=="overview"&&!businesses.some(b=>b.id===active&&!b.archived)){
      setActive("overview");
    }
  },[active,businesses,authenticated,checking,loading]);
  useEffect(()=>{
    const handlePopState=()=>{
      const businessId=new URLSearchParams(window.location.search).get("business")||"overview";
      setActive(businessId);
      setSearch("");
      setFiltersOpen(false);
      setOverviewFiltersOpen(false);
      clearFilters();
    };
    window.addEventListener("popstate",handlePopState);
    return ()=>window.removeEventListener("popstate",handlePopState);
  },[]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(""),2600);return()=>clearTimeout(t);},[toast]);

  async function login(username,password) {
    await api("/api/auth/login",{method:"POST",body:JSON.stringify({username,password})});
    setAuthenticated(true);await refresh();
  }
  async function logout() {
    try{await api("/api/auth/logout",{method:"POST",body:"{}"});}finally{
      setAuthenticated(false);setSessionUser(null);setUsers([]);setBusinesses([]);setCategories([]);setTasks([]);setActive("overview");setSearch("");
    }
  }
  function updateTaskAttachmentState(taskId,attachment,action="add") { setTasks(current=>current.map(task=>{ if(task.id!==taskId)return task; const currentAttachments=task.attachments||[]; const next=action==="remove"?currentAttachments.filter(item=>item.id!==attachment.id):[...currentAttachments.filter(item=>item.id!==attachment.id),attachment]; return {...task,attachments:next}; })); }
  function notify(message){setToast(message);}
  function requestConfirmation(config){
    return new Promise(resolve=>{
      if(confirmResolver.current)confirmResolver.current(false);
      confirmResolver.current=resolve;
      setConfirmDialog(config);
    });
  }
  function settleConfirmation(confirmed){
    const resolve=confirmResolver.current;
    confirmResolver.current=null;
    setConfirmDialog(null);
    if(resolve)resolve(confirmed);
  }
  async function addTask(values){const result=await api("/api/tasks",{method:"POST",body:JSON.stringify(values)});setTasks(t=>[result,...t]);notify("Task added");return result;}
  async function updateTask(task,values){const result=await api(`/api/tasks/${task.id}`,{method:"PATCH",body:JSON.stringify(values)});setTasks(ts=>ts.map(t=>t.id===task.id?{...result,attachments:t.attachments||[]} :t));notify("Task updated");return result;}
  async function removeTask(task){
    const confirmed=await requestConfirmation({
      heading:"Delete task?",
      title:task.title,
      message:"This task will be permanently deleted.",
      detail:"All attachments linked to this task will also be deleted from Cloudinary. This action cannot be undone.",
      confirmLabel:"Delete task",
      tone:"danger"
    });
    if(!confirmed)return;
    try{
      await api(`/api/tasks/${task.id}`,{method:"DELETE"});
      setTasks(ts=>ts.filter(t=>t.id!==task.id));
      notify("Task and attachments deleted");
    }catch(err){notify(err.message);}
  }
  async function changeStatus(task,status,note="") {
    const result=await api(`/api/tasks/${task.id}/status`,{method:"PATCH",body:JSON.stringify({status,completion_note:status==="done"?note:"",confirm_status_change:true,confirm_completion:status==="done"})});
    setTasks(ts=>ts.map(t=>t.id===task.id?result:t));
    setViewingTask(current=>current?.id===task.id?result:current);
    notify(status==="done"?"Task completed":status==="in_progress"?"Task moved to in progress":"Task reopened");
    return result;
  }
  function requestStatusChange(task,status) {
    if(!["todo","in_progress","done"].includes(status)||status===task.status)return;
    setCompletionNote("");
    setRequestedStatus(status);
    setCompletingTask(task);
  }
  async function confirmCompletion() {
    if(!completingTask)return;
    setCompletionBusy(true);
    try {
      await changeStatus(completingTask,requestedStatus,requestedStatus==="done"?completionNote.trim():"");
      setCompletingTask(null);setCompletionNote("");
    } catch(err){notify(err.message);}
    finally{setCompletionBusy(false);}
  }
  async function openAccount() {
    try{const result=await api("/api/account");setAccountDetails({...result,...sessionUser});setAccountOpen(true);}
    catch(err){notify(err.message);}
  }
  async function saveAccount(patch) {
    const result=await api("/api/account",{method:"PATCH",body:JSON.stringify(patch)});
    setAccountDetails(current=>({...current,...result}));
    notify("Account preferences saved");
    return result;
  }
  async function openActivity() {
    try {
      const result=await api("/api/admin/activity?limit=100");
      setActivityItems(result.events||[]);
      setActivityOpen(true);
      const seen=new Date().toISOString();
      setActivitySeenAt(seen);
      try{localStorage.setItem("taskxvs_activity_seen",seen);}catch{}
    } catch(err){notify(err.message);}
  }
  async function addBusiness(name,notification_email,email_notifications){const b=await api("/api/businesses",{method:"POST",body:JSON.stringify({name,notification_email,email_notifications})});await refresh();setActive(b.id);notify("Business added");}
  async function renameBusiness(id,patch){const next=await api(`/api/businesses/${id}`,{method:"PATCH",body:JSON.stringify(patch)});setBusinesses(bs=>bs.map(x=>x.id===id?next:x));notify("Business updated");}
  async function archiveBusiness(b){const next=await api(`/api/businesses/${b.id}`,{method:"PATCH",body:JSON.stringify({archived:!b.archived})});setBusinesses(bs=>bs.map(x=>x.id===b.id?next:x));if(next.archived&&active===b.id)setActive("overview");notify(next.archived?"Business archived":"Business restored");}
  async function deleteBusiness(b){await api(`/api/businesses/${b.id}`,{method:"DELETE"});setBusinesses(bs=>bs.filter(x=>x.id!==b.id));setCategories(cs=>cs.filter(c=>c.business_id!==b.id));setTasks(ts=>ts.filter(t=>t.business_id!==b.id));if(active===b.id)setActive("overview");notify("Business deleted");}
  async function saveUser(id,data){const result=await api(id?`/api/admin/users/${id}`:"/api/admin/users",{method:id?"PATCH":"POST",body:JSON.stringify(data)});const latest=await api("/api/admin/users");setUsers(latest.users||[]);notify(id?"User updated":"User created");return result;}
  async function toggleUser(user){await api(`/api/admin/users/${user.id}`,{method:"PATCH",body:JSON.stringify({active:!user.active})});const latest=await api("/api/admin/users");setUsers(latest.users||[]);notify(user.active?"User disabled":"User enabled");}
  async function deleteUser(user){
    const confirmed=await requestConfirmation({
      heading:"Delete team member?",
      title:user.username,
      message:"This account will be permanently deleted and the user will immediately lose access to TaskXVS.",
      detail:"This action cannot be undone.",
      confirmLabel:"Delete account",
      tone:"danger"
    });
    if(!confirmed)return;
    await api(`/api/admin/users/${user.id}`,{method:"DELETE"});
    setUsers(us=>us.filter(u=>u.id!==user.id));
    notify("User deleted");
  }
  async function addCategory(v){const c=await api("/api/categories",{method:"POST",body:JSON.stringify(v)});setCategories(cs=>[...cs,c]);notify("Category added");}
  async function editCategory(c,patch){const next=await api(`/api/categories/${c.id}`,{method:"PATCH",body:JSON.stringify(patch)});setCategories(cs=>cs.map(x=>x.id===c.id?next:x));notify("Category updated");}
  async function deleteCategory(c){
    const count=tasks.filter(t=>t.category_id===c.id).length;
    const confirmed=await requestConfirmation({
      heading:"Delete category?",
      title:c.name,
      message:"This category will be permanently removed.",
      detail:count+` task(s) will remain in ${c.name}’s business but become uncategorized.`,
      confirmLabel:"Delete category",
      tone:"danger"
    });
    if(!confirmed)return;
    await api(`/api/categories/${c.id}`,{method:"DELETE"});
    setCategories(cs=>cs.filter(x=>x.id!==c.id));
    setTasks(ts=>ts.map(t=>t.category_id===c.id?{...t,category_id:null}:t));
    notify("Category deleted");
  }

  const isOwner=sessionUser?.role==="owner";
  const canWriteBusiness=id=>isOwner||businesses.find(b=>b.id===id)?.permission==="write";
  const activeCanWrite=active==="overview"?isOwner:canWriteBusiness(active);
  const writableBusinesses=businesses.filter(b=>!b.archived&&canWriteBusiness(b.id));
  const canCreateBusiness=isOwner||writableBusinesses.length>0;
  const pendingFor = id => tasks.filter(t=>t.business_id===id&&isOpen(t)).length;
  const progressFor = id => {
    const related=tasks.filter(t=>t.business_id===id);
    const done=related.filter(t=>t.status==="done").length;
    return {done,total:related.length,percent:related.length?Math.round(done/related.length*100):0};
  };
  const overallProgress=tasks.length?Math.round(tasks.filter(t=>t.status==="done").length/tasks.length*100):0;
  const selectedBusiness=businesses.find(b=>b.id===active);
  const searchResults=useMemo(()=>{
    const q=search.trim().toLowerCase();
    if(!q)return [];
    return tasks.filter(t=>(t.title+" "+t.description+" "+t.notes).toLowerCase().includes(q));
  },[tasks,search]);
  function rangeBounds() {
    if(range==="today")return [today,today];
    if(range==="7")return [today,addDays(today,7)];
    if(range==="30")return [today,addDays(today,30)];
    if(range==="month")return [today.slice(0,8)+"01",today.slice(0,7)+"-31"];
    if(range==="custom")return [customFrom,customTo];
    return ["",""];
  }
  const [from,to]=rangeBounds();
  const overviewTasks=tasks.filter(t=>{
    if(t.status==="done"||isOverdue(t,today))return true;
    if(!from)return true;
    const target=t.deadline||t.created_date;
    return target>=from&&target<=to;
  });
  const overdueTasks=tasks.filter(t=>isOverdue(t,today)).sort((a,b)=>a.deadline.localeCompare(b.deadline));
  const progressPercent=0;
  const overviewTasksSorted=useMemo(()=>{
    let result=[...overviewTasks];
    if(overviewFilters.status==="open")result=result.filter(t=>t.status==="todo"&&!isOverdue(t,today));
    if(overviewFilters.status==="in_progress")result=result.filter(t=>t.status==="in_progress"&&!isOverdue(t,today));
    if(overviewFilters.status==="delayed")result=result.filter(t=>isOverdue(t,today));
    if(overviewFilters.status==="completed")result=result.filter(t=>t.status==="done");
    if(overviewFilters.status==="urgent")result=result.filter(t=>isOpen(t)&&(t.priority==="urgent"||isDueSoon(t,today)));
    if(overviewFilters.priority!=="all")result=result.filter(t=>t.priority===overviewFilters.priority);
    const order={urgent:0,high:1,normal:2,low:3};
    result.sort((a,b)=>{
      if(overviewFilters.sort==="newest")return (b.created_at||"").localeCompare(a.created_at||"");
      if(overviewFilters.sort==="oldest")return (a.created_at||"").localeCompare(b.created_at||"");
      if(overviewFilters.sort==="updated")return (b.updated_at||"").localeCompare(a.updated_at||"");
      if(overviewFilters.sort==="deadline_latest")return (b.deadline||"0000-01-01").localeCompare(a.deadline||"0000-01-01");
      if(overviewFilters.sort==="priority_high")return (order[a.priority]??2)-(order[b.priority]??2);
      if(overviewFilters.sort==="priority_low")return (order[b.priority]??2)-(order[a.priority]??2);
      if(overviewFilters.sort==="title_az")return (a.title||"").localeCompare(b.title||"");
      if(overviewFilters.sort==="title_za")return (b.title||"").localeCompare(a.title||"");
      return (a.deadline||"9999-12-31").localeCompare(b.deadline||"9999-12-31");
    });
    return result;
  },[overviewTasks,overviewFilters,today]);
  const urgentTasks=tasks.filter(t=>isDueSoon(t,today)|| (isOpen(t)&&t.priority==="urgent")).sort((a,b)=>(a.deadline||"9999").localeCompare(b.deadline||"9999"));
  const completedTasks=overviewTasks.filter(t=>t.status==="done");
  const openTasks=overviewTasks.filter(isOpen);
  const recentTasks=[...tasks].sort((a,b)=>(b.updated_at||"").localeCompare(a.updated_at||"")).slice(0,7);

  const businessFiltered=useMemo(()=>{
    let result=tasks.filter(t=>t.business_id===active);
    if(filters.category)result=result.filter(t=>t.category_id===filters.category);
    if(filters.status)result=result.filter(t=>t.status===filters.status);
    if(filters.priority)result=result.filter(t=>t.priority===filters.priority);
    if(filters.deadlineState==="overdue")result=result.filter(t=>isOverdue(t,today));
    if(filters.deadlineState==="urgent")result=result.filter(t=>isDueSoon(t,today));
    if(filters.deadlineState==="none")result=result.filter(t=>!t.deadline&&isOpen(t));
    if(filters.dueFrom)result=result.filter(t=>t.deadline&&t.deadline>=filters.dueFrom);
    if(filters.dueTo)result=result.filter(t=>t.deadline&&t.deadline<=filters.dueTo);
    if(filters.createdFrom)result=result.filter(t=>t.created_date>=filters.createdFrom);
    if(filters.createdTo)result=result.filter(t=>t.created_date<=filters.createdTo);
    const order={urgent:0,high:1,normal:2,low:3};
    result.sort((a,b)=>{
      if(filters.sort==="newest")return (b.created_at||"").localeCompare(a.created_at||"");
      if(filters.sort==="oldest")return (a.created_at||"").localeCompare(b.created_at||"");
      if(filters.sort==="priority")return order[a.priority]-order[b.priority];
      return (a.deadline||"9999").localeCompare(b.deadline||"9999");
    });
    return result;
  },[tasks,active,filters,today]);

  function clearFilters(){setFilters({category:"",status:"",priority:"",deadlineState:"",dueFrom:"",dueTo:"",createdFrom:"",createdTo:"",sort:"deadline"});}
  function clearOverviewFilters(){setOverviewFilters({status:"all",priority:"all",sort:"deadline"});}
  const overviewFilterCount=(overviewFilters.status!=="all"?1:0)+(overviewFilters.priority!=="all"?1:0);
  function taskCard(t,withBusiness=false){
    const b=businesses.find(x=>x.id===t.business_id),c=categories.find(x=>x.id===t.category_id);
    const canWrite=canWriteBusiness(t.business_id);
    const props={task:t,category:c,business:withBusiness?b:null,today,canWrite,
      onView:()=>setViewingTask(t),
      onEdit:()=>{setViewingTask(null);setEditingTask(t);setModal("task");},
      onDelete:()=>removeTask(t),
      onStatus:status=>requestStatusChange(t,status)};
    return listMode?<TaskListRow key={t.id} {...props}/>:<TaskCard key={t.id} {...props}/>;
  }
  const activeFilterCount=Object.entries(filters).filter(([k,v])=>k!=="sort"&&Boolean(v)).length;
  function openNewTask(){setEditingTask(null);if(!writableBusinesses.length){notify("No business with write access is assigned to you.");return;}if(active!=="overview"&&!canWriteBusiness(active)){notify("This business is read-only.");return;}setModal("task");}
  function tabTo(id){
    if(id!==active){
      try{
        const url=new URL(window.location.href);
        if(id==="overview")url.searchParams.delete("business");
        else url.searchParams.set("business",id);
        window.history.pushState({taskxvsWorkspace:id},"",url.toString());
      }catch{}
    }
    setActive(id);
    clearFilters();
    setSearch("");
    setFiltersOpen(false);
    setMobileNav(false);
  }
  const headerTitle=search.trim()?"Search results":active==="overview"?"Overview":selectedBusiness?.name||"Overview";
  const headerSub=search.trim()?"Across your assigned businesses":active==="overview"?"Your workspace":selectedBusiness?.name||"Business";

  if(checking)return <div className="boot-screen"><div className="boot-mark">S</div><span>Preparing your workspace…</span></div>;
  if(!authenticated)return <Login onLogin={login}/>;
  return <div className={`app-frame ${sidebarCollapsed?"app-collapsed":""}`}>
    <aside className={`sidebar ${mobileNav?"sidebar-open":""} ${sidebarCollapsed?"sidebar-collapsed":""}`}>
      <div className="sidebar-brand-row"><Brand collapsed={sidebarCollapsed} onClick={()=>setSidebarCollapsed(v=>!v)}/></div>
      {!sidebarCollapsed&&<label className="sidebar-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks…"/>{search&&<button type="button" aria-label="Clear search" onClick={()=>setSearch("")}><X size={14}/></button>}</label>}
      <div className="sidebar-section-label">WORKSPACE</div>
      <button className={`sidebar-link sidebar-overview-link ${active==="overview"?"is-active":""}`} title="Overview" onClick={()=>tabTo("overview")}><span className="overview-bullet"><LayoutDashboard size={17}/></span><span>Overview</span></button>
      <div className="sidebar-business-heading">
        <span>BUSINESSES</span>
        <div className="sidebar-business-tools">
          {isOwner&&<button className="sidebar-manage-businesses" onClick={()=>setModal("businesses")} aria-label="Manage businesses"><Settings2 size={14}/><span>Manage</span></button>}
          {canCreateBusiness&&<button className="sidebar-business-add" onClick={()=>setModal("businesses")} aria-label="Add business"><Plus size={16}/></button>}
        </div>
      </div>
      <nav className="sidebar-business-list">{businesses.filter(b=>!b.archived).map(b=><button key={b.id} className={`sidebar-link ${active===b.id?"is-active":""}`} onClick={()=>tabTo(b.id)} title={b.name}><span className="business-bullet">{b.name.slice(0,1)}</span><span className="sidebar-business-name">{b.name}</span><span className="sidebar-count">{pendingFor(b.id)}</span></button>)}</nav>
      {canCreateBusiness&&<button className="sidebar-add-business" title="Add business" onClick={()=>setModal("businesses")}><Plus size={15}/><span>Add business</span></button>}
      <div className="sidebar-bottom">
        {isOwner&&<button className="sidebar-link sidebar-admin-link" title="Settings" onClick={()=>setSettingsOpen(true)}><Settings2 size={17}/><span>Settings</span></button>}
        {isOwner&&<button className="sidebar-link sidebar-admin-link" title="Team access" onClick={()=>setModal("users")}><Users size={17}/><span>Team access</span></button>}
        <button type="button" className="owner-row owner-row-button" onClick={openAccount} title="My account"><div className="owner-avatar">{(sessionUser?.displayName||"X").slice(0,1).toUpperCase()}</div><div><strong>{sessionUser?.displayName||"User"}</strong><small>{isOwner?"Workspace owner":"Team member"}</small></div></button>
        <button className="sidebar-link logout-link" title="Sign out" onClick={logout}><LogOut size={16}/><span>Sign out</span></button>
      </div>
    </aside>
    {mobileNav&&<button className="mobile-scrim" onClick={()=>setMobileNav(false)} aria-label="Close menu"/>}
    <main className="main-area">
      <header className="topbar">
        <IconButton label="Open menu" className="mobile-menu-button" onClick={()=>setMobileNav(true)}><Menu size={18}/></IconButton>
        <nav className="business-tabs" aria-label="Business workspaces">
          <div className="business-tabs-scroll">
            <button className={`business-tab ${active==="overview"&&!search?"tab-active":""}`} onClick={()=>tabTo("overview")}><LayoutDashboard size={17}/><span>Overview</span></button>
            {businesses.filter(b=>!b.archived).map(b=><button key={b.id} title={b.name} className={`business-tab ${active===b.id&&!search?"tab-active":""}`} onClick={()=>tabTo(b.id)}><span className="tab-label">{b.name}<span className="tab-counter">{pendingFor(b.id)}</span></span></button>)}
          </div>
        </nav>
        <div className="topbar-right">
          {isOwner&&<button type="button" className="activity-trigger" aria-label="Workspace activity" title="Workspace activity" onClick={openActivity}><Bell size={18}/>{activityItems.filter(item=>!activitySeenAt||new Date(item.created_at).getTime()>Date.parse(activitySeenAt)).length>0&&<span>{activityItems.filter(item=>!activitySeenAt||new Date(item.created_at).getTime()>Date.parse(activitySeenAt)).length}</span>}</button>}
          {writableBusinesses.length>0&&<Button onClick={openNewTask}><Plus size={16}/> New task</Button>}
        </div>
      </header>
      <div className="main-scroll">


        {search.trim()? <section className="page-section">
          <div className="section-heading"><div><h2>Search results</h2><p>{searchResults.length} tasks</p></div></div>
          {searchResults.length?<div className={listMode?"task-list-mode":"task-masonry"}>{searchResults.map(t=>taskCard(t,true))}</div>:<EmptyState title="No matches found" description="Try another keyword or search for a business, category or task detail."/>}
        </section> : active==="overview" ? <section className="page-section">
          <div className="overview-toolbar">
            <div><h3>Overview</h3></div>
            <div className="range-control"><CalendarRange size={15}/><select value={range} onChange={e=>setRange(e.target.value)}><option value="today">Today</option><option value="7">Next 7 days</option><option value="30">Next 30 days</option><option value="month">This month</option><option value="all">All time</option><option value="custom">Custom range</option></select></div>
          </div>
          {range==="custom"&&<div className="custom-range"><label>From <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)}/></label><label>To <input type="date" min={customFrom} value={customTo} onChange={e=>setCustomTo(e.target.value)}/></label></div>}
          <div className="metric-grid">
            <Metric icon={<Layers3 size={17}/>} label="Open" value={openTasks.length} tone="sage"/>
            <Metric icon={<CheckCheck size={17}/>} label="Done" value={completedTasks.length} tone="lavender"/>
            <Metric icon={<AlarmClock size={17}/>} label="Urgent" value={urgentTasks.length} tone="amber"/>
            <Metric icon={<CircleAlert size={17}/>} label="Delayed" value={overdueTasks.length} tone="coral"/>
          </div>
          <div className="progress-panel">
            <div className="progress-heading"><strong>Overall progress</strong><span>{overallProgress}% · {tasks.filter(t=>t.status==="done").length}/{tasks.length} done</span></div>
            <div className="progress-track"><i style={{width:overallProgress+"%"}}/></div>
          </div>
          <div className="overview-task-heading">
            <strong>All tasks</strong><span>{overviewTasksSorted.length}</span>
            <div className="overview-task-controls">
              <div className="view-toggle"><button className={listMode?"selected":""} onClick={()=>setListMode(true)} aria-label="List view"><List size={16}/></button><button className={!listMode?"selected":""} onClick={()=>setListMode(false)} aria-label="Card view"><Grid2X2 size={16}/></button></div>
              <button type="button" className={overviewFilterCount?"overview-filter-trigger is-active":"overview-filter-trigger"} aria-label="Filter and sort all tasks" title="Filter and sort all tasks" aria-expanded={overviewFiltersOpen} onClick={()=>setOverviewFiltersOpen(v=>!v)}><SlidersHorizontal size={17}/>{overviewFilterCount>0&&<span>{overviewFilterCount}</span>}</button>
            </div>
          </div>
          {overviewFiltersOpen&&<div className="filters-panel overview-filters-panel">
            <div className="filters-title"><div><SlidersHorizontal size={16}/><strong>Filter and sort tasks</strong></div><button type="button" onClick={clearOverviewFilters}>Clear all</button></div>
            <div className="filters-grid overview-filters-grid">
              <label className="filter-field"><span>Status</span><select value={overviewFilters.status} onChange={e=>setOverviewFilters(v=>({...v,status:e.target.value}))}><option value="all">All tasks</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="delayed">Delayed</option><option value="completed">Completed</option><option value="urgent">Urgent</option></select></label>
              <label className="filter-field"><span>Priority</span><select value={overviewFilters.priority} onChange={e=>setOverviewFilters(v=>({...v,priority:e.target.value}))}><option value="all">Any priority</option><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></label>
              <label className="filter-field"><span>Sort by</span><select value={overviewFilters.sort} onChange={e=>setOverviewFilters(v=>({...v,sort:e.target.value}))}><option value="deadline">Deadline soonest</option><option value="deadline_latest">Deadline latest</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="updated">Recently updated</option><option value="priority_high">Priority: high to low</option><option value="priority_low">Priority: low to high</option><option value="title_az">Title: A to Z</option><option value="title_za">Title: Z to A</option></select></label>
            </div>
          </div>}
          {loading ? (
            <div className="loading-block">Loading…</div>
          ) : overviewTasksSorted.length ? (
            <div className={listMode?"task-list-mode":"task-masonry"}>{overviewTasksSorted.map(t=>taskCard(t,true))}</div>
          ) : overviewTasks.length ? (
            <EmptyState title="No tasks match these filters" description="Adjust the filters or clear them to see your tasks." action={<Button variant="secondary" onClick={clearOverviewFilters}>Clear filters</Button>}/>
          ) : (
            <EmptyState title="No tasks yet" description="Add a task to see it here." action={<Button onClick={openNewTask}><Plus size={15}/> Add task</Button>}/>
          )}</section> : selectedBusiness ? <section className="page-section">
          <div className="business-hero business-hero-compact">
            <div className="business-summary"><strong>{tasks.filter(t=>t.business_id===active).length} tasks</strong><span>{progressFor(active).percent}% complete {selectedBusiness.permission==="read"&&" · Read only"}</span></div>
            <div className="business-actions">
              <div className="view-toggle"><button className={listMode?"selected":""} onClick={()=>setListMode(true)} aria-label="List view"><List size={16}/></button><button className={!listMode?"selected":""} onClick={()=>setListMode(false)} aria-label="Card view"><Grid2X2 size={16}/></button></div>
              {activeCanWrite&&<button type="button" className={`filter-trigger ${activeFilterCount?"filter-active":""}`} onClick={()=>setFiltersOpen(v=>!v)}><SlidersHorizontal size={16}/><span>Filters</span>{activeFilterCount>0&&<b>{activeFilterCount}</b>}</button>}
              {activeCanWrite&&<Button variant="secondary" onClick={()=>setModal("categories")}><Tag size={15}/> Categories</Button>}
              {activeCanWrite&&<Button onClick={openNewTask}><Plus size={16}/> Add task</Button>}
            </div>
          </div>
          <div className="progress-panel business-progress-panel"><div className="progress-heading"><strong>Progress</strong><span>{progressFor(active).percent}% · {progressFor(active).done}/{progressFor(active).total} done</span></div><div className="progress-track"><i style={{width:progressFor(active).percent+"%"}}/></div></div>
          <div className="business-stats"><MiniStat label="Open" value={tasks.filter(t=>t.business_id===active&&isOpen(t)).length}/><MiniStat label="Urgent" value={tasks.filter(t=>t.business_id===active&&(isDueSoon(t,today)||(isOpen(t)&&t.priority==="urgent"))).length}/><MiniStat label="Delayed" value={tasks.filter(t=>t.business_id===active&&isOverdue(t,today)).length}/><MiniStat label="Done" value={tasks.filter(t=>t.business_id===active&&t.status==="done").length}/></div>
          {filtersOpen&&activeCanWrite&&<div className="filters-panel">
            <div className="filters-title"><div><SlidersHorizontal size={16}/><strong>Filter tasks</strong></div><button onClick={clearFilters}>Clear all</button></div>
            <div className="filters-grid">
              <label className="filter-field"><span>Category</span><select value={filters.category} onChange={e=>setFilters(f=>({...f,category:e.target.value}))}><option value="">All categories</option>{categories.filter(c=>c.business_id===active).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
              <label className="filter-field"><span>Status</span><select value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))}><option value="">All statuses</option>{STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
              <label className="filter-field"><span>Priority</span><select value={filters.priority} onChange={e=>setFilters(f=>({...f,priority:e.target.value}))}><option value="">All priorities</option>{PRIORITIES.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
              <label className="filter-field"><span>Deadline state</span><select value={filters.deadlineState} onChange={e=>setFilters(f=>({...f,deadlineState:e.target.value}))}><option value="">Any deadline</option><option value="overdue">Delayed</option><option value="urgent">Due within 2 days</option><option value="none">No deadline</option></select></label>
              <label className="filter-field"><span>Due from</span><input type="date" value={filters.dueFrom} onChange={e=>setFilters(f=>({...f,dueFrom:e.target.value}))}/></label>
              <label className="filter-field"><span>Due to</span><input type="date" value={filters.dueTo} onChange={e=>setFilters(f=>({...f,dueTo:e.target.value}))}/></label>
              <label className="filter-field"><span>Created from</span><input type="date" value={filters.createdFrom} onChange={e=>setFilters(f=>({...f,createdFrom:e.target.value}))}/></label>
              <label className="filter-field"><span>Created to</span><input type="date" value={filters.createdTo} onChange={e=>setFilters(f=>({...f,createdTo:e.target.value}))}/></label>
              <label className="filter-field filter-sort"><span>Sort by</span><select value={filters.sort} onChange={e=>setFilters(f=>({...f,sort:e.target.value}))}><option value="deadline">Deadline soonest</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="priority">Priority</option></select></label>
              <div className="view-toggle"><button className={!listMode?"selected":""} onClick={()=>setListMode(false)} aria-label="Grid view"><Grid2X2 size={16}/></button><button className={listMode?"selected":""} onClick={()=>setListMode(true)} aria-label="List view"><List size={17}/></button></div>
            </div>
          </div>}
          <div className="task-results-heading"><span>{businessFiltered.length} tasks</span><button onClick={clearFilters}>Clear filters</button></div>
          {loading?<div className="loading-block">Loading tasks…</div>:businessFiltered.length?<div className={listMode?"task-list-mode":"task-masonry"}>{businessFiltered.map(t=>taskCard(t))}</div>:<EmptyState title={tasks.some(t=>t.business_id===active)?"No tasks match these filters":"A fresh start."} description={tasks.some(t=>t.business_id===active)?"Try adjusting your filters, or clear them to see all tasks.":`Add the first task for ${selectedBusiness.name} and keep everything moving.`} action={<Button onClick={openNewTask}><Plus size={15}/> Add a task</Button>}/>}
        </section> : <EmptyState title="No business selected" description="Add a business to get started." action={<Button onClick={()=>setModal("businesses")}>Add business</Button>}/>}
      </div>
    </main>
    {modal==="task"&&<TaskForm task={editingTask} businesses={writableBusinesses} categories={categories} defaultBusiness={active==="overview"?writableBusinesses[0]?.id:active} onClose={()=>setModal(null)} onSave={values=>editingTask?updateTask(editingTask,values):addTask(values)} onUpdate={updateTask} onAttachmentUpdate={updateTaskAttachmentState} requestConfirmation={requestConfirmation}/>}
    {modal==="categories"&&selectedBusiness&&activeCanWrite&&<CategoryManager business={selectedBusiness} categories={categories} onClose={()=>setModal(null)} onAdd={addCategory} onEdit={editCategory} onDelete={deleteCategory}/>}
    {modal==="businesses"&&canCreateBusiness&&<BusinessManager businesses={businesses} emailConfigured={emailConfigured} isOwner={isOwner} currentUserId={sessionUser?.id} onClose={()=>setModal(null)} onAdd={addBusiness} onRename={renameBusiness} onArchive={archiveBusiness} onDelete={deleteBusiness}/>}
    {modal==="users"&&isOwner&&<UserManager users={users} businesses={businesses} onClose={()=>setModal(null)} onSave={saveUser} onDelete={deleteUser} onToggle={toggleUser}/>}
    {viewingTask&&<TaskDetails task={tasks.find(t=>t.id===viewingTask.id)||viewingTask} business={businesses.find(b=>b.id===viewingTask.business_id)} category={categories.find(c=>c.id===viewingTask.category_id)} today={today} canWrite={canWriteBusiness(viewingTask.business_id)} onClose={()=>setViewingTask(null)} onEdit={()=>{setEditingTask(tasks.find(t=>t.id===viewingTask.id)||viewingTask);setViewingTask(null);setModal("task");}} onComplete={()=>requestStatusChange(tasks.find(t=>t.id===viewingTask.id)||viewingTask,"done")}/>}
    {completingTask&&<CompleteTaskDialog task={completingTask} status={requestedStatus} note={completionNote} setNote={setCompletionNote} onCancel={()=>{setCompletingTask(null);setCompletionNote("");}} onConfirm={confirmCompletion} busy={completionBusy}/>}
    {activityOpen&&isOwner&&<ActivityFeed items={activityItems} onClose={()=>setActivityOpen(false)}/>}
    {settingsOpen&&isOwner&&<WorkspaceSettings onClose={()=>setSettingsOpen(false)} notify={notify} emailConfigured={emailConfigured} requestConfirmation={requestConfirmation}/>}
    {accountOpen&&<AccountSettings account={accountDetails||sessionUser} onClose={()=>setAccountOpen(false)} onSave={saveAccount}/>}
    {confirmDialog&&<ConfirmDialog config={confirmDialog} onCancel={()=>settleConfirmation(false)} onConfirm={()=>settleConfirmation(true)}/>}
    {toast&&<div className="toast-message"><Check size={15}/>{toast}</div>}
  </div>;
}

function Metric({icon,label,value,tone,helper}) {
  return <div className={`metric-card metric-${tone}`}><div className="metric-top"><span>{label}</span><i>{icon}</i></div><strong>{value}</strong><small>{helper}</small></div>;
}
function MiniStat({label,value}){return <div className="mini-stat"><span>{label}</span><strong>{value}</strong></div>;}
function CompactTask({task,business,onClick,today}){
  const due=isOverdue(task,today),soon=isDueSoon(task,today);
  return <button className="compact-task" onClick={onClick}><span className={`compact-dot ${due?"dot-coral":soon?"dot-amber":""}`}/><span className="compact-task-main"><strong>{task.title}</strong><small>{business?.name||"Business"} · {relativeDeadline(task,today)}</small></span><ArrowUpRight size={14}/></button>;
}

export default App;
