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

      const thumbHtml = v.thumbnail_path ? `<img class="card-thumb" src="/static/thumbnails/${esc(v.thumbnail_path)}" alt="" />` : '';

      card.innerHTML = `
        ${thumbHtml}
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

  function sponsorCardIndicator(s) {
    // Urgent: overdue payment or overdue next_action
    const now = new Date().toISOString().slice(0,10);
    if (s.payment_due_date && s.payment_due_date < now && s.status !== 'paid') return 'indicator-urgent';
    if (s.next_action_due && s.next_action_due < now) return 'indicator-urgent';
    // Stale: no contact in 7+ days
    if (s.last_contact_date) {
      const diff = (new Date() - new Date(s.last_contact_date)) / 86400000;
      if (diff > 7) return 'indicator-stale';
    }
    // Action needed: has next_action with upcoming due
    if (s.next_action && s.next_action_due) {
      const diff = (new Date(s.next_action_due) - new Date()) / 86400000;
      if (diff >= 0 && diff <= 3) return 'indicator-action';
    }
    return '';
  }

  function firstName(name) {
    if (!name) return '';
    return name.trim().split(/\s+/)[0];
  }

  function renderSponsors() {
    $$('.column-body[data-dropzone]', $('#sponsorBoard')).forEach(z => { z.innerHTML = ''; });
    const counts = {};
    sponsors.forEach(s => {
      counts[s.status] = (counts[s.status] || 0) + 1;
      const zone = $(`[data-dropzone="${s.status}"]`, $('#sponsorBoard'));
      if (!zone) return;
      const card = document.createElement('div');
      const indicator = sponsorCardIndicator(s);
      card.className = 'sponsor-card' + (indicator ? ' ' + indicator : '');
      card.draggable = true;
      card.dataset.id = String(s.id);

      // Deal value + type
      const dealStr = s.deal_value ? `$${Number(s.deal_value).toLocaleString()} <span class="deal-type-badge">${s.deal_type || 'flat_rate'}</span>` : '';

      // Contact first name
      const contact = firstName(s.contact_name);

      // Content phase badge
      const phaseBadge = (s.status === 'content' && s.content_phase) ? `<span class="content-phase-badge">${esc(s.content_phase)}</span>` : '';

      // Key dates
      let datesHtml = '';
      const dateFields = [
        { label: 'Script', val: s.script_due },
        { label: 'Approval', val: s.brand_approval_deadline },
        { label: 'Live', val: s.live_date },
        { label: 'Payment', val: s.payment_due_date },
      ];
      const activeDates = dateFields.filter(d => d.val);
      if (activeDates.length) {
        datesHtml = '<div class="sponsor-dates">' + activeDates.map(d => `<span class="date-chip"><b>${d.label}:</b> ${d.val}</span>`).join('') + '</div>';
      }

      // Next action
      const actionText = s.next_action ? (s.next_action.length > 80 ? s.next_action.slice(0,80) + '…' : s.next_action) : '';
      const actionHtml = s.next_action ? `<div class="sponsor-action"><i data-lucide="arrow-right-circle"></i> ${esc(actionText)}${s.next_action_due ? ` <span class="action-due">by ${s.next_action_due}</span>` : ''}</div>` : '';

      // Deliverables
      const deliv = s.deliverables ? `<div class="sponsor-deliverables">${esc(s.deliverables.length > 60 ? s.deliverables.slice(0,60) + '…' : s.deliverables)}</div>` : '';

      card.innerHTML = `
        <div class="sponsor-card-header">
          <div class="sponsor-brand">${esc(s.brand_name)}</div>
          ${contact ? `<span class="sponsor-contact">${esc(contact)}</span>` : ''}
        </div>
        ${dealStr ? `<div class="sponsor-value">${dealStr}</div>` : ''}
        ${phaseBadge}
        ${datesHtml}
        ${actionHtml}
        ${deliv}
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

/* ── OVERVIEW DASHBOARD PAGE ───────────────────── */
if ($('#statsGrid') && !$('#board') && !$('#sponsorBoard')) {
  const VIDEO_STAGES = ['idea','pre-production','filming','post-production','ready','published'];
  const SPONSOR_STAGES = ['inquiry','negotiation','contract','content','delivered','live','paid'];
  const STAGE_COLORS = { published: 'green', live: 'green', paid: 'yellow' };

  async function loadDashboard() {
    const [stats, deadlines] = await Promise.all([api('/api/stats'), api('/api/deadlines')]);

    $('#statTotalVideos').textContent = stats.total_videos;
    $('#statPublished').textContent = stats.published;
    $('#statActiveSponsors').textContent = stats.active_sponsors;
    $('#statPipelineValue').textContent = '$' + Number(stats.pipeline_value).toLocaleString();

    // Video pipeline bars
    const vMax = Math.max(1, ...VIDEO_STAGES.map(s => stats.video_stages[s] || 0));
    $('#videoPipelineBars').innerHTML = VIDEO_STAGES.map(s => {
      const c = stats.video_stages[s] || 0;
      const pct = (c / vMax * 100).toFixed(0);
      const cls = STAGE_COLORS[s] || '';
      return `<div class="pipeline-bar-row">
        <span class="pipeline-bar-label">${s.replace(/-/g,' ')}</span>
        <div class="pipeline-bar-track"><div class="pipeline-bar-fill ${cls}" style="width:${pct}%"></div></div>
        <span class="pipeline-bar-count">${c}</span>
      </div>`;
    }).join('');

    // Sponsor pipeline bars
    const sMax = Math.max(1, ...SPONSOR_STAGES.map(s => stats.sponsor_stages[s] || 0));
    $('#sponsorPipelineBars').innerHTML = SPONSOR_STAGES.map(s => {
      const c = stats.sponsor_stages[s] || 0;
      const pct = (c / sMax * 100).toFixed(0);
      const cls = STAGE_COLORS[s] || '';
      return `<div class="pipeline-bar-row">
        <span class="pipeline-bar-label">${s}</span>
        <div class="pipeline-bar-track"><div class="pipeline-bar-fill ${cls}" style="width:${pct}%"></div></div>
        <span class="pipeline-bar-count">${c}</span>
      </div>`;
    }).join('');

    // Deadlines
    if (deadlines.length) {
      $('#deadlinesSection').style.display = '';
      $('#deadlinesList').innerHTML = deadlines.map(d => {
        const items = [];
        if (d.script_due) items.push({ type: 'Script Due', date: d.script_due });
        if (d.record_date) items.push({ type: 'Record', date: d.record_date });
        if (d.brand_approval_deadline) items.push({ type: 'Approval', date: d.brand_approval_deadline });
        return items.map(i => `<div class="deadline-item">
          <span class="deadline-type">${i.type}</span>
          <span class="deadline-brand">${esc(d.brand_name)}</span>
          <span class="deadline-date">${i.date}</span>
        </div>`).join('');
      }).join('');
    }

    lucide.createIcons();
  }
  loadDashboard();
}

/* ── SPONSOR STATS HEADER ──────────────────────── */
if ($('#sponsorStats')) {
  api('/api/stats').then(s => {
    $('#sTotalDeals').textContent = s.total_sponsors;
    $('#sActiveDeals').textContent = s.active_sponsors;
    $('#sLiveDeals').textContent = s.live_deals;
    $('#sPaidDeals').textContent = s.paid_deals;
    $('#sPipelineValue').textContent = '$' + Number(s.pipeline_value).toLocaleString();
  });
}

/* ── Util ──────────────────────────────────────── */
function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
