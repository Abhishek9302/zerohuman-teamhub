import type { Project, Task, TaskStatus } from './types';

export const taskStatuses: TaskStatus[] = ['Todo', 'In Progress', 'In Review', 'Done'];

export function groupTasksByStatus(tasks: Task[]) {
  return taskStatuses.map((status) => ({
    status,
    tasks: tasks.filter((task) => task.status === status)
  }));
}

export function getCalendarBuckets(tasks: Task[]) {
  return tasks.reduce<Record<string, Task[]>>((acc, task) => {
    const key = task.dueDate;
    acc[key] = acc[key] ?? [];
    acc[key].push(task);
    return acc;
  }, {});
}

export function getProjectTaskCounts(projects: Project[]) {
  return projects.map((project) => ({
    name: project.name,
    total: project.tasks.length,
    done: project.tasks.filter((task) => task.status === 'Done').length
  }));
}
