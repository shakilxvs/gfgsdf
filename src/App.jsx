import React, { useEffect, useMemo, useState } from "react";
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
  Send, MessageCircle, UserRound, LockKeyhole, MailCheck, BellRing
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

function Brand({collapsed=false}) {
  return <div className="brand-lockup"><div className="brand-symbol"><ListChecks size={20} strokeWidth={2.4}/></div>{!collapsed&&<div className="brand-name">TASKXVS</div>}</div>;
}
function Button({children, variant="primary", size="normal", className="", ...props}) {
  return <button className={`button button-${variant} button-${size} ${className}`} {...props}>{children}</button>;
}
function IconButton({label, children, ...props}) {
  return <button className="icon-button" aria-label={label} title={label} {...props}>{children}</button>;
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
    <div className="task-card-foot"><span><CalendarDays size={13}/>Created {formatDate(task.created_date)}</span>{task.deadline && <span>Due {formatDate(task.deadline,true)}</span>}</div>
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
    <span className="task-row-category" title={category?.name||"Uncategorized"} style={{"--chip-color":category?.color||"#d97737"}}><Icon size={20}/></span>
    <div className="task-row-main">
      <div className="task-row-title-line"><h3>{task.title}</h3>{business&&<span className="task-row-business">{business.name}</span>}</div>
      {task.description&&<p className="task-row-description">{task.description}</p>}
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

function TaskForm({task,businesses,categories,defaultBusiness,onClose,onSave}) {
  const [draft,setDraft]=useState(()=>({
    business_id:task?.business_id||defaultBusiness||businesses[0]?.id||"",
    category_id:task?.category_id||"",
    title:task?.title||"", description:task?.description||"", notes:task?.notes||"",
    status:task?.status||"todo", priority:task?.priority||"normal",
    created_date:task?.created_date||todayDhaka(), start_date:task?.start_date||"", deadline:task?.deadline||""
  }));
  const [saving,setSaving]=useState(false); const [error,setError]=useState("");
  const available=categories.filter(c=>c.business_id===draft.business_id);
  function set(k,v) {
    setDraft(d=>{
      const next={...d,[k]:v};
      if(k==="business_id" && d.category_id && !categories.some(c=>c.id===d.category_id&&c.business_id===v)) next.category_id="";
      return next;
    });
  }
  async function submit(e) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await onSave({...draft,category_id:draft.category_id||null,start_date:draft.start_date||null,deadline:draft.deadline||null});
      onClose();
    } catch(err) { setError(err.message); }
    finally { setSaving(false); }
  }
  return <Modal title={task?"Edit task":"Create a task"} subtitle="Capture the details, then get back to work." onClose={onClose} wide>
    <form className="task-form" onSubmit={submit}>
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
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions"><Button variant="ghost" type="button" onClick={onClose}>Cancel</Button><Button disabled={saving}>{saving?"Saving…":task?"Save changes":"Add task"}</Button></div>
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

function WhatsAppCloudSettings({onClose,notify}) {
  const [status,setStatus]=useState({status:"disconnected",connected:false,qr_data_url:""});
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
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
  async function test(){
    setBusy(true);setError("");
    try{
      const result=await api("/api/admin/whatsapp/test",{method:"POST"});
      notify(result.message||"Test message queued.");
    }catch(err){setError(err.message);}
    finally{setBusy(false);}
  }
  const connected=status.status==="connected";
  const pairing=status.status==="qr"&&Boolean(status.qr_data_url);
  return <Modal title="WhatsApp notifications" subtitle="Connect the dedicated sender to the free TaskXVS cloud worker." onClose={onClose} wide>
    <div className="whatsapp-cloud-settings">
      <div className={connected?"whatsapp-cloud-card connected":"whatsapp-cloud-card pending"}>
        <div className="whatsapp-cloud-symbol"><MessageCircle size={21}/></div>
        <div className="whatsapp-cloud-copy">
          <strong>{connected?"WhatsApp sender connected":pairing?"Scan to connect WhatsApp":"Cloud sender waiting"}</strong>
          <span>{loading?"Checking cloud worker…":connected?("Connected "+(status.phone_number||"sender number")+". Messages are sent by the scheduled cloud worker."):(status.status==="error"||status.status==="logged_out")?(status.last_error||"The sender needs to be paired again."):"The free cloud worker will display a QR code when its next run starts."}</span>
        </div>
        <span className="provider-status">{connected?"Connected":pairing?"Pair device":"Waiting"}</span>
      </div>
      {pairing&&<div className="whatsapp-cloud-qr">
        <strong>Link your dedicated sender once</strong>
        <p>Open WhatsApp on the sender phone, go to Linked devices, choose Link a device, then scan this QR code.</p>
        <img src={status.qr_data_url} alt="WhatsApp device pairing QR code"/>
        <small>The phone is only needed for pairing. It does not need to stay online after linking.</small>
      </div>}
      <div className="whatsapp-cloud-steps">
        <strong>How this free setup works</strong>
        <p>GitHub's free public-repository runner hosts the connection in scheduled sessions. Messages wait in the database queue and are sent when the worker is online.</p>
        <p>There may be short gaps between sessions or when GitHub delays a scheduled run. This is not a guaranteed 24/7 connection.</p>
      </div>
      {error&&<div className="form-error">{error}</div>}
      <div className="modal-actions">
        {connected&&<Button variant="secondary" onClick={test} disabled={busy}>{busy?"Queueing…":"Send test message"} <Send size={14}/></Button>}
        <Button variant="ghost" onClick={()=>{setLoading(true);api("/api/admin/whatsapp/status").then(setStatus).catch(e=>setError(e.message)).finally(()=>setLoading(false));}}>Refresh status</Button>
      </div>
      <div className="whatsapp-cloud-warning"><ShieldCheck size={17}/><p>This connection uses an unofficial WhatsApp Web protocol, not Meta's official API. WhatsApp may restrict the sender account. Use only your dedicated sender number and send notifications only to people who have opted in. Avoid bulk or unsolicited messaging.</p></div>
    </div>
  </Modal>;
}

function AccountSettings({account,onClose,onSave}) {
  const [number,setNumber]=useState(account?.whatsapp_number||"");
  const [enabled,setEnabled]=useState(Boolean(account?.whatsapp_notifications_enabled));
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function submit(e){
    e.preventDefault();setBusy(true);setError("");
    try{await onSave({whatsapp_number:number,whatsapp_notifications_enabled:enabled});onClose();}
    catch(err){setError(err.message);}
    finally{setBusy(false);}
  }
  return <Modal title="My account" subtitle="Add your WhatsApp contact for TaskXVS notifications." onClose={onClose}>
    <form className="profile-settings-form" onSubmit={submit}>
      <div className="profile-account-summary"><span className="profile-account-icon"><UserRound size={19}/></span><div><strong>{account?.display_name||account?.displayName||account?.username||"Account"}</strong><small>@{account?.username||"owner"} · {account?.role==="owner"?"Workspace owner":"Team member"}</small></div></div>
      <label className="field"><span>WhatsApp contact number</span><input type="tel" inputMode="tel" autoComplete="tel" value={number} onChange={e=>setNumber(e.target.value)} placeholder="+8801XXXXXXXXX"/></label>
      <p className="form-hint">Include your country code. Example: +8801XXXXXXXXX.</p>
      <div className={account?.whatsapp_configured?"whatsapp-connection-state connected":"whatsapp-connection-state pending"}>{account?.whatsapp_configured?<><CircleCheck size={16}/><span>The TaskXVS cloud sender is connected. Notifications can be delivered while its free worker session is online.</span></>:<><CircleAlert size={16}/><span>Your contact and opt-in will be saved now. Delivery starts after the owner pairs the dedicated sender with the TaskXVS cloud worker.</span></>}</div>
      <label className="inline-check"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> I agree to receive TaskXVS WhatsApp notifications on this number</label>
      {error&&<div className="form-error">{error}</div>}
      <div className="modal-actions"><Button variant="ghost" type="button" onClick={onClose} disabled={busy}>Cancel</Button><Button disabled={busy}>{busy?"Saving…":"Save contact"}</Button></div>
    </form>
  </Modal>;
}

function TaskDetails({task,business,category,today,canWrite,onClose,onEdit,onComplete}) {
  const status=displayStatus(task,today);
  const completed=task.completed_at?new Date(task.completed_at).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"}):"Not completed";
  return <Modal title="Task details" subtitle={business?.name||"Workspace task"} onClose={onClose} wide>
    <div className="task-detail-content">
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
      {task.notes&&<section className="task-detail-section"><h3>Task notes</h3><p>{task.notes}</p></section>}
      {task.completion_note&&<section className="task-detail-section task-detail-completion"><h3><CheckCheck size={15}/> Completion note</h3><p>{task.completion_note}</p></section>}
      <div className="task-detail-actions"><Button variant="ghost" onClick={onClose}>Close</Button>{canWrite&&<><Button variant="secondary" onClick={onEdit}><Pencil size={15}/> Edit task</Button>{task.status!=="done"&&<Button onClick={onComplete}><Check size={15}/> Mark as done</Button>}</>}</div>
    </div>
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
  const [active,setActive]=useState("overview");
  const [search,setSearch]=useState("");
  const [listMode,setListMode]=useState(true);
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);
  const [filtersOpen,setFiltersOpen]=useState(false);
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
  const [whatsAppSettingsOpen,setWhatsAppSettingsOpen]=useState(false);
  const [activitySeenAt,setActivitySeenAt]=useState(()=>{try{return localStorage.getItem("taskxvs_activity_seen")||"";}catch{return "";}});
  const [completionBusy,setCompletionBusy]=useState(false);
  const [toast,setToast]=useState("");
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
  function notify(message){setToast(message);}
  async function addTask(values){const result=await api("/api/tasks",{method:"POST",body:JSON.stringify(values)});setTasks(t=>[result,...t]);notify("Task added");}
  async function updateTask(task,values){const result=await api(`/api/tasks/${task.id}`,{method:"PATCH",body:JSON.stringify(values)});setTasks(ts=>ts.map(t=>t.id===task.id?result:t));notify("Task updated");}
  async function removeTask(task){if(!confirm(`Delete “${task.title}” permanently?`))return;await api(`/api/tasks/${task.id}`,{method:"DELETE"});setTasks(ts=>ts.filter(t=>t.id!==task.id));notify("Task deleted");}
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
    notify("WhatsApp contact saved");
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
  async function deleteUser(user){if(!confirm(`Delete account ${user.username}? They will immediately lose access.`))return;await api(`/api/admin/users/${user.id}`,{method:"DELETE"});setUsers(us=>us.filter(u=>u.id!==user.id));notify("User deleted");}
  async function addCategory(v){const c=await api("/api/categories",{method:"POST",body:JSON.stringify(v)});setCategories(cs=>[...cs,c]);notify("Category added");}
  async function editCategory(c,patch){const next=await api(`/api/categories/${c.id}`,{method:"PATCH",body:JSON.stringify(patch)});setCategories(cs=>cs.map(x=>x.id===c.id?next:x));notify("Category updated");}
  async function deleteCategory(c){const count=tasks.filter(t=>t.category_id===c.id).length;if(!confirm(`Delete “${c.name}”? ${count} task(s) will become uncategorized.`))return;await api(`/api/categories/${c.id}`,{method:"DELETE"});setCategories(cs=>cs.filter(x=>x.id!==c.id));setTasks(ts=>ts.map(t=>t.category_id===c.id?{...t,category_id:null}:t));notify("Category deleted");}

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
  const overviewTasksSorted=[...overviewTasks].sort((a,b)=>(a.deadline||"9999-12-31").localeCompare(b.deadline||"9999-12-31"));
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
  function tabTo(id){setActive(id);clearFilters();setSearch("");setFiltersOpen(false);setMobileNav(false);}
  const headerTitle=search.trim()?"Search results":active==="overview"?"Overview":selectedBusiness?.name||"Overview";
  const headerSub=search.trim()?"Across your assigned businesses":active==="overview"?"Your workspace":selectedBusiness?.name||"Business";

  if(checking)return <div className="boot-screen"><div className="boot-mark">S</div><span>Preparing your workspace…</span></div>;
  if(!authenticated)return <Login onLogin={login}/>;
  return <div className={`app-frame ${sidebarCollapsed?"app-collapsed":""}`}>
    <aside className={`sidebar ${mobileNav?"sidebar-open":""} ${sidebarCollapsed?"sidebar-collapsed":""}`}>
      <div className="sidebar-brand-row"><Brand collapsed={sidebarCollapsed}/><IconButton label={sidebarCollapsed?"Expand sidebar":"Collapse sidebar"} className="sidebar-collapse-toggle" onClick={()=>setSidebarCollapsed(v=>!v)}>{sidebarCollapsed?<ChevronRight size={18}/>:<ChevronLeft size={18}/>}</IconButton></div>
      <label className="sidebar-search" title={sidebarCollapsed?"Search tasks":undefined}><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={sidebarCollapsed?"Search":"Search tasks…"}/>{search&&<button type="button" aria-label="Clear search" onClick={()=>setSearch("")}><X size={14}/></button>}</label>
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
          {isOwner&&<button type="button" className="activity-trigger" aria-label="WhatsApp settings" title="WhatsApp settings" onClick={()=>setWhatsAppSettingsOpen(true)}><MessageCircle size={18}/></button>}
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
            <strong>All tasks</strong><span>{overviewTasksSorted.length}</span><small>Overdue and completed tasks stay visible</small>
            <div className="view-toggle"><button className={listMode?"selected":""} onClick={()=>setListMode(true)} aria-label="List view"><List size={16}/></button><button className={!listMode?"selected":""} onClick={()=>setListMode(false)} aria-label="Card view"><Grid2X2 size={16}/></button></div>
          </div>
          {loading?<div className="loading-block">Loading…</div>:overviewTasksSorted.length?<div className={listMode?"task-list-mode":"task-masonry"}>{overviewTasksSorted.map(t=>taskCard(t,true))}</div>:<EmptyState title="No tasks yet" description="Add a task to see it here." action={<Button onClick={openNewTask}><Plus size={15}/> Add task</Button>}/>}
        </section> : selectedBusiness ? <section className="page-section">
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
    {modal==="task"&&<TaskForm task={editingTask} businesses={writableBusinesses} categories={categories} defaultBusiness={active==="overview"?writableBusinesses[0]?.id:active} onClose={()=>setModal(null)} onSave={values=>editingTask?updateTask(editingTask,values):addTask(values)}/>}
    {modal==="categories"&&selectedBusiness&&activeCanWrite&&<CategoryManager business={selectedBusiness} categories={categories} onClose={()=>setModal(null)} onAdd={addCategory} onEdit={editCategory} onDelete={deleteCategory}/>}
    {modal==="businesses"&&canCreateBusiness&&<BusinessManager businesses={businesses} emailConfigured={emailConfigured} isOwner={isOwner} currentUserId={sessionUser?.id} onClose={()=>setModal(null)} onAdd={addBusiness} onRename={renameBusiness} onArchive={archiveBusiness} onDelete={deleteBusiness}/>}
    {modal==="users"&&isOwner&&<UserManager users={users} businesses={businesses} onClose={()=>setModal(null)} onSave={saveUser} onDelete={deleteUser} onToggle={toggleUser}/>}
    {viewingTask&&<TaskDetails task={tasks.find(t=>t.id===viewingTask.id)||viewingTask} business={businesses.find(b=>b.id===viewingTask.business_id)} category={categories.find(c=>c.id===viewingTask.category_id)} today={today} canWrite={canWriteBusiness(viewingTask.business_id)} onClose={()=>setViewingTask(null)} onEdit={()=>{setEditingTask(tasks.find(t=>t.id===viewingTask.id)||viewingTask);setViewingTask(null);setModal("task");}} onComplete={()=>requestStatusChange(tasks.find(t=>t.id===viewingTask.id)||viewingTask,"done")}/>}
    {completingTask&&<CompleteTaskDialog task={completingTask} status={requestedStatus} note={completionNote} setNote={setCompletionNote} onCancel={()=>{setCompletingTask(null);setCompletionNote("");}} onConfirm={confirmCompletion} busy={completionBusy}/>}
    {activityOpen&&isOwner&&<ActivityFeed items={activityItems} onClose={()=>setActivityOpen(false)}/>}
    {whatsAppSettingsOpen&&isOwner&&<WhatsAppCloudSettings onClose={()=>setWhatsAppSettingsOpen(false)} notify={notify}/>}
    {accountOpen&&<AccountSettings account={accountDetails||sessionUser} onClose={()=>setAccountOpen(false)} onSave={saveAccount}/>}
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
