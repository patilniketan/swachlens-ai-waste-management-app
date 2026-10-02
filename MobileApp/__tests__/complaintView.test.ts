import {
  describeAiSource,
  describeEvent,
  stepDates,
} from '../src/utils/complaintView';
import { generateUuid } from '../src/utils/uuid';
import type { TimelineEvent } from '../src/types/complaint';

const event = (partial: Partial<TimelineEvent>): TimelineEvent => ({
  type: 'STATUS_CHANGED',
  fromValue: null,
  toValue: null,
  reason: null,
  createdAt: '2026-10-02T10:00:00.000Z',
  ...partial,
});

describe('describeAiSource', () => {
  test('AI results do not need review', () => {
    expect(describeAiSource('gemini').needsReview).toBe(false);
    expect(describeAiSource('cached').needsReview).toBe(false);
  });

  test('fallback and missing source are flagged for manual review', () => {
    expect(describeAiSource('fallback').needsReview).toBe(true);
    expect(describeAiSource(null).needsReview).toBe(true);
    expect(describeAiSource('fallback').label).toMatch(/review/i);
  });
});

describe('stepDates', () => {
  test('records when each progress step was first reached', () => {
    const dates = stepDates([
      event({ type: 'CREATED', toValue: 'Pending', createdAt: '2026-10-01T08:00:00.000Z' }),
      event({ type: 'ASSIGNED', toValue: null, createdAt: '2026-10-01T09:00:00.000Z' }),
      event({ fromValue: 'Pending', toValue: 'Assigned', createdAt: '2026-10-01T09:00:00.000Z' }),
      event({ fromValue: 'Assigned', toValue: 'InProgress', createdAt: '2026-10-01T11:00:00.000Z' }),
      event({ fromValue: 'InProgress', toValue: 'Resolved', createdAt: '2026-10-02T07:00:00.000Z' }),
    ]);

    expect(dates).toEqual({
      Pending: '2026-10-01T08:00:00.000Z',
      Assigned: '2026-10-01T09:00:00.000Z',
      InProgress: '2026-10-01T11:00:00.000Z',
      Resolved: '2026-10-02T07:00:00.000Z',
    });
  });

  test('keeps the first time a step was reached', () => {
    const dates = stepDates([
      event({ toValue: 'Assigned', createdAt: '2026-10-01T09:00:00.000Z' }),
      event({ toValue: 'Assigned', createdAt: '2026-10-01T12:00:00.000Z' }),
    ]);

    expect(dates.Assigned).toBe('2026-10-01T09:00:00.000Z');
  });

  test('handles a missing timeline', () => {
    expect(stepDates(undefined)).toEqual({});
  });
});

describe('describeEvent', () => {
  test('never exposes who was assigned', () => {
    expect(describeEvent(event({ type: 'ASSIGNED', toValue: null }))).toBe('Assigned to a field team');
  });

  test('uses readable status labels', () => {
    expect(describeEvent(event({ toValue: 'InProgress' }))).toBe('Status changed to In Progress');
  });
});

describe('generateUuid', () => {
  test('produces distinct v4-format ids', () => {
    const ids = new Set(Array.from({ length: 200 }, () => generateUuid()));

    expect(ids.size).toBe(200);
    ids.forEach(id =>
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/),
    );
  });
});
