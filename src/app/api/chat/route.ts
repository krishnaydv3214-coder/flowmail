import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { runAgentChat } from '@/lib/corsair/mcp';

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

    const { message, history } = await request.json();

    if (!message) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }

    const agentResult = await runAgentChat(userId, message, history || []);
    return NextResponse.json({ success: true, ...agentResult });
  } catch (error: any) {
    console.error('Error in AI agent chat:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
