import { useRef, useMemo, useState, useEffect } from 'react';
import { SearchIcon, SortIcon, PencilIcon, AddPersonIcon, CameraIcon } from '../../../shared/icons';
import type { Person } from '../../../types/people';
import type { Status } from '../../../types/status';



const AVATAR_COLORS = ['#4f46e5', '#0e7490', '#b45309', '#be185d', '#15803d', '#7c3aed'];

const initials = (name: string) =>
  name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();


type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  status: Status;
  photo: string;
};

const EMPTY_FORM: FormState = { firstName: '', lastName: '', email: '', status: 'Active', photo: '' };

function PeopleContent() {
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState('');
  const [ascending, setAscending] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/people')
      .then(r => r.json())
      .then(setPeople);
  }, []);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, photo: ev.target?.result as string }));
    reader.readAsDataURL(file);
  }

  const visiblePeople = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = people.filter(
      p =>
        p.displayName.toLowerCase().includes(q) ||
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
    );
    return [...matches].sort((a, b) =>
      ascending
        ? a.displayName.localeCompare(b.displayName)
        : b.displayName.localeCompare(a.displayName)
    );
  }, [people, query, ascending]);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(person: Person) {
    setEditingId(person.id);
    setForm({
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      status: person.status,
      photo: person.photo ?? '',
    });
    setFormOpen(true);
  }

  async function handleSubmit() {
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    const displayName = `${form.firstName.trim()} ${form.lastName.trim()}`;
    const body = { ...form, displayName };

    if (editingId === null) {
      const res = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const created: Person = await res.json();
      setPeople(prev => [...prev, created]);
    } else {
      const res = await fetch(`/api/people/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const updated: Person = await res.json();
      setPeople(prev => prev.map(p => (p.id === editingId ? updated : p)));
    }

    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(false);
  }

  const inputStyle: React.CSSProperties = {
    background: '#1f1f23',
    border: '1px solid #3a3a42',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 14,
    color: '#e7e7ea',
    outline: 'none',
  };

  return (
    <div
      style={{
        background: '#121214',
        minHeight: '100vh',
        padding: 24,
        color: '#e7e7ea',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Manage People</h1>
          <p style={{ fontSize: 14, color: '#9b9ba3', margin: '6px 0 0' }}>
            View and manage all organization members and their access levels.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          <AddPersonIcon />
          Add Person
        </button>
      </div>

      {/* Search + Sort */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, margin: '24px 0' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: 'min(560px, 100%)' }}>
          <SearchIcon />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search by name or email..."
            aria-label="Search people by name or email"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: '#1c1c20',
              border: `1px solid ${searchFocused ? '#6a6a74' : '#3a3a42'}`,
              borderRadius: 12,
              padding: '12px 16px 12px 44px',
              fontSize: 15,
              color: '#e7e7ea',
              outline: 'none',
              transition: 'border-color 120ms ease',
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => setAscending(v => !v)}
          aria-label={`Sort ${ascending ? 'descending' : 'ascending'}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'transparent',
            border: 'none',
            color: '#d3d3d9',
            fontSize: 15,
            cursor: 'pointer',
            padding: '8px 4px',
          }}
        >
          <SortIcon ascending={ascending} />
          Sort
        </button>
      </div>

      {/* Add / Edit form */}
      {formOpen && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 12,
            background: '#1a1a1e',
            border: '1px solid #2a2a30',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
          }}
        >
          {/* Photo upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            aria-label="Upload profile photo"
            onChange={handlePhotoChange}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload profile photo"
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: '2px dashed #3a3a42',
              background: form.photo ? 'transparent' : '#1f1f23',
              cursor: 'pointer',
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7c7c85',
              flexShrink: 0,
            }}
          >
            {form.photo ? (
              <img src={form.photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <CameraIcon />
            )}
          </button>
          <input
            style={inputStyle}
            value={form.firstName}
            onChange={e => setForm({ ...form, firstName: e.target.value })}
            placeholder="First name"
            aria-label="First name"
          />
          <input
            style={inputStyle}
            value={form.lastName}
            onChange={e => setForm({ ...form, lastName: e.target.value })}
            placeholder="Last name"
            aria-label="Last name"
          />
          <input
            style={{ ...inputStyle, minWidth: 220 }}
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="Email address"
            aria-label="Email address"
          />
          <select
            style={inputStyle}
            value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value as Status })}
            aria-label="Status"
          >
            <option value="Active">Active</option>
            <option value="Archived">Archived</option>
          </select>
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              background: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {editingId === null ? 'Add' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => {
              setFormOpen(false);
              setEditingId(null);
              setForm(EMPTY_FORM);
            }}
            style={{
              background: 'transparent',
              color: '#9b9ba3',
              border: 'none',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ border: '1px solid #2e2e34', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2e2e34' }}>
              {['Member', 'First name', 'Last name', 'Email address', 'Status', 'Actions'].map(
                (h, i) => (
                  <th
                    key={h}
                    style={{
                      textAlign: i === 5 ? 'right' : 'left',
                      padding: '14px 20px',
                      fontSize: 12,
                      fontWeight: 500,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#9b9ba3',
                    }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {visiblePeople.map((person, idx) => (
              <tr
                key={person.id}
                style={{ borderBottom: idx < visiblePeople.length - 1 ? '1px solid #26262c' : 'none' }}
              >
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {person.photo ? (
                      <img
                        src={person.photo}
                        alt={person.displayName}
                        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: AVATAR_COLORS[person.id % AVATAR_COLORS.length],
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {initials(person.displayName)}
                      </div>
                    )}
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{person.displayName}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 20px' }}>{person.firstName}</td>
                <td style={{ padding: '14px 20px' }}>{person.lastName}</td>
                <td style={{ padding: '14px 20px', color: '#9b9ba3' }}>{person.email}</td>
                <td style={{ padding: '14px 20px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 14px',
                      borderRadius: 8,
                      fontSize: 13,
                      border: `1px solid ${person.status === 'Active' ? '#166534' : '#3a3a42'}`,
                      color: person.status === 'Active' ? '#4ade80' : '#b9b9c1',
                      background: person.status === 'Active' ? 'rgba(22, 101, 52, 0.12)' : 'transparent',
                    }}
                  >
                    {person.status}
                  </span>
                </td>
                <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => openEdit(person)}
                    aria-label={`Edit ${person.displayName}`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#d3d3d9',
                      cursor: 'pointer',
                      padding: 6,
                    }}
                  >
                    <PencilIcon />
                  </button>
                </td>
              </tr>
            ))}
            {visiblePeople.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '24px 20px', textAlign: 'center', color: '#7c7c85' }}>
                  No people match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PeopleContent;
