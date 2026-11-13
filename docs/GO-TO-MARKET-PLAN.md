# GetConfident: from launched website to real business

*Prepared 7 November 2026 from an audit of the live site (getconfident.com.ng) and its codebase.*

**Planning assumptions:** ₦1,550 = US$1 (check before budgeting), solo founder, about 15–25 hours a
week, starting budget under ₦150,000 for the first 90 days. Costs marked "≈" are estimates; confirm
current prices. No part of this plan guarantees users or revenue. It's designed to find out quickly
what works and double down on it.

---

## 0. Honest summary

**You have more product than most startups at launch.** The core loop works end to end:
random topic → timer → speak → real transcription → AI coaching report → progress. It's tested
(about 200 unit tests, about 80 browser tests) and secure (hand-built authentication, rate limits, data
export and deletion).

**What you don't have yet is a business system.** There are no payments, no analytics (you can't
see who visits or where they drop off), no error monitoring and no pricing page. Nobody outside
this project has used it at scale. The biggest risks are not technical:

1. **Nobody comes.** Distribution is the hard part. That's why sections 3–5 matter more than new features.
2. **People try it once and leave.** Speaking practice is uncomfortable, and most users will do
   one session. Retention (section 7) decides whether this is a business.
3. **Free alternatives exist.** Google's Interview Warmup is free, and Yoodli has a free tier. You
   win on *local relevance*, *low-data voice practice* and *naira pricing*, not on "AI".
4. **Nigerian willingness to pay for self-improvement software is real but small per person.**
   Plan for many small payments and a few institutional deals, not big individual subscriptions.

---

## 1. Product readiness

### 1.1 Audit: what exists (verified in the code and on the live site)

| Area | Status | Notes |
| --- | --- | --- |
| Sign-up / sign-in / password reset | ✅ | Email and password only. **No Google sign-in, no email verification** |
| Onboarding | ✅ | Asks for the user's goal, preferred length and interests |
| Practice | ✅ | **12 modes** (Impromptu, Interview, Presentation, Storytelling, Debate, Elevator Pitch, Sales Pitch, Networking, Meeting Simulation, Daily Challenge, …), 3 difficulties, 30 s–10 min, camera or voice only |
| Live coach | ✅ | Pace and filler cues while speaking. Uses the browser's speech recognition, so it works best in Chrome; Safari/iOS support is limited |
| AI report | ✅ | Score /100, strengths, improvements, metrics, highlighted fillers, structure, grammar, delivery, homework, 16-dimension analysis. Verified with real speech: 78/100 with specific, sensible feedback |
| Follow-up questions | ✅ | Interviewer mode reads questions aloud |
| Progress, history, streaks, achievements | ✅ | 9 achievements (First Practice, 7-Day Streak, 30-Day Streak, 100 Speeches, No Filler Words, Perfect Score, Confident Speaker, Interview Master, Presentation Expert) |
| Notifications and email | ✅ partly | Weekly summary (on by default), achievement emails (on), **practice reminders off by default** (opt-in) |
| Shareable result image | ✅ | Scores only; never the recording |
| Installable app (PWA) | ✅ | "Add to Home screen" |
| Privacy, terms, data export, account deletion | ✅ | **No contact email is configured in production**, so the privacy page shows no way to reach you |
| Daily limit | ✅ | 15 sessions a day per user (protects AI costs) |
| **Payments** | ❌ | Nothing; you can't charge yet |
| **Analytics** | ❌ | You can't see visitors, funnels or drop-off |
| **Error monitoring** | ❌ | If something breaks for users, you won't know |
| **Admin / metrics dashboard** | ❌ | No way to see signups and usage except by querying the database |
| **Pricing page** | ❌ | |

### 1.2 Barriers to adoption (what will stop real Nigerian users)

1. **Data cost and weak networks.** Video uploads are heavy. The camera was **on by default** in
   my test session. On mobile data, default to voice only and make video an opt-in.
2. **Sign-up friction.** No "Continue with Google". Many users will bounce at a password form.
3. **The first session is a cold start.** Speaking alone to a screen is awkward. Users need a
   30-second, low-stakes first rep, ideally *before* sign-up.
4. **Accent fairness.** Whisper handles Nigerian English reasonably, but test with 10–20 real
   Nigerian speakers (different regions, Pidgin-influenced speech) before claiming it works for
   everyone. Watch for unfair penalties on accent rather than clarity.
5. **Trust.** It's a new brand asking for microphone access. Show a privacy line next to the record
   button ("Your recording is private. Delete it anytime.") and a real contact.
6. **Local relevance.** Current topics are general. The highest-intent Nigerian moments are
   **graduate trainee and bank interviews, NYSC and job interviews, final-year project defence,
   visa interviews (UK, US, Canada) and church or community speaking**. These topic packs don't
   exist yet.

### 1.3 Fix before public launch (essential, 1–2 weeks)

| # | Fix | Why | Effort |
| --- | --- | --- | --- |
| 1 | **Redeploy production** so getconfident.com.ng becomes the canonical address (the setting is already saved; it needs one redeploy) | Links, emails and previews use the right domain | 2 min |
| 2 | **Set `NEXT_PUBLIC_CONTACT_EMAIL`** (for example hello@getconfident.com.ng) and create that mailbox | Legal (NDPA) and trust | 1 hour |
| 3 | **Domain email with SPF, DKIM and DMARC** (Zoho Mail free tier or Whogohost email) and send app emails from it | Password-reset and reminder emails otherwise land in spam | Half a day |
| 4 | **Analytics:** PostHog (free tier) or Vercel Web Analytics, plus key product events (sign-up, first session done, report viewed, day-2 return) | You can't improve what you can't see | 1 day |
| 5 | **Error monitoring:** Sentry free tier | Know when users hit errors | 2 hours |
| 6 | **Voice-only by default on mobile** | Data cost, upload failures | 1 hour |
| 7 | **Recording retention:** auto-delete raw recordings after, say, 30 days (keep transcripts and scores) | Storage costs grow forever otherwise; better privacy | Half a day |
| 8 | **Test on real devices:** a ₦60k–₦100k Android phone on 3G/4G, an iPhone in Safari, and a laptop | Most of your users are on mid-range Android | 1 day |
| 9 | **Check provider limits:** Groq plan and rate limits, Neon storage, Vercel Blob usage. Set spending alerts | A launch spike on free-tier limits looks like "the app is broken" | 2 hours |
| 10 | **Vercel plan:** the Hobby plan is for non-commercial use. **Move to Pro (≈ $20/mo ≈ ₦31,000) before you charge money** | Terms compliance | 10 min |
| 11 | The landing page's illustrated progress card shows "−48% fillers" and "+7 this week". Label it **"Example"** | Avoid reading as a performance claim | 15 min |

### 1.4 Next (weeks 3–8)

- **Continue with Google** sign-in (the biggest friction reducer).
- **Try one question before signing up:** a 30-second demo on the homepage (a topic and a timer, then "Sign up to see your feedback").
- **Nigerian topic packs:** Graduate Trainee and Bank Interviews, Project Defence, Visa Interview, NYSC and First Job, Church and Community Speaking, Pitching to Investors.
- **Practice reminders default:** ask during onboarding ("Want a daily nudge at 7pm?"). Opt-in rates are far higher than in buried settings.
- **WhatsApp channel** for reminders (start manually with a WhatsApp Channel or broadcast list; automate later).
- **Payments and plans** (section 6).
- **Referral:** "Invite a friend, both get 7 days Pro."
- **Simple admin page:** daily signups, activations, sessions, paying users.

### 1.5 Can wait (month 3+)

Email verification (add if fake sign-ups appear), leaderboards, team and institution dashboards
(do it manually first), native mobile apps, more languages, human coach marketplace.

---

## 2. Brand and positioning

**The problem:** *People know what they want to say, but freeze, ramble or fill the silence with "um"
when it matters: interviews, defences, presentations, meetings. There's nowhere private, affordable
and available at 11pm to practise out loud and get honest feedback.*

**Strongest audiences, ranked by urgency × reachability × willingness to pay**
1. **Final-year students and fresh graduates** facing project defence, NYSC and graduate trainee
   interviews. Huge, reachable on campus, deadline-driven.
2. **Job seekers** (0–5 years' experience), interview-driven and willing to pay for a better chance.
3. **People preparing for visa interviews:** very high urgency. *Needs a topic pack first.*
4. **Young professionals** presenting at work, sales staff, founders pitching.
5. **Institutions** (career centres, bootcamps, HR teams) buying for groups. That's the bigger revenue.

**Positioning statement**
> For Nigerian students and young professionals who freeze when it matters, **GetConfident** is the AI
> speaking coach you can practise with anytime, out loud, in private. Unlike tips videos or costly
> coaching, it gives you a real question, a timer and instant, specific feedback on what to fix,
> built for the interviews, defences and presentations you actually face, at a naira price.

**Why GetConfident over alternatives (be honest about each)**

| Alternative | Their strength | Your angle |
| --- | --- | --- |
| Google Interview Warmup | Free, Google brand | Broader than interviews (12 modes), timed impromptu practice, filler and pace metrics, progress and streaks, local scenarios |
| Yoodli, Poised, Orai | Polished, global | Naira pricing, local scenarios, voice-only low-data mode, no install |
| Toastmasters | Real humans, community | Available anytime, private, no stage fright before you're ready (and Toastmasters members are a great *audience*) |
| Paid coaches | Personal | ₦2,000/month instead of ₦20,000+/session |
| Practising alone | Free | You can't hear your own "ums" |

**Messaging pillars**
1. **Practice, not talent:** "Your mind didn't go blank. It just never practised."
2. **Real moments:** interview, defence, presentation, visa.
3. **Honest, specific feedback:** "See exactly what to fix."
4. **Private and affordable:** practise alone at 11pm, in naira, on your phone.

**Voice:** warm, direct, a little playful, never shaming. Nigerian English is welcome. Avoid
hype words ("revolutionary", "AI-powered" as the lead).

---

## 3. Getting the first 100 users

**Realistic expectation:** 100 *sign-ups* in 4–6 weeks is achievable with daily outreach.
100 *active* users (practised at least twice) is harder; expect 30–50% of sign-ups to complete a first
session and 15–25% to return within a week. You'll likely need 250–400 sign-ups to have 100 people
who genuinely used it.

### 3.1 Where they are and how to approach them

| Channel | Who | Approach | Weekly target |
| --- | --- | --- | --- |
| **Your own network** (WhatsApp contacts, status, family groups) | Friends, ex-classmates | Personal message plus WhatsApp Status with the ad | 30–50 messages in week 1 |
| **Final-year class reps and departmental WhatsApp groups** (UNILAG, UI, OAU, UNN, UNIBEN, ABU, Covenant, LASU, FUTA …) | Final-year students | Ask the class rep to share; offer a free "Defence Prep" session | 5 class reps a week |
| **Campus associations:** debate societies, Enactus, JCI campus chapters, AIESEC, Rotaract, student press, fellowships | Ambitious students | Offer a "30-second challenge" at their meeting; free Pro for members | 2 associations a week |
| **Toastmasters Nigeria clubs** | Motivated speakers | Offer it as a between-meetings practice tool | 3 clubs a week |
| **LinkedIn** (graduate trainees, career coaches, HR, recruiters) | Job seekers and influencers | Build-in-public posts plus DMs to career coaches | 3 posts and 20 DMs a week |
| **X (Twitter) NG** | Job-seeker and tech community | Threads ("I built an AI that counts your ums"), reply to interview-advice threads | Daily |
| **Facebook groups** (job vacancy groups, NYSC groups, graduate trainee prep groups) | Job seekers | Give value first (an interview tips post), link second; follow group rules | 3 posts a week |
| **Jobberman, MyJobMag and Nairaland career threads** | Job seekers | Helpful answers with a link | 2 a week |
| **Bootcamps and communities** (ALX, AltSchool, Utiva, tech communities) | Career-switchers preparing for interviews | Community managers: free access for a cohort | 2 a week |

### 3.2 Scripts

**WhatsApp (personal network)**
> Hey [Name]! 👋 I just launched something I built: **GetConfident**, an app that gives you a random
> interview or presentation question, times you, and an AI tells you exactly what to fix (it even
> counts your "ums" 😅).
> Could you try one 2-minute session and tell me honestly what you think? It's free:
> getconfident.com.ng
> Your feedback would really help me 🙏

**Class rep or group admin**
> Good evening [Name], I'm Ebenezer, a [your background]. I built **GetConfident**, a free tool that
> helps students practise for project defence and interviews out loud, with instant AI feedback on
> clarity, structure and filler words.
> Could you share it with your class? I'd also love to run a free 20-minute "Defence Prep" session on
> Google Meet for your class, with practice questions and live feedback.
> Here's a 30-second video of how it works: [ad link]. Thank you!

**Toastmasters / debate club**
> Hello [Name], I'm a fan of what [Club] does for speakers. I built GetConfident, an AI practice
> partner for Table Topics-style impromptu speaking: random topic, timer, instant feedback on pace,
> fillers and structure. I'd like to offer your members free Pro access for 3 months in exchange for
> honest feedback. Could I demo it for 5 minutes at your next meeting?

**LinkedIn DM to a career coach or HR person**
> Hi [Name], I enjoy your posts on interview prep. I built GetConfident (getconfident.com.ng) so
> candidates can rehearse answers out loud and get instant feedback, filler words and structure
> included. Would you try it and tell me if it's useful for the people you coach? Happy to give your
> community free access.

**Feedback conversation** (do 10 of these in month 1; ask about behaviour, not opinions)
1. When was the last time you had to speak somewhere important? What happened?
2. How did you prepare? What did that cost you?
3. *(After they try it)* What did you expect the feedback to say? Was anything wrong or unfair?
4. What would make you come back tomorrow?
5. If this disappeared, what would you use instead?
6. Have you ever paid for anything to prepare for interviews or exams? How much?

### 3.3 Campaign ideas (cheap)

- **#30SecondChallenge:** "Tell me about yourself. 30 seconds. Post your filler count." Use the ad's
  hook and share-card images. Give the lowest filler count of the week free Pro and a shout-out.
- **"Defence Prep Week"** (exam season): free live Google Meet sessions with final-year students.
- **Campus ambassadors** (from week 5): 5 students, each paid ₦5,000 in airtime or data per 20
  *activated* users (not just sign-ups).
- **Founder story posts:** "I built this because I froze in my own interview…" (only if it's true).

---

## 4. Marketing and content

### 4.1 Platform roles

| Platform | Role | Format | Frequency |
| --- | --- | --- | --- |
| **TikTok** | Discovery | 15–35 s vertical: challenges, "rate my answer", interview-question-of-the-day | 1 a day (minimum 4 a week) |
| **Instagram Reels** | Discovery and credibility | Same videos, plus carousels of tips | 4 a week |
| **Facebook** | Older job seekers, groups | Reels plus group posts | 3 a week |
| **LinkedIn** | Professionals, partners, institutions | Founder posts, lessons, demos | 3 a week |
| **YouTube Shorts** | Search over time | The same vertical videos | 4 a week |
| **WhatsApp Status and Channel** | Your warmest audience | Daily question and tips | Daily |

Make one video and post it to all five. Batch 5 videos in one 2-hour session each week (CapCut and your phone).

### 4.2 Turning one ad into many campaigns ("You're On" as a franchise)

1. **The challenge:** "Tell me about yourself. 30 seconds." Viewers stitch or duet with their attempt.
2. **Question of the Day:** the same REC-light format with a new real topic from the app every day.
3. **Filler counter reactions:** record yourself, a friend or volunteers (with permission) answering
   a question, show the real GetConfident report, then try again.
4. **Nigerian scenarios series:** "Project defence edition", "Bank GTP interview edition", "Visa
   interview edition" (once the packs exist).
5. **Before and after:** a volunteer's first session vs. their tenth (real reports, with consent; no
   invented results).
6. **Founder build-in-public:** how the AI scores you, what users struggle with, weekly numbers.

### 4.3 30-day content plan

| Day | Content | Platform focus |
| --- | --- | --- |
| 1 | Post the "You're On" ad (33 s) | All |
| 2 | "What does 'Tell me about yourself' really want?" 3 tips | TikTok, Reels |
| 3 | Founder post: why I built GetConfident | LinkedIn, X |
| 4 | #30SecondChallenge launch: you attempt it on camera and show your real report | All |
| 5 | Carousel: 5 filler words and what to say instead | IG, LinkedIn |
| 6 | Screen recording: 60-second walkthrough of a full session | YouTube Shorts, TikTok |
| 7 | Week-1 recap: what users said (anonymised) | LinkedIn |
| 8 | Question of the Day #1 (REC format) | TikTok, Reels |
| 9 | "Project defence: the 3 questions every panel asks" | TikTok, FB groups |
| 10 | Volunteer reaction: first-ever AI feedback (with consent) | All |
| 11 | Question of the Day #2 | TikTok, Reels |
| 12 | Tip: the STAR method in 30 seconds, then a demo in the app | All |
| 13 | Challenge winners shout-out | All |
| 14 | LinkedIn: "100 people practised. Here's what I learned." (only if true; otherwise use real numbers) | LinkedIn |
| 15 | The 20 s cut of the ad, with a different caption | TikTok, Reels |
| 16 | "Pace check": what 130–160 words per minute sounds like | TikTok |
| 17 | Question of the Day #3 | TikTok, Reels |
| 18 | Mythbuster: "Confident people aren't born that way" | IG carousel |
| 19 | Bank and graduate trainee interview edition | All |
| 20 | Live session (IG Live or a Twitter Space): practise with viewers | IG, X |
| 21 | Week-3 recap with real numbers | LinkedIn |
| 22 | Question of the Day #4 | TikTok, Reels |
| 23 | "How the AI scores you" (transparency builds trust) | YouTube Shorts, LinkedIn |
| 24 | Duet or stitch a popular interview-advice video with a practical demo | TikTok |
| 25 | Volunteer before and after (real reports) | All |
| 26 | Question of the Day #5 | TikTok, Reels |
| 27 | "Speak in a meeting without rambling": 3-step formula | LinkedIn, Reels |
| 28 | Challenge round 2 | All |
| 29 | User story (with permission) | All |
| 30 | Month recap, what's next, first paid plan announcement (if ready) | All |

### 4.4 Organic before paid

Spend **₦0 on ads until** you have analytics running, at least 20% of sign-ups completing a first
session, and some users returning in week 2. Then test **₦2,000–₦5,000 a day for 7 days** on the
20 s cut (Meta and TikTok), targeting Nigeria, ages 20–30, with an interest in jobs, careers or graduate
programmes. Judge by **cost per activated user** (completed a first session), not clicks. Stop
anything above about ₦500 per activated user until the product converts better.

---

## 5. Partnerships and distribution

| Partner type | Examples | What they get | Ask |
| --- | --- | --- | --- |
| University career services / SIWES and student affairs | UNILAG Career Services, UI, OAU, Covenant, Pan-Atlantic, private universities first (faster decisions) | Measurable employability support; usage report | Free 30-day pilot for one faculty, then paid seats |
| Departments (final-year coordinators) | Any department with project defence | Defence readiness | Pilot with one final-year class |
| Bootcamps and training academies | ALX, AltSchool, Utiva, Decagon, local tech hubs | Interview readiness for graduates (their placement rate is their KPI) | Bundle seats into the programme |
| Recruitment and HR firms | Graduate trainee recruiters, HR consultancies | Better-prepared candidates; a screening practice tool | Co-branded "Interview Ready" programme |
| Corporate L&D | Banks and firms with GTP intakes, sales teams | Onboarding and presentation practice | Pilot for one intake |
| Youth and leadership orgs | JCI Nigeria, Rotaract, Enactus, AIESEC, church youth programmes, NYSC CDS groups | Member benefit | Group access |
| Speaking communities | Toastmasters clubs, debate leagues | Between-meeting practice | Free Pro for feedback and a case study |

**Pricing for groups** (test): **₦1,000–₦1,500 per user per month, minimum 30 seats**, or
**₦25,000–₦50,000 per cohort term**. Start with a **free 30-day pilot** and a written success
measure.

**What you must be able to deliver:** a weekly usage report (sessions, average score trend, filler
trend per cohort). There's no admin dashboard yet, so produce it manually from the database
(I can write the query) until three or more partners need it.

**One-page proposal template**
> **GetConfident × [Organisation]: Interview and Presentation Readiness Pilot**
> **Problem:** your [students/graduates/staff] are skilled but struggle to communicate under pressure
> in interviews, defences and presentations.
> **Solution:** GetConfident, an AI speaking coach. Each participant practises real questions out
> loud and gets instant feedback on clarity, structure, confidence and filler words, with progress tracked.
> **Pilot:** 30 days, up to [50] participants, free. Kick-off session (30 min, online or on site) plus a
> weekly practice challenge.
> **You receive:** weekly usage and improvement report; a closing session; a certificate of participation.
> **Success measure:** at least 60% of participants complete 3+ sessions; average score and filler-rate
> trend reported.
> **After the pilot:** ₦[x] per participant per month or ₦[y] per cohort.
> **Contact:** Ebenezer Ojeba · hello@getconfident.com.ng · getconfident.com.ng

---

## 6. Monetisation

### 6.1 Unit economics (from the current setup; verify against your provider bills)
- AI cost per practice session (Groq Whisper and the LLM) is very low, **roughly ₦5–₦15 per
  session**; follow-up questions add a little.
- Bigger costs are **fixed**: Vercel Pro (≈ ₦31k/mo), database (Neon free → ≈ $19/mo when you
  outgrow it), video storage (grows with recordings unless you add retention), email.
- So **a generous free tier is affordable**. Use it to win users and charge for depth, volume and
  outcomes.

### 6.2 Plans (starting hypothesis; test it, don't assume it)

| | **Free** | **Pro** | **Interview Sprint** | **Teams / Institutions** |
| --- | --- | --- | --- | --- |
| Price (NG) | ₦0 | **₦2,500/month** or ₦20,000/year | **₦1,500 for 7 days** (one-off) | ₦1,000–₦1,500/seat/month |
| Price (intl.) | $0 | $6/month or $48/year | $4 / 7 days | Custom |
| Sessions | 3 a day | Up to 15 a day (current cap) | Up to 15 a day | Per seat |
| AI report | Score, top 3 strengths and fixes, fillers | **Full 16-dimension analysis**, homework | Full | Full |
| Follow-up interview questions | 1 per session | Unlimited | Unlimited | Unlimited |
| Progress history | Last 7 days | Full history and trends | 7 days | Full and cohort report |
| Recordings | Deleted after 7 days | Kept 90 days | Kept 7 days | Policy per contract |
| Topic packs (Defence, Bank GTP, Visa) | Sample questions | All packs | Pick one pack | All |

Why the **Interview Sprint**: many Nigerian users pay for an *event* (an interview next week), not a
habit. A cheap one-off pass matches how people buy data bundles. **Student price:** ₦1,500/month
with a school email or an ambassador code.

### 6.3 Payments
- **Paystack** (recommended): cards, bank transfer, USSD; subscriptions via Plans; good naira
  experience. Local fee ≈ 1.5% + ₦100 (₦100 waived under ₦2,500), capped at ₦2,000. International
  cards cost more (≈ 3.9% + ₦100). Check current rates. Full activation requires business
  registration (section 8).
- **Flutterwave:** an alternative, useful for multi-currency across Africa.
- International users: Paystack accepts international cards. Add Stripe or Lemon Squeezy only
  if non-African revenue becomes meaningful.

### 6.4 Pricing experiments (in this order)
1. **Fake-door test** (weeks 5–6): add "Go Pro" buttons and a pricing page. Clicking opens a
   "Join the founding members list" form showing the price. Measure click-through by price shown
   (₦1,500 / ₦2,500 / ₦4,000, rotated by week). Costs nothing to build and tells you which price
   people respond to.
2. **Founding member offer** (week 7): first 50 people get Pro for ₦15,000 a year (or ₦1,500 a month,
   locked for life) via a Paystack payment link, before you build full billing. Manually upgrade them.
   This proves people will pay before you spend weeks building billing.
3. **Interview Sprint test** (week 9): a one-off ₦1,500 pass, promoted in job and NYSC groups.
4. **Institutional pilot conversion** (weeks 10–12): first paid cohort.

**Targets you can trust:** 2–5% of active users paying is normal for consumer subscription apps.
With 300 active users that's 6–15 payers, about ₦15k–₦40k a month. That's real but small, and why
institutions matter.

---

## 7. User retention

### 7.1 The activation moment
**A user is "activated" when they complete their first session and read their report.** Everything
before that should take under 2 minutes.
- Homepage: "Try one question now" (30-second demo; sign up to see feedback).
- Onboarding: choose a goal → **start the first session immediately** (default 1 min, voice only,
  easy topic tied to their goal).
- After the first report, ask: "Want a reminder tomorrow at [time]?" (WhatsApp or email). Turn the
  reminder on with their consent instead of leaving it off by default.

### 7.2 Habit loops (most already exist; use them deliberately)
- **Streaks and achievements:** exist. Add a weekly challenge ("This week: elevator pitch").
- **Daily Challenge mode:** exists. Make it the default "one tap" action on the dashboard and in reminders.
- **Weekly summary email:** exists (on by default). Make sure it lands in the inbox (section 1.3, item 3).
- **Goal deadlines:** "My interview is on [date]" → a countdown plan of 5 sessions. *To build.*
- **Share card:** exists. Prompt sharing after personal bests.
- **WhatsApp:** a broadcast with a daily question at 7pm (manual first).

### 7.3 Are users improving? (measure value, not just usage)
Track per user, over their first 5 sessions:
- overall score trend
- fillers per minute trend (the most objective metric)
- pace within 130–160 wpm
- self-reported confidence: one question after sessions 1 and 5, "How confident do you feel? 1–5"

Report the cohort median, not the best user. If fillers per minute don't fall for most users by
session 5, the feedback isn't actionable enough. Fix the coaching before spending on marketing.

---

## 8. Business and operations (Nigeria)

| Item | What to do | Cost (≈, verify) |
| --- | --- | --- |
| **Business registration (CAC)** | Register a Business Name now (fast, cheap); incorporate as a Ltd when you raise money or sign larger contracts | Business name ≈ ₦10k–₦25k; Ltd ≈ ₦30k–₦80k+ via an agent |
| **Tax** | Get a TIN; open a business bank account; keep monthly records. Nigeria's tax rules changed with the 2025 tax reform. Small businesses below the thresholds have reduced obligations, but **get a short consultation with an accountant** | Accountant consultation ≈ ₦20k–₦50k |
| **Data protection (NDPA 2023)** | You process voice recordings and personal data. Publish a clear privacy policy with a contact (needs item 1.3 #2); collect consent; honour deletion (exists). Check whether you must **register with the NDPC** as a data controller "of major importance" (it depends on how many people's data you process) and whether an annual compliance audit filing applies | NDPC registration fees depend on tier; check ndpc.gov.ng |
| **Terms and refunds** | Add a refund policy before taking payments (Paystack requires one) | ₦0 (template) |
| **Customer support** | WhatsApp Business number plus hello@ email; reply within 24 hours; keep an FAQ | ₦0 |
| **Bookkeeping** | Spreadsheet or Wave/Zoho Books (free tiers) | ₦0 |

**Monthly operating costs (lean)**

| Tool | Cost |
| --- | --- |
| Vercel Pro (required to charge) | ≈ ₦31,000 |
| Domain (annual ₦7,200) | ≈ ₦600/month |
| Neon database | ₦0 now; ≈ ₦30,000/month when outgrown |
| AI (Groq) | Usage-based; likely under ₦10,000 at early scale; set alerts |
| Vercel Blob storage | Small with retention; grows without it |
| Email (Zoho Mail free / SMTP) | ₦0–₦5,000 |
| PostHog, Sentry | ₦0 (free tiers) |
| ElevenLabs (ads only) | ≈ ₦35,000/month while producing ads; cancel between campaigns |
| Canva, CapCut | ₦0 |
| **Total (lean)** | **≈ ₦35,000–₦50,000/month** before ads |

**Do it yourself:** product decisions, user interviews, first 100 users, partnerships, content
on-camera (your face builds trust). **Outsource later:** video editing (once you post daily), bookkeeping,
legal docs review, campus ambassadors, paid ads management (only after organic works).

**Security and privacy responsibilities:** keep secrets out of code (✅ done); rotate any key you've
pasted anywhere public; restrict who has database access; back up the database (Neon has point-in-time
restore; confirm it's on); keep dependencies updated; never use real users' recordings in marketing
without written consent.

---

## 9. Performance measurement

### 9.1 The funnel to track

| Stage | Metric | How to measure |
| --- | --- | --- |
| Visit | Unique visitors, by source (UTM) | PostHog or Vercel Analytics |
| Sign-up | Visitor → sign-up % | Event `signed_up` |
| Activation | Sign-up → first completed session within 24h | Event `session_completed` (first) |
| Habit | Users with 2+ sessions in their first 7 days | Database query |
| Retention | Week-1 and week-4 retention (did they practise again?) | PostHog retention chart |
| North star | **Weekly practising users (WPU):** people who completed at least one session this week | Database query |
| Value | Median fillers per minute, session 1 vs. session 5 | Database query |
| Revenue | Paying users, MRR, conversion from active to paid | Paystack dashboard |

**Tools:** PostHog (free) for funnels and retention, Google Search Console for search, Paystack for
revenue, Neon SQL for the rest. Review every **Monday morning** in one spreadsheet.

### 9.2 Targets (realistic, not promises)

| | Day 30 | Day 60 | Day 90 |
| --- | --- | --- | --- |
| Sign-ups (total) | 100–150 | 300–400 | 600–900 |
| Activation (first session) | ≥ 40% | ≥ 50% | ≥ 55% |
| Weekly practising users | 25–40 | 60–100 | 100–180 |
| Week-1 retention | ≥ 15% | ≥ 20% | ≥ 25% |
| User interviews done | 10 | 20 | 30 |
| Paying users | 0 (test interest) | 5–15 (founding members) | 15–40 |
| Institutional pilots | 1 in conversation | 1–2 running | 1 paid |

If you hit sign-ups but miss activation, fix onboarding. If you hit activation but miss retention,
fix the coaching value and reminders. Don't add channels until the funnel holds water.

---

## 10. 90-day roadmap

Each week lists: **what to do · why · how · tools · expected outcome · cost · how you'll know it worked**.

### Month 1: Ready, then first users (weeks 1–4)

**Week 1: Launch-ready**
- Redeploy on the new domain; set the contact email; set up domain email with SPF/DKIM; voice-only
  default on mobile; label the landing illustration "Example".
  · *Why:* trust and deliverability · *How:* Vercel dashboard, Zoho Mail, small code changes (I can do
  them) · *Cost:* ₦0 · *Worked if:* a password-reset email lands in a Gmail inbox, not spam.
- Install PostHog and Sentry; define the 5 events.
  · *Why:* you can't steer blind · *Cost:* ₦0 · *Worked if:* you can see today's visitors and sign-ups.
- Test on a cheap Android phone on mobile data and on an iPhone. Fix anything that breaks.
  · *Worked if:* a full session works on both, under 2 minutes from landing to report.
- Register the business name with CAC (start the process).
  · *Cost:* ≈ ₦10k–₦25k · *Worked if:* application submitted.

**Week 2: First 30 users from your network**
- Send 50 personal WhatsApp messages (script 3.2); post the ad on Status and all platforms.
- Do 5 feedback conversations (script 3.2).
  · *Tools:* WhatsApp, Google Meet, a notes doc · *Cost:* ₦0
  · *Worked if:* 30+ sign-ups, 15+ completed first sessions, 5 interviews with written notes.

**Week 3: Fix what users told you, then campuses**
- Fix the top 3 friction points from interviews.
- Contact 5 class reps and 2 campus associations; run 1 free online "Defence Prep" session.
- Start the content plan (day 1–7 posts).
  · *Cost:* ≈ ₦5,000 (data and airtime) · *Worked if:* 60+ total sign-ups; activation ≥ 40%.

**Week 4: Challenge and Google sign-in**
- Launch #30SecondChallenge. Add "Continue with Google" and "Try one question before sign-up"
  (I can build these).
  · *Worked if:* 100+ sign-ups total; sign-up conversion rises after Google sign-in.

### Month 2: Retention and willingness to pay (weeks 5–8)

**Week 5: Local topic packs and reminders**
- Add Project Defence, Bank and Graduate Trainee Interview, and Visa Interview packs (30–50 real
  questions each). Ask for reminder consent after the first report. Start a WhatsApp Channel with a
  daily 7pm question.
  · *Worked if:* week-1 retention ≥ 20%.
- Recruit 3–5 campus ambassadors (paid per *activated* user).
  · *Cost:* ≈ ₦5,000 per 20 activated users · *Worked if:* each brings 10+ activated users in 2 weeks.

**Week 6: Pricing fake-door**
- Add a pricing page and "Go Pro" buttons (fake door), rotating the shown price weekly.
  · *Worked if:* ≥ 5% of active users click "Go Pro". Note which price gets the most sign-ups to the list.

**Week 7: First money**
- Move Vercel to Pro. Activate Paystack (business name registered). Offer **Founding Member** via a
  Paystack payment link and upgrade buyers manually.
  · *Cost:* ≈ ₦31,000/month (Vercel) · *Worked if:* 5+ people pay. **This is the most important signal in the plan.**

**Week 8: Partnerships**
- Send the pilot proposal to 10 organisations (career centres, bootcamps, Toastmasters, an HR firm).
  Book 3 meetings.
  · *Worked if:* 1 pilot agreed.

### Month 3: Scale what works (weeks 9–12)

**Week 9: Interview Sprint and the first paid ads test**
- Launch the ₦1,500 7-day Interview Sprint. If activation is at least 40% and retention at least 20%,
  run ₦3,000/day for 7 days on the 20 s ad.
  · *Cost:* ≈ ₦21,000 · *Worked if:* cost per activated user is under ₦500.

**Week 10: Build billing properly** (only if weeks 7–9 showed people pay)
- Paystack subscriptions, plan limits in the app, and a billing page (I can build this).
  · *Worked if:* payment to Pro access with no manual step.

**Week 11: Pilot delivery**
- Run the institutional pilot: kick-off session, weekly challenge, manual report.
  · *Worked if:* at least 60% of participants complete 3+ sessions.

**Week 12: Review and decide**
- Compare the day-90 targets. Pick the **one** acquisition channel with the best cost per activated
  user and put 70% of your time there. Write a 1-page case study from the pilot.
  · *Worked if:* you can state your best channel, your price and your retention honestly.

**Week 13: Next quarter plan**
- Decide: institutions-first (B2B) or consumer-first (B2C), based on where the money came from.

---

## What to do tomorrow

1. **Redeploy** on Vercel (Deployments → latest → ⋯ → Redeploy). Open getconfident.com.ng and do one full session yourself on your phone, on mobile data.
2. **Create hello@getconfident.com.ng** (Zoho Mail free) and tell me the address. I'll set it as the contact email and fix the email sending setup.
3. **Send 20 WhatsApp messages** using the script in 3.2, and post the ad to your Status and TikTok.
4. **Book 3 feedback calls** for this week.

## This week

- Analytics and error monitoring live (I can install both).
- Voice-only default on mobile, the "Example" label, the contact email, domain email. All small; I can do them in one sitting.
- 30 sign-ups from your network, 5 user conversations, CAC business name started.

---

# THE FIRST 10 THINGS I MUST DO TO MAKE GETCONFIDENT A REAL BUSINESS

1. **Redeploy on getconfident.com.ng and use the product daily yourself.** You are user zero.
2. **Fix trust basics:** a real contact email, domain email that lands in inboxes, a privacy
   contact, and the landing illustration labelled as an example.
3. **Install analytics and error monitoring** so every decision is based on what users do.
4. **Make the first session effortless on a cheap Android phone:** voice-only by default, under 2
   minutes from landing to first report, Google sign-in next.
5. **Get 30 real users from your own network and talk to 10 of them.** Write down their exact words.
6. **Add Nigerian high-stakes topic packs:** project defence, graduate trainee and bank interviews,
   visa interviews. This is your edge over global tools.
7. **Prove someone will pay** with a Founding Member offer via a Paystack link before you build billing.
8. **Register the business** (CAC business name, TIN, business account) and check your NDPA
   data-protection obligations.
9. **Land one institutional pilot** (a career centre, bootcamp or department) with a written success
   measure and a manual weekly report.
10. **Review the funnel every Monday** (visitors → sign-ups → first session → return → paid) and fix
    the leakiest stage before adding new channels or spending on ads.
