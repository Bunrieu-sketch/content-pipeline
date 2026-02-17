'use client';
import { useEffect, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';

interface Video { id: number; title: string; stage: string; notes: string; due_date: string | null; thumbnail_path: string | null; youtube_video_id: string | null; view_count: number; outlier_score: number; }
const STAGES = ['idea', 'pre-production', 'filming', 'post-production', 'ready', 'published'];
const CHANNEL_AVG = 150000;

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
}

function outlierBadge(viewCount: number) {
  const mult = viewCount / CHANNEL_AVG;
  const label = `${mult.toFixed(1)}x`;
  let color = '#888'; let bg = 'rgba(128,128,128,0.12)'; let star = '';
  if (mult < 0.5) { color = '#e74c3c'; bg = 'rgba(231,76,60,0.12)'; }
  else if (mult <= 1.5) { color = '#888'; bg = 'rgba(128,128,128,0.12)'; }
  else if (mult <= 3) { color = '#27ae60'; bg = 'rgba(39,174,96,0.12)'; }
  else { color = '#d4a017'; bg = 'rgba(212,160,23,0.15)'; star = '⭐ '; }
  return (
    <span style={{ color, background: bg, borderRadius: 4, padding: '1px 5px', fontSize: 12, fontWeight: 600, marginLeft: 6 }}>
      {star}{label}
    </span>
  );
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [title, setTitle] = useState('');

  const load = useCallback(() => { fetch('/api/videos').then(r => r.json()).then(setVideos); }, []);
  useEffect(load, [load]);

  const add = async () => {
    if (!title.trim()) return;
    await fetch('/api/videos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, stage: 'idea' }) });
    setTitle(''); load();
  };

  const move = async (id: number, stage: string) => {
    await fetch(`/api/videos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage }) });
    load();
  };

  const remove = async (id: number) => {
    await fetch(`/api/videos/${id}`, { method: 'DELETE' }); load();
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

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Videos</h1>
      <div className="add-form">
        <input placeholder="Video title…" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <button onClick={add}>+ Add Video</button>
      </div>
      <div className="kanban">
        {STAGES.map(stage => {
          const items = videos.filter(v => v.stage === stage);
          return (
            <div key={stage} className="kanban-column" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={e => onDrop(e, stage)}>
              <h3>{stage.replace(/-/g, ' ')} <span className="count">{items.length}</span></h3>
              {items.map(v => (
                <div key={v.id} className="kanban-card relative group" draggable onDragStart={e => onDragStart(e, v.id)} onDragEnd={onDragEnd}
                  style={{ transition: 'box-shadow 0.15s, transform 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.transform = ''; }}
                >
                  {v.stage === 'published' && v.youtube_video_id ? (
                    <img src={`https://img.youtube.com/vi/${v.youtube_video_id}/mqdefault.jpg`} alt="" style={{ width: '100%', borderRadius: 4, marginBottom: 6 }} />
                  ) : v.thumbnail_path ? (
                    <img src={`/thumbnails/${v.thumbnail_path}`} alt="" style={{ width: '100%', borderRadius: 4, marginBottom: 6 }} />
                  ) : null}
                  {v.stage === 'published' && v.view_count > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4, fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{formatViews(v.view_count)} views</span>
                      {outlierBadge(v.view_count)}
                    </div>
                  )}
                  <div className="card-title" style={{ fontWeight: 600 }}>{v.title}</div>
                  {v.due_date && (
                    <div className="card-meta" style={{ marginTop: 4 }}>
                      <span style={{ background: 'var(--border)', borderRadius: 4, padding: '2px 6px', fontSize: 13, fontWeight: 500 }}>
                        Publish goal: {v.due_date}
                      </span>
                    </div>
                  )}
                  <button
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity"
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                    onClick={() => remove(v.id)}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
