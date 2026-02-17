'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Video, Handshake, TrendingUp, DollarSign, Calendar, AlertCircle } from 'lucide-react';

interface Stats {
  totalVideos: number; 
  published: number; 
  activeSponsors: number;
  pipelineValue: number; 
  liveDeals: number; 
  paidDeals: number;
  overduePayments: number;
  urgentActions: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => { 
    fetch('/api/stats').then(r => r.json()).then(setStats); 
  }, []);

  if (!stats) return <p>Loading…</p>;

  return (
    <div>
      <h1 style={{ marginBottom: 8 }}>YouTube Dashboard</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        Video pipeline, sponsor CRM, and deal tracking
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        <Link href="/videos" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'var(--card)', padding: 16, borderRadius: 10, border: '1px solid var(--border)', textAlign: 'center' }}>
            <Video size={24} style={{ margin: '0 auto 8px', color: 'var(--accent)' }} />
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Videos</div>
          </div>
        </Link>
        <Link href="/sponsors" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'var(--card)', padding: 16, borderRadius: 10, border: '1px solid var(--border)', textAlign: 'center' }}>
            <Handshake size={24} style={{ margin: '0 auto 8px', color: 'var(--accent)' }} />
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sponsors</div>
          </div>
        </Link>
        <Link href="/crm-guide" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'var(--card)', padding: 16, borderRadius: 10, border: '1px solid var(--border)', textAlign: 'center' }}>
            <Calendar size={24} style={{ margin: '0 auto 8px', color: 'var(--accent)' }} />
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Guide</div>
          </div>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="value">{stats.totalVideos}</div>
          <div className="label">Total Videos</div>
        </div>
        <div className="stat-card">
          <div className="value">{stats.published}</div>
          <div className="label">Published</div>
        </div>
        <div className="stat-card">
          <div className="value">{stats.activeSponsors}</div>
          <div className="label">Active Sponsors</div>
        </div>
        <div className="stat-card">
          <div className="value" style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <DollarSign size={20} />
            {stats.pipelineValue.toLocaleString()}
          </div>
          <div className="label">Pipeline Value</div>
        </div>
        <div className="stat-card">
          <div className="value">{stats.liveDeals}</div>
          <div className="label">Live Deals</div>
        </div>
        <div className="stat-card">
          <div className="value">{stats.paidDeals}</div>
          <div className="label">Paid Deals</div>
        </div>
      </div>

      {(stats.overduePayments > 0 || stats.urgentActions > 0) && (
        <div style={{ background: 'var(--card)', padding: 16, borderRadius: 10, border: '1px solid var(--border)', marginBottom: 24 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--red)' }}>
            <AlertCircle size={18} />
            Attention Required
          </h3>
          {stats.overduePayments > 0 && (
            <div style={{ color: 'var(--red)', marginBottom: 8 }}>
              ⚠️ {stats.overduePayments} overdue payment{stats.overduePayments > 1 ? 's' : ''}
            </div>
          )}
          {stats.urgentActions > 0 && (
            <div style={{ color: 'var(--orange)' }}>
              📧 {stats.urgentActions} urgent action{stats.urgentActions > 1 ? 's' : ''} from email
            </div>
          )}
        </div>
      )}

      <div style={{ background: 'var(--card)', padding: 16, borderRadius: 10, border: '1px solid var(--border)' }}>
        <h3 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={18} />
          Quick Tips
        </h3>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.8 }}>
          <li>Check <strong>montythehandler@gmail.com</strong> for sponsor updates</li>
          <li>Drag sponsor cards to move between stages</li>
          <li>Click any card to edit full details</li>
          <li>Set payment due dates when deals go live</li>
        </ul>
      </div>
    </div>
  );
}
