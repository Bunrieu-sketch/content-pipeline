'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  X,
  ChevronRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  DollarSign,
  Calendar,
  Mail,
  Trash2,
} from 'lucide-react';

const STAGES = [
  'offer_received',
  'qualified',
  'contract_signed',
  'brief_script',
  'filming',
  'brand_review',
  'published',
  'invoiced',
  'paid',
  'make_good',
] as const;

type Stage = (typeof STAGES)[number];

type SponsorV2 = {
  id: number;
  brand_name: string;
  deal_type: 'flat_rate' | 'cpm' | 'full_video';
  deal_value_gross: number;
  deal_value_net: number;
  cpm_rate: number | null;
  cpm_cap: number | null;
  mvg: number | null;
  stage: Stage;
  agency_contact: string | null;
  agency_email: string | null;
  offer_date: string | null;
  contract_date: string | null;
  brief_received_date: string | null;
  script_due_date: string | null;
  film_by_date: string | null;
  rough_cut_due_date: string | null;
  publish_date: string | null;
  invoice_date: string | null;
  payment_due_date: string | null;
  payment_received_date: string | null;
  payment_terms_brand_days: number;
  payment_terms_agency_days: number;
  invoice_amount: number;
  placement: string;
  integration_length_seconds: number;
  brief_text: string;
  brief_link: string;
  script_draft: string;
  script_status: string;
  has_tracking_link: number;
  has_pinned_comment: number;
  has_qr_code: number;
  tracking_link: string;
  promo_code: string;
  youtube_video_id: string;
  youtube_video_title: string;
  views_at_30_days: number;
  cpm_screenshot_taken: number;
  cpm_invoice_generated: number;
  mvg_met: number | null;
  make_good_required: number;
  make_good_video_id: string;
  exclusivity_window_days: number;
  exclusivity_category: string;
  notes: string;
  next_action: string;
  next_action_due: string | null;
};

type SponsorDeliverableV2 = {
  id: number;
  sponsor_id: number;
  title: string;
  status: 'pending' | 'complete';
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

type SponsorNote = {
  id: number;
  sponsor_id: number;
  note: string;
  created_at: string;
  updated_at: string;
};

const SCRIPT_STATUSES = [
  'not_started',
  'drafting',
  'submitted',
  'revision_1',
  'revision_2',
  'revision_3',
  'approved',
];

const DEAL_TYPE_LABELS: Record<string, string> = {
  flat_rate: 'Flat Rate',
  cpm: 'CPM',
  full_video: 'Full Video',
};

const STAGE_COLORS: Record<string, string> = {
  offer_received: '#58a6ff',
  qualified: '#a371f7',
  contract_signed: '#d29922',
  brief_script: '#d29922',
  filming: '#f0883e',
  brand_review: '#f0883e',
  published: '#3fb950',
  invoiced: '#3fb950',
  paid: '#56d364',
  make_good: '#f85149',
};

const PLACEMENTS = ['first_5_min', 'first_2_min', 'midroll'];

const emptyDeal = (): Partial<SponsorV2> => ({
  brand_name: '',
  deal_type: 'flat_rate',
  deal_value_gross: 0,
  deal_value_net: 0,
  stage: 'offer_received',
  payment_terms_brand_days: 30,
  payment_terms_agency_days: 15,
  placement: 'first_5_min',
  integration_length_seconds: 60,
  script_status: 'not_started',
  has_tracking_link: 0,
  has_pinned_comment: 0,
  has_qr_code: 0,
});

const toDate = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value: string | null | undefined) => {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleDateString();
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—';
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const addDays = (value: string, days: number) => {
  const base = toDate(value);
  if (!base) return value;
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
};

const diffDays = (value: string | null | undefined) => {
  const date = toDate(value);
  if (!date) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const delta = Math.round((date.getTime() - start.getTime()) / 86400000);
  return delta;
};

const getKeyDeadline = (sponsor: SponsorV2) => {
  const candidates = [
    { label: 'Next action', date: sponsor.next_action_due },
    { label: 'Script due', date: sponsor.script_due_date },
    { label: 'Film by', date: sponsor.film_by_date },
    { label: 'Rough cut', date: sponsor.rough_cut_due_date },
    { label: 'Publish', date: sponsor.publish_date },
    { label: 'Invoice', date: sponsor.invoice_date },
    { label: 'Payment', date: sponsor.payment_due_date },
  ].filter(item => item.date);

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const aDate = toDate(a.date!);
    const bDate = toDate(b.date!);
    if (!aDate || !bDate) return 0;
    return aDate.getTime() - bDate.getTime();
  });
  return candidates[0];
};

const getUrgency = (value: string | null | undefined) => {
  const days = diffDays(value);
  if (days === null) return 'neutral';
  if (days < 0) return 'overdue';
  if (days <= 3) return 'soon';
  return 'ontrack';
};

export default function SponsorsV2Page() {
  const [sponsors, setSponsors] = useState<SponsorV2[]>([]);
  const [selected, setSelected] = useState<SponsorV2 | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'script' | 'checklist' | 'payment'>('overview');
  const [draft, setDraft] = useState<Partial<SponsorV2>>(emptyDeal());
  const [isNew, setIsNew] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);
  const [deliverables, setDeliverables] = useState<SponsorDeliverableV2[]>([]);
  const [notes, setNotes] = useState<SponsorNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newDeliverable, setNewDeliverable] = useState('');

  const load = useCallback(() => {
    fetch('/api/sponsors-v2')
      .then(res => res.json())
      .then(data => setSponsors(data));
  }, []);

  const loadSideData = useCallback((id: number) => {
    Promise.all([
      fetch(`/api/sponsors-v2/${id}/deliverables`).then(res => res.json()),
      fetch(`/api/sponsors-v2/${id}/notes`).then(res => res.json()),
    ]).then(([deliverableData, noteData]) => {
      setDeliverables(deliverableData || []);
      setNotes(noteData || []);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (selected) {
      setDraft(selected);
      setActiveTab('overview');
    }
  }, [selected]);

  useEffect(() => {
    if (selected?.id) {
      loadSideData(selected.id);
    } else {
      setDeliverables([]);
      setNotes([]);
      setNewNote('');
      setNewDeliverable('');
    }
  }, [selected?.id, loadSideData]);

  const openNewDeal = () => {
    setIsNew(true);
    setSelected(null);
    setDraft(emptyDeal());
    setPanelOpen(true);
    setActiveTab('overview');
  };

  const openDeal = (deal: SponsorV2) => {
    setIsNew(false);
    setSelected(deal);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setSelected(null);
    setIsNew(false);
  };

  const updateDeal = async (id: number, updates: Partial<SponsorV2>) => {
    const res = await fetch(`/api/sponsors-v2/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setSponsors(prev => prev.map(item => (item.id === updated.id ? updated : item)));
    setSelected(prev => (prev && prev.id === updated.id ? updated : prev));
    setDraft(prev => ({ ...prev, ...updated }));
  };

  const createDeal = async () => {
    if (!draft.brand_name || !draft.brand_name.trim()) return;
    const res = await fetch('/api/sponsors-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!res.ok) return;
    const created = await res.json();
    setSponsors(prev => [...prev, created]);
    setSelected(created);
    setIsNew(false);
  };

  const deleteDeal = async (id: number) => {
    if (!confirm('Delete this deal?')) return;
    await fetch(`/api/sponsors-v2/${id}`, { method: 'DELETE' });
    setSponsors(prev => prev.filter(item => item.id !== id));
    closePanel();
  };

  const moveDeal = async (id: number, stage?: Stage) => {
    const res = await fetch(`/api/sponsors-v2/${id}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stage ? { stage } : {}),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setSponsors(prev => prev.map(item => (item.id === updated.id ? updated : item)));
    setSelected(prev => (prev && prev.id === updated.id ? updated : prev));
  };

  const addNote = async () => {
    if (!selected) return;
    const note = newNote.trim();
    if (!note) return;
    const res = await fetch(`/api/sponsors-v2/${selected.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) return;
    const created = await res.json();
    setNotes(prev => [created, ...prev]);
    setNewNote('');
  };

  const deleteNote = async (noteId: number) => {
    if (!selected) return;
    if (!confirm('Delete this note?')) return;
    await fetch(`/api/sponsors-v2/${selected.id}/notes/${noteId}`, { method: 'DELETE' });
    setNotes(prev => prev.filter(note => note.id !== noteId));
  };

  const addDeliverable = async () => {
    if (!selected) return;
    const title = newDeliverable.trim();
    if (!title) return;
    const res = await fetch(`/api/sponsors-v2/${selected.id}/deliverables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) return;
    const created = await res.json();
    setDeliverables(prev => [created, ...prev]);
    setNewDeliverable('');
  };

  const updateDeliverable = async (deliverableId: number, updates: Partial<SponsorDeliverableV2>) => {
    if (!selected) return;
    const res = await fetch(`/api/sponsors-v2/${selected.id}/deliverables/${deliverableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setDeliverables(prev => prev.map(item => (item.id === updated.id ? updated : item)));
  };

  const deleteDeliverable = async (deliverableId: number) => {
    if (!selected) return;
    if (!confirm('Delete this deliverable?')) return;
    await fetch(`/api/sponsors-v2/${selected.id}/deliverables/${deliverableId}`, { method: 'DELETE' });
    setDeliverables(prev => prev.filter(item => item.id !== deliverableId));
  };

  const stats = useMemo(() => {
    const activeDeals = sponsors.filter(s => s.stage !== 'paid');
    const pipelineValue = activeDeals.reduce((sum, s) => sum + (Number(s.deal_value_net) || 0), 0);
    const overduePayments = sponsors.filter(s => {
      const due = diffDays(s.payment_due_date);
      return s.payment_due_date && !s.payment_received_date && due !== null && due < 0;
    });
    const upcomingDeadlines = sponsors.filter(s => {
      const candidates = [
        s.next_action_due,
        s.script_due_date,
        s.film_by_date,
        s.rough_cut_due_date,
        s.publish_date,
        s.invoice_date,
        s.payment_due_date,
      ];
      return candidates.some(date => {
        const days = diffDays(date);
        return days !== null && days >= 0 && days <= 7;
      });
    });
    return {
      activeDeals: activeDeals.length,
      pipelineValue,
      overduePayments: overduePayments.length,
      upcomingDeadlines: upcomingDeadlines.length,
    };
  }, [sponsors]);

  const alerts = useMemo(() => {
    const items: { tone: 'danger' | 'warn'; text: string }[] = [];
    sponsors.forEach(s => {
      const overdueDays = diffDays(s.payment_due_date);
      if (s.payment_due_date && !s.payment_received_date && overdueDays !== null && overdueDays < 0) {
        items.push({
          tone: 'danger',
          text: `${s.brand_name} payment overdue by ${Math.abs(overdueDays)} days — follow up with ${s.agency_contact || 'agency'}`,
        });
      }

      if (s.deal_type === 'cpm' && s.publish_date) {
        const endDate = addDays(s.publish_date, 30);
        const daysLeft = diffDays(endDate);
        if (daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && !s.cpm_invoice_generated) {
          items.push({
            tone: 'warn',
            text: `${s.brand_name}: 30-day CPM period ends ${formatDate(endDate)} — prepare invoice`,
          });
        }
      }

      if (s.script_due_date) {
        const scriptDays = diffDays(s.script_due_date);
        if (scriptDays !== null && scriptDays >= 0 && scriptDays <= 3 && s.script_status !== 'approved') {
          items.push({
            tone: 'warn',
            text: `${s.brand_name} script due in ${scriptDays} days`,
          });
        }
      }
    });
    return items.slice(0, 4);
  }, [sponsors]);

  const onDragStart = (event: React.DragEvent, id: number) => {
    event.dataTransfer.setData('text/plain', String(id));
    setDraggingId(id);
  };

  const onDragEnd = () => {
    setDraggingId(null);
    setDragOverStage(null);
  };

  const onDrop = (event: React.DragEvent, stage: Stage) => {
    event.preventDefault();
    setDragOverStage(null);
    const id = Number(event.dataTransfer.getData('text/plain'));
    if (id) moveDeal(id, stage);
  };

  const panelTitle = isNew ? 'New Deal' : selected?.brand_name;
  const publishDate = (draft.publish_date as string | null) || null;
  const brandDays = Number(draft.payment_terms_brand_days || 30);
  const agencyDays = Number(draft.payment_terms_agency_days || 15);
  const brandPayDate = publishDate ? addDays(publishDate, brandDays) : null;
  const agencyPayDate = publishDate && brandPayDate ? addDays(brandPayDate, agencyDays) : null;
  const paymentOverdue = draft.payment_due_date && diffDays(draft.payment_due_date as string) !== null
    ? (diffDays(draft.payment_due_date as string) as number) < 0 && !draft.payment_received_date
    : false;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">Sponsors V2</h1>
          <span className="text-xs text-[var(--text-muted)] border border-[var(--border)] rounded-full px-2.5 py-0.5">Pipeline CRM</span>
        </div>
        <button className="btn flex items-center gap-1.5 text-xs" onClick={openNewDeal}>
          <Plus size={14} /> New Deal
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(163,113,247,0.15)' }}>
            <CheckCircle2 size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="value">{stats.activeDeals}</div>
          <div className="label">Active Deals</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(63,185,80,0.15)' }}>
            <DollarSign size={16} style={{ color: 'var(--green)' }} />
          </div>
          <div className="value" style={{ color: 'var(--green)' }}>${stats.pipelineValue.toLocaleString()}</div>
          <div className="label">Pipeline Value (Net)</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(248,81,73,0.15)' }}>
            <AlertTriangle size={16} style={{ color: 'var(--red)' }} />
          </div>
          <div className="value" style={{ color: 'var(--red)' }}>{stats.overduePayments}</div>
          <div className="label">Overdue Payments</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(210,153,34,0.15)' }}>
            <Clock size={16} style={{ color: 'var(--yellow)' }} />
          </div>
          <div className="value" style={{ color: 'var(--yellow)' }}>{stats.upcomingDeadlines}</div>
          <div className="label">Deadlines Next 7 Days</div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="flex items-center gap-3 text-xs" style={{ opacity: 0.85 }}>
          {alerts.map((alert, index) => (
            <div
              key={`${alert.text}-${index}`}
              className="flex items-center gap-1.5"
              style={{ color: alert.tone === 'danger' ? 'var(--red)' : 'var(--yellow)' }}
            >
              {alert.tone === 'danger' ? <AlertTriangle size={11} /> : <Clock size={11} />}
              <span>{alert.text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="kanban">
        {STAGES.map(stage => {
          const items = sponsors.filter(s => s.stage === stage);
          return (
            <div
              key={stage}
              className={`kanban-column transition-colors ${
                dragOverStage === stage ? 'border-[var(--accent)] bg-[rgba(163,113,247,0.08)]' : ''
              }`}
              onDragOver={event => {
                event.preventDefault();
                setDragOverStage(stage);
              }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={event => onDrop(event, stage)}
            >
              <h3>
                <span className="flex items-center">
                  <span className="stage-dot" style={{ background: STAGE_COLORS[stage] || 'var(--text-muted)' }} />
                  <span className="capitalize">{stage.replace(/_/g, ' ')}</span>
                </span>
                <span className="count">{items.length}</span>
              </h3>
              {items.map(s => {
                const deadline = getKeyDeadline(s);
                const urgency = deadline ? getUrgency(deadline.date) : 'neutral';
                const urgencyClass =
                  urgency === 'overdue'
                    ? 'border-l-[3px] border-l-[var(--red)]'
                    : urgency === 'soon'
                      ? 'border-l-[3px] border-l-[var(--yellow)]'
                      : urgency === 'ontrack'
                        ? 'border-l-[3px] border-l-[var(--green)]'
                        : '';
                return (
                  <div
                    key={s.id}
                    className={`kanban-card transition-transform duration-200 hover:-translate-y-0.5 ${
                      draggingId === s.id ? 'opacity-60' : ''
                    } ${urgencyClass}`}
                    draggable
                    onDragStart={event => onDragStart(event, s.id)}
                    onDragEnd={onDragEnd}
                    onClick={() => openDeal(s)}
                  >
                    <div className="card-brand">{s.brand_name}</div>
                    <span className={`card-badge ${s.deal_type}`}>
                      {DEAL_TYPE_LABELS[s.deal_type] || s.deal_type}
                    </span>
                    <div className="card-value">
                      {s.deal_type === 'cpm' && Number(s.invoice_amount) > 0 && ['published','invoiced','paid'].includes(s.stage) ? (
                        <>
                          ${Number(s.invoice_amount).toLocaleString()}
                          <span className="text-[10px] opacity-50 ml-1">actual</span>
                          <div className="text-[10px] opacity-40">cap: ${Number(s.deal_value_net).toLocaleString()}</div>
                        </>
                      ) : (
                        <>
                          ${Number(s.deal_value_net || 0).toLocaleString()}
                          {s.deal_type === 'cpm' && <span className="text-[10px] opacity-50 ml-1">net cap</span>}
                        </>
                      )}
                    </div>
                    {deadline && (
                      <div className="mt-2 pt-1.5 border-t border-[var(--border)]">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[13px] font-semibold bg-[var(--border)] rounded px-1.5 py-0.5 ${
                            urgency === 'overdue'
                              ? 'text-[var(--red)]'
                              : urgency === 'soon'
                                ? 'text-[var(--yellow)]'
                                : 'text-[var(--text-muted)]'
                          }`}
                        >
                          <Calendar size={13} />
                          {deadline.label}: {formatDate(deadline.date)}
                        </span>
                      </div>
                    )}
                    {s.next_action && (
                      <div className="card-meta mt-1 flex items-center gap-2 text-[var(--accent)]">
                        <Mail size={12} /> {s.next_action}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {panelOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70" onClick={closePanel} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', maxWidth: 640, maxHeight: '85vh', overflowY: 'auto', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', padding: 24, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase text-[var(--text-muted)]">Deal Details</div>
                <h2 className="text-xl font-semibold">{panelTitle || 'Untitled deal'}</h2>
              </div>
              <button className="text-[var(--text-muted)] hover:text-[var(--text)]" onClick={closePanel}>
                <X size={18} />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--text-muted)]">
                Stage: {draft.stage || 'offer_received'}
              </span>
              <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--text-muted)]">
                {DEAL_TYPE_LABELS[draft.deal_type || 'flat_rate']}
              </span>
              <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--accent)]">
                ${Number(draft.deal_value_net || 0).toLocaleString()} net
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--text-muted)]">Brand name</label>
                <input
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                  value={draft.brand_name || ''}
                  onChange={event => setDraft(prev => ({ ...prev, brand_name: event.target.value }))}
                  onBlur={() =>
                    !isNew &&
                    selected &&
                    draft.brand_name !== selected.brand_name &&
                    updateDeal(selected.id, { brand_name: draft.brand_name || '' })
                  }
                  placeholder="Brand"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)]">Deal value (gross)</label>
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                  value={draft.deal_value_gross ?? 0}
                  onChange={event =>
                    setDraft(prev => ({
                      ...prev,
                      deal_value_gross: Number(event.target.value),
                      deal_value_net: Number(event.target.value) * 0.8,
                    }))
                  }
                  onBlur={() =>
                    !isNew &&
                    selected &&
                    updateDeal(selected.id, { deal_value_gross: draft.deal_value_gross || 0 })
                  }
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2 border-b border-[var(--border)] pb-3">
              {['overview', 'script', 'checklist', 'payment'].map(tab => (
                <button
                  key={tab}
                  className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-wide whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-[var(--accent)] text-white'
                      : 'border border-[var(--border)] text-[var(--text-muted)]'
                  }`}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-4">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Stage</label>
                      <select
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.stage || 'offer_received'}
                        onChange={event => {
                          const value = event.target.value as Stage;
                          setDraft(prev => ({ ...prev, stage: value }));
                          if (!isNew && selected) moveDeal(selected.id, value);
                        }}
                      >
                        {STAGES.map(stage => (
                          <option key={stage} value={stage}>
                            {stage.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Deal type</label>
                      <select
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.deal_type || 'flat_rate'}
                        onChange={event => {
                          const value = event.target.value as SponsorV2['deal_type'];
                          setDraft(prev => ({ ...prev, deal_type: value }));
                          if (!isNew && selected) updateDeal(selected.id, { deal_type: value });
                        }}
                      >
                        {Object.entries(DEAL_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Agency contact</label>
                      <input
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.agency_contact || ''}
                        onChange={event => setDraft(prev => ({ ...prev, agency_contact: event.target.value }))}
                        onBlur={() =>
                          !isNew &&
                          selected &&
                          updateDeal(selected.id, { agency_contact: draft.agency_contact || '' })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Agency email</label>
                      <input
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.agency_email || ''}
                        onChange={event => setDraft(prev => ({ ...prev, agency_email: event.target.value }))}
                        onBlur={() =>
                          !isNew &&
                          selected &&
                          updateDeal(selected.id, { agency_email: draft.agency_email || '' })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Offer date', 'offer_date'],
                      ['Contract date', 'contract_date'],
                      ['Brief received', 'brief_received_date'],
                      ['Script due', 'script_due_date'],
                      ['Film by', 'film_by_date'],
                      ['Rough cut due', 'rough_cut_due_date'],
                      ['Publish date', 'publish_date'],
                    ].map(([label, key]) => (
                      <div key={key}>
                        <label className="text-xs text-[var(--text-muted)]">{label}</label>
                        <input
                          type="date"
                          className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                          value={(draft as any)[key] || ''}
                          onChange={event => setDraft(prev => ({ ...prev, [key]: event.target.value }))}
                          onBlur={() =>
                            !isNew && selected && updateDeal(selected.id, { [key]: (draft as any)[key] || null })
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Placement</label>
                      <select
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.placement || 'first_5_min'}
                        onChange={event => {
                          setDraft(prev => ({ ...prev, placement: event.target.value }));
                          if (!isNew && selected) updateDeal(selected.id, { placement: event.target.value });
                        }}
                      >
                        {PLACEMENTS.map(place => (
                          <option key={place} value={place}>
                            {place.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Integration length (sec)</label>
                      <input
                        type="number"
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.integration_length_seconds ?? 60}
                        onChange={event =>
                          setDraft(prev => ({ ...prev, integration_length_seconds: Number(event.target.value) }))
                        }
                        onBlur={() =>
                          !isNew &&
                          selected &&
                          updateDeal(selected.id, { integration_length_seconds: draft.integration_length_seconds || 0 })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[var(--text-muted)]">Next action</label>
                    <input
                      className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                      value={draft.next_action || ''}
                      onChange={event => setDraft(prev => ({ ...prev, next_action: event.target.value }))}
                      onBlur={() =>
                        !isNew && selected && updateDeal(selected.id, { next_action: draft.next_action || '' })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Next action due</label>
                      <input
                        type="date"
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.next_action_due || ''}
                        onChange={event => setDraft(prev => ({ ...prev, next_action_due: event.target.value }))}
                        onBlur={() =>
                          !isNew &&
                          selected &&
                          updateDeal(selected.id, { next_action_due: draft.next_action_due || null })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Notes</label>
                      <textarea
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.notes || ''}
                        onChange={event => setDraft(prev => ({ ...prev, notes: event.target.value }))}
                        onBlur={() =>
                          !isNew && selected && updateDeal(selected.id, { notes: draft.notes || '' })
                        }
                        rows={3}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-xs uppercase tracking-wide text-[var(--text-muted)]">Activity notes</div>
                    <div className="grid gap-2">
                      {notes.length === 0 && (
                        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text-muted)]">
                          No notes yet. Add the latest call summary or action items.
                        </div>
                      )}
                      {notes.map(note => (
                        <div
                          key={note.id}
                          className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        >
                          <div>
                            <div className="text-[var(--text)]">{note.note}</div>
                            <div className="text-xs text-[var(--text-muted)]">{formatDateTime(note.created_at)}</div>
                          </div>
                          <button
                            className="text-xs text-[var(--text-muted)] hover:text-[var(--red)]"
                            onClick={() => deleteNote(note.id)}
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      <textarea
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={newNote}
                        onChange={event => setNewNote(event.target.value)}
                        placeholder="Add a quick update..."
                        rows={2}
                      />
                      <button className="btn w-full" onClick={addNote} disabled={!selected}>
                        Add Note
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'script' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-[var(--text-muted)]">Brief text</label>
                    <textarea
                      className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                      value={draft.brief_text || ''}
                      onChange={event => setDraft(prev => ({ ...prev, brief_text: event.target.value }))}
                      onBlur={() =>
                        !isNew && selected && updateDeal(selected.id, { brief_text: draft.brief_text || '' })
                      }
                      rows={4}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)]">Script draft</label>
                    <textarea
                      className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                      value={draft.script_draft || ''}
                      onChange={event => setDraft(prev => ({ ...prev, script_draft: event.target.value }))}
                      onBlur={() =>
                        !isNew && selected && updateDeal(selected.id, { script_draft: draft.script_draft || '' })
                      }
                      rows={6}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)]">Script status</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {SCRIPT_STATUSES.map(status => (
                        <button
                          key={status}
                          className={`rounded-full px-3 py-1 text-xs ${
                            draft.script_status === status
                              ? 'bg-[var(--accent)] text-white'
                              : 'border border-[var(--border)] text-[var(--text-muted)]'
                          }`}
                          onClick={() => {
                            setDraft(prev => ({ ...prev, script_status: status }));
                            if (!isNew && selected) updateDeal(selected.id, { script_status: status });
                          }}
                        >
                          {status.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'checklist' && (
                <div className="space-y-4">
                  <div className="grid gap-3">
                    {[
                      ['has_tracking_link', 'Tracking link ready'],
                      ['has_pinned_comment', 'Pinned comment done'],
                      ['has_qr_code', 'QR code included'],
                    ].map(([key, label]) => (
                      <label
                        key={key}
                        className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                      >
                        <span>{label}</span>
                        <input
                          type="checkbox"
                          checked={Boolean((draft as any)[key])}
                          onChange={event => {
                            const value = event.target.checked ? 1 : 0;
                            setDraft(prev => ({ ...prev, [key]: value }));
                            if (!isNew && selected) updateDeal(selected.id, { [key]: value } as any);
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Tracking link</label>
                      <input
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.tracking_link || ''}
                        onChange={event => setDraft(prev => ({ ...prev, tracking_link: event.target.value }))}
                        onBlur={() =>
                          !isNew && selected && updateDeal(selected.id, { tracking_link: draft.tracking_link || '' })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Promo code</label>
                      <input
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.promo_code || ''}
                        onChange={event => setDraft(prev => ({ ...prev, promo_code: event.target.value }))}
                        onBlur={() =>
                          !isNew && selected && updateDeal(selected.id, { promo_code: draft.promo_code || '' })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Custom deliverables</div>
                      <button
                        className="rounded-md border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                        onClick={addDeliverable}
                        disabled={!selected}
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={newDeliverable}
                        onChange={event => setNewDeliverable(event.target.value)}
                        placeholder="Enter deliverable (e.g. 2x IG stories)"
                      />
                    </div>
                    <div className="grid gap-2">
                      {deliverables.length === 0 && (
                        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text-muted)]">
                          Add any custom deliverables that don’t fit the checklist.
                        </div>
                      )}
                      {deliverables.map(item => (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={item.status === 'complete'}
                            onChange={event =>
                              updateDeliverable(item.id, { status: event.target.checked ? 'complete' : 'pending' })
                            }
                          />
                          <input
                            className="flex-1 bg-transparent text-[var(--text)] outline-none"
                            value={item.title}
                            onChange={event =>
                              setDeliverables(prev =>
                                prev.map(row => (row.id === item.id ? { ...row, title: event.target.value } : row))
                              )
                            }
                            onBlur={() => updateDeliverable(item.id, { title: item.title })}
                          />
                          <input
                            type="date"
                            className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs"
                            value={item.due_date || ''}
                            onChange={event =>
                              setDeliverables(prev =>
                                prev.map(row => (row.id === item.id ? { ...row, due_date: event.target.value } : row))
                              )
                            }
                            onBlur={() => updateDeliverable(item.id, { due_date: item.due_date || null })}
                          />
                          <button
                            className="text-xs text-[var(--text-muted)] hover:text-[var(--red)]"
                            onClick={() => deleteDeliverable(item.id)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'payment' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Invoice amount</label>
                      <input
                        type="number"
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.invoice_amount ?? 0}
                        onChange={event => setDraft(prev => ({ ...prev, invoice_amount: Number(event.target.value) }))}
                        onBlur={() =>
                          !isNew && selected && updateDeal(selected.id, { invoice_amount: draft.invoice_amount || 0 })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Invoice date</label>
                      <input
                        type="date"
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.invoice_date || ''}
                        onChange={event => setDraft(prev => ({ ...prev, invoice_date: event.target.value }))}
                        onBlur={() =>
                          !isNew && selected && updateDeal(selected.id, { invoice_date: draft.invoice_date || null })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Brand payment terms (days)</label>
                      <input
                        type="number"
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.payment_terms_brand_days ?? 30}
                        onChange={event =>
                          setDraft(prev => ({ ...prev, payment_terms_brand_days: Number(event.target.value) }))
                        }
                        onBlur={() =>
                          !isNew &&
                          selected &&
                          updateDeal(selected.id, { payment_terms_brand_days: draft.payment_terms_brand_days || 30 })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Agency payment terms (days)</label>
                      <input
                        type="number"
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.payment_terms_agency_days ?? 15}
                        onChange={event =>
                          setDraft(prev => ({ ...prev, payment_terms_agency_days: Number(event.target.value) }))
                        }
                        onBlur={() =>
                          !isNew &&
                          selected &&
                          updateDeal(selected.id, { payment_terms_agency_days: draft.payment_terms_agency_days || 15 })
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-muted)]">
                    {publishDate && brandPayDate && agencyPayDate ? (
                      <div className="flex flex-col gap-1">
                        <span>
                          Published: {formatDate(publishDate)} → Brand pays agency by: {formatDate(brandPayDate)} ({brandDays}d)
                        </span>
                        <span>
                          Agency pays you by: {formatDate(agencyPayDate)} (+{agencyDays}d)
                        </span>
                      </div>
                    ) : (
                      <span>Set a publish date to calculate payment due date automatically.</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Payment due date (auto)</label>
                      <input
                        type="date"
                        disabled
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm opacity-70"
                        value={draft.payment_due_date || ''}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Payment received</label>
                      <input
                        type="date"
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.payment_received_date || ''}
                        onChange={event => setDraft(prev => ({ ...prev, payment_received_date: event.target.value }))}
                        onBlur={() =>
                          !isNew &&
                          selected &&
                          updateDeal(selected.id, { payment_received_date: draft.payment_received_date || null })
                        }
                      />
                    </div>
                  </div>

                  {paymentOverdue && (
                    <div className="flex items-center gap-2 rounded-lg border border-[var(--red)]/40 bg-[rgba(248,81,73,0.12)] px-3 py-2 text-sm text-[var(--red)]">
                      <AlertTriangle size={14} /> Payment is overdue — follow up with {draft.agency_contact || 'agency'}.
                    </div>
                  )}

                  {draft.deal_type === 'cpm' && (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm">
                        <span>CPM screenshot taken</span>
                        <input
                          type="checkbox"
                          checked={Boolean(draft.cpm_screenshot_taken)}
                          onChange={event => {
                            const value = event.target.checked ? 1 : 0;
                            setDraft(prev => ({ ...prev, cpm_screenshot_taken: value }));
                            if (!isNew && selected) updateDeal(selected.id, { cpm_screenshot_taken: value });
                          }}
                        />
                      </label>
                      <label className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm">
                        <span>CPM invoice generated</span>
                        <input
                          type="checkbox"
                          checked={Boolean(draft.cpm_invoice_generated)}
                          onChange={event => {
                            const value = event.target.checked ? 1 : 0;
                            setDraft(prev => ({ ...prev, cpm_invoice_generated: value }));
                            if (!isNew && selected) updateDeal(selected.id, { cpm_invoice_generated: value });
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-4">
              <button
                className="flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-muted)]"
                onClick={() => {
                  if (selected && confirm('Move to next stage?')) moveDeal(selected.id);
                }}
                disabled={!selected}
              >
                Move to Next Stage <ChevronRight size={14} />
              </button>
              <div className="flex items-center gap-2">
                {isNew ? (
                  <button className="btn" onClick={createDeal}>
                    Create Deal
                  </button>
                ) : (
                  <button
                    className="flex items-center gap-2 rounded-md border border-[var(--red)] px-3 py-2 text-sm text-[var(--red)]"
                    onClick={() => selected && deleteDeal(selected.id)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
