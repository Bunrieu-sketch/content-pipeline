import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export function GET() {
  const db = getDb();
  const totalVideos = (db.prepare('SELECT COUNT(*) as c FROM videos').get() as any).c;
  const published = (db.prepare("SELECT COUNT(*) as c FROM videos WHERE stage='published'").get() as any).c;
  const activeSponsors = (db.prepare("SELECT COUNT(*) as c FROM sponsors WHERE status NOT IN ('paid')").get() as any).c;
  const pipelineValue = (db.prepare("SELECT COALESCE(SUM(deal_value),0) as v FROM sponsors WHERE status IN ('inquiry','negotiation','contract','content','delivered')").get() as any).v;
  const liveDeals = (db.prepare("SELECT COUNT(*) as c FROM sponsors WHERE status='live'").get() as any).c;
  const paidDeals = (db.prepare("SELECT COUNT(*) as c FROM sponsors WHERE status='paid'").get() as any).c;

  return NextResponse.json({
    totalVideos, published, activeSponsors, pipelineValue, liveDeals, paidDeals,
  });
}
