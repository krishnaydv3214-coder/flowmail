import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sendEmail } from '@/lib/corsair/gmail';

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

    const { to, subject, body, threadId } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, subject, body' },
        { status: 400 }
      );
    }

    const email = await sendEmail(userId, { to, subject, body, threadId });
    return NextResponse.json({ success: true, email });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
