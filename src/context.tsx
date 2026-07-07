'use client';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { teamHubData } from './data';
import type { Project, Task, User, Notification, View, TaskStatus, Priority } from './types';

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
}

const AppContext = createContext<(AppState & AppActions) | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

let _idCounter = 1000;
function genId(prefix: string) { return `${prefix}-${++_idCounter}-${Date.now()}`; }

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(teamHubData.projects);
  const [members, setMembers] = useState<User[]>(teamHubData.organization.members);
  const [currentUser] = useState<User>(teamHubData.currentUser);
  const [notifications, setNotifications] = useState<Notification[]>(teamHubData.notifications);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string>(teamHubData.projects[0]?.id ?? '');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false);
  const [taskDetailOpen, setTaskDetailOpenState] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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

  const toggleDarkMode = useCallback(() => setDarkMode(d => !d), []);

  const setTaskDetailOpen = useCallback((open: boolean, task?: Task | null) => {
    setTaskDetailOpenState(open);
    setEditingTask(task ?? null);
  }, []);

  const addNotification = useCallback((msg: string, type: Notification['type']) => {
    setNotifications(ns => [{ id: genId('n'), type, message: msg, time: 'Just now', read: false }, ...ns]);
  }, []);

  const createTask = useCallback((projectId: string, task: Omit<Task, 'id' | 'comments' | 'activity' | 'subtasks'>) => {
    const newTask: Task = {
      ...task,
      id: genId('t'),
      comments: [],
      activity: [{ id: genId('a'), actor: currentUser.name, action: 'created', target: task.title, time: 'Just now' }],
      subtasks: []
    };
    setProjects(ps => ps.map(p => p.id === projectId ? { ...p, tasks: [...p.tasks, newTask] } : p));
    addNotification(`New task "${task.title}" created in ${projects.find(p => p.id === projectId)?.name}`, 'assignment');
  }, [currentUser.name, projects, addNotification]);

  const updateTask = useCallback((projectId: string, taskId: string, updates: Partial<Task>) => {
    setProjects(ps => ps.map(p =>
      p.id === projectId
        ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t) }
        : p
    ));
    setEditingTask(et => et && et.id === taskId ? { ...et, ...updates } : et);
  }, []);

  const deleteTask = useCallback((projectId: string, taskId: string) => {
    setProjects(ps => ps.map(p =>
      p.id === projectId ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId) } : p
    ));
    setTaskDetailOpenState(false);
    setEditingTask(null);
  }, []);

  const moveTaskStatus = useCallback((projectId: string, taskId: string, status: TaskStatus) => {
    setProjects(ps => ps.map(p =>
      p.id === projectId
        ? {
          ...p,
          tasks: p.tasks.map(t =>
            t.id === taskId
              ? {
                ...t,
                status,
                activity: [
                  ...t.activity,
                  { id: genId('a'), actor: currentUser.name, action: `moved to ${status}`, target: t.title, time: 'Just now' }
                ]
              }
              : t
          )
        }
        : p
    ));
    setEditingTask(et => et && et.id === taskId ? { ...et, status } : et);
  }, [currentUser.name]);

  const addComment = useCallback((projectId: string, taskId: string, body: string) => {
    const comment = { id: genId('c'), author: currentUser.name, body, time: 'Just now' };
    setProjects(ps => ps.map(p =>
      p.id === projectId
        ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, comments: [...t.comments, comment] } : t) }
        : p
    ));
    setEditingTask(et => et && et.id === taskId ? { ...et, comments: [...et.comments, comment] } : et);
  }, [currentUser.name]);

  const toggleSubtask = useCallback((projectId: string, taskId: string, subtaskId: string) => {
    setProjects(ps => ps.map(p =>
      p.id === projectId
        ? {
          ...p,
          tasks: p.tasks.map(t =>
            t.id === taskId
              ? { ...t, subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, done: !s.done } : s) }
              : t
          )
        }
        : p
    ));
    setEditingTask(et => {
      if (!et || et.id !== taskId) return et;
      return { ...et, subtasks: et.subtasks.map(s => s.id === subtaskId ? { ...s, done: !s.done } : s) };
    });
  }, []);

  const createProject = useCallback((project: Omit<Project, 'id' | 'tasks'>) => {
    const newProject: Project = { ...project, id: genId('p'), tasks: [] };
    setProjects(ps => [...ps, newProject]);
    setActiveProjectId(newProject.id);
  }, []);

  const updateProject = useCallback((projectId: string, updates: Partial<Project>) => {
    setProjects(ps => ps.map(p => p.id === projectId ? { ...p, ...updates } : p));
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    setProjects(ps => {
      const remaining = ps.filter(p => p.id !== projectId);
      if (activeProjectId === projectId && remaining.length > 0) setActiveProjectId(remaining[0].id);
      return remaining;
    });
  }, [activeProjectId]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(ns => ns.map(n => ({ ...n, read: true })));
  }, []);

  const inviteMember = useCallback((name: string, email: string, role: string) => {
    const newMember: User = {
      id: genId('u'), name, email, role: role as User['role'], avatar: name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase(), taskCount: 0
    };
    setMembers(ms => [...ms, newMember]);
    addNotification(`${name} joined TeamHub Labs`, 'invite');
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
      taskDetailOpen, editingTask,
      setActiveView, setActiveProjectId, setSelectedTaskId, setCmdPaletteOpen,
      toggleDarkMode, setNewTaskOpen, setNewProjectOpen, setInviteMemberOpen,
      setTaskDetailOpen, createTask, updateTask, deleteTask, moveTaskStatus,
      addComment, toggleSubtask, createProject, updateProject, deleteProject,
      markNotificationRead, markAllNotificationsRead, inviteMember, removeMember,
      updateMemberRole, addNotification
    }}>
      {children}
    </AppContext.Provider>
  );
}
