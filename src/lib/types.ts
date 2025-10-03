export type UserRole = 'user' | 'manager' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  groupId?: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
}

export interface Hive {
  id: string;
  name: string;
  location: string;
  queenYear: number;
  acquisitionDate: string;
  status: 'active' | 'inactive' | 'archived';
  ownerId: string;
  pendingTasksCount: number;
}

export interface Step {
  id: string;
  title: string;
  description: string;
  contentText: string;
  requiresProof: boolean;
  mediaType?: 'none' | 'image' | 'video' | 'document';
  mediaUrl?: string;
  order: number;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  category: string;
  seasonality: string[];
  frequency: 'once' | 'weekly' | 'monthly';
  defaultDueDays: number;
  steps: Step[];
  createdAt: string;
}

export interface Assignment {
  id: string;
  taskId: string;
  task: Task;
  hiveId: string;
  hive: Hive;
  assignedTo: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  progress: number;
  createdAt: string;
}

export interface StepProgress {
  id: string;
  assignmentId: string;
  stepId: string;
  completed: boolean;
  notes?: string;
  mediaUrl?: string;
  completedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'new_task' | 'deadline_approaching' | 'task_completed';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  taskIds: string[];
  createdAt: string;
}
