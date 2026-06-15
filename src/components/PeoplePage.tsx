import { useState } from 'react';

type Person = {
  id: number;
  name: string;
};

function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  function handleSubmit() {
    if (!name.trim()) return;

    if (editingId === null) {
      setPeople([...people, { id: Date.now(), name }]);
    } else {
      setPeople(people.map(p => (p.id === editingId ? { ...p, name } : p)));
    }
    setName('');
    setEditingId(null);
  }

  function handleEdit(person: Person) {
    setName(person.name);
    setEditingId(person.id);
  }

  const visiblePeople = people.filter(p =>
    p.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div>
      <h1 style={{ fontSize: '20px', margin: 0 }}>People</h1>
      <p style={{ fontSize: '12px' }}>
        View and manage all organization members and their access levels
      </p>

      {/* Search box */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          maxWidth: 560,
          marginBottom: 16,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#7c7c85"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ position: 'absolute', left: 14, pointerEvents: 'none' }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search by name..."
          aria-label="Search people by name"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: '#1f1f23',
            border: `1px solid ${searchFocused ? '#6a6a74' : '#3a3a42'}`,
            borderRadius: 12,
            padding: '10px 14px 10px 40px',
            fontSize: 14,
            color: '#e7e7ea',
            outline: 'none',
            transition: 'border-color 120ms ease',
          }}
        />
      </div>

      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Name"
      />
      <button onClick={handleSubmit}>
        {editingId === null ? 'Add' : 'Save'}
      </button>

      <ul>
        {visiblePeople.map(person => (
          <li key={person.id}>
            {person.name}{' '}
            <button onClick={() => handleEdit(person)}>Edit</button>
          </li>
        ))}
      </ul>
      {people.length > 0 && visiblePeople.length === 0 && (
        <p style={{ fontSize: 13, color: '#7c7c85' }}>
          No people match your search.
        </p>
      )}
    </div>
  );
}

export default PeoplePage;
