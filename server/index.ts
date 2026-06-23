import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Person } from '../src/components/types';
import type { Project } from '../src/types/project';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path to the people JSON file (acts as the database for people)
const DB_PATH = path.join(__dirname, 'peopledb.json');

// Paths to the normalised project-related JSON files
const PROJECT_DB_PATH      = path.join(__dirname, 'projectdb.json');
const RESOURCES_DB_PATH    = path.join(__dirname, 'resourcesdb.json');
const FINANCE_DB_PATH      = path.join(__dirname, 'financedetailsdb.json');

// exists sync checks to see if the file exists, to read the database file and retun the array of people stored in it 
function readDb(): Person[] {
  if (!fs.existsSync(DB_PATH)) return [];
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}
// This function saves the array of people to the database file.
function writeDb(people: Person[]) {
  fs.writeFileSync(DB_PATH, JSON.stringify(people, null, 2));
}
// Creates your Express server instance. app is the object you use for everything 
const app = express();
app.use(express.json({ limit: '10mb' }));

//reads the entire array from the file and sends it back as JSON
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

// ─── Project routes ──────────────────────────────────────────────────────────

// ─── Helpers for the three normalised project files ──────────────────────────

type ResourceRow     = { id: number; fkProjectId: number; fkPeopleId: number | null; rate: number; hours: number };
type FinanceRow      = { id: number; fkProjectId: number; brucePowerPm: number; projectNum: number; ccaSds: string; rc: string; validFrom: string; validTo: string; costModel: string; clientProject: string };

function readJson<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}
function writeJson<T>(filePath: string, data: T[]) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Returns projects with resources + billingCodes joined back in for the frontend.
// Employee names are resolved live from peopledb so edits on the People page
// are immediately reflected on the Projects page.
function readProjects(): Project[] {
  const projects   = readJson<Project>(PROJECT_DB_PATH);
  const resources  = readJson<ResourceRow>(RESOURCES_DB_PATH);
  const finances   = readJson<FinanceRow>(FINANCE_DB_PATH);
  const people     = readJson<Person>(DB_PATH);
  const peopleById = new Map(people.map(p => [p.id, p.displayName]));

  return projects.map(proj => ({
    ...proj,
    resources: resources
      .filter(r => r.fkProjectId === proj.id)
      .map(r => ({ id: r.id, employee: peopleById.get(r.fkPeopleId ?? -1) ?? '', rate: String(r.rate || '') })),
    billingCodes: finances
      .filter(f => f.fkProjectId === proj.id)
      .map(f => ({ id: f.id, label: f.costModel, clientProject: f.clientProject, sdsCca: f.ccaSds, rc: f.rc, amount: f.brucePowerPm ? String(f.brucePowerPm) : '' })),
  }));
}

// Splits a project body into its three tables and persists each one
function saveProject(project: Project) {
  const { resources = [], billingCodes = [], ...core } = project as any;

  // ── projectdb.json ──
  const projects = readJson<Project>(PROJECT_DB_PATH);
  const idx = projects.findIndex(p => p.id === project.id);
  if (idx === -1) projects.push(core); else projects[idx] = { ...projects[idx], ...core };
  writeJson(PROJECT_DB_PATH, projects);

  // ── resourcesdb.json ── replace all rows for this project
  // Resolve the employee display name to a stable person ID so the link
  // survives future name edits on the People page.
  const people        = readJson<Person>(DB_PATH);
  const peopleByName  = new Map(people.map(p => [p.displayName, p.id]));
  const allResources  = readJson<ResourceRow>(RESOURCES_DB_PATH).filter(r => r.fkProjectId !== project.id);
  for (const r of resources) {
    const fkPeopleId = peopleByName.get(r.employee) ?? null;
    // id = person's id so the row is directly traceable to the person it represents;
    // fall back to a timestamp when no person is assigned yet
    const id = fkPeopleId ?? Date.now();
    allResources.push({ id, fkProjectId: project.id, fkPeopleId, rate: parseFloat(r.rate) || 0, hours: 0 });
  }
  writeJson(RESOURCES_DB_PATH, allResources);

  // ── financedetailsdb.json ── replace all rows for this project
  const allFinances = readJson<FinanceRow>(FINANCE_DB_PATH).filter(f => f.fkProjectId !== project.id);
  for (const bc of billingCodes) {
    // id = project's id so the finance row is directly traceable to its project
    allFinances.push({ id: project.id, fkProjectId: project.id, brucePowerPm: parseInt(bc.amount) || 0, projectNum: 0, ccaSds: bc.sdsCca || '', rc: bc.rc || '', validFrom: '', validTo: '', costModel: bc.label || '', clientProject: bc.clientProject || '' });
  }
  writeJson(FINANCE_DB_PATH, allFinances);
}

// GET all projects (resources + billingCodes joined in)
app.get('/api/projects', (_req, res) => {
  res.json(readProjects());
});

// POST create a new project — server assigns the id and createdAt timestamp
app.post('/api/projects', (req, res) => {
  const project: Project = {
    id: Date.now(),
    createdAt: new Date().toISOString().slice(0, 10),
    projectManager: '',
    notes: '',
    ...req.body,
  } as any;
  saveProject(project);
  res.status(201).json(project);
});

// PUT update an existing project by id
app.put('/api/projects/:id', (req, res) => {
  const id = Number(req.params.id);
  const projects = readProjects();
  const existing = projects.find(p => p.id === id);
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }
  const updated = { ...existing, ...req.body, id };
  saveProject(updated);
  res.json(updated);
});

// DELETE remove a project and its related rows
app.delete('/api/projects/:id', (req, res) => {
  const id = Number(req.params.id);
  writeJson(PROJECT_DB_PATH,   readJson<Project>(PROJECT_DB_PATH).filter(p => p.id !== id));
  writeJson(RESOURCES_DB_PATH, readJson<ResourceRow>(RESOURCES_DB_PATH).filter(r => r.fkProjectId !== id));
  writeJson(FINANCE_DB_PATH,   readJson<FinanceRow>(FINANCE_DB_PATH).filter(f => f.fkProjectId !== id));
  res.status(204).end();
});

app.listen(3001, () => console.log('API server running on http://localhost:3001'));
