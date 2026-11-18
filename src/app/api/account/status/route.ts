import { NextResponse } from 'next/server';
import { isAccountFrozen, DEFAULT_SUSPENSION_INFO } from '@/lib/access-control';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get('email') || '').trim().toLowerCase();

  const frozen = isAccountFrozen(email);

  if (frozen) {
    return NextResponse.json({
      frozen: true,
      code: 'ACCOUNT_FROZEN',
      email,
      ...DEFAULT_SUSPENSION_INFO,
    }, { status: 403 });
  }

  return NextResponse.json({
    frozen: false,
    email,
    status: 'ACTIVE',
  });
}
