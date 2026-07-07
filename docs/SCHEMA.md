# TeamHub — Database Schema Design (Drizzle / PostgreSQL)

> Author: The Architect. Target: apps/api/src/db/schema.ts

## pgEnums
- role: `owner | admin | member | viewer`
- task_priority: `low | medium | high | urgent`
- task_status: `todo | in_progress | in_review | done`
- notification_type: `assignment | comment | mention | due_date | invite`
- activity_action: `created | updated | status_changed | assigned | commented | archived | label_added | member_added`

## Tables (columns · types · constraints)

### users
- id uuid pk default gen_random_uuid()
- email text unique not null
- password_hash text not null
- name text not null
- avatar_url text null
- created_at timestamptz default now()

### organizations
- id uuid pk
- name text not null
- slug text unique not null
- owner_id uuid → users.id
- created_at timestamptz default now()

### org_members
- id uuid pk
- org_id uuid → organizations.id (cascade)
- user_id uuid → users.id null (null until invite accepted)
- invited_email text null
- role role not null default 'member'
- status text not null default 'active'  (pending|active)
- created_at timestamptz default now()
- UNIQUE(org_id, user_id)

### projects
- id uuid pk
- org_id uuid → organizations.id (cascade)
- name text not null
- description text null
- color text not null default '#6366f1'
- icon text null
- archived boolean not null default false
- created_by_id uuid → users.id
- created_at timestamptz default now()
- INDEX(org_id)

### project_members
- id uuid pk
- project_id uuid → projects.id (cascade)
- user_id uuid → users.id
- role role not null default 'member'
- created_at timestamptz default now()
- UNIQUE(project_id, user_id)

### tasks
- id uuid pk
- project_id uuid → projects.id (cascade)
- parent_task_id uuid → tasks.id null (self-ref for nested tasks)
- title text not null
- description text null
- assignee_id uuid → users.id null
- creator_id uuid → users.id
- due_date timestamptz null
- priority task_priority not null default 'medium'
- status task_status not null default 'todo'
- position integer not null default 0  (ordering within status column)
- created_at timestamptz default now()
- updated_at timestamptz default now()
- INDEX(project_id, status), INDEX(assignee_id)

### subtasks
- id uuid pk
- task_id uuid → tasks.id (cascade)
- title text not null
- done boolean not null default false
- assignee_id uuid → users.id null
- position integer not null default 0
- created_at timestamptz default now()
- INDEX(task_id)

### comments
- id uuid pk
- task_id uuid → tasks.id (cascade)
- author_id uuid → users.id
- body text not null
- mentions uuid[] default '{}'  (mentioned user ids)
- created_at timestamptz default now()
- updated_at timestamptz default now()
- INDEX(task_id)

### labels
- id uuid pk
- project_id uuid → projects.id (cascade)
- name text not null
- color text not null default '#64748b'
- created_at timestamptz default now()
- UNIQUE(project_id, name)

### task_labels
- task_id uuid → tasks.id (cascade)
- label_id uuid → labels.id (cascade)
- PRIMARY KEY(task_id, label_id)

### notifications
- id uuid pk
- user_id uuid → users.id (recipient, cascade)
- actor_id uuid → users.id null
- type notification_type not null
- entity_type text not null  (task|comment|org|project)
- entity_id uuid not null
- message text not null
- read boolean not null default false
- created_at timestamptz default now()
- INDEX(user_id, read)

### activity_log
- id uuid pk
- org_id uuid → organizations.id (cascade)
- project_id uuid → projects.id null
- task_id uuid → tasks.id null
- actor_id uuid → users.id
- action activity_action not null
- meta jsonb null  (before/after, field names, etc.)
- created_at timestamptz default now()
- INDEX(project_id, created_at), INDEX(task_id, created_at)

## Relations (drizzle relations())
- users 1—* org_members, project_members, tasks(assignee/creator), comments, notifications
- organizations 1—* org_members, projects, activity_log
- projects 1—* project_members, tasks, labels, activity_log
- tasks 1—* subtasks, comments, task_labels; self 1—* (parent/children)
- labels *—* tasks via task_labels

## PostgreSQL MCP verification checklist (Pedant)
- gen_random_uuid available (pgcrypto) — else use uuid_generate_v4/uuid-ossp
- all FKs resolve; cascade deletes correct
- enums created before tables referencing them
- unique/indexes present as above
