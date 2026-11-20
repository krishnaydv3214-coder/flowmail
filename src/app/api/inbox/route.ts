import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listEmails, getGmailConnectionStatus } from '@/lib/corsair/gmail';

export async function GET() {
  try {
    let userId = 'mock_user_123';
    try {
      const session = await auth();
      if (session?.userId) {
        userId = session.userId;
      }
    } catch (e) {
      // Auth config might not be fully initialized in local preview, fallback to mock user
    }

    const threads = await listEmails(userId);
    const connectionStatus = await getGmailConnectionStatus(userId);
    
    return NextResponse.json({ 
      success: true, 
      threads,
      connected: connectionStatus.connected,
      signInLink: connectionStatus.signInLink
    });
  } catch (error: any) {
    console.error('Error fetching inbox threads:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

