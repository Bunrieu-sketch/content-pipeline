/* ── Helpers ───────────────────────────────────── */
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];

function toast(msg, isError = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = 'toast', 2500);
}

async function api(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

/* ── Drag & Drop (generic) ─────────────────────── */
function initDragDrop(cardSelector, dropzoneSelector, onDrop) {
  document.addEventListener('dragstart', e => {
    const card = e.target.closest(cardSelector);
    if (!card) return;
    card.classList.add('dragging');
    e.dataTransfer.setData('text/plain', card.dataset.id || card.dataset.title);
    e.dataTransfer.effectAllowed = 'move';
  });
  document.addEventListener('dragend', e => {
    const card = e.target.closest(cardSelector);
    if (card) card.classList.remove('dragging');
    $$(dropzoneSelector).forEach(z => z.classList.remove('drag-over'));
  });
  document.addEventListener('dragover', e => {
    const zone = e.target.closest(dropzoneSelector);
    if (!zone) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    zone.classList.add('drag-over');
  });
  document.addEventListener('dragleave', e => {
    const zone = e.target.closest(dropzoneSelector);
    if (zone) zone.classList.remove('drag-over');
  });
  document.addEventListener('drop', e => {
    const zone = e.target.closest(dropzoneSelector);
    if (!zone) return;
    e.preventDefault();
    zone.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/plain');
    const stage = zone.dataset.dropzone;
    onDrop(id, stage);
  });
}

/* ── VIDEO PIPELINE PAGE ───────────────────────── */
if ($('#board') && !$('#sponsorBoard')) {
  let videos = [];

  async function loadVideos() {
    videos = await api('/api/videos');
    renderVideos();
  }

  function renderVideos() {
    $$('.column-body[data-dropzone]', $('#board')).forEach(zone => { zone.innerHTML = ''; });
    const counts = {};
    videos.forEach(v => {
      counts[v.stage] = (counts[v.stage] || 0) + 1;
      const zone = $(`[data-dropzone="${v.stage}"]`, $('#board'));
      if (!zone) return;
      const card = document.createElement('div');
      card.className = 'card';
      card.draggable = true;
      card.dataset.title = v.title;
      card.dataset.id = v.id;

      let meta = '';
      if (v.views) meta += `<span><i data-lucide="eye"></i> ${Number(v.views).toLocaleString()}</span>`;
      if (v.publish_date) meta += `<span><i data-lucide="calendar"></i> ${v.publish_date}</span>`;
      if (v.youtube_video_id) meta += `<span><i data-lucide="youtube"></i></span>`;

      card.innerHTML = `
        <div class="card-title">${esc(v.title)}</div>
        ${meta ? `<div class="card-meta">${meta}</div>` : ''}
        <div class="card-actions">
          <button class="card-action-btn delete-btn" title="Delete"><i data-lucide="trash-2"></i></button>
        </div>
      `;
      zone.appendChild(card);
    });
    $$('[data-count]', $('#board')).forEach(el => {
      el.textContent = counts[el.dataset.count] || 0;
    });
    lucide.createIcons();
  }

  initDragDrop('.card', '#board [data-dropzone]', async (title, stage) => {
    try {
      await api(`/api/videos/${encodeURIComponent(title)}`, { method: 'PUT', body: { stage } });
      const v = videos.find(x => x.title === title);
      if (v) v.stage = stage;
      renderVideos();
    } catch (e) { toast(e.message, true); }
  });

  document.addEventListener('click', async e => {
    const btn = e.target.closest('.delete-btn');
    if (!btn) return;
    const card = btn.closest('.card');
    const title = card.dataset.title;
    try {
      await api(`/api/videos/${encodeURIComponent(title)}`, { method: 'DELETE' });
      videos = videos.filter(v => v.title !== title);
      renderVideos();
      toast('Video deleted');
    } catch (e) { toast(e.message, true); }
  });

  loadVideos();
}

/* ── SPONSOR CRM PAGE ──────────────────────────── */
if ($('#sponsorBoard')) {
  let sponsors = [];
  const modal = $('#sponsorModal');
  const form = $('#sponsorForm');

  async function loadSponsors() {
    sponsors = await api('/api/sponsors');
    renderSponsors();
  }

  function paymentStatus(dueDateStr) {
    if (!dueDateStr) return '';
    const due = new Date(dueDateStr);
    const now = new Date();
    const diff = (due - now) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 'payment-overdue';
    if (diff < 7) return 'payment-due-soon';
    return '';
  }

  function renderSponsors() {
    $$('.column-body[data-dropzone]', $('#sponsorBoard')).forEach(z => { z.innerHTML = ''; });
    const counts = {};
    sponsors.forEach(s => {
      counts[s.status] = (counts[s.status] || 0) + 1;
      const zone = $(`[data-dropzone="${s.status}"]`, $('#sponsorBoard'));
      if (!zone) return;
      const card = document.createElement('div');
      card.className = 'sponsor-card';
      card.draggable = true;
      card.dataset.id = String(s.id);

      const pStatus = paymentStatus(s.payment_due_date);
      let metaHtml = '';
      if (s.contact_email) metaHtml += `<div class="sponsor-meta-row"><i data-lucide="mail"></i> ${esc(s.contact_email)}</div>`;
      if (s.payment_due_date) metaHtml += `<div class="sponsor-meta-row ${pStatus}"><i data-lucide="clock"></i> Due: ${s.payment_due_date}</div>`;

      card.innerHTML = `
        <div class="sponsor-brand">${esc(s.brand_name)}</div>
        ${s.deal_value ? `<div class="sponsor-value">$${Number(s.deal_value).toLocaleString()}</div>` : ''}
        ${metaHtml ? `<div class="sponsor-meta">${metaHtml}</div>` : ''}
      `;
      card.addEventListener('click', () => openSponsorModal(s));
      zone.appendChild(card);
    });
    $$('[data-count]', $('#sponsorBoard')).forEach(el => {
      el.textContent = counts[el.dataset.count] || 0;
    });
    lucide.createIcons();
  }

  function openSponsorModal(s = null) {
    form.reset();
    if (s) {
      $('#sponsorModalTitle').textContent = 'Edit Sponsor Deal';
      form.elements.id.value = s.id;
      form.elements.brand_name.value = s.brand_name || '';
      form.elements.contact_email.value = s.contact_email || '';
      form.elements.deal_value.value = s.deal_value || '';
      form.elements.status.value = s.status || 'inquiry';
      form.elements.payment_due_date.value = s.payment_due_date || '';
      form.elements.notes.value = s.notes || '';
    } else {
      $('#sponsorModalTitle').textContent = 'New Sponsor Deal';
      form.elements.id.value = '';
    }
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() { modal.setAttribute('aria-hidden', 'true'); }

  $('#addSponsorBtn').addEventListener('click', () => openSponsorModal());
  $('#closeSponsorModal').addEventListener('click', closeModal);
  $('#cancelSponsorModal').addEventListener('click', closeModal);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const body = Object.fromEntries(fd);
    const id = body.id;
    delete body.id;
    try {
      if (id) {
        await api(`/api/sponsors/${id}`, { method: 'PUT', body });
      } else {
        await api('/api/sponsors', { method: 'POST', body });
      }
      closeModal();
      await loadSponsors();
      toast(id ? 'Sponsor updated' : 'Sponsor added');
    } catch (e) { toast(e.message, true); }
  });

  initDragDrop('.sponsor-card', '#sponsorBoard [data-dropzone]', async (id, stage) => {
    try {
      await api(`/api/sponsors/${id}`, { method: 'PUT', body: { status: stage } });
      const s = sponsors.find(x => String(x.id) === id);
      if (s) s.status = stage;
      renderSponsors();
    } catch (e) { toast(e.message, true); }
  });

  loadSponsors();
}

/* ── YouTube Sync Button ───────────────────────── */
const syncBtn = $('#syncYouTube');
if (syncBtn) {
  syncBtn.addEventListener('click', async () => {
    syncBtn.classList.add('syncing');
    try {
      const data = await api('/api/videos/sync', { method: 'POST' });
      toast(`Synced ${data.imported || 0} new videos`);
      // Reload if on video page
      if ($('#board') && !$('#sponsorBoard')) location.reload();
    } catch (e) {
      toast(e.message, true);
    } finally {
      syncBtn.classList.remove('syncing');
    }
  });
}

/* ── Util ──────────────────────────────────────── */
function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
