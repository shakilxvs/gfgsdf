import React, { useEffect, useMemo, useState } from "react";
import {
  Activity, AlarmClock, Archive, ArrowDownWideNarrow, ArrowLeft, ArrowUpRight,
  Bell, BriefcaseBusiness, CalendarDays, Check, CheckCheck, ChevronDown,
  CircleDot, Clock3, Code2, Ellipsis, Eye, Filter, LayoutDashboard, List,
  LogOut, Mail, Megaphone, Menu, MoreHorizontal, Palette, PenLine, Percent,
  Plus, Search, Settings, ShoppingBag, SlidersHorizontal, Tag, Trash2,
  Video, Wallet, X, Pencil, RotateCcw, AlertCircle, CalendarRange,
  Layers3, CircleCheck, CircleAlert, PanelLeftClose, Grid2X2, Sparkles, Lock
} from "lucide-react";

const ICONS = {
  "shopping-bag": ShoppingBag, percent: Percent, tag: Tag, video: Video,
  mail: Mail, megaphone: Megaphone, palette: Palette, code: Code2,
  search: Search, "pen-line": PenLine, settings: Settings, wallet: Wallet,
  "circle-dot": CircleDot, briefcase: BriefcaseBusiness, calendar: CalendarDays,
  activity: Activity, layers: Layers3, sparkles: Sparkles,
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
const ICON_OPTIONS = ["shopping-bag","percent","tag","video","mail","megaphone","palette","code","search","pen-line","settings","wallet","circle-dot"];

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

function Brand() {
  return <div className="brand-lockup"><div className="brand-symbol">S</div><div><div className="brand-name">SHLOMO</div><div className="brand-caption">PERSONAL WORKSPACE</div></div></div>;
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
  const [username,setUsername]=useState("shlomock");
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
      <div className="login-brand"><div className="login-mark">S</div><div className="login-wordmark">SHLOMO</div></div>
      <div className="login-copy"><span className="eyebrow">YOUR WORK, IN ONE PLACE</span><h1>Welcome back.</h1><p>A calmer way to stay on top of every business.</p></div>
      <form onSubmit={submit} className="login-form">
        <label className="field"><span>Login ID</span><div className="input-with-icon"><BriefcaseBusiness size={16}/><input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required /></div></label>
        <label className="field"><span>Password</span><div className="input-with-icon"><Lock size={15}/><input type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/><button type="button" className="reveal-button" onClick={()=>setShow(v=>!v)} aria-label={show?"Hide password":"Show password"}><Eye size={16}/></button></div></label>
        {error && <div className="login-error" role="alert"><AlertCircle size={15}/>{error}</div>}
        <Button className="login-submit" disabled={busy}>{busy?"Signing in…":<>Sign in <ArrowUpRight size={16}/></>}</Button>
      </form>
      <div className="login-foot"><span className="secure-dot"/> Private workspace · single owner</div>
    </div>
    <div className="login-aside"><div className="aside-art"><div className="art-card art-card-one"><div className="art-label">TODAY'S FOCUS</div><div className="art-line long"/><div className="art-line medium"/><div className="art-row"><span/><span/><span/></div></div><div className="art-card art-card-two"><div className="art-check"><Check size={15}/></div><div className="art-line medium"/><div className="art-line short"/></div><div className="art-circle"/></div><div className="aside-note"><span>FOCUS BETTER.</span><span>MOVE WITH CLARITY.</span></div></div>
  </main>;
}

function TaskCard({task, category, business, today, onEdit, onDelete, onStatus}) {
  const Icon = ICONS[category?.icon] || Tag;
  const overdue = isOverdue(task,today);
  const urgent = isDueSoon(task,today);
  return <article className={`task-card ${task.status==="done"?"task-done":""}`}>
    <div className="task-card-top">
      <div className="task-meta-left">{business && <span className="task-business">{business.name}</span>}
        <span className="category-chip" style={{"--chip-color":category?.color||"#668575"}}><Icon size={13}/>{category?.name||"Uncategorized"}</span>
      </div>
      <div className="task-menu"><IconButton label="Edit task" onClick={onEdit}><Pencil size={15}/></IconButton><IconButton label="Delete task" onClick={onDelete}><MoreHorizontal size={17}/></IconButton></div>
    </div>
    <div className="task-title-line"><button className={`complete-control ${task.status==="done"?"complete-checked":""}`} aria-label={task.status==="done"?"Reopen task":"Mark complete"} onClick={()=>onStatus(task.status==="done"?"todo":"done")}>{task.status==="done"&&<Check size={13}/>}</button><h3>{task.title}</h3></div>
    {task.description && <p className="task-description">{task.description}</p>}
    <div className="task-badges">
      {overdue?<span className="status-select status-delayed">Delayed</span>:<select className={`status-select status-${task.status}`} value={task.status} onChange={e=>onStatus(e.target.value)} aria-label="Change task status">
        {STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
      </select>}
      {task.priority!=="normal" && <span className={`priority-chip priority-${task.priority}`}>{priorityLabel(task.priority)} priority</span>}
      {task.deadline && <span className={`deadline-chip ${overdue?"deadline-overdue":urgent?"deadline-urgent":""}`}><Clock3 size={12}/>{relativeDeadline(task,today)}</span>}
      {!task.deadline && <span className="neutral-chip">No deadline</span>}
    </div>
    <div className="task-card-foot"><span><CalendarDays size={13}/>Created {formatDate(task.created_date)}</span>{task.deadline && <span>Due {formatDate(task.deadline,true)}</span>}</div>
  </article>;
}

function TaskListRow({task,category,business,today,onEdit,onDelete,onStatus}) {
  const Icon = ICONS[category?.icon] || Tag;
  const delayed = isOverdue(task,today);
  const statusText = displayStatus(task,today);
  return <article className={`task-row ${task.status==="done"?"task-done":""}`}>
    <span className="task-row-category" title={category?.name||"Uncategorized"} style={{"--chip-color":category?.color||"#d97737"}}><Icon size={19}/></span>
    <div className="task-row-main">
      <div className="task-row-title-line"><h3>{task.title}</h3>{business&&<span className="task-row-business">{business.name}</span>}</div>
      {task.description&&<p className="task-row-description">{task.description}</p>}
    </div>
    <div className="task-row-deadline"><small>Deadline</small><strong className={delayed?"text-delayed":""}>{task.deadline?formatDate(task.deadline,true):"No deadline"}</strong>{task.deadline&&<span>{relativeDeadline(task,today)}</span>}</div>
    <div className={`task-row-status ${delayed?"status-delayed":task.status==="done"?"status-done":task.status==="in_progress"?"status-progress":"status-todo"}`}>{statusText}</div>
    <div className="task-row-actions">
      <select value={task.status} onChange={e=>onStatus(e.target.value)} aria-label="Change task status"><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select>
      <IconButton label="Edit task" onClick={onEdit}><Pencil size={15}/></IconButton>
      <IconButton label="Delete task" onClick={onDelete}><Trash2 size={15}/></IconButton>
    </div>
  </article>;
}

function TaskForm({task,businesses,categories,defaultBusiness,onClose,onSave})
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
        <label className="field"><span>Status</span><select value={draft.status} onChange={e=>set("status",e.target.value)}>{STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
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
  const [name,setName]=useState(""); const [icon,setIcon]=useState("tag"); const [color,setColor]=useState(COLORS[0]); const [error,setError]=useState("");
  const [editing,setEditing]=useState(null);
  const list=categories.filter(c=>c.business_id===business.id);
  async function submit(e) {
    e.preventDefault(); setError("");
    try {
      if(editing) await onEdit(editing.id,{name:name.trim(),icon,color});
      else await onAdd({business_id:business.id,name:name.trim(),icon,color});
      setEditing(null); setName(""); setIcon("tag"); setColor(COLORS[0]);
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
        <label className="field"><span>Icon</span><select value={icon} onChange={e=>setIcon(e.target.value)}>{ICON_OPTIONS.map(k=><option key={k} value={k}>{k}</option>)}</select></label>
      </div>
      <div className="color-palette"><span>Accent</span>{COLORS.map(c=><button type="button" key={c} className={`color-dot ${color===c?"selected":""}`} style={{background:c}} onClick={()=>setColor(c)} aria-label={`Select ${c}`}/>) }<span className="category-preview selected-preview" style={{background:color+"18",color}}><SelectedIcon size={15}/></span></div>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions">{editing&&<Button variant="ghost" type="button" onClick={()=>{setEditing(null);setName("");setIcon("tag");setColor(COLORS[0]);}}>Cancel edit</Button>}<Button>{editing?"Save category":"Add category"}</Button></div>
    </form>
  </Modal>;
}

function BusinessManager({businesses,onClose,onAdd,onRename,onArchive,onDelete}) {
  const [name,setName]=useState(""); const [error,setError]=useState("");
  async function submit(e){e.preventDefault();setError("");try{await onAdd(name);setName("");}catch(err){setError(err.message);}}
  return <Modal title="Your businesses" subtitle="Keep each workspace tidy and separate." onClose={onClose} wide>
    <div className="business-manager-list">{businesses.map(b=><div className="business-manager-row" key={b.id}>
      <div className="business-avatar">{b.name.slice(0,1).toUpperCase()}</div><div className="business-manager-name"><strong>{b.name}</strong><small>{b.archived?"Archived":"Active"}</small></div>
      <button className="mini-action" onClick={async()=>{const next=prompt("Business name",b.name);if(next?.trim()&&next.trim()!==b.name)try{await onRename(b,next.trim())}catch(e){setError(e.message)}}}><Pencil size={14}/></button>
      <button className="mini-action" onClick={()=>onArchive(b)}>{b.archived?<RotateCcw size={14}/>:<Archive size={14}/>}</button>
      <button className="mini-action danger-action" onClick={()=>onDelete(b)}><Trash2 size={14}/></button>
    </div>)}</div>
    <form className="business-create" onSubmit={submit}><label className="field"><span>Add a business</span><input value={name} onChange={e=>setName(e.target.value)} maxLength={60} placeholder="Business name" required/></label>{error&&<div className="form-error">{error}</div>}<div className="modal-actions"><Button disabled={!name.trim()}>Add business <Plus size={15}/></Button></div></form>
  </Modal>;
}

function App() {
  const [authenticated,setAuthenticated]=useState(false);
  const [checking,setChecking]=useState(true);
  const [loading,setLoading]=useState(false);
  const [businesses,setBusinesses]=useState([]);
  const [categories,setCategories]=useState([]);
  const [tasks,setTasks]=useState([]);
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
  const [toast,setToast]=useState("");
  const [mobileNav,setMobileNav]=useState(false);
  const today=todayDhaka();

  async function refresh() {
    setLoading(true);
    try {
      const result=await api("/api/bootstrap");
      setBusinesses(result.businesses||[]);setCategories(result.categories||[]);setTasks(result.tasks||[]);
    } finally {setLoading(false);}
  }
  useEffect(()=>{
    api("/api/auth/session").then(async s=>{if(s.authenticated){setAuthenticated(true);await refresh();}}).catch(()=>{}).finally(()=>setChecking(false));
  },[]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(""),2600);return()=>clearTimeout(t);},[toast]);

  async function login(username,password) {
    await api("/api/auth/login",{method:"POST",body:JSON.stringify({username,password})});
    setAuthenticated(true);await refresh();
  }
  async function logout() {
    try{await api("/api/auth/logout",{method:"POST",body:"{}"});}finally{
      setAuthenticated(false);setBusinesses([]);setCategories([]);setTasks([]);setActive("overview");setSearch("");
    }
  }
  function notify(message){setToast(message);}
  async function addTask(values){const result=await api("/api/tasks",{method:"POST",body:JSON.stringify(values)});setTasks(t=>[result,...t]);notify("Task added");}
  async function updateTask(task,values){const result=await api(`/api/tasks/${task.id}`,{method:"PATCH",body:JSON.stringify(values)});setTasks(ts=>ts.map(t=>t.id===task.id?result:t));notify("Task updated");}
  async function removeTask(task){if(!confirm(`Delete “${task.title}” permanently?`))return;await api(`/api/tasks/${task.id}`,{method:"DELETE"});setTasks(ts=>ts.filter(t=>t.id!==task.id));notify("Task deleted");}
  async function changeStatus(task,status){const result=await api(`/api/tasks/${task.id}`,{method:"PATCH",body:JSON.stringify({...task,status})});setTasks(ts=>ts.map(t=>t.id===task.id?result:t));notify(status==="done"?"Task completed":"Task reopened");}
  async function addBusiness(name){const b=await api("/api/businesses",{method:"POST",body:JSON.stringify({name})});setBusinesses(bs=>[...bs,b]);await refresh();setActive(b.id);notify("Business added");}
  async function renameBusiness(b,name){const next=await api(`/api/businesses/${b.id}`,{method:"PATCH",body:JSON.stringify({name})});setBusinesses(bs=>bs.map(x=>x.id===b.id?next:x));notify("Business renamed");}
  async function archiveBusiness(b){const next=await api(`/api/businesses/${b.id}`,{method:"PATCH",body:JSON.stringify({archived:!b.archived})});setBusinesses(bs=>bs.map(x=>x.id===b.id?next:x));if(next.archived&&active===b.id)setActive("overview");notify(next.archived?"Business archived":"Business restored");}
  async function deleteBusiness(b){const count=tasks.filter(t=>t.business_id===b.id).length;const ok=confirm(`Delete ${b.name}? This permanently removes its ${count} task(s) and categories.`);if(!ok)return;await api(`/api/businesses/${b.id}`,{method:"DELETE"});setBusinesses(bs=>bs.filter(x=>x.id!==b.id));setCategories(cs=>cs.filter(c=>c.business_id!==b.id));setTasks(ts=>ts.filter(t=>t.business_id!==b.id));if(active===b.id)setActive("overview");notify("Business deleted");}
  async function addCategory(v){const c=await api("/api/categories",{method:"POST",body:JSON.stringify(v)});setCategories(cs=>[...cs,c]);notify("Category added");}
  async function editCategory(c,patch){const next=await api(`/api/categories/${c.id}`,{method:"PATCH",body:JSON.stringify(patch)});setCategories(cs=>cs.map(x=>x.id===c.id?next:x));notify("Category updated");}
  async function deleteCategory(c){const count=tasks.filter(t=>t.category_id===c.id).length;if(!confirm(`Delete “${c.name}”? ${count} task(s) will become uncategorized.`))return;await api(`/api/categories/${c.id}`,{method:"DELETE"});setCategories(cs=>cs.filter(x=>x.id!==c.id));setTasks(ts=>ts.map(t=>t.category_id===c.id?{...t,category_id:null}:t));notify("Category deleted");}

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
    if(!from)return true;
    const target=t.deadline||t.created_date;
    return target>=from&&target<=to;
  });
  const overdueTasks=tasks.filter(t=>isOverdue(t,today)).sort((a,b)=>a.deadline.localeCompare(b.deadline));
  const progressPercent=overviewTasks.length?Math.round(completedTasks.length/overviewTasks.length*100):0;
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
    const props={task:t,category:c,business:withBusiness?b:null,today,
      onEdit:()=>{setEditingTask(t);setModal("task");},
      onDelete:()=>removeTask(t),
      onStatus:status=>changeStatus(t,status)};
    return listMode?<TaskListRow key={t.id} {...props}/>:<TaskCard key={t.id} {...props}/>;
  }
  const activeFilterCount=Object.entries(filters).filter(([k,v])=>k!=="sort"&&Boolean(v)).length;
  function openNewTask(){setEditingTask(null);if(active==="overview"&&!businesses.some(b=>!b.archived)){notify("Add a business first.");return;}setModal("task");}
  function tabTo(id){setActive(id);clearFilters();setSearch("");setFiltersOpen(false);setMobileNav(false);}
  const headerTitle=search.trim()?"Search results":active==="overview"?"Overview":selectedBusiness?.name||"Overview";
  const headerSub=search.trim()?"Across all your businesses":active==="overview"?"Your businesses, priorities and deadlines in one place":`Tasks and categories for ${selectedBusiness?.name||"this business"}`;

  if(checking)return <div className="boot-screen"><div className="boot-mark">S</div><span>Preparing your workspace…</span></div>;
  if(!authenticated)return <Login onLogin={login}/>;
  return <div className={`app-frame ${sidebarCollapsed?"app-collapsed":""}`}>
    <aside className={`sidebar ${mobileNav?"sidebar-open":""} ${sidebarCollapsed?"sidebar-collapsed":""}`}>
      <Brand/>
      <div className="sidebar-section-label">WORKSPACE</div>
      <button className={`sidebar-link ${active==="overview"?"is-active":""}`} onClick={()=>tabTo("overview")}><LayoutDashboard size={17}/>Overview</button>
      <div className="sidebar-business-heading"><span>YOUR BUSINESSES</span><button onClick={()=>setModal("businesses")} aria-label="Manage businesses"><Plus size={15}/></button></div>
      <nav className="sidebar-business-list">{businesses.filter(b=>!b.archived).map(b=><button key={b.id} className={`sidebar-link ${active===b.id?"is-active":""}`} onClick={()=>tabTo(b.id)}><span className="business-bullet">{b.name.slice(0,1)}</span><span className="sidebar-business-name">{b.name}</span><span className="sidebar-count">{pendingFor(b.id)}</span></button>)}</nav>
      <button className="sidebar-add-business" onClick={()=>setModal("businesses")}><Plus size={15}/> Add business</button>
      <div className="sidebar-bottom"><div className="owner-row"><div className="owner-avatar">S</div><div><strong>Shakil</strong><small>Workspace owner</small></div></div><button className="sidebar-link logout-link" onClick={logout}><LogOut size={16}/>Sign out</button></div>
    </aside>
    {mobileNav&&<button className="mobile-scrim" onClick={()=>setMobileNav(false)} aria-label="Close menu"/>}
    <main className="main-area">
      <header className="topbar">
        <div className="topbar-left">
          <IconButton label={sidebarCollapsed?"Expand sidebar":"Collapse sidebar"} className="sidebar-collapse-toggle" onClick={()=>setSidebarCollapsed(v=>!v)}><PanelLeftClose size={18}/></IconButton>
          <IconButton label="Open menu" className="mobile-menu-button" onClick={()=>setMobileNav(true)}><Menu size={18}/></IconButton>
        </div>
        <div className="topbar-right"><label className="global-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks, details…" aria-label="Search all tasks"/>{search&&<button onClick={()=>setSearch("")} aria-label="Clear search"><X size={14}/></button>}</label><Button onClick={openNewTask}><Plus size={16}/> New task</Button><IconButton label="Sign out" className="top-logout" onClick={logout}><LogOut size={17}/></IconButton></div>
      </header>
      <div className="main-scroll">
        <div className="business-tabs">
          <button className={`business-tab ${active==="overview"&&!search?"tab-active":""}`} onClick={()=>tabTo("overview")}><LayoutDashboard size={15}/>Overview</button>
          {businesses.filter(b=>!b.archived).map(b=>{const p=progressFor(b.id);return <button key={b.id} title={`${b.name}: ${p.percent}% complete`} className={`business-tab ${active===b.id&&!search?"tab-active":""}`} onClick={()=>tabTo(b.id)}><span className="tab-label">{b.name}<span className="tab-counter">{pendingFor(b.id)}</span></span><span className="business-tab-progress"><i style={{width:p.percent+"%"}}/></span></button>})}
          <button className="business-tab tab-add" onClick={()=>setModal("businesses")}><Plus size={15}/>Business</button>
          <span className="tabs-spacer"/>
          <button className="manage-businesses" onClick={()=>setModal("businesses")}><Settings size={14}/> Manage</button>
        </div>

        {search.trim()? <section className="page-section">
          <div className="section-heading"><div><span className="eyebrow">GLOBAL SEARCH</span><h2>Results for “{search.trim()}”</h2><p>{searchResults.length} matching {searchResults.length===1?"task":"tasks"} across all businesses.</p></div></div>
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
            <div className="progress-heading"><strong>Overall progress</strong><span>{progressPercent}% · {completedTasks.length}/{overviewTasks.length} done</span></div>
            <div className="progress-track"><i style={{width:progressPercent+"%"}}/></div>
          </div>
          <div className="overview-task-heading">
            <strong>All tasks</strong><span>{overviewTasksSorted.length}</span>
            <div className="view-toggle"><button className={listMode?"selected":""} onClick={()=>setListMode(true)} aria-label="List view"><List size={16}/></button><button className={!listMode?"selected":""} onClick={()=>setListMode(false)} aria-label="Card view"><Grid2X2 size={16}/></button></div>
          </div>
          {loading?<div className="loading-block">Loading…</div>:overviewTasksSorted.length?<div className={listMode?"task-list-mode":"task-masonry"}>{overviewTasksSorted.map(t=>taskCard(t,true))}</div>:<EmptyState title="No tasks yet" description="Add a task to see it here." action={<Button onClick={openNewTask}><Plus size={15}/> Add task</Button>}/>}
        </section> : selectedBusiness ? <section className="page-section">
          <div className="business-hero business-hero-compact">
            <div className="business-summary"><strong>{tasks.filter(t=>t.business_id===active).length} tasks</strong><span>{progressFor(active).percent}% complete</span></div>
            <div className="business-actions">
              <div className="view-toggle"><button className={listMode?"selected":""} onClick={()=>setListMode(true)} aria-label="List view"><List size={16}/></button><button className={!listMode?"selected":""} onClick={()=>setListMode(false)} aria-label="Card view"><Grid2X2 size={16}/></button></div>
              <IconButton label="Filters" className={`filter-toggle ${activeFilterCount?"filter-active":""}`} onClick={()=>setFiltersOpen(v=>!v)}><Filter size={17}/>{activeFilterCount>0&&<span>{activeFilterCount}</span>}</IconButton>
              <Button variant="secondary" onClick={()=>setModal("categories")}><Tag size={15}/> Categories</Button>
              <Button onClick={openNewTask}><Plus size={16}/> Add task</Button>
            </div>
          </div>
          <div className="progress-panel business-progress-panel"><div className="progress-heading"><strong>Progress</strong><span>{progressFor(active).percent}% · {progressFor(active).done}/{progressFor(active).total} done</span></div><div className="progress-track"><i style={{width:progressFor(active).percent+"%"}}/></div></div>
          <div className="business-stats"><MiniStat label="Open" value={tasks.filter(t=>t.business_id===active&&isOpen(t)).length}/><MiniStat label="Urgent" value={tasks.filter(t=>t.business_id===active&&(isDueSoon(t,today)||(isOpen(t)&&t.priority==="urgent"))).length}/><MiniStat label="Delayed" value={tasks.filter(t=>t.business_id===active&&isOverdue(t,today)).length}/><MiniStat label="Done" value={tasks.filter(t=>t.business_id===active&&t.status==="done").length}/></div>
          {filtersOpen&&<div className="filters-panel">
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
    {modal==="task"&&<TaskForm task={editingTask} businesses={businesses} categories={categories} defaultBusiness={active==="overview"?businesses.find(b=>!b.archived)?.id:active} onClose={()=>setModal(null)} onSave={values=>editingTask?updateTask(editingTask,values):addTask(values)}/>}
    {modal==="categories"&&selectedBusiness&&<CategoryManager business={selectedBusiness} categories={categories} onClose={()=>setModal(null)} onAdd={addCategory} onEdit={editCategory} onDelete={deleteCategory}/>}
    {modal==="businesses"&&<BusinessManager businesses={businesses} onClose={()=>setModal(null)} onAdd={addBusiness} onRename={renameBusiness} onArchive={archiveBusiness} onDelete={deleteBusiness}/>}
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
