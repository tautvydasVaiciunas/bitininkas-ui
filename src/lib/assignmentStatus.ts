import type { AssignmentStatus } from '@/lib/api';

export type AssignmentUiStatus = AssignmentStatus | 'overdue';

export const assignmentStatusLabels: Record<AssignmentUiStatus, string> = {
  not_started: 'Laukiama',
  in_progress: 'Vykdoma',
  done: 'Atlikta',
  overdue: 'Vėluojama',
};

export const resolveAssignmentUiStatus = (status: AssignmentStatus, dueDate?: string | null): AssignmentUiStatus => {
  if (status === 'done') {
    return status;
  }

  if (!dueDate) {
    return status;
  }

  const due = new Date(dueDate);
  const now = new Date();

  if (!Number.isNaN(due.getTime()) && due < now) {
    return 'overdue';
  }

  return status;
};

export const assignmentStatusFilterOptions: { value: AssignmentStatus | 'all' | 'overdue'; label: string }[] = [
  { value: 'all', label: 'Visos būsenos' },
  { value: 'not_started', label: assignmentStatusLabels.not_started },
  { value: 'in_progress', label: assignmentStatusLabels.in_progress },
  { value: 'done', label: assignmentStatusLabels.done },
  { value: 'overdue', label: assignmentStatusLabels.overdue },
];

