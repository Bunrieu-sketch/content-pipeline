'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  X,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Trash2,
  Film,
  Play,
  Edit3,
  CheckSquare,
} from 'lucide-react';

const WEEK_COLORS = [
  '#58a6ff', // Week 1 - Blue
  '#a371f7', // Week 2 - Purple
  '#d29922', // Week 3 - Yellow
  '#f0883e', // Week 4 - Orange
  '#3fb950', // Week 5 - Green
];

const STATUS_COLORS: Record<string, string> = {
  planning: '#8b949e',
  week1: '#58a6ff',
  week2: '#a371f7',
  week3: '#d29922',
  week4: '#f0883e',
  week5: '#3fb950',
  shooting: '#f85149',
  editing: '#d29922',
  published: '#56d364',
};

type Series = {
  id: number;
  title: string;
  location: string;
  country: string | null;
  status: string;
  pre_pro_week: number;
  week1_complete: number;
  week2_complete: number;
  week3_complete: number;
  week3_complete_1: number;
  week4_complete: number;
  week5_complete: number;
  fixer_name: string | null;
  fixer_contact: string | null;
  fixer_rate_day: number | null;
  shoot_start: string | null;
  shoot_end: string | null;
  target_publish: string | null;
  budget_total: number;
  target_cost_per_episode: number;
  actual_cost: number;
  notes: string | null;
  episode_count: number;
  published_count: number;
};

type Episode = {
  id: number;
  series_id: number;
  episode_number: number;
  title: string;
  hook: string | null;
  thumbnail_concept: string | null;
  episode_type: 'cornerstone' | 'secondary';
  status: string;
  target_publish: string | null;
  actual_publish: string | null;
  sponsor_name: string | null;
};

type PreProTask = {
  id: number;
  series_id: number;
  week_number: number;
  task_name: string;
  completed: number;
  completed_at: string | null;
};

const emptySeries = (): Partial<Series> => ({
  title: '',
  location: '',
  country: '',
  status: 'planning',
  pre_pro_week: 1,
  budget_total: 0,
  target_cost_per_episode: 1000,
});

const toDate = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value: string | null | undefined) => {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const diffDays = (value: string | null | undefined) => {
  const date = toDate(value);
  if (!date) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const delta = Math.round((date.getTime() - start.getTime()) / 86400000);
  return delta;
};

export default function ProductionCalendarPage() {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [tasks, setTasks] = useState<PreProTask[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'episodes' | 'prepro'>('overview');
  const [draft, setDraft] = useState<Partial<Series>>(emptySeries());
  const [isNew, setIsNew] = useState(false);

  const load = useCallback(() => {
    fetch('/api/series')
      .then(res => res.json())
      .then(data => setSeriesList(data));
  }, []);

  const loadSeriesDetails = useCallback((id: number) => {
    Promise.all([
      fetch(`/api/series/${id}`).then(res => res.json()),
    ]).then(([seriesData]) => {
      setEpisodes(seriesData.episodes || []);
      setTasks(seriesData.tasks || []);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (selectedSeries) {
      setDraft(selectedSeries);
      loadSeriesDetails(selectedSeries.id);
    }
  }, [selectedSeries, loadSeriesDetails]);

  const openNewSeries = () => {
    setIsNew(true);
    setSelectedSeries(null);
    setDraft(emptySeries());
    setPanelOpen(true);
    setActiveTab('overview');
  };

  const openSeries = (series: Series) => {
    setIsNew(false);
    setSelectedSeries(series);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setSelectedSeries(null);
    setIsNew(false);
  };

  const createSeries = async () => {
    if (!draft.title || !draft.location) return;
    const res = await fetch('/api/series', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!res.ok) return;
    const created = await res.json();
    setSeriesList(prev => [...prev, created]);
    setSelectedSeries(created);
    setIsNew(false);
  };

  const updateSeries = async (id: number, updates: Partial<Series>) => {
    const res = await fetch(`/api/series/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setSeriesList(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    setSelectedSeries(prev => (prev && prev.id === updated.id ? updated : prev));
    setDraft(prev => ({ ...prev, ...updated }));
  };

  const deleteSeries = async (id: number) => {
    if (!confirm('Delete this series?')) return;
    await fetch(`/api/series/${id}`, { method: 'DELETE' });
    setSeriesList(prev => prev.filter(s => s.id !== id));
    closePanel();
  };

  const addEpisode = async () => {
    if (!selectedSeries) return;
    const title = prompt('Episode title:');
    if (!title) return;
    const res = await fetch(`/api/series/${selectedSeries.id}/episodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        episode_number: episodes.length + 1,
      }),
    });
    if (!res.ok) return;
    const created = await res.json();
    setEpisodes(prev => [...prev, created]);
  };

  const toggleTask = async (taskId: number, completed: boolean) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: completed ? 1 : 0 }),
    });
    if (!res.ok) return;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: completed ? 1 : 0 } : t));
  };

  const stats = useMemo(() => {
    const active = seriesList.filter(s => s.status !== 'published');
    const shootingSoon = seriesList.filter(s => {
      const days = diffDays(s.shoot_start);
      return days !== null && days >= 0 && days <= 14;
    });
    const publishingSoon = seriesList.filter(s => {
      const days = diffDays(s.target_publish);
      return days !== null && days >= 0 && days <= 7;
    });
    return {
      activeSeries: active.length,
      shootingSoon: shootingSoon.length,
      publishingSoon: publishingSoon.length,
      totalEpisodes: seriesList.reduce((sum, s) => sum + (s.episode_count || 0), 0),
    };
  }, [seriesList]);

  const getWeekProgress = (series: Series) => {
    const weeks = [series.week1_complete, series.week2_complete, series.week3_complete, series.week4_complete, series.week5_complete];
    const completed = weeks.filter(Boolean).length;
    return { completed, total: 5, currentWeek: series.pre_pro_week };
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">Production Calendar</h1>
          <span className="text-xs text-[var(--text-muted)] border border-[var(--border)] rounded-full px-2.5 py-0.5">5-Week Pipeline</span>
        </div>
        <button className="btn flex items-center gap-1.5 text-xs" onClick={openNewSeries}>
          <Plus size={14} /> New Series
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(163,113,247,0.15)' }}>
            <Film size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="value">{stats.activeSeries}</div>
          <div className="label">Active Series</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(88,166,255,0.15)' }}>
            <Play size={16} style={{ color: 'var(--blue)' }} />
          </div>
          <div className="value">{stats.totalEpisodes}</div>
          <div className="label">Total Episodes</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(248,81,73,0.15)' }}>
            <AlertTriangle size={16} style={{ color: 'var(--red)' }} />
          </div>
          <div className="value" style={{ color: 'var(--red)' }}>{stats.shootingSoon}</div>
          <div className="label">Shooting in 14d</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(63,185,80,0.15)' }}>
            <CheckCircle2 size={16} style={{ color: 'var(--green)' }} />
          </div>
          <div className="value" style={{ color: 'var(--green)' }}>{stats.publishingSoon}</div>
          <div className="label">Publishing in 7d</div>
        </div>
      </div>

      {/* Timeline View */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Calendar size={16} /> Series Timeline
        </h3>
        <div className="space-y-3">
          {seriesList.length === 0 && (
            <div className="text-center py-8 text-[var(--text-muted)] text-sm">
              No series yet. Create your first production series.
            </div>
          )}
          {seriesList.map(series => {
            const progress = getWeekProgress(series);
            const daysToShoot = diffDays(series.shoot_start);
            return (
              <div
                key={series.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 cursor-pointer hover:border-[var(--accent)] transition-colors"
                onClick={() => openSeries(series)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: STATUS_COLORS[series.status] || '#8b949e' }}
                      />
                      <span className="font-semibold">{series.title}</span>
                      <span className="text-xs text-[var(--text-muted)]">• {series.location}</span>
                      {series.episode_count > 0 && (
                        <span className="text-xs bg-[var(--border)] px-2 py-0.5 rounded">
                          {series.episode_count} episodes
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> Shoot: {formatDate(series.shoot_start)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Play size={12} /> Publish: {formatDate(series.target_publish)}
                      </span>
                      {series.fixer_name && (
                        <span className="flex items-center gap-1">
                          <Users size={12} /> Fixer: {series.fixer_name}
                        </span>
                      )}
                      {daysToShoot !== null && daysToShoot >= 0 && daysToShoot <= 14 && (
                        <span style={{ color: 'var(--red)' }}>
                          {daysToShoot === 0 ? 'Shooting today!' : `Shooting in ${daysToShoot}d`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(week => {
                      const isComplete = week <= progress.completed;
                      const isCurrent = week === series.pre_pro_week;
                      return (
                        <div
                          key={week}
                          className="w-8 h-6 rounded text-[10px] flex items-center justify-center font-medium"
                          style={{
                            background: isComplete ? WEEK_COLORS[week - 1] : isCurrent ? `${WEEK_COLORS[week - 1]}40` : 'var(--border)',
                            color: isComplete ? '#000' : isCurrent ? WEEK_COLORS[week - 1] : 'var(--text-muted)',
                          }}
                          title={`Week ${week}`}
                        >
                          W{week}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Series Detail Panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70" onClick={closePanel} />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: 800,
              maxHeight: '85vh',
              overflowY: 'auto',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--card)',
              padding: 24,
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase text-[var(--text-muted)]">Series Details</div>
                <h2 className="text-xl font-semibold">{isNew ? 'New Series' : draft.title}</h2>
              </div>
              <button className="text-[var(--text-muted)] hover:text-[var(--text)]" onClick={closePanel}>
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 flex gap-2 border-b border-[var(--border)] pb-3">
              {['overview', 'episodes', 'prepro'].map(tab => (
                <button
                  key={tab}
                  className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-wide whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-[var(--accent)] text-white'
                      : 'border border-[var(--border)] text-[var(--text-muted)]'
                  }`}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                >
                  {tab === 'prepro' ? 'Pre-Production' : tab}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-4">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Series Title</label>
                      <input
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.title || ''}
                        onChange={e => setDraft(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Bangladesh Series 2"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Location</label>
                      <input
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.location || ''}
                        onChange={e => setDraft(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="e.g., Dhaka, Bangladesh"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Shoot Start</label>
                      <input
                        type="date"
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.shoot_start || ''}
                        onChange={e => {
                          setDraft(prev => ({ ...prev, shoot_start: e.target.value }));
                          if (!isNew && selectedSeries) updateSeries(selectedSeries.id, { shoot_start: e.target.value });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Shoot End</label>
                      <input
                        type="date"
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.shoot_end || ''}
                        onChange={e => {
                          setDraft(prev => ({ ...prev, shoot_end: e.target.value }));
                          if (!isNew && selectedSeries) updateSeries(selectedSeries.id, { shoot_end: e.target.value });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Target Publish</label>
                      <input
                        type="date"
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.target_publish || ''}
                        onChange={e => {
                          setDraft(prev => ({ ...prev, target_publish: e.target.value }));
                          if (!isNew && selectedSeries) updateSeries(selectedSeries.id, { target_publish: e.target.value });
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Fixer Name</label>
                      <input
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.fixer_name || ''}
                        onChange={e => {
                          setDraft(prev => ({ ...prev, fixer_name: e.target.value }));
                          if (!isNew && selectedSeries) updateSeries(selectedSeries.id, { fixer_name: e.target.value });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Fixer Rate ($/day)</label>
                      <input
                        type="number"
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.fixer_rate_day || ''}
                        onChange={e => {
                          setDraft(prev => ({ ...prev, fixer_rate_day: Number(e.target.value) }));
                          if (!isNew && selectedSeries) updateSeries(selectedSeries.id, { fixer_rate_day: Number(e.target.value) });
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Budget Total</label>
                      <input
                        type="number"
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.budget_total || 0}
                        onChange={e => {
                          setDraft(prev => ({ ...prev, budget_total: Number(e.target.value) }));
                          if (!isNew && selectedSeries) updateSeries(selectedSeries.id, { budget_total: Number(e.target.value) });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-muted)]">Target Cost/Episode</label>
                      <input
                        type="number"
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        value={draft.target_cost_per_episode || 1000}
                        onChange={e => {
                          setDraft(prev => ({ ...prev, target_cost_per_episode: Number(e.target.value) }));
                          if (!isNew && selectedSeries) updateSeries(selectedSeries.id, { target_cost_per_episode: Number(e.target.value) });
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[var(--text-muted)]">Notes</label>
                    <textarea
                      className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                      value={draft.notes || ''}
                      onChange={e => {
                        setDraft(prev => ({ ...prev, notes: e.target.value }));
                        if (!isNew && selectedSeries) updateSeries(selectedSeries.id, { notes: e.target.value });
                      }}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'episodes' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase text-[var(--text-muted)]">Episodes</span>
                    <button className="btn text-xs flex items-center gap-1" onClick={addEpisode} disabled={isNew}>
                      <Plus size={12} /> Add Episode
                    </button>
                  </div>
                  {episodes.length === 0 && (
                    <div className="text-center py-6 text-[var(--text-muted)] text-sm border border-dashed border-[var(--border)] rounded-lg">
                      No episodes yet. Add your first episode.
                    </div>
                  )}
                  <div className="space-y-2">
                    {episodes.map((ep, idx) => (
                      <div key={ep.id} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                        <span className="text-xs text-[var(--text-muted)] w-6">{ep.episode_number}</span>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{ep.title}</div>
                          {ep.hook && <div className="text-xs text-[var(--text-muted)]">{ep.hook}</div>}
                        </div>
                        <span
                          className="text-[10px] uppercase px-2 py-0.5 rounded"
                          style={{
                            background: ep.episode_type === 'cornerstone' ? 'rgba(163,113,247,0.2)' : 'rgba(88,166,255,0.2)',
                            color: ep.episode_type === 'cornerstone' ? 'var(--accent)' : 'var(--blue)',
                          }}
                        >
                          {ep.episode_type}
                        </span>
                        {ep.sponsor_name && (
                          <span className="text-xs text-[var(--green)]">${ep.sponsor_name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'prepro' && (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(week => {
                    const weekTasks = tasks.filter(t => t.week_number === week);
                    const completedCount = weekTasks.filter(t => t.completed).length;
                    const isCurrentWeek = draft.pre_pro_week === week;
                    return (
                      <div
                        key={week}
                        className={`rounded-lg border p-3 ${isCurrentWeek ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: WEEK_COLORS[week - 1] }}
                            />
                            <span className="font-semibold text-sm">Week {week}</span>
                            {isCurrentWeek && <span className="text-xs text-[var(--accent)]">(Current)</span>}
                          </div>
                          <span className="text-xs text-[var(--text-muted)]">
                            {completedCount}/{weekTasks.length} complete
                          </span>
                        </div>
                        <div className="space-y-1">
                          {weekTasks.map(task => (
                            <label key={task.id} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(task.completed)}
                                onChange={e => toggleTask(task.id, e.target.checked)}
                                className="rounded"
                              />
                              <span className={task.completed ? 'line-through opacity-50' : ''}>
                                {task.task_name}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-4">
              {isNew ? (
                <button className="btn" onClick={createSeries}>
                  Create Series
                </button>
              ) : (
                <>
                  <button
                    className="flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-muted)]"
                    onClick={() => selectedSeries && updateSeries(selectedSeries.id, { pre_pro_week: Math.min(5, (draft.pre_pro_week || 1) + 1) })}
                  >
                    Advance Week <ChevronRight size={14} />
                  </button>
                  <button
                    className="flex items-center gap-2 rounded-md border border-[var(--red)] px-3 py-2 text-sm text-[var(--red)]"
                    onClick={() => selectedSeries && deleteSeries(selectedSeries.id)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
