'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Plus,
  Search,
  Trash2,
  Copy,
  Clock,
  GitBranch,
  LogOut,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import {
  getUser,
  saveUser,
  logout,
  getProjects,
  createProject,
  deleteProject,
  duplicateProject,
  type Project,
  type UserProfile,
} from '@/lib/project-store';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showConfirm } from '@/lib/confirmStore';

// ── Login Screen ──────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (user: UserProfile) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    const user: UserProfile = {
      id: uuidv4(),
      name: name.trim(),
      email: email.trim(),
      avatar: name.trim().slice(0, 2).toUpperCase(),
    };
    saveUser(user);
    onLogin(user);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Decorative glows */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/30">
            <LayoutDashboard size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">FlowForge</h1>
          <p className="mt-2 text-sm text-slate-400">
            Visual BPMN workflow modelling engine
          </p>
        </div>

        {/* Login card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white/5 px-8 py-8 backdrop-blur-xl"
        >
          <h2 className="mb-6 text-lg font-semibold text-white">Sign in to continue</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="John Smith"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!name.trim() || !email.trim()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Get Started
            <ArrowRight size={16} />
          </button>

          <p className="mt-4 text-center text-xs text-slate-500">
            No server required — your data stays in this browser.
          </p>
        </form>
      </div>
    </div>
  );
}

// ── New Project Dialog ────────────────────────────────────────────────────────

function NewProjectDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, desc: string) => void;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-0 shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-bold text-slate-800">Create New Workflow</h2>
          <p className="mt-1 text-xs text-slate-500">
            Start with a clean canvas and one Start Event node.
          </p>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Workflow Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="e.g. Employee Onboarding"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Description</label>
            <textarea
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="Brief description of the workflow purpose…"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={() => { if (name.trim()) { onCreate(name.trim(), desc.trim()); onClose(); setName(''); setDesc(''); } }}
            disabled={!name.trim()}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            Create Workflow
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  onOpen,
  onDelete,
  onDuplicate,
}: {
  project: Project;
  onOpen: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const age = getRelativeTime(project.updatedAt);

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50 cursor-pointer"
      onClick={onOpen}
    >
      {/* Thumbnail area */}
      <div className="flex h-36 items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 relative">
        <span className="text-5xl opacity-60">{project.thumbnail ?? '🔄'}</span>
        {/* Actions overlay */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-500 shadow-sm hover:bg-white hover:text-indigo-600"
            title="Duplicate"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              showConfirm({
                title: `Delete "${project.name}"?`,
                description: 'This project and all its workflow data will be permanently deleted.',
                confirmLabel: 'Delete',
                variant: 'danger',
                onConfirm: onDelete,
              });
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-500 shadow-sm hover:bg-white hover:text-rose-500"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {/* Info */}
      <div className="flex flex-1 flex-col px-4 py-3">
        <h3 className="text-sm font-bold text-slate-800 leading-tight truncate">{project.name}</h3>
        {project.description && (
          <p className="mt-1 text-xs text-slate-500 line-clamp-2">{project.description}</p>
        )}
        <div className="mt-auto pt-3 flex items-center gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><Clock size={10} />{age}</span>
          <span className="flex items-center gap-1"><GitBranch size={10} />{project.nodeCount} nodes</span>
        </div>
      </div>
    </div>
  );
}

// ── Time helper ───────────────────────────────────────────────────────────────

function getRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ user, onLogout }: { user: UserProfile; onLogout: () => void }) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    setProjects(getProjects());
  }, []);

  const handleCreate = useCallback(
    (name: string, desc: string) => {
      const project = createProject(name, desc);
      setProjects(getProjects());
      router.push(`/editor/${project.id}`);
    },
    [router],
  );

  const handleDelete = useCallback((id: string) => {
    deleteProject(id);
    setProjects(getProjects());
  }, []);

  const handleDuplicate = useCallback((id: string) => {
    duplicateProject(id);
    setProjects(getProjects());
  }, []);

  const filtered = search.trim()
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description.toLowerCase().includes(search.toLowerCase()),
      )
    : projects;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top nav */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow">
            <LayoutDashboard size={16} />
          </div>
          <span className="text-base font-bold text-slate-800">FlowForge</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
              {user.avatar}
            </div>
            <span className="text-xs font-medium text-slate-700">{user.name}</span>
          </div>
          <button
            onClick={() => { logout(); onLogout(); }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {/* Title row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Workflows</h1>
            <p className="mt-1 text-sm text-slate-500">
              {projects.length} workflow{projects.length !== 1 ? 's' : ''} in your workspace
            </p>
          </div>
          <button
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Plus size={16} />
            New Workflow
          </button>
        </div>

        {/* Search */}
        {projects.length > 0 && (
          <div className="relative mb-6 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              placeholder="Search workflows…"
            />
          </div>
        )}

        {/* Empty state */}
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-100">
              <Sparkles size={32} className="text-indigo-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-700">No workflows yet</h2>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Create your first BPMN workflow with drag-and-drop nodes,
              business rules, API integrations, and AI-powered generation.
            </p>
            <button
              onClick={() => setNewOpen(true)}
              className="mt-6 flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              <Plus size={16} />
              Create Your First Workflow
            </button>
          </div>
        )}

        {/* Project grid */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Quick create card */}
            <button
              onClick={() => setNewOpen(true)}
              className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 transition hover:border-indigo-300 hover:bg-indigo-50/40"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-500">
                <Plus size={24} />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-600">New Workflow</p>
            </button>

            {filtered.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={() => router.push(`/editor/${p.id}`)}
                onDelete={() => handleDelete(p.id)}
                onDuplicate={() => handleDuplicate(p.id)}
              />
            ))}
          </div>
        )}

        {/* No match */}
        {search.trim() && filtered.length === 0 && projects.length > 0 && (
          <p className="py-12 text-center text-sm text-slate-400">
            No workflows matching &ldquo;{search}&rdquo;
          </p>
        )}
      </main>

      {/* New project dialog */}
      <NewProjectDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}

// ── Root Page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <ConfirmDialog />
        <LoginScreen onLogin={setUser} />
      </>
    );
  }

  return (
    <>
      <ConfirmDialog />
      <Dashboard user={user} onLogout={() => setUser(null)} />
    </>
  );
}
