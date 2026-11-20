import { getTenant, isMock } from './client';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface Email {
  id: string;
  threadId: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  receivedAt: string;
  direction: 'incoming' | 'outgoing';
  isRead: boolean;
  snippet: string;
  priority?: 'Critical' | 'Important' | 'Normal' | 'Low';
  reason?: string;
  actionItems?: string[];
  inviteEvent?: {
    id: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
    googleMeetLink?: string;
    organizer: string;
    organizerName?: string;
    guests?: {
      name: string;
      email: string;
      avatarUrl?: string;
      isOrganizer?: boolean;
      status: 'yes' | 'no' | 'maybe' | 'awaiting';
    }[];
    notifications?: string[];
  };
}

export interface EmailThread {
  id: string;
  subject: string;
  snippet: string;
  priority: 'Critical' | 'Important' | 'Normal' | 'Low';
  updatedAt: string;
  emails: Email[];
}

// ─────────────────────────────────────────────
// Mock data (used only when Corsair keys are absent)
// ─────────────────────────────────────────────

const MOCK_THREADS: EmailThread[] = [
  {
    id: 'thread_invite',
    subject: 'Invitation: Kickoff Meeting @ Wed Jun 17, 2026 4PM - 5PM (you@flowmail.ai)',
    snippet: 'Going? Will you attend? When: Wed Jun 17, 4:00 PM. Duration: 60 minutes.',
    priority: 'Critical',
    updatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    emails: [
      {
        id: 'msg_invite_1',
        threadId: 'thread_invite',
        sender: 'alex@startup.co',
        recipient: 'you@flowmail.ai',
        subject: 'Invitation: Kickoff Meeting @ Wed Jun 17, 2026 4PM - 5PM (you@flowmail.ai)',
        body: `You have been invited to Kickoff Meeting.\n\nWhen: Wed Jun 17, 2026 4:00 PM - 5:00 PM Eastern Time\nOrganizer: alex@startup.co\n\nProject kickoff discussion, initial scoping, and target deliverables setup.`,
        receivedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        direction: 'incoming',
        isRead: false,
        snippet: 'Going? Will you attend? When: Wed Jun 17, 4:00 PM. Duration: 60 minutes.',
        priority: 'Critical',
        reason: 'Calendar invitation to Kickoff Meeting requiring RSVP response.',
        actionItems: ['RSVP to Kickoff Meeting invite'],
        inviteEvent: {
          id: 'event_kickoff_invite',
          title: 'Example of an Event',
          description: 'Project kickoff discussion, initial scoping, and target deliverables setup.',
          startTime: '2026-06-17T15:00:00-04:00', // 3:00pm
          endTime: '2026-06-17T16:00:00-04:00', // 4:00pm
          location: 'https://meet.google.com/jci-trcc-bho',
          googleMeetLink: 'https://meet.google.com/jci-trcc-bho',
          organizer: 'diksha.chauhan@startup.co',
          organizerName: 'Diksha Chauhan',
          guests: [
            {
              name: 'Diksha Chauhan',
              email: 'diksha.chauhan@startup.co',
              isOrganizer: true,
              status: 'yes'
            },
            {
              name: 's. s.',
              email: 'you@flowmail.ai',
              isOrganizer: false,
              status: 'awaiting'
            }
          ],
          notifications: [
            '30 minutes before, as email',
            '30 minutes before'
          ]
        }
      }
    ]
  },
  {
    id: 'thread_1',
    subject: 'Urgent: Production Database Migration Issues',
    snippet: 'Hey team, we are seeing connection timeouts on our main Neon PostgreSQL instance after deploying the vector database migration...',
    priority: 'Critical',
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    emails: [
      {
        id: 'msg_1_1',
        threadId: 'thread_1',
        sender: 'alex@startup.co',
        recipient: 'you@flowmail.ai',
        subject: 'Urgent: Production Database Migration Issues',
        body: `Hey team,\n\nWe are seeing connection timeouts on our main Neon PostgreSQL instance after deploying the vector database migration. It looks like pgvector queries are locking the search_embeddings table under high concurrent load.\n\nCan we set up a quick call today at 4:30 PM to debug this? We need to verify if the index creation is blocking writes.\n\nBest,\nAlex`,
        receivedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        direction: 'incoming',
        isRead: false,
        snippet: 'Hey team, we are seeing connection timeouts on our main Neon PostgreSQL instance after...',
        priority: 'Critical',
        reason: 'Mention of database connection issues in production and urgent meeting request.',
        actionItems: ['Schedule call at 4:30 PM today to debug Neon index locks', 'Verify index blocking writes']
      }
    ]
  },
  {
    id: 'thread_2',
    subject: 'Feedback on FlowMail AI UI/UX Prototypes',
    snippet: 'Hi, I reviewed the latest Figma links for the keyboard-first command palette. It looks extremely clean, but I have some minor suggestions...',
    priority: 'Important',
    updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    emails: [
      {
        id: 'msg_2_1',
        threadId: 'thread_2',
        sender: 'sarah.ux@design.io',
        recipient: 'you@flowmail.ai',
        subject: 'Feedback on FlowMail AI UI/UX Prototypes',
        body: `Hi there,\n\nI reviewed the latest Figma links for the keyboard-first command palette. It looks extremely clean, and the micro-animations are super fluid!\n\nA few minor points:\n1. Ensure that pressing 'Escape' correctly resets the search query.\n2. In the Calendar grid view, can we make sure there is a visual highlight for the currently focused time slot?\n\nLet's meet tomorrow at 10:00 AM to review these items.\n\nThanks,\nSarah`,
        receivedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        direction: 'incoming',
        isRead: false,
        snippet: 'Hi, I reviewed the latest Figma links for the keyboard-first command palette...',
        priority: 'Important',
        reason: 'Design feedback requiring action and scheduling request.',
        actionItems: ['Add Escape key handler to search palette', 'Implement Arrow key visual highlights in Calendar', 'Review UX tomorrow at 10:00 AM']
      }
    ]
  },
  {
    id: 'thread_3',
    subject: 'Vercel Deployment Succeeded: flowmail-ai',
    snippet: 'Project: flowmail-ai. Branch: main. Deployment URL: https://flowmail-ai.vercel.app...',
    priority: 'Normal',
    updatedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    emails: [
      {
        id: 'msg_3_1',
        threadId: 'thread_3',
        sender: 'noreply@vercel.com',
        recipient: 'you@flowmail.ai',
        subject: 'Vercel Deployment Succeeded: flowmail-ai',
        body: `Vercel Deployment Succeeded!\n\nProject: flowmail-ai\nBranch: main\nURL: https://flowmail-ai.vercel.app`,
        receivedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        direction: 'incoming',
        isRead: true,
        snippet: 'Project: flowmail-ai. Branch: main. Commit: add Clerk authentication...',
        priority: 'Normal',
        reason: 'Automated notification. No action items required.',
        actionItems: []
      }
    ]
  }
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Decode a base64url payload string from a Gmail message body. */
function decodeBase64Url(data: string): string {
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

/** Extract a named header value from a Gmail message payload. */
function getHeader(headers: { name?: string; value?: string }[], name: string): string {
  return headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

/** Recursively find the plain-text body part in a MIME message. */
function extractBody(payload: any): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const result = extractBody(part);
      if (result) return result;
    }
  }
  return '';
}

/** Build a base64url-encoded RFC 2822 email string suitable for gmail.api.messages.send. */
function buildRawEmail(to: string, from: string, subject: string, body: string, threadId?: string): string {
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `MIME-Version: 1.0`,
    '',
    body,
  ];
  const raw = lines.join('\r\n');
  // base64url encode
  return Buffer.from(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Convert a Corsair Gmail thread object into our internal EmailThread format. */
function mapThread(t: any): EmailThread {
  const messages: Email[] = (t.messages || []).map((msg: any) => {
    const headers = msg.payload?.headers || [];
    const subject = getHeader(headers, 'Subject');
    const from = getHeader(headers, 'From');
    const to = getHeader(headers, 'To');
    const body = extractBody(msg.payload) || msg.snippet || '';

    return {
      id: msg.id || '',
      threadId: msg.threadId || t.id || '',
      sender: from,
      recipient: to,
      subject,
      body,
      receivedAt: msg.internalDate
        ? new Date(Number(msg.internalDate)).toISOString()
        : new Date().toISOString(),
      direction: 'incoming' as const,
      isRead: !(msg.labelIds || []).includes('UNREAD'),
      snippet: msg.snippet || '',
      priority: 'Normal' as const,
    };
  });

  return {
    id: t.id || '',
    subject: messages[0]?.subject || t.snippet || '(No subject)',
    snippet: t.snippet || '',
    priority: 'Normal',
    updatedAt: messages[messages.length - 1]?.receivedAt || new Date().toISOString(),
    emails: messages,
  };
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

export async function listEmails(userId: string): Promise<EmailThread[]> {
  if (isMock) return MOCK_THREADS;

  const tenant = getTenant(userId);
  if (!tenant) return MOCK_THREADS;

  try {
    // First fetch thread stubs (id + snippet)
    const listResult = await tenant.run<{
      threads?: { id?: string; snippet?: string }[];
    }>('gmail.api.threads.list', {
      maxResults: 20,
      q: 'in:inbox -category:promotions -category:social',
    });

    if (!listResult.success) {
      console.warn('Corsair Gmail not connected – falling back to mock. SignIn:', listResult.signInLink);
      return MOCK_THREADS;
    }

    const threadStubs = listResult.data.threads || [];
    if (threadStubs.length === 0) return [];

    // Fetch each thread in full (with messages)
    const threads = await Promise.all(
      threadStubs.slice(0, 15).map(async stub => {
        const threadResult = await tenant.run<any>('gmail.api.threads.get', {
          id: stub.id!,
          format: 'full',
        });
        if (!threadResult.success) return null;
        return mapThread(threadResult.data);
      })
    );

    return threads.filter(Boolean) as EmailThread[];
  } catch (err) {
    console.error('Corsair Gmail listEmails error:', err);
    return MOCK_THREADS;
  }
}

export async function getThread(userId: string, threadId: string): Promise<EmailThread | null> {
  if (isMock) return MOCK_THREADS.find(t => t.id === threadId) || null;

  const tenant = getTenant(userId);
  if (!tenant) return MOCK_THREADS.find(t => t.id === threadId) || null;

  try {
    const result = await tenant.run<any>('gmail.api.threads.get', {
      id: threadId,
      format: 'full',
    });
    if (!result.success) return null;
    return mapThread(result.data);
  } catch (err) {
    console.error('Corsair Gmail getThread error:', err);
    return null;
  }
}

export async function sendEmail(
  userId: string,
  data: { to: string; subject: string; body: string; threadId?: string }
): Promise<Email> {
  // Build a local "outgoing" email object to return regardless of mode
  const newEmail: Email = {
    id: `msg_${Math.random().toString(36).substring(7)}`,
    threadId: data.threadId || `thread_${Math.random().toString(36).substring(7)}`,
    sender: 'me',
    recipient: data.to,
    subject: data.subject,
    body: data.body,
    receivedAt: new Date().toISOString(),
    direction: 'outgoing',
    isRead: true,
    snippet: data.body.substring(0, 100) + '...',
    priority: 'Normal'
  };

  if (isMock) {
    // Add to mock thread store locally in memory
    const existingThread = MOCK_THREADS.find(t => t.id === newEmail.threadId);
    if (existingThread) {
      existingThread.emails.push(newEmail);
      existingThread.updatedAt = newEmail.receivedAt;
      existingThread.snippet = newEmail.snippet;
    } else {
      MOCK_THREADS.unshift({
        id: newEmail.threadId,
        subject: newEmail.subject,
        snippet: newEmail.snippet,
        priority: 'Normal',
        updatedAt: newEmail.receivedAt,
        emails: [newEmail]
      });
    }
    return newEmail;
  }

  const tenant = getTenant(userId);
  if (!tenant) return newEmail;

  try {
    // Build the RFC 2822 raw email payload
    const raw = buildRawEmail(data.to, 'me', data.subject, data.body, data.threadId);

    const result = await tenant.run<any>('gmail.api.messages.send', {
      raw,
      ...(data.threadId ? { threadId: data.threadId } : {}),
    });

    if (!result.success) {
      console.warn('Corsair Gmail send failed – sign-in required:', result.signInLink);
    } else {
      console.log('Email sent via Corsair Gmail, message id:', result.data.id);
      newEmail.id = result.data.id || newEmail.id;
      newEmail.threadId = result.data.threadId || newEmail.threadId;
    }
  } catch (err) {
    console.error('Corsair Gmail sendEmail error:', err);
  }

  return newEmail;
}

export async function searchEmails(userId: string, query: string): Promise<EmailThread[]> {
  if (isMock) {
    const lowerQuery = query.toLowerCase();
    return MOCK_THREADS.filter(
      t =>
        t.subject.toLowerCase().includes(lowerQuery) ||
        t.snippet.toLowerCase().includes(lowerQuery) ||
        t.emails.some(e => e.body.toLowerCase().includes(lowerQuery) || e.sender.toLowerCase().includes(lowerQuery))
    );
  }

  const tenant = getTenant(userId);
  if (!tenant) return [];

  try {
    const listResult = await tenant.run<{
      threads?: { id?: string; snippet?: string }[];
    }>('gmail.api.threads.list', { q: query, maxResults: 10 });

    if (!listResult.success) return [];

    const stubs = listResult.data.threads || [];
    const threads = await Promise.all(
      stubs.map(async stub => {
        const r = await tenant.run<any>('gmail.api.threads.get', { id: stub.id!, format: 'full' });
        return r.success ? mapThread(r.data) : null;
      })
    );
    return threads.filter(Boolean) as EmailThread[];
  } catch (err) {
    console.error('Corsair Gmail searchEmails error:', err);
    return [];
  }
}

export async function getGmailConnectionStatus(userId: string): Promise<{ connected: boolean; signInLink?: string }> {
  if (isMock) return { connected: true };
  const tenant = getTenant(userId);
  if (!tenant) return { connected: false };
  try {
    const listResult = await tenant.run<any>('gmail.api.threads.list', {
      maxResults: 1,
      q: 'in:inbox',
    });
    if (!listResult.success) {
      return { connected: false, signInLink: listResult.signInLink };
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

