import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getTenant, isMock } from '@/lib/corsair/client';

/**
 * GET /api/corsair/connect
 * Returns a Corsair connect link for the current user.
 * The frontend can redirect to this URL for the user to connect Gmail/Calendar.
 */
export async function GET() {
  try {
    if (isMock) {
      return NextResponse.json({
        success: false,
        error: 'Corsair is not configured. Please add CORSAIR_API_KEY and NEXT_PUBLIC_CORSAIR_INSTANCE_ID to your .env file.',
      }, { status: 503 });
    }

    let userId = 'anonymous';
    try {
      const session = await auth();
      if (session?.userId) userId = session.userId;
    } catch {}

    const tenant = getTenant(userId);
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Could not create Corsair tenant.' }, { status: 500 });
    }

    const link = await tenant.connectLink.create();
    return NextResponse.json({ success: true, url: link.url });
  } catch (error: any) {
    console.error('Corsair connect link error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
