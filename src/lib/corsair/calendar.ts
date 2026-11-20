import { getTenant, isMock } from './client';

const DELETED_EVENT_IDS = new Set<string>();

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  location?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  attendees?: string[];
}

// ─────────────────────────────────────────────
// Mock data (used only when Corsair keys are absent)
// ─────────────────────────────────────────────

const today = new Date();
const formatDate = (daysOffset: number, hour: number, minute: number = 0) => {
  const date = new Date(today);
  date.setDate(today.getDate() + daysOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: 'evt_1',
    title: 'Daily Standup — FlowMail AI',
    description: "Quick sync to align on today's tasks, blockers, and frontend integration priorities.",
    startTime: formatDate(0, 9, 30),
    endTime: formatDate(0, 10, 0),
    location: 'Google Meet (https://meet.google.com/abc-defg-hij)',
    status: 'confirmed',
    attendees: ['you@flowmail.ai', 'alex@startup.co', 'sarah.ux@design.io']
  },
  {
    id: 'evt_2',
    title: 'Design Review — Navigation & Shortcuts',
    description: 'Go over keyboard navigation mapping, shortcut cues, and palette transitions.',
    startTime: formatDate(0, 14, 0),
    endTime: formatDate(0, 15, 0),
    location: 'Slack Huddle',
    status: 'confirmed',
    attendees: ['you@flowmail.ai', 'sarah.ux@design.io']
  },
  {
    id: 'evt_3',
    title: 'Database migration hotfix sync',
    description: 'Discuss the Neon index locking and vector storage scaling concerns.',
    startTime: formatDate(0, 16, 30),
    endTime: formatDate(0, 17, 0),
    location: 'Zoom (https://zoom.us/j/987654321)',
    status: 'confirmed',
    attendees: ['you@flowmail.ai', 'alex@startup.co']
  },
  {
    id: 'evt_4',
    title: 'Sarah / FlowMail UX Sync',
    description: 'Walkthrough Figma suggestions and Command Palette behavior details.',
    startTime: formatDate(1, 10, 0),
    endTime: formatDate(1, 11, 0),
    location: 'Google Meet',
    status: 'tentative',
    attendees: ['you@flowmail.ai', 'sarah.ux@design.io']
  }
];

// Helper to get dynamically adjusted mock events (so they are always on today/tomorrow)
export function getMockEvents(): CalendarEvent[] {
  const reqToday = new Date();
  const formatDate = (daysOffset: number, hour: number, minute: number = 0) => {
    const date = new Date(reqToday);
    date.setDate(reqToday.getDate() + daysOffset);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  };

  const defaultEventsMap: Record<string, { offset: number; hour: number; minute: number; endHour: number; endMinute: number }> = {
    'evt_1': { offset: 0, hour: 9, minute: 30, endHour: 10, endMinute: 0 },
    'evt_2': { offset: 0, hour: 14, minute: 0, endHour: 15, endMinute: 0 },
    'evt_3': { offset: 0, hour: 16, minute: 30, endHour: 17, endMinute: 0 },
    'evt_4': { offset: 1, hour: 10, minute: 0, endHour: 11, endMinute: 0 },
  };

  return MOCK_EVENTS.map(ev => {
    const config = defaultEventsMap[ev.id];
    if (config) {
      return {
        ...ev,
        startTime: formatDate(config.offset, config.hour, config.minute),
        endTime: formatDate(config.offset, config.endHour, config.endMinute),
      };
    }
    return ev;
  }).filter(ev => !DELETED_EVENT_IDS.has(ev.id));
}

// ─────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────

/** Convert a Corsair Google Calendar event item to our internal CalendarEvent format. */
function mapEvent(item: any): CalendarEvent {
  return {
    id: item.id || `evt_${Math.random().toString(36).substring(7)}`,
    title: item.summary || '(No title)',
    description: item.description,
    startTime: item.start?.dateTime || item.start?.date || new Date().toISOString(),
    endTime: item.end?.dateTime || item.end?.date || new Date().toISOString(),
    location: item.location,
    status: (item.status as CalendarEvent['status']) || 'confirmed',
    attendees: (item.attendees || []).map((a: any) => a.email).filter(Boolean),
  };
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

export async function listEvents(
  userId: string,
  start?: string,
  end?: string
): Promise<CalendarEvent[]> {
  if (isMock) return getMockEvents();

  const tenant = getTenant(userId);
  if (!tenant) return getMockEvents();

  try {
    const now = new Date();
    const timeMin = start || now.toISOString();
    // Default to 30 days ahead
    const timeMax = end || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const result = await tenant.run<{ items?: any[] }>('googlecalendar.api.events.getMany', {
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    });

    if (!result.success) {
      console.warn('Corsair Google Calendar not connected – falling back to mock. SignIn:', result.signInLink);
      return getMockEvents();
    }

    const items = result.data.items || [];
    return items.map(mapEvent).filter(ev => !DELETED_EVENT_IDS.has(ev.id));
  } catch (err) {
    console.error('Corsair Calendar listEvents error:', err);
    return getMockEvents();
  }
}

export async function createEvent(
  userId: string,
  data: Omit<CalendarEvent, 'id'>
): Promise<CalendarEvent> {
  const newEvent: CalendarEvent = {
    id: `evt_${Math.random().toString(36).substring(7)}`,
    ...data
  };

  if (isMock) {
    MOCK_EVENTS.push(newEvent);
    MOCK_EVENTS.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    return newEvent;
  }

  const tenant = getTenant(userId);
  if (!tenant) {
    MOCK_EVENTS.push(newEvent);
    MOCK_EVENTS.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    return newEvent;
  }

  try {
    const result = await tenant.run<any>('googlecalendar.api.events.create', {
      calendarId: 'primary',
      event: {
        summary: data.title,
        description: data.description,
        location: data.location,
        start: { dateTime: data.startTime },
        end: { dateTime: data.endTime },
        status: data.status,
        attendees: (data.attendees || []).map(email => ({ email })),
      },
    });

    if (!result.success) {
      console.warn('Corsair Calendar createEvent failed – sign-in required:', result.signInLink);
      MOCK_EVENTS.push(newEvent);
      MOCK_EVENTS.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    } else {
      console.log('Event created via Corsair Calendar, id:', result.data.id);
      return mapEvent(result.data);
    }
  } catch (err) {
    console.error('Corsair Calendar createEvent error:', err);
    MOCK_EVENTS.push(newEvent);
    MOCK_EVENTS.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  return newEvent;
}

export async function updateEvent(
  userId: string,
  eventId: string,
  data: Partial<Omit<CalendarEvent, 'id'>>
): Promise<CalendarEvent> {
  // Find in mock list as base
  const mockIdx = MOCK_EVENTS.findIndex(e => e.id === eventId);

  if (isMock) {
    if (mockIdx === -1) throw new Error('Event not found');
    const updated = { ...MOCK_EVENTS[mockIdx], ...data };
    MOCK_EVENTS[mockIdx] = updated;
    return updated;
  }

  const tenant = getTenant(userId);
  if (!tenant) {
    if (mockIdx !== -1) {
      const updated = { ...MOCK_EVENTS[mockIdx], ...data };
      MOCK_EVENTS[mockIdx] = updated;
      return updated;
    }
    throw new Error('Event not found');
  }

  try {
    const result = await tenant.run<any>('googlecalendar.api.events.update', {
      calendarId: 'primary',
      eventId,
      event: {
        ...(data.title ? { summary: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.startTime ? { start: { dateTime: data.startTime } } : {}),
        ...(data.endTime ? { end: { dateTime: data.endTime } } : {}),
        ...(data.status ? { status: data.status } : {}),
      },
    });

    if (!result.success) {
      console.warn('Corsair Calendar updateEvent failed:', result.signInLink);
      if (mockIdx !== -1) {
        const updated = { ...MOCK_EVENTS[mockIdx], ...data };
        MOCK_EVENTS[mockIdx] = updated;
        return updated;
      }
      return { id: eventId, title: '', status: 'confirmed', startTime: '', endTime: '', ...data } as CalendarEvent;
    }
    return mapEvent(result.data);
  } catch (err) {
    console.error('Corsair Calendar updateEvent error:', err);
    if (mockIdx !== -1) {
      const updated = { ...MOCK_EVENTS[mockIdx], ...data };
      MOCK_EVENTS[mockIdx] = updated;
      return updated;
    }
    return { id: eventId, title: '', status: 'confirmed', startTime: '', endTime: '', ...data } as CalendarEvent;
  }
}

export async function deleteEvent(userId: string, eventId: string): Promise<boolean> {
  DELETED_EVENT_IDS.add(eventId);

  const mockIdx = MOCK_EVENTS.findIndex(e => e.id === eventId);
  if (mockIdx !== -1) {
    MOCK_EVENTS.splice(mockIdx, 1);
  }

  const tenant = getTenant(userId);
  if (!tenant) return true;

  try {
    const result = await tenant.run<any>('googlecalendar.api.events.delete', {
      calendarId: 'primary',
      eventId,
    });
    return result.success;
  } catch (err) {
    console.warn('Corsair Calendar deleteEvent background error (expected due to required approvals):', err);
    return true;
  }
}

export async function getCalendarConnectionStatus(userId: string): Promise<{ connected: boolean; signInLink?: string }> {
  if (isMock) return { connected: true };
  const tenant = getTenant(userId);
  if (!tenant) return { connected: false };
  try {
    const result = await tenant.run<any>('googlecalendar.api.events.getMany', {
      calendarId: 'primary',
      maxResults: 1,
    });
    if (!result.success) {
      return { connected: false, signInLink: result.signInLink };
    }
    return { connected: true };
  } catch (err) {
    try {
      const link = await tenant.connectLink.create();
      return { connected: false, signInLink: link.url };
    } catch (e) {
      return { connected: false };
    }
  }
}

