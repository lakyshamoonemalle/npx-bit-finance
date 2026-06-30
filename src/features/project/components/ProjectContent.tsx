import { useState, useMemo, useEffect } from 'react';
import type { Project, ProjectStatus, ProjectCategory } from '../../../types/project';
import type { Person } from '../../../types/people';

// ─── Table display constants ──────────────────────────────────────────────────

const PAGE_SIZE = 5;

const CATEGORY_STYLE: Record<ProjectCategory, { bg: string; emoji: string }> = {
  Development: { bg: '#1d4ed8', emoji: '🚀' },
  Marketing:   { bg: '#b45309', emoji: '📣' },
  Research:    { bg: '#0e7490', emoji: '📊' },
  Consulting:  { bg: '#6d28d9', emoji: '🤝' },
  Design:      { bg: '#be185d', emoji: '🎨' },
  Finance:     { bg: '#15803d', emoji: '💰' },
};

const STATUS_COLOR: Record<ProjectStatus, string> = {
  Active:        '#22c55e',
  Pending:       '#f59e0b',
  'In Progress': '#3b82f6',
  'On Hold':     '#6b7280',
  Completed:     '#8b5cf6',
  Archived:      '#4a4a52',
};

type BillingCodeRow = {
  id: number;
  label: string;
  clientProject: string;
  sdsCca: string;
  rc: string;
  amount: string;
};

type ResourceRow = {
  id: number;
  employee: string;
  rate: string;
};

type ModalForm = {
  name: string;
  client: string;
  startDate: string;
  endDate: string;
  projectType: string;
  npxNumber: string;
  category: ProjectCategory;
  status: ProjectStatus;
  billingCodes: BillingCodeRow[];
  resources: ResourceRow[];
};

let _uid = 1;
const nextUid = () => _uid++;

const newBillingCode = (): BillingCodeRow => ({
  id: nextUid(), label: '', clientProject: '', sdsCca: '', rc: '', amount: '',
});
const newResource = (): ResourceRow => ({
  id: nextUid(), employee: '', rate: '',
});

const EMPTY_MODAL: ModalForm = {
  name: '', client: '', startDate: '', endDate: '',
  projectType: '', npxNumber: '',
  category: 'Development', status: 'Active',
  billingCodes: [newBillingCode()],
  resources: [newResource(), newResource()],
};

function timeAgo(isoDate: string): string {
  const days = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7)  return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  if (weeks < 5)  return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

function ProjectContent() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<'All' | 'In Progress' | 'Completed'>('All');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ModalForm>({ ...EMPTY_MODAL });

  function loadData() {
    setLoading(true);
    setLoadError(false);
    Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/people').then(r => r.json()),
    ])
      .then(([p, people]) => { setProjects(p); setPeople(people); })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    if (filter === 'In Progress') return projects.filter(p => p.status !== 'Completed');
    if (filter === 'Completed')   return projects.filter(p => p.status === 'Completed');
    return projects;
  }, [projects, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openCreate() {
    setEditingId(null);
    setForm({
      ...EMPTY_MODAL,
      billingCodes: [newBillingCode()],
      resources:    [newResource(), newResource()],
    });
    setModalOpen(true);
  }

  function openEdit(project: Project) {
    setEditingId(project.id);
    setForm({
      name:         project.name,
      client:       project.client,
      startDate:    project.startDate    ?? '',
      endDate:      project.endDate      ?? '',
      projectType:  project.projectType  ?? '',
      npxNumber:    project.npxNumber,
      category:     project.category,
      status:       project.status,
      billingCodes: project.billingCodes?.length ? project.billingCodes : [newBillingCode()],
      resources:    project.resources?.length    ? project.resources    : [newResource(), newResource()],
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  async function handleSubmit() {
    if (!formValid) return;

    const payload = {
      name:         form.name.trim(),
      client:       form.client.trim(),
      startDate:    form.startDate,
      endDate:      form.endDate,
      projectType:  form.projectType,
      npxNumber:    form.npxNumber.trim(),
      category:     form.category,
      status:       form.status,
      billingCodes: form.billingCodes,
      resources:    form.resources,
    };

    try {
      if (editingId === null) {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const created: Project = await res.json();
        setProjects(prev => [...prev, created]);
      } else {
        const res = await fetch(`/api/projects/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const updated: Project = await res.json();
        setProjects(prev => prev.map(p => (p.id === editingId ? updated : p)));
      }
      closeModal();
    } catch (err) {
      console.error('Failed to save project:', err);
      alert('Could not save the project. Make sure the dev server is running (npm run dev).');
    }
  }

  const npxValid = /^NPX-[A-Z]{3}-\d{5}$/.test(form.npxNumber.trim());

  // True when all required fields (except dates) are filled and NPX format is valid
  const formValid =
    form.name.trim() !== '' &&
    form.client.trim() !== '' &&
    form.projectType !== '' &&
    npxValid;

  async function handleArchive(project: Project) {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Archived' }),
    });
    const updated: Project = await res.json();
    setProjects(prev => prev.map(p => (p.id === project.id ? updated : p)));
  }

  function addBillingCode() {
    setForm(f => ({ ...f, billingCodes: [...f.billingCodes, newBillingCode()] }));
  }

  function updateBillingCode(id: number, field: keyof Omit<BillingCodeRow, 'id'>, value: string) {
    setForm(f => ({
      ...f,
      billingCodes: f.billingCodes.map(bc => bc.id === id ? { ...bc, [field]: value } : bc),
    }));
  }

  function removeBillingCode(id: number) {
    setForm(f => ({ ...f, billingCodes: f.billingCodes.filter(bc => bc.id !== id) }));
  }

  function addResource() {
    setForm(f => ({ ...f, resources: [...f.resources, newResource()] }));
  }

  function updateResource(id: number, field: keyof Omit<ResourceRow, 'id'>, value: string) {
    setForm(f => ({
      ...f,
      resources: f.resources.map(r => r.id === id ? { ...r, [field]: value } : r),
    }));
  }

  function removeResource(id: number) {
    setForm(f => ({ ...f, resources: f.resources.filter(r => r.id !== id) }));
  }

  const fieldInput: React.CSSProperties = {
    width:        '100%',
    boxSizing:    'border-box',
    background:   '#252530',
    border:       '1px solid #3c3c4e',
    borderRadius: 8,
    padding:      '9px 12px',
    fontSize:     14,
    color:        '#e4e4f0',
    outline:      'none',
    colorScheme:  'dark',
  };

  const fieldLabel: React.CSSProperties = {
    display:       'block',
    fontSize:      11,
    fontWeight:    600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color:         '#8888a0',
    marginBottom:  6,
  };

  const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );

  const ArchiveIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );

  return (
    <div
      style={{
        background:  '#121214',
        minHeight:   '100vh',
        padding:     24,
        color:       '#e7e7ea',
        fontFamily:  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div
        style={{
          display:        'flex',
          alignItems:     'flex-start',
          justifyContent: 'space-between',
          paddingBottom:  24,
          borderBottom:   '1px solid #2e2e34',
          marginBottom:   32,
        }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Project Portfolio</h1>
          <p style={{ fontSize: 14, color: '#9b9ba3', margin: '6px 0 0' }}>
            Register a new initiative in the system by filling out the details below.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        8,
            background: '#6c47ff',
            color:      '#fff',
            border:     'none',
            borderRadius: 10,
            padding:    '10px 18px',
            fontSize:   14,
            fontWeight: 500,
            cursor:     'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          + Create Project
        </button>
      </div>

      {/* ── Section heading + filter tabs ────────────────────────────────── */}
      <div
        style={{
          display:        'flex',
          alignItems:     'flex-start',
          justifyContent: 'space-between',
          marginBottom:   20,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Active Projects</h2>
          <p style={{ fontSize: 13, color: '#9b9ba3', margin: '4px 0 0' }}>
            A comprehensive list of all current and past projects.
          </p>
        </div>

        <div
          style={{
            display:      'flex',
            background:   '#1a1a1e',
            border:       '1px solid #2e2e34',
            borderRadius: 10,
            padding:      4,
            gap:          4,
          }}
        >
          {(['All', 'In Progress', 'Completed'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => { setFilter(tab); setPage(1); }}
              style={{
                background:   filter === tab ? '#6c47ff' : 'transparent',
                color:        filter === tab ? '#fff' : '#9b9ba3',
                border:       'none',
                borderRadius: 7,
                padding:      '6px 14px',
                fontSize:     13,
                fontWeight:   500,
                cursor:       'pointer',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Projects table ─────────────────────────────────────────────────── */}
      <div style={{ border: '1px solid #2e2e34', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2e2e34' }}>
              {['PROJECT DETAILS', 'NPX#', 'CLIENT', 'CATEGORY', 'STATUS', 'ACTIONS'].map((h, i) => (
                <th
                  key={h}
                  style={{
                    textAlign:     i === 5 ? 'right' : 'left',
                    padding:       '14px 20px',
                    fontSize:      11,
                    fontWeight:    500,
                    letterSpacing: '0.08em',
                    color:         '#9b9ba3',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((project, idx) => {
              const cat = CATEGORY_STYLE[project.category] ?? CATEGORY_STYLE.Development;
              return (
                <tr
                  key={project.id}
                  style={{ borderBottom: idx < visible.length - 1 ? '1px solid #26262c' : 'none' }}
                >
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: cat.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18, flexShrink: 0,
                        }}
                      >
                        {cat.emoji}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{project.name}</div>
                        <div style={{ fontSize: 12, color: '#9b9ba3', marginTop: 2 }}>
                          Created {timeAgo(project.createdAt)}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: '14px 20px', color: '#c5c5cd' }}>{project.npxNumber}</td>
                  <td style={{ padding: '14px 20px', color: '#c5c5cd' }}>{project.client}</td>

                  <td style={{ padding: '14px 20px' }}>
                    <span
                      style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 6,
                        fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                        textTransform: 'uppercase', background: '#2a2a30', color: '#c5c5cd',
                      }}
                    >
                      {project.category}
                    </span>
                  </td>

                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: STATUS_COLOR[project.status] ?? '#6b7280',
                          display: 'inline-block', flexShrink: 0,
                        }}
                      />
                      {project.status}
                    </div>
                  </td>

                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => openEdit(project)}
                        aria-label={`Edit ${project.name}`}
                        style={{ background: 'transparent', border: 'none', color: '#9b9ba3', cursor: 'pointer', padding: 6 }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchive(project)}
                        aria-label={`Archive ${project.name}`}
                        style={{ background: 'transparent', border: 'none', color: '#9b9ba3', cursor: 'pointer', padding: 6 }}
                      >
                        <ArchiveIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {loading && (
              <tr>
                <td colSpan={6} style={{ padding: '32px 20px', textAlign: 'center', color: '#7c7c85' }}>
                  Loading projects…
                </td>
              </tr>
            )}

            {loadError && (
              <tr>
                <td colSpan={6} style={{ padding: '32px 20px', textAlign: 'center', color: '#ef4444' }}>
                  Could not load projects — make sure the dev server is running.{' '}
                  <button
                    type="button"
                    onClick={loadData}
                    style={{ color: '#6c47ff', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 14 }}
                  >
                    Retry
                  </button>
                </td>
              </tr>
            )}

            {!loading && !loadError && visible.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '32px 20px', textAlign: 'center', color: '#7c7c85' }}>
                  No projects found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination bar */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderTop: '1px solid #2e2e34',
            fontSize: 13, color: '#9b9ba3',
          }}
        >
          <span>
            Showing{' '}
            <strong style={{ color: '#e7e7ea' }}>
              {filtered.length === 0
                ? '0'
                : `${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, filtered.length)}`}
            </strong>{' '}
            of <strong style={{ color: '#e7e7ea' }}>{filtered.length}</strong> projects
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ background: 'transparent', border: '1px solid #3a3a42', borderRadius: 8, padding: '5px 12px', fontSize: 13, color: page === 1 ? '#4a4a52' : '#e7e7ea', cursor: page === 1 ? 'default' : 'pointer' }}>
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} type="button" onClick={() => setPage(p)}
                style={{ background: page === p ? '#6c47ff' : 'transparent', border: page === p ? 'none' : '1px solid #3a3a42', borderRadius: 8, padding: '5px 10px', fontSize: 13, color: page === p ? '#fff' : '#e7e7ea', cursor: 'pointer', minWidth: 32 }}>
                {p}
              </button>
            ))}
            <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ background: 'transparent', border: '1px solid #3a3a42', borderRadius: 8, padding: '5px 12px', fontSize: 13, color: page === totalPages ? '#4a4a52' : '#e7e7ea', cursor: page === totalPages ? 'default' : 'pointer' }}>
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Create / Edit modal
          ══════════════════════════════════════════════════════════════════ */}
      {modalOpen && (
        <div
          onClick={closeModal}
          style={{
            position:   'fixed',
            inset:      0,
            background: 'rgba(0, 0, 0, 0.65)',
            zIndex:     1000,
            display:    'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding:    '40px 20px',
            overflowY:  'auto',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background:   '#1e1e2c',
              borderRadius: 16,
              width:        '100%',
              maxWidth:     880,
              flexShrink:   0,
              boxShadow:    '0 24px 64px rgba(0,0,0,0.5)',
            }}
          >

            {/* ── Modal header ─────────────────────────────────────────── */}
            <div
              style={{
                display:        'flex',
                justifyContent: 'space-between',
                alignItems:     'flex-start',
                padding:        '28px 28px 20px',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#e4e4f0' }}>
                  {editingId === null ? 'Create New Project' : 'Edit Project'}
                </h2>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#8888a0' }}>
                  Fill in the details to launch your next initiative.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Close modal"
                style={{
                  background: 'transparent',
                  border:     'none',
                  color:      '#8888a0',
                  cursor:     'pointer',
                  fontSize:   20,
                  padding:    4,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #2e2e3e', margin: 0 }} />

            {/* ── Modal body ───────────────────────────────────────────── */}
            <div style={{ padding: '24px 28px' }}>

              <div
                style={{
                  fontSize:      12,
                  fontWeight:    700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color:         '#d4d4e4',
                  marginBottom:  16,
                }}
              >
                General Information
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>

                <div style={{ flex: '3 1 180px' }}>
                  <label style={fieldLabel}>Project Name</label>
                  <input
                    style={fieldInput}
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Q4 Growth Strategy"
                  />
                </div>

                <div style={{ flex: '2 1 140px' }}>
                  <label style={fieldLabel}>Client</label>
                  <input
                    style={fieldInput}
                    value={form.client}
                    onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                    placeholder="e.g. Acme Corp"
                  />
                </div>

                <div style={{ flex: '2 1 130px' }}>
                  <label style={fieldLabel}>Start Date</label>
                  <input
                    type="date"
                    style={fieldInput}
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  />
                </div>

                <div style={{ flex: '2 1 130px' }}>
                  <label style={fieldLabel}>End Date</label>
                  <input
                    type="date"
                    style={fieldInput}
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  />
                </div>

                <div style={{ flex: '2 1 150px' }}>
                  <label style={fieldLabel}>Project Type</label>
                  <select
                    style={{ ...fieldInput, cursor: 'pointer' }}
                    value={form.projectType}
                    onChange={e => setForm(f => ({ ...f, projectType: e.target.value }))}
                  >
                    <option value="">Select type (FP/T&M)</option>
                    <option value="FP">FP — Fixed Price</option>
                    <option value="T&M">T&M — Time &amp; Materials</option>
                  </select>
                </div>


                <div style={{ flex: '1.5 1 100px' }}>
                  <label style={fieldLabel}>NPX#</label>
                  <input
                    style={{
                      ...fieldInput,
                      border: form.npxNumber && !npxValid
                        ? '1px solid #ef4444'
                        : '1px solid #3c3c4e',
                    }}
                    value={form.npxNumber}
                    onChange={e => setForm(f => ({ ...f, npxNumber: e.target.value }))}
                    placeholder="e.g. NPX-DEV-12345"
                  />
                  {form.npxNumber && !npxValid && (
                    <span style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'block' }}>
                      Format: NPX-XXX-##### (3 letters, 5 digits)
                    </span>
                  )}
              </div>
              </div>
              

              {/* ── BILLING CODES section ──────────────────────────────── */}
              <div
                style={{
                  display:        'flex',
                  justifyContent: 'space-between',
                  alignItems:     'center',
                  marginBottom:   14,
                }}
              >
                <div
                  style={{
                    fontSize:      12,
                    fontWeight:    700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color:         '#d4d4e4',
                  }}
                >
                  Billing Codes
                </div>
                <button
                  type="button"
                  onClick={addBillingCode}
                  style={{
                    background: 'transparent',
                    border:     'none',
                    color:      '#6c47ff',
                    fontSize:   12,
                    fontWeight: 600,
                    cursor:     'pointer',
                    padding:    0,
                    letterSpacing: '0.04em',
                  }}
                >
                  + ADD BILLING CODE
                </button>
              </div>

              {form.billingCodes.map((bc, idx) => (
                <div
                  key={bc.id}
                  style={{
                    display:      'flex',
                    gap:          12,
                    flexWrap:     'wrap',
                    marginBottom: idx < form.billingCodes.length - 1 ? 12 : 0,
                  }}
                >
                  <div style={{ flex: '2 1 90px' }}>
                    {idx === 0 && <label style={fieldLabel}>Label</label>}
                    <input
                      style={fieldInput}
                      value={bc.label}
                      onChange={e => updateBillingCode(bc.id, 'label', e.target.value)}
                      placeholder="e.g. Internal"
                    />
                  </div>

                  <div style={{ flex: '2 1 110px' }}>
                    {idx === 0 && <label style={fieldLabel}>Client Project</label>}
                    <input
                      style={fieldInput}
                      value={bc.clientProject}
                      onChange={e => updateBillingCode(bc.id, 'clientProject', e.target.value)}
                      placeholder="CP-2024-001"
                    />
                  </div>

                  <div style={{ flex: '2 1 120px' }}>
                    {idx === 0 && <label style={fieldLabel}>SDS/CCA</label>}
                    <input
                      style={fieldInput}
                      value={bc.sdsCca}
                      onChange={e => updateBillingCode(bc.id, 'sdsCca', e.target.value)}
                      placeholder="Enter SDS/CCA code"
                    />
                  </div>

                  <div style={{ flex: '1 1 70px' }}>
                    {idx === 0 && <label style={fieldLabel}>RC</label>}
                    <input
                      style={fieldInput}
                      value={bc.rc}
                      onChange={e => updateBillingCode(bc.id, 'rc', e.target.value)}
                      placeholder="RC-12"
                    />
                  </div>

                  <div style={{ flex: '1 1 80px' }}>
                    {idx === 0 && <label style={fieldLabel}>Amount</label>}
                    <input
                      style={fieldInput}
                      value={bc.amount}
                      onChange={e => updateBillingCode(bc.id, 'amount', e.target.value)}
                      placeholder="$0.00"
                    />
                  </div>

                  {form.billingCodes.length > 1 && (
                    <div
                      style={{
                        flex:        '0 0 auto',
                        display:     'flex',
                        alignItems:  idx === 0 ? 'flex-end' : 'center',
                        paddingBottom: idx === 0 ? 2 : 0,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => removeBillingCode(bc.id)}
                        aria-label="Remove billing code"
                        style={{ background: 'transparent', border: 'none', color: '#6b6b84', cursor: 'pointer', padding: 4 }}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── RESOURCES section — only shown for T&M projects ───────── */}
            {form.projectType === 'T&M' && (
              <div
                style={{
                  background:   '#181826',
                  margin:       '0 16px 16px',
                  borderRadius: 12,
                  padding:      '20px 24px',
                }}
              >
                <div
                  style={{
                    display:        'flex',
                    justifyContent: 'space-between',
                    alignItems:     'center',
                    marginBottom:   16,
                  }}
                >
                  <div
                    style={{
                      fontSize:      12,
                      fontWeight:    700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color:         '#d4d4e4',
                    }}
                  >
                    Resources
                  </div>
                  <button
                    type="button"
                    onClick={addResource}
                    style={{
                      background: 'transparent',
                      border:     'none',
                      color:      '#6c47ff',
                      fontSize:   12,
                      fontWeight: 600,
                      cursor:     'pointer',
                      padding:    0,
                      letterSpacing: '0.04em',
                    }}
                  >
                    + ADD RESOURCE
                  </button>
                </div>

                {form.resources.map(res => (
                  <div key={res.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>

                    <div style={{ flex: '3 1 0' }}>
                      <label style={fieldLabel}>Employee</label>
                      <select
                        style={{ ...fieldInput, cursor: 'pointer' }}
                        value={res.employee}
                        onChange={e => updateResource(res.id, 'employee', e.target.value)}
                      >
                        <option value="">Select employee...</option>
                        {people.map(p => (
                          <option key={p.id} value={p.displayName}>{p.displayName}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ flex: '2 1 0' }}>
                      <label style={fieldLabel}>Rate ($/hr)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        style={fieldInput}
                        value={res.rate}
                        onChange={e => updateResource(res.id, 'rate', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeResource(res.id)}
                      aria-label="Remove resource"
                      style={{
                        background:    'transparent',
                        border:        '1px solid #3c3c4e',
                        borderRadius:  8,
                        color:         '#6b6b84',
                        cursor:        'pointer',
                        padding:       '9px 10px',
                        flexShrink:    0,
                        display:       'flex',
                        alignItems:    'center',
                      }}
                    >
                      <ArchiveIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ── Modal footer: Cancel + primary action button ──────────── */}
            <div
              style={{
                display:        'flex',
                justifyContent: 'flex-end',
                gap:            12,
                padding:        '16px 28px 24px',
                borderTop:      '1px solid #2e2e3e',
              }}
            >
              <button
                type="button"
                onClick={closeModal}
                style={{
                  background:   'transparent',
                  border:       '1px solid #3c3c4e',
                  borderRadius: 8,
                  padding:      '9px 20px',
                  fontSize:     14,
                  color:        '#a0a0b8',
                  cursor:       'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!formValid}
                style={{
                  background:   formValid ? '#6c47ff' : '#3a3050',
                  border:       'none',
                  borderRadius: 8,
                  padding:      '9px 20px',
                  fontSize:     14,
                  fontWeight:   500,
                  color:        formValid ? '#fff' : '#6b6b84',
                  cursor:       formValid ? 'pointer' : 'not-allowed',
                  transition:   'background 0.15s, color 0.15s',
                }}
              >
                {editingId === null ? 'Create Project' : 'Save Changes'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectContent;
