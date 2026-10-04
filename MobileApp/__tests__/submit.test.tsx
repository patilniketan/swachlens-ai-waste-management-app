/**
 * @format
 */

import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import SubmissionResultScreen from '../src/screens/complaints/SubmissionResultScreen';
import { createComplaint, type CreateComplaintResponse } from '../src/services/complaint';

const response = (overrides: Partial<CreateComplaintResponse['ai']> = {}, withDuplicate = true) =>
  ({
    complaint: { id: 'cmuqyee3u00005gvc9jlk6fd4', status: 'Pending' },
    duplicateSuggestion: withDuplicate
      ? {
          complaintId: 'seed-cm-bins',
          verdict: 'yes',
          reason: 'Same incident',
          summary: 'Large mixed household waste at Central Market',
          status: 'Pending',
          confirmed: false,
        }
      : null,
    ai: {
      source: 'gemini',
      needsManualReview: false,
      summary: 'Large pile of mixed household waste by the market bins.',
      wasteType: 'Mixed household waste',
      wasteCategories: ['plastic bags'],
      relativeVolume: 'Large',
      condition: 'Mixed',
      hazardousDetected: true,
      hazardousTypes: ['broken glass'],
      accessibility: 'Easy',
      suggestedEquipment: [],
      blockedRoad: false,
      nearSensitiveSite: true,
      confidence: 0.8,
      priority: 'CRITICAL',
      urgencyScore: 8,
      requiredWorkers: 3,
      requiredHeavyVehicles: 0,
      estimatedTimeMinutes: 75,
      priorityReasons: [
        'Urgency 8/10 -> CRITICAL (CRITICAL >= 7, STANDARD >= 3)',
        '+4 hazardous material visible: broken glass',
        '+2 near a school, hospital or market',
      ],
      ...overrides,
    },
    idempotentReplay: false,
  }) as unknown as CreateComplaintResponse;

const renderResult = async (result: CreateComplaintResponse) => {
  const navigation = { replace: jest.fn(), popToTop: jest.fn() };
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <SubmissionResultScreen
        route={{ key: 'r', name: 'SubmissionResult', params: { result } } as any}
        navigation={navigation as any}
      />,
    );
  });

  const text = tree!.root
    .findAllByType(Text)
    .map(node => [].concat(node.props.children).join(''))
    .join('\n');

  return { text, navigation };
};

describe('SubmissionResultScreen', () => {
  test('shows the AI result, priority reasons and the duplicate note', async () => {
    const { text } = await renderResult(response());

    expect(text).toContain('Mixed household waste');
    expect(text).toContain('Large');
    expect(text).toContain('Yes: broken glass');
    expect(text).toContain('Critical · 8/10');
    expect(text).toContain('+4 hazardous material visible: broken glass');
    expect(text).not.toContain('Urgency 8/10'); // summary line is not repeated
    expect(text).toContain('A similar report exists nearby; staff will review');
    expect(text).toContain('Assessed by AI');
  });

  test('tells the citizen when analysis fell back to manual review', async () => {
    const { text } = await renderResult(
      response({ source: 'fallback', needsManualReview: true, summary: null }, false),
    );

    expect(text).toContain('a staff member will review your report manually');
    expect(text).not.toContain('similar report exists nearby');
  });
});

describe('createComplaint', () => {
  const okResponse = () =>
    Promise.resolve({
      ok: true,
      status: 201,
      text: () => Promise.resolve(JSON.stringify({ success: true, data: response() })),
    });

  // Records append() calls the way React Native's FormData would send them.
  class RecordingFormData {
    parts: { fieldName: string; string?: string; uri?: string }[] = [];
    append(fieldName: string, value: unknown) {
      this.parts.push(
        typeof value === 'string'
          ? { fieldName, string: value }
          : { fieldName, ...(value as { uri: string }) },
      );
    }
  }

  const realFormData = (globalThis as any).FormData;

  beforeEach(() => {
    (globalThis as any).fetch = jest.fn(okResponse);
    (globalThis as any).FormData = RecordingFormData;
  });

  afterEach(() => {
    (globalThis as any).FormData = realFormData;
  });

  const sentRequest = () => {
    const [url, init] = (globalThis as any).fetch.mock.calls[0];
    const { parts } = init.body as RecordingFormData;
    const field = (name: string) => parts.find(part => part.fieldName === name);
    return { url, init, field };
  };

  test('sends description, coordinates, the photo and the Idempotency-Key', async () => {
    await createComplaint({
      idempotencyKey: '7b3f6c1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
      description: 'Garbage behind the market',
      address: 'Central Market',
      latitude: 28.5689,
      longitude: 77.239,
      imageUri: 'file:///photo.jpg',
      imageType: 'image/jpeg',
    });

    const { url, init, field } = sentRequest();

    expect(url).toMatch(/\/api\/complaints$/);
    expect(init.method).toBe('POST');
    expect(init.headers['Idempotency-Key']).toBe('7b3f6c1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f');
    expect(field('description')?.string).toBe('Garbage behind the market');
    expect(field('text')).toBeUndefined();
    expect(field('latitude')?.string).toBe('28.5689');
    expect(field('longitude')?.string).toBe('77.239');
    expect(field('image')?.uri).toBe('file:///photo.jpg');
  });

  test('omits the image part when no photo was taken', async () => {
    await createComplaint({
      idempotencyKey: '7b3f6c1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
      description: 'Garbage behind the market',
      address: 'Central Market',
      latitude: 28.5689,
      longitude: 77.239,
    });

    expect(sentRequest().field('image')).toBeUndefined();
  });
});
