import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getThread } from '@/lib/corsair/gmail';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const thread = await getThread(userId, id);
    if (!thread) {
      return NextResponse.json({ success: false, error: 'Thread not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, thread });
  } catch (error: any) {
    console.error('Error fetching thread details:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
