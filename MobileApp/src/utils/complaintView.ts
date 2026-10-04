import { STATUS_LABELS, type ComplaintStatus, type TimelineEvent } from '../types/complaint';

export type AiSource = 'gemini' | 'cached' | 'seed' | 'fallback';

/** Plain-language note on where the AI assessment came from. */
export function describeAiSource(source: AiSource | null | undefined): {
  label: string;
  needsReview: boolean;
} {
  switch (source) {
    case 'gemini':
      return { label: 'Assessed by AI from your photo and description.', needsReview: false };
    case 'cached':
      return { label: 'Assessed by AI (stored demo analysis).', needsReview: false };
    case 'seed':
      return { label: 'Simulated demo assessment.', needsReview: false };
    default:
      return {
        label:
          'Automatic analysis was unavailable, so a staff member will review your report manually.',
        needsReview: true,
      };
  }
}

export const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: 'Critical',
  STANDARD: 'Standard',
  TRIVIAL: 'Low',
};

export const DUPLICATE_MESSAGE =
  'A similar report exists nearby; staff will review. If it is the same problem, your report is added to it as an extra vote.';

/** The progress steps shown on a complaint, in order. */
export const PROGRESS_STEPS: ComplaintStatus[] = ['Pending', 'Assigned', 'InProgress', 'Resolved'];

/** When each progress step was first reached, from the event history. */
export function stepDates(timeline: TimelineEvent[] = []): Partial<Record<ComplaintStatus, string>> {
  const dates: Partial<Record<ComplaintStatus, string>> = {};

  for (const event of timeline) {
    const reached =
      event.type === 'CREATED'
        ? 'Pending'
        : event.type === 'STATUS_CHANGED'
          ? (event.toValue as ComplaintStatus | null)
          : null;

    if (reached && !dates[reached]) dates[reached] = event.createdAt;
  }

  return dates;
}

/** One line describing a history entry, for citizens. */
export function describeEvent(event: TimelineEvent): string {
  const label = (status: string | null) =>
    status ? STATUS_LABELS[status as ComplaintStatus] ?? status : '—';

  switch (event.type) {
    case 'CREATED':
      return 'Report received';
    case 'ASSIGNED':
      return 'Assigned to a field team';
    case 'STATUS_CHANGED':
      return `Status changed to ${label(event.toValue)}`;
    case 'DUPLICATE_CONFIRMED':
      return 'Confirmed as the same problem as an existing report';
    case 'MERGED':
      return 'Combined with another report';
    default:
      return event.type;
  }
}
