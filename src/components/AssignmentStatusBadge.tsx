import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';
import type { AssignmentStatus } from '@/lib/api';
import {
  type AssignmentUiStatus,
  assignmentStatusLabels,
  resolveAssignmentUiStatus,
} from '@/lib/assignmentStatus';
import { cn } from '@/lib/utils';

const badgeVariantsByStatus: Record<AssignmentUiStatus, BadgeProps['variant']> = {
  not_started: 'secondary',
  in_progress: 'default',
  done: 'success',
  overdue: 'destructive',
};

interface AssignmentStatusBadgeProps {
  status: AssignmentStatus;
  dueDate?: string | null;
  className?: string;
}

export function AssignmentStatusBadge({ status, dueDate, className }: AssignmentStatusBadgeProps) {
  const uiStatus = resolveAssignmentUiStatus(status, dueDate);
  const variant = badgeVariantsByStatus[uiStatus];

  return (
    <Badge variant={variant} className={cn(className)}>
      {assignmentStatusLabels[uiStatus]}
    </Badge>
  );
}

