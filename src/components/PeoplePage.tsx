import { useState } from 'react';

type Person = {
  id: number;
  name: string;
};

function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

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

  return (
    <div>
      <p style={{ fontSize: "20px" }}>People</p>

      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Name"
      />
      <button onClick={handleSubmit}>
        {editingId === null ? 'Add' : 'Save'}
      </button>

      <ul>
        {people.map(person => (
          <li key={person.id}>
            {person.name}{' '}
            <button onClick={() => handleEdit(person)}>Edit</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PeoplePage;