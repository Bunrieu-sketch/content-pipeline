# Content Pipeline Workflow — How to Add New Episodes

## Step-by-Step Process

### Step 1: Initial Intake
**When:** Idea approved / Shoot location locked

**I need:**
- Working title (even if rough)
- Location / topic
- Shoot dates (if scheduled)
- Expected publish date (if known)
- Any sponsors attached

**I provide:**
- 3-5 title options based on your style
- Thumbnail concept research
- Competitor analysis (what's working in this niche)

### Step 2: Pre-Production
**When:** Research complete, script outline ready

**Dashboard updates:**
- Move to "pre-prod" stage
- Add script due date
- Link any sponsor deals
- Add brief/deliverables

**I provide:**
- Finalized title (locked)
- Thumbnail mockup options
- SEO description draft

### Step 3: Shooting
**When:** On location / filming begins

**Dashboard updates:**
- Move to "shooting" stage
- Add actual shoot dates
- Log any B-roll or interview notes

### Step 4: Post-Production
**When:** Editing begins

**Dashboard updates:**
- Move to "post-prod" stage
- Add estimated completion date
- Flag any sponsor approval deadlines

**I provide:**
- Thumbnail final design
- Title/thumbnail A/B test suggestions (if unsure)

### Step 5: Titles & Thumbnails
**When:** Edit locked, ready for upload

**Dashboard updates:**
- Move to "titles-thumbnails" stage
- Final YouTube title confirmed
- Thumbnail uploaded to Google Drive
- Sponsor integration verified

### Step 6: Published
**When:** Video goes live

**Dashboard updates:**
- Move to "published" stage
- Add actual publish date
- Add YouTube video ID
- Update sponsor status to "live"
- Calculate payment due date

**I do:**
- Sync to calendar
- Generate invoice (if sponsor deal)
- Monitor 30-day views (for CPM deals)

---

## Title Optimization

### Andrew's Title Formula

Based on your last 5 videos, your formula is:

**Pattern 1: The Shocking Statement**
```
[Strong Adjective] [Subject]: [Surprising Subtitle]
```
Examples:
- "Poisoning a Megacity: One Industry Is Slowly Killing 40 Million People"
- "Floating Crab Factories: Turning Trash Into Millions"

**Pattern 2: The Insider/Question**
```
Inside/How [Subject] ([Provocative Question])
```
Examples:
- "Inside China's Rat Meat Industry (How Is This Legal?)"
- "Hong Kong's Coffin Home Crisis (It's Getting Worse)"

**Pattern 3: The Banned/Illegal Hook**
```
[Country]'s [Banned Subject] [Action/Verb] ([Explanation])
```
Examples:
- "China's Giant BANNED Rats Are Making a Comeback (Here's how)"

### Title Tips for Maximum CTR

1. **Lead with the unexpected** — "Bangladesh Bus Racing" not "The Bus Culture of Bangladesh"
2. **Use parentheses** — Your signature style for subtitles/explanations
3. **Power words:** Insane, Crazy, Banned, Giant, Secret, Hidden, Illegal
4. **Numbers when shocking:** "40 Million People," "Millions"
5. **Question marks sparingly** — only when genuinely provocative

---

## Thumbnail Research Process

### Step 1: Competitor Analysis
Search YouTube for:
- Same topic/country
- Similar themes (extreme travel, food, industry)
- Channels in your niche (BEFRS, Fearless and Far, etc.)

**What to note:**
- Which thumbnails get highest views
- Color schemes that pop
- Text overlay styles
- Facial expressions (yours vs. subjects)

### Step 2: Concept Development

**Your style elements:**
- **You in the frame** — usually centered or rule-of-thirds
- **Shocked/surprised expression** — your signature
- **Subject visible** — the "wow" moment (food, danger, weirdness)
- **Text overlays** — minimal, bold, high contrast
- **Color grading** — cinematic, slightly desaturated

**Thumbnail checklists:**
- [ ] Readable at small size (mobile)
- [ ] Face visible (yours or subject's)
- [ ] One focal point (not cluttered)
- [ ] Contrasting colors
- [ ] Curiosity gap (makes them click)

### Step 3: Generate Options

I can help create mockups using:
- **Nano Banana Pro** (image generation)
- **Reference images** from your shoots
- **Competitor thumbnails** as inspiration

### Step 4: Testing

**If unsure between options:**
- Post both in Telegram
- Get feedback from your team
- Or: A/B test on YouTube (if you have the feature)

---

## Current Pipeline Status

### This Week (Feb 21)
**Bangladesh Bus Racing: The Insane Culture of Speed**
- Stage: Post-production
- Status: Mostly edited
- Publish: Saturday Feb 21
- Sponsor: None
- Thumbnail needed: You + racing bus + shocked face

### Next Week (Feb 28)
**From Poverty to Luxury: Inside the Global Human Hair Wig Industry**
- Stage: Post-production  
- Status: Needs editing
- Publish: Saturday Feb 28
- Sponsor: None
- Thumbnail needed: You + hair/wigs + transformation visual

### March Lineup
**Indonesia Vespa Punks: The Nomadic Biker Gangs of Java**
- Stage: Shooting
- Status: Partially shot
- Target: March 15

**Pasola: Indonesia's Ancient Ritual of Blood and Horses**
- Stage: Shooting
- Status: Partially shot  
- Target: March 22

**Inside Indonesia's Sperm Worm Festival (Nyale Ceremony)**
- Stage: Shooting
- Status: Partially shot
- Target: March 29

---

## Quick Commands

**Add new video:**
```bash
curl -X POST http://localhost:5050/api/videos \
  -H "Content-Type: application/json" \
  -d '{"title": "Video Title", "stage": "idea", "due_date": "2026-03-15"}'
```

**Sync calendar:**
```bash
python3 scripts/gcal_sync.py --all
```

**View pipeline:**
http://localhost:5050/videos