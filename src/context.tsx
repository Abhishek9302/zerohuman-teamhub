'use client';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { teamHubData } from './data';
import type { Project, Task, User, Notification, View, TaskStatus, Priority } from './types';
import { api, getToken, setToken, ApiTask, ApiProject, ApiUser } from './api';

interface AppState {
  projects: Project[];
  members: User[];
  currentUser: User;
  notifications: Notification[];
  activeView: View;
  activeProjectId: string;
  selectedTaskId: string | null;
  cmdPaletteOpen: boolean;
  darkMode: boolean;
  newTaskOpen: boolean;
  newProjectOpen: boolean;
  inviteMemberOpen: boolean;
  taskDetailOpen: boolean;
  editingTask: Task | null;
  authed: boolean;
  authLoading: boolean;
  authError: string | null;
}

interface AppActions {
  setActiveView: (v: View) => void;
  setActiveProjectId: (id: string) => void;
  setSelectedTaskId: (id: string | null) => void;
  setCmdPaletteOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
  setNewTaskOpen: (open: boolean) => void;
  setNewProjectOpen: (open: boolean) => void;
  setInviteMemberOpen: (open: boolean) => void;
  setTaskDetailOpen: (open: boolean, task?: Task | null) => void;
  createTask: (projectId: string, task: Omit<Task, 'id' | 'comments' | 'activity' | 'subtasks'>) => void;
  updateTask: (projectId: string, taskId: string, updates: Partial<Task>) => void;
  deleteTask: (projectId: string, taskId: string) => void;
  moveTaskStatus: (projectId: string, taskId: string, status: TaskStatus) => void;
  addComment: (projectId: string, taskId: string, body: string) => void;
  toggleSubtask: (projectId: string, taskId: string, subtaskId: string) => void;
  createProject: (project: Omit<Project, 'id' | 'tasks'>) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  inviteMember: (name: string, email: string, role: string) => void;
  removeMember: (id: string) => void;
  updateMemberRole: (id: string, role: string) => void;
  addNotification: (msg: string, type: Notification['type']) => void;
  signup: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AppContext = createContext<(AppState & AppActions) | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

let _idCounter = 1000;
function genId(prefix: string) { return `${prefix}-${++_idCounter}-${Date.now()}`; }

// Map backend rows to the frontend domain model (which carries extra client-only fields).
function mapTask(t: ApiTask): Task {
  return {
    id: t.id,
    title: t.title,
    description: t.description || '',
    assignee: t.assignee || '',
    dueDate: t.due_date || '',
    priority: (t.priority as Priority) || 'Medium',
    status: (t.status as TaskStatus) || 'Todo',
    labels: [],
    subtasks: [],
    comments: [],
    activity: [],
  };
}

function mapProject(p: ApiProject, tasks: Task[]): Project {
  return {
    id: p.id,
    name: p.name,
    icon: p.icon || '📁',
    color: p.color || '#6366f1',
    archived: !!p.archived,
    description: p.description || '',
    tasks,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<User[]>(teamHubData.organization.members);
  const [currentUser, setCurrentUser] = useState<User>(teamHubData.currentUser);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false);
  const [taskDetailOpen, setTaskDetailOpenState] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [authed, setAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdPaletteOpen(o => !o);
      }
      if (e.key === 'Escape') {
        setCmdPaletteOpen(false);
        setNewTaskOpen(false);
        setNewProjectOpen(false);
        setInviteMemberOpen(false);
        setTaskDetailOpenState(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Load all projects + their tasks from the backend after auth.
  const hydrate = useCallback(async () => {
    const { projects: apiProjects } = await api.listProjects();
    const { tasks: allTasks } = await api.listTasks();
    const tasksByProject = new Map<string, Task[]>();
    for (const t of allTasks) {
      const list = tasksByProject.get(t.project_id) ?? [];
      list.push(mapTask(t));
      tasksByProject.set(t.project_id, list);
    }
    const mapped = apiProjects.map(p => mapProject(p, tasksByProject.get(p.id) ?? []));
    setProjects(mapped);
    if (mapped.length > 0) setActiveProjectId(prev => prev || mapped[0].id);
  }, []);

  // On mount, if a token exists try to hydrate; otherwise show the auth screen.
  useEffect(() => {
    (async () => {
      if (getToken()) {
        try {
          await hydrate();
          setAuthed(true);
        } catch {
          setToken(null);
        }
      }
      setAuthLoading(false);
    })();
  }, [hydrate]);

  const applyAuth = useCallback(async (token: string, user: ApiUser) => {
    setToken(token);
    setCurrentUser({
      id: user.id, name: user.name, email: user.email,
      role: (user.role as User['role']) || 'Owner',
      avatar: user.avatar || user.name.slice(0, 2).toUpperCase(), taskCount: 0,
    });
    await hydrate();
    setAuthed(true);
  }, [hydrate]);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    setAuthError(null);
    try {
      const { token, user } = await api.signup(name, email, password);
      await applyAuth(token, user);
    } catch (e) {
      setAuthError((e as Error).message);
      throw e;
    }
  }, [applyAuth]);

  const login = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      const { token, user } = await api.login(email, password);
      await applyAuth(token, user);
    } catch (e) {
      setAuthError((e as Error).message);
      throw e;
    }
  }, [applyAuth]);

  const logout = useCallback(() => {
    setToken(null);
    setAuthed(false);
    setProjects([]);
    setActiveProjectId('');
  }, []);

  const toggleDarkMode = useCallback(() => setDarkMode(d => !d), []);

  const setTaskDetailOpen = useCallback((open: boolean, task?: Task | null) => {
    setTaskDetailOpenState(open);
    setEditingTask(task ?? null);
  }, []);

  const addNotification = useCallback((msg: string, type: Notification['type']) => {
    setNotifications(ns => [{ id: genId('n'), type, message: msg, time: 'Just now', read: false }, ...ns]);
  }, []);

  const createTask = useCallback((projectId: string, task: Omit<Task, 'id' | 'comments' | 'activity' | 'subtasks'>) => {
    (async () => {
      try {
        const { task: created } = await api.createTask({
          projectId, title: task.title, description: task.description,
          assignee: task.assignee, dueDate: task.dueDate, priority: task.priority, status: task.status,
        });
        const mapped = mapTask(created);
        mapped.activity = [{ id: genId('a'), actor: currentUser.name, action: 'created', target: task.title, time: 'Just now' }];
        setProjects(ps => ps.map(p => p.id === projectId ? { ...p, tasks: [mapped, ...p.tasks] } : p));
        addNotification(`New task "${task.title}" created`, 'assignment');
      } catch (e) {
        addNotification(`Failed to create task: ${(e as Error).message}`, 'assignment');
      }
    })();
  }, [currentUser.name, addNotification]);

  const updateTask = useCallback((projectId: string, taskId: string, updates: Partial<Task>) => {
    setProjects(ps => ps.map(p =>
      p.id === projectId ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t) } : p
    ));
    setEditingTask(et => et && et.id === taskId ? { ...et, ...updates } : et);
    api.updateTask(taskId, {
      title: updates.title, description: updates.description, assignee: updates.assignee,
      dueDate: updates.dueDate, priority: updates.priority as any, status: updates.status as any,
    }).catch(() => {});
  }, []);

  const deleteTask = useCallback((projectId: string, taskId: string) => {
    setProjects(ps => ps.map(p => p.id === projectId ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId) } : p));
    setTaskDetailOpenState(false);
    setEditingTask(null);
    api.deleteTask(taskId).catch(() => {});
  }, []);

  const moveTaskStatus = useCallback((projectId: string, taskId: string, status: TaskStatus) => {
    setProjects(ps => ps.map(p =>
      p.id === projectId ? {
        ...p,
        tasks: p.tasks.map(t => t.id === taskId ? {
          ...t, status,
          activity: [...t.activity, { id: genId('a'), actor: currentUser.name, action: `moved to ${status}`, target: t.title, time: 'Just now' }],
        } : t),
      } : p
    ));
    setEditingTask(et => et && et.id === taskId ? { ...et, status } : et);
    api.updateTask(taskId, { status: status as any }).catch(() => {});
  }, [currentUser.name]);

  const addComment = useCallback((projectId: string, taskId: string, body: string) => {
    const comment = { id: genId('c'), author: currentUser.name, body, time: 'Just now' };
    setProjects(ps => ps.map(p =>
      p.id === projectId ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, comments: [...t.comments, comment] } : t) } : p
    ));
    setEditingTask(et => et && et.id === taskId ? { ...et, comments: [...et.comments, comment] } : et);
  }, [currentUser.name]);

  const toggleSubtask = useCallback((projectId: string, taskId: string, subtaskId: string) => {
    setProjects(ps => ps.map(p =>
      p.id === projectId ? {
        ...p,
        tasks: p.tasks.map(t => t.id === taskId ? { ...t, subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, done: !s.done } : s) } : t),
      } : p
    ));
    setEditingTask(et => {
      if (!et || et.id !== taskId) return et;
      return { ...et, subtasks: et.subtasks.map(s => s.id === subtaskId ? { ...s, done: !s.done } : s) };
    });
  }, []);

  const createProject = useCallback((project: Omit<Project, 'id' | 'tasks'>) => {
    (async () => {
      try {
        const { project: created } = await api.createProject({
          name: project.name, icon: project.icon, color: project.color, description: project.description,
        });
        const mapped = mapProject(created, []);
        setProjects(ps => [...ps, mapped]);
        setActiveProjectId(mapped.id);
      } catch (e) {
        addNotification(`Failed to create project: ${(e as Error).message}`, 'assignment');
      }
    })();
  }, [addNotification]);

  const updateProject = useCallback((projectId: string, updates: Partial<Project>) => {
    setProjects(ps => ps.map(p => p.id === projectId ? { ...p, ...updates } : p));
    api.updateProject(projectId, {
      name: updates.name, description: updates.description, archived: updates.archived as any,
    }).catch(() => {});
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    setProjects(ps => {
      const remaining = ps.filter(p => p.id !== projectId);
      if (activeProjectId === projectId && remaining.length > 0) setActiveProjectId(remaining[0].id);
      return remaining;
    });
    api.deleteProject(projectId).catch(() => {});
  }, [activeProjectId]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(ns => ns.map(n => ({ ...n, read: true })));
  }, []);

  const inviteMember = useCallback((name: string, email: string, role: string) => {
    const newMember: User = {
      id: genId('u'), name, email, role: role as User['role'],
      avatar: name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase(), taskCount: 0,
    };
    setMembers(ms => [...ms, newMember]);
    addNotification(`${name} was invited to TeamHub`, 'invite');
  }, [addNotification]);

  const removeMember = useCallback((id: string) => {
    setMembers(ms => ms.filter(m => m.id !== id));
  }, []);

  const updateMemberRole = useCallback((id: string, role: string) => {
    setMembers(ms => ms.map(m => m.id === id ? { ...m, role: role as User['role'] } : m));
  }, []);

  return (
    <AppContext.Provider value={{
      projects, members, currentUser, notifications,
      activeView, activeProjectId, selectedTaskId, cmdPaletteOpen,
      darkMode, newTaskOpen, newProjectOpen, inviteMemberOpen,
      taskDetailOpen, editingTask, authed, authLoading, authError,
      setActiveView, setActiveProjectId, setSelectedTaskId, setCmdPaletteOpen,
      toggleDarkMode, setNewTaskOpen, setNewProjectOpen, setInviteMemberOpen,
      setTaskDetailOpen, createTask, updateTask, deleteTask, moveTaskStatus,
      addComment, toggleSubtask, createProject, updateProject, deleteProject,
      markNotificationRead, markAllNotificationsRead, inviteMember, removeMember,
      updateMemberRole, addNotification, signup, login, logout,
    }}>
      {children}
    </AppContext.Provider>
  );
}
