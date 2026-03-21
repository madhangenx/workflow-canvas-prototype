import { v4 as uuidv4 } from 'uuid';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string; // emoji or icon key
  nodeCount: number;
  edgeCount: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string; // initials or emoji
}

// ── Storage keys ───────────────────────────────────────────────────────────────

const PROJECTS_KEY = 'flowforge_projects';
const WORKFLOW_PREFIX = 'flowforge_wf_';
const USER_KEY = 'flowforge_user';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setStorage(key: string, data: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ── User ──────────────────────────────────────────────────────────────────────

export function getUser(): UserProfile | null {
  return getStorage<UserProfile | null>(USER_KEY, null);
}

export function saveUser(user: UserProfile) {
  setStorage(USER_KEY, user);
}

export function logout() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
}

// ── Projects (list) ──────────────────────────────────────────────────────────

export function getProjects(): Project[] {
  return getStorage<Project[]>(PROJECTS_KEY, []);
}

function saveProjects(projects: Project[]) {
  setStorage(PROJECTS_KEY, projects);
}

export function createProject(name: string, description: string): Project {
  const project: Project = {
    id: uuidv4(),
    name,
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    thumbnail: ['🔄', '⚙️', '📋', '🔀', '🏗️', '📊'][Math.floor(Math.random() * 6)],
    nodeCount: 1,
    edgeCount: 0,
  };
  const projects = getProjects();
  projects.unshift(project);
  saveProjects(projects);

  // Initialise empty workflow data
  const initialWorkflow = {
    meta: {
      id: project.id,
      name,
      description,
      version: '1.0.0',
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    nodes: [
      {
        id: 'start-1',
        type: 'startEvent',
        position: { x: 60, y: 60 },
        style: { width: 36, height: 36 },
        data: {
          nodeType: 'startEvent',
          label: 'Start',
          inputFields: [],
          outputFields: [],
          businessRules: [],
          apis: [],
          actionButtons: [],
        },
      },
    ],
    edges: [],
  };
  setStorage(`${WORKFLOW_PREFIX}${project.id}`, initialWorkflow);
  return project;
}

export function updateProject(id: string, patch: Partial<Pick<Project, 'name' | 'description' | 'nodeCount' | 'edgeCount'>>) {
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1) return;
  Object.assign(projects[idx], patch, { updatedAt: new Date().toISOString() });
  saveProjects(projects);
}

export function deleteProject(id: string) {
  const projects = getProjects().filter((p) => p.id !== id);
  saveProjects(projects);
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`${WORKFLOW_PREFIX}${id}`);
  }
}

export function duplicateProject(id: string): Project | null {
  const projects = getProjects();
  const src = projects.find((p) => p.id === id);
  if (!src) return null;
  const newId = uuidv4();
  const copy: Project = {
    ...src,
    id: newId,
    name: `${src.name} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  projects.unshift(copy);
  saveProjects(projects);

  // Copy workflow data
  const wfData = getWorkflowData(id);
  if (wfData) {
    const parsed = JSON.parse(wfData);
    parsed.meta.id = newId;
    parsed.meta.name = copy.name;
    setStorage(`${WORKFLOW_PREFIX}${newId}`, parsed);
  }
  return copy;
}

// ── Workflow data (per project) ──────────────────────────────────────────────

export function getWorkflowData(projectId: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`${WORKFLOW_PREFIX}${projectId}`) ?? null;
}

export function saveWorkflowData(projectId: string, json: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${WORKFLOW_PREFIX}${projectId}`, json);
  // Update counts in project list
  try {
    const data = JSON.parse(json);
    updateProject(projectId, {
      nodeCount: data.nodes?.length ?? 0,
      edgeCount: data.edges?.length ?? 0,
      name: data.meta?.name,
    });
  } catch { /* ignore */ }
}
