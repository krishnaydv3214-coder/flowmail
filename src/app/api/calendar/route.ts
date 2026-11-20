import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listEvents, getCalendarConnectionStatus } from '@/lib/corsair/calendar';

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
    const start = searchParams.get('start') || undefined;
    const end = searchParams.get('end') || undefined;

    const events = await listEvents(userId, start, end);
    const connectionStatus = await getCalendarConnectionStatus(userId);
    
    return NextResponse.json({ 
      success: true, 
      events,
      connected: connectionStatus.connected,
      signInLink: connectionStatus.signInLink
    });
  } catch (error: any) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

