export default function CrmGuidePage() {
  return (
    <div className="guide">
      <h1>YouTube Dashboard Guide</h1>
      <p>Manage your video pipeline and sponsor deals in one place.</p>

      <h2>📧 Email Workflow</h2>
      <p>
        All sponsor communications should be forwarded to: <code>montythehandler@gmail.com</code>
      </p>
      <p>
        Check this inbox regularly for:
      </p>
      <ul>
        <li><strong>New sponsor inquiries</strong> — Create new deals in the inquiry stage</li>
        <li><strong>Contract updates</strong> — Move deals from negotiation → contract</li>
        <li><strong>Content briefs</strong> — Update content phase when received</li>
        <li><strong>Script approvals</strong> — Mark script as approved</li>
        <li><strong>Live confirmations</strong> — Move to live stage and set payment due date</li>
        <li><strong>Payment notifications</strong> — Mark as paid when invoice settled</li>
      </ul>

      <h3>Email Check Schedule</h3>
      <ul>
        <li><strong>Morning (7am):</strong> Full check + update dashboard</li>
        <li><strong>Midday (~1pm):</strong> Quick check for urgent items</li>
        <li><strong>Evening (~6pm):</strong> Final check + prep for tomorrow</li>
        <li><strong>Weekly (Monday 9am):</strong> Payment due review</li>
      </ul>

      <h2>🎬 Video Stages</h2>
      <table>
        <thead><tr><th>Stage</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>idea</code></td><td>Video concept or topic brainstormed</td></tr>
          <tr><td><code>pre-production</code></td><td>Script writing, research, planning</td></tr>
          <tr><td><code>filming</code></td><td>Currently being recorded</td></tr>
          <tr><td><code>post-production</code></td><td>Editing, graphics, sound design</td></tr>
          <tr><td><code>ready</code></td><td>Complete and scheduled for upload</td></tr>
          <tr><td><code>published</code></td><td>Live on YouTube</td></tr>
        </tbody>
      </table>

      <h2>🤝 Sponsor Stages</h2>
      <table>
        <thead><tr><th>Stage</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>inquiry</code></td><td>Initial contact or inbound lead</td></tr>
          <tr><td><code>negotiation</code></td><td>Discussing terms, rates, deliverables</td></tr>
          <tr><td><code>contract</code></td><td>Agreement signed, awaiting content phase</td></tr>
          <tr><td><code>content</code></td><td>Creating sponsored content (script, filming)</td></tr>
          <tr><td><code>delivered</code></td><td>Content sent for brand approval</td></tr>
          <tr><td><code>live</code></td><td>Sponsored video is published</td></tr>
          <tr><td><code>paid</code></td><td>Payment received, deal complete</td></tr>
        </tbody>
      </table>

      <h2>📝 Content Sub-Phases</h2>
      <p>When a sponsor is in the <strong>content</strong> stage, track detailed progress:</p>
      <table>
        <thead><tr><th>Phase</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td>Waiting on Brief</td><td>Awaiting brand's content guidelines</td></tr>
          <tr><td>Writing Script</td><td>Drafting the sponsored segment</td></tr>
          <tr><td>Script Submitted</td><td>Sent to brand for review</td></tr>
          <tr><td>Script Approved</td><td>Brand has signed off</td></tr>
          <tr><td>Scheduled</td><td>Integration planned for specific video</td></tr>
          <tr><td>Recorded</td><td>Content filmed and in editing</td></tr>
        </tbody>
      </table>

      <h2>💰 Payment Tracking</h2>
      <p>For <strong>flat rate</strong> deals: Set payment due date when deal moves to <code>live</code>.</p>
      <p>For <strong>CPM</strong> deals: Wait 30 days after live date, record views, calculate final amount.</p>
      
      <h3>Payment Due Date Rules</h3>
      <ul>
        <li>Net 30 is standard (30 days after live date)</li>
        <li>Mark red/overdue when past due date</li>
        <li>Weekly payment check every Monday</li>
      </ul>

      <h2>🎯 Using the Kanban Boards</h2>
      <ul>
        <li><strong>Drag and drop</strong> cards between columns to update stage</li>
        <li><strong>Click any card</strong> to edit full details</li>
        <li><strong>Trash icon</strong> deletes an item (with confirmation)</li>
        <li><strong>+ Add Sponsor/Video</strong> creates new items</li>
      </ul>

      <h2>📊 API Endpoints</h2>
      <h3>Videos</h3>
      <ul>
        <li><code>GET /api/videos</code> — List all videos</li>
        <li><code>POST /api/videos</code> — Create video (body: title, stage)</li>
        <li><code>PUT /api/videos/:id</code> — Update video (body: stage, title, notes)</li>
        <li><code>DELETE /api/videos/:id</code> — Delete video</li>
      </ul>

      <h3>Sponsors</h3>
      <ul>
        <li><code>GET /api/sponsors</code> — List all sponsors</li>
        <li><code>POST /api/sponsors</code> — Create sponsor (body: brand_name, deal_value, etc.)</li>
        <li><code>PUT /api/sponsors/:id</code> — Update sponsor fields</li>
        <li><code>DELETE /api/sponsors/:id</code> — Delete sponsor</li>
      </ul>

      <h3>Stats</h3>
      <ul>
        <li><code>GET /api/stats</code> — Dashboard statistics</li>
      </ul>

      <h2>🔗 Quick Links</h2>
      <ul>
        <li><a href="http://localhost:5050/videos">Videos Pipeline</a></li>
        <li><a href="http://localhost:5050/sponsors">Sponsor CRM</a></li>
        <li><a href="http://localhost:5053">Mission Control</a></li>
      </ul>
    </div>
  );
}
