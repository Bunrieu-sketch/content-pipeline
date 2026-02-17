'use client';
import { useEffect, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';

interface Video { id: number; title: string; stage: string; notes: string; due_date: string | null; }
const STAGES = ['idea', 'pre-production', 'filming', 'post-production', 'ready', 'published'];

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
                <div key={v.id} className="kanban-card" draggable onDragStart={e => onDragStart(e, v.id)} onDragEnd={onDragEnd}>
                  <div className="card-title">{v.title}</div>
                  {v.due_date && <div className="card-meta">Due: {v.due_date}</div>}
                  <button className="btn btn-danger btn-sm" style={{ marginTop: 6 }} onClick={() => remove(v.id)}><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
