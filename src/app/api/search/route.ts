import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { searchEmails } from '@/lib/corsair/gmail';
import { listEvents } from '@/lib/corsair/calendar';

export async function GET(request: Request) {
  try {
    let userId = 'mock_user_123';
    try {
      const session = await auth();
      if (session?.userId) {
        userId = session.userId;
      }
    } catch (e) {
      // Fallback
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query) {
      return NextResponse.json({ success: true, results: [] });
    }

    // 1. Email search
    const matchingThreads = await searchEmails(userId, query);

    // 2. Calendar search
    const allEvents = await listEvents(userId);
    const lowerQuery = query.toLowerCase();
    const matchingEvents = allEvents.filter(
      e =>
        e.title.toLowerCase().includes(lowerQuery) ||
        e.description?.toLowerCase().includes(lowerQuery) ||
        e.location?.toLowerCase().includes(lowerQuery)
    );

    // Combine results
    const results = [
      ...matchingThreads.map(t => ({
        type: 'email',
        id: t.id,
        title: t.subject,
        subtitle: t.snippet,
        meta: `Updated ${new Date(t.updatedAt).toLocaleDateString()}`,
        priority: t.priority
      })),
      ...matchingEvents.map(e => ({
        type: 'event',
        id: e.id,
        title: e.title,
        subtitle: e.description || 'No description',
        meta: `${new Date(e.startTime).toLocaleDateString()} @ ${new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        location: e.location
      }))
    ];

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Error in unified search:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
