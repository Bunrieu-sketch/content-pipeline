'use client';
import { useEffect, useState, useCallback } from 'react';
import { Trash2, Plus, Mail, Calendar, FileText, DollarSign } from 'lucide-react';

interface Sponsor { 
  id: number; 
  brand_name: string; 
  status: string; 
  deal_value: number; 
  contact_email: string; 
  notes: string; 
  payment_due_date: string | null;
  content_phase: string | null;
  script_status: string | null;
  script_due: string | null;
  brand_approval_deadline: string | null;
  live_date: string | null;
  next_action: string | null;
  next_action_due: string | null;
  deal_type: string;
  payment_terms_days: number;
}

const STAGES = ['inquiry', 'negotiation', 'contract', 'content', 'delivered', 'live', 'paid'];
const CONTENT_PHASES = ['Waiting on Brief', 'Writing Script', 'Script Submitted', 'Script Approved', 'Scheduled', 'Recorded'];

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Sponsor | null>(null);
  const [form, setForm] = useState({ 
    brand_name: '', 
    deal_value: '', 
    contact_email: '', 
    notes: '',
    deal_type: 'flat_rate',
    payment_terms_days: '30',
    payment_due_date: '',
    content_phase: '',
    script_status: '',
    script_due: '',
    brand_approval_deadline: '',
    live_date: '',
    next_action: '',
    next_action_due: '',
  });

  const load = useCallback(() => { fetch('/api/sponsors').then(r => r.json()).then(setSponsors); }, []);
  useEffect(load, [load]);

  const add = async () => {
    if (!form.brand_name.trim()) return;
    await fetch('/api/sponsors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...form, 
        deal_value: Number(form.deal_value) || 0, 
        status: 'inquiry',
        payment_terms_days: Number(form.payment_terms_days) || 30,
      }),
    });
    resetForm();
    setShowModal(false); 
    load();
  };

  const update = async () => {
    if (!editing) return;
    await fetch(`/api/sponsors/${editing.id}`, {
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...form, 
        deal_value: Number(form.deal_value) || 0,
        payment_terms_days: Number(form.payment_terms_days) || 30,
      }),
    });
    resetForm();
    setEditing(null);
    load();
  };

  const resetForm = () => {
    setForm({ 
      brand_name: '', deal_value: '', contact_email: '', notes: '',
      deal_type: 'flat_rate', payment_terms_days: '30', payment_due_date: '',
      content_phase: '', script_status: '', script_due: '',
      brand_approval_deadline: '', live_date: '', next_action: '', next_action_due: '',
    });
  };

  const editSponsor = (s: Sponsor) => {
    setEditing(s);
    setForm({
      brand_name: s.brand_name,
      deal_value: String(s.deal_value),
      contact_email: s.contact_email || '',
      notes: s.notes || '',
      deal_type: s.deal_type || 'flat_rate',
      payment_terms_days: String(s.payment_terms_days || 30),
      payment_due_date: s.payment_due_date || '',
      content_phase: s.content_phase || '',
      script_status: s.script_status || '',
      script_due: s.script_due || '',
      brand_approval_deadline: s.brand_approval_deadline || '',
      live_date: s.live_date || '',
      next_action: s.next_action || '',
      next_action_due: s.next_action_due || '',
    });
    setShowModal(true);
  };

  const move = async (id: number, status: string) => {
    await fetch(`/api/sponsors/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    load();
  };

  const remove = async (id: number) => { 
    if (!confirm('Delete this sponsor?')) return;
    await fetch(`/api/sponsors/${id}`, { method: 'DELETE' }); 
    load(); 
  };

  const onDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('text/plain', String(id));
    (e.target as HTMLElement).classList.add('dragging');
  };
  const onDragEnd = (e: React.DragEvent) => (e.target as HTMLElement).classList.remove('dragging');
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); (e.currentTarget as HTMLElement).classList.add('drag-over'); };
  const onDragLeave = (e: React.DragEvent) => (e.currentTarget as HTMLElement).classList.remove('drag-over');
  const onDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    const id = Number(e.dataTransfer.getData('text/plain'));
    if (id) move(id, stage);
  };

  const isOverdue = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1>Sponsors</h1>
        <button className="btn" onClick={() => { resetForm(); setEditing(null); setShowModal(true); }}>
          <Plus size={14} /> Add Sponsor
        </button>
      </div>

      <div style={{ background: 'var(--card)', padding: 12, borderRadius: 8, marginBottom: 16, border: '1px solid var(--border)', fontSize: 13 }}>
        <strong style={{ color: 'var(--accent)' }}>Email Workflow:</strong> Check <code>montythehandler@gmail.com</code> for sponsor updates. 
        Forward sponsor emails there and update stages accordingly. 
        <a href="/crm-guide" style={{ color: 'var(--accent)', marginLeft: 8 }}>View full guide →</a>
      </div>

      <div className="kanban">
        {STAGES.map(stage => {
          const items = sponsors.filter(s => s.status === stage);
          return (
            <div key={stage} className="kanban-column" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={e => onDrop(e, stage)}>
              <h3 style={{ textTransform: 'capitalize' }}>{stage} <span className="count">{items.length}</span></h3>
              {items.map(s => (
                <div key={s.id} className="kanban-card" draggable onDragStart={e => onDragStart(e, s.id)} onDragEnd={onDragEnd} onClick={() => editSponsor(s)} style={{ cursor: 'pointer' }}>
                  <div className="card-title">{s.brand_name}</div>
                  
                  {s.deal_value > 0 && (
                    <div className="card-meta" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <DollarSign size={12} /> ${s.deal_value.toLocaleString()}
                      {s.deal_type === 'cpm' && <span style={{ fontSize: 10, opacity: 0.7 }}>(CPM)</span>}
                    </div>
                  )}
                  
                  {s.content_phase && (
                    <div className="card-meta" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FileText size={12} /> {s.content_phase}
                    </div>
                  )}
                  
                  {s.payment_due_date && (
                    <div className={isOverdue(s.payment_due_date) ? 'card-meta text-danger' : 'card-meta'} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} /> Payment: {new Date(s.payment_due_date).toLocaleDateString()}
                      {isOverdue(s.payment_due_date) && <span style={{ color: 'var(--red)', fontWeight: 600 }}> OVERDUE</span>}
                    </div>
                  )}
                  
                  {s.next_action && (
                    <div className="card-meta" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent)' }}>
                      <Mail size={12} /> {s.next_action}
                      {s.next_action_due && <span>— {new Date(s.next_action_due).toLocaleDateString()}</span>}
                    </div>
                  )}
                  
                  {s.notes && <div className="card-meta" style={{ marginTop: 2, opacity: 0.7 }}>{s.notes.slice(0, 60)}</div>}
                  
                  <button 
                    className="btn btn-danger btn-sm" 
                    style={{ marginTop: 6 }} 
                    onClick={e => { e.stopPropagation(); remove(s.id); }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflow: 'auto' }}>
            <h3>{editing ? 'Edit Sponsor' : 'New Sponsor'}</h3>
            
            <label>Brand Name *</label>
            <input value={form.brand_name} onChange={e => setForm({ ...form, brand_name: e.target.value })} />
            
            <label>Contact Email</label>
            <input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label>Deal Value ($)</label>
                <input type="number" value={form.deal_value} onChange={e => setForm({ ...form, deal_value: e.target.value })} />
              </div>
              <div>
                <label>Deal Type</label>
                <select value={form.deal_type} onChange={e => setForm({ ...form, deal_type: e.target.value })}>
                  <option value="flat_rate">Flat Rate</option>
                  <option value="cpm">CPM</option>
                </select>
              </div>
            </div>

            {form.deal_type === 'cpm' && (
              <div>
                <label>Payment Terms (days after live)</label>
                <input type="number" value={form.payment_terms_days} onChange={e => setForm({ ...form, payment_terms_days: e.target.value })} />
              </div>
            )}

            <label>Content Phase</label>
            <select value={form.content_phase} onChange={e => setForm({ ...form, content_phase: e.target.value })}>
              <option value="">— Select Phase —</option>
              {CONTENT_PHASES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <label>Script Status</label>
            <input value={form.script_status} onChange={e => setForm({ ...form, script_status: e.target.value })} placeholder="e.g., Draft v2, Awaiting Approval" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label>Script Due</label>
                <input type="date" value={form.script_due} onChange={e => setForm({ ...form, script_due: e.target.value })} />
              </div>
              <div>
                <label>Brand Approval Deadline</label>
                <input type="date" value={form.brand_approval_deadline} onChange={e => setForm({ ...form, brand_approval_deadline: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label>Live Date</label>
                <input type="date" value={form.live_date} onChange={e => setForm({ ...form, live_date: e.target.value })} />
              </div>
              <div>
                <label>Payment Due Date</label>
                <input type="date" value={form.payment_due_date} onChange={e => setForm({ ...form, payment_due_date: e.target.value })} />
              </div>
            </div>

            <label>Next Action</label>
            <input value={form.next_action} onChange={e => setForm({ ...form, next_action: e.target.value })} placeholder="e.g., Follow up on contract" />
            
            <label>Next Action Due</label>
            <input type="date" value={form.next_action_due} onChange={e => setForm({ ...form, next_action_due: e.target.value })} />

            <label>Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />

            <div className="modal-actions">
              <button className="btn" style={{ background: 'var(--border)' }} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn" onClick={editing ? update : add}>
                {editing ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
