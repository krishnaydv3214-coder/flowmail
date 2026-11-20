import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createEvent, deleteEvent } from '@/lib/corsair/calendar';

export async function POST(request: Request) {
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

    const body = await request.json();
    const { title, description, startTime, endTime, location } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, startTime, endTime' },
        { status: 400 }
      );
    }

    const event = await createEvent(userId, {
      title,
      description,
      startTime,
      endTime,
      location,
      status: 'confirmed'
    });

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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
    const eventId = searchParams.get('id');

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Missing event ID' },
        { status: 400 }
      );
    }

    const success = await deleteEvent(userId, eventId);
    return NextResponse.json({ success });
  } catch (error: any) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
