import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Person } from '../src/components/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'peopledb.json');


function readDb(): Person[] {
  if (!fs.existsSync(DB_PATH)) return [];
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDb(people: Person[]) {
  fs.writeFileSync(DB_PATH, JSON.stringify(people, null, 2));
}

const app = express();
app.use(express.json({ limit: '10mb' }));

app.get('/api/people', (_req, res) => {
  res.json(readDb());
});

app.post('/api/people', (req, res) => {
  const people = readDb();
  const person: Person = { id: Date.now(), ...req.body };
  people.push(person);
  writeDb(people);
  res.status(201).json(person);
});

app.put('/api/people/:id', (req, res) => {
  const id = Number(req.params.id);
  const people = readDb();
  const idx = people.findIndex(p => p.id === id);
  if (idx === -1) { res.status(404).json({ error: 'Not found' }); return; }
  people[idx] = { ...people[idx], ...req.body, id };
  writeDb(people);
  res.json(people[idx]);
});

app.delete('/api/people/:id', (req, res) => {
  const id = Number(req.params.id);
  writeDb(readDb().filter(p => p.id !== id));
  res.status(204).end();
});

app.listen(3001, () => console.log('API server running on http://localhost:3001'));
