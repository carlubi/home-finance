---
name: linear-design-principles
description: Applies Linear's UI/UX and product philosophy (design as product judgment, not decoration) when designing, building, or reviewing interfaces and making product decisions. Use when framing a product problem, planning a redesign, deciding scope, reducing visual noise, designing AI/agent interfaces, debating customization vs opinionated defaults, or setting up product process (handoffs, OKRs, A/B testing, design reviews). Triggers on "Linear style," "calm interface," "opinionated software," "is this the right problem," "should we add a setting," "feature request vs need," "redesign strategy," "should this be reversible/undo," "is chat the right AI interface," "how should our agent behave," "novelty vs familiarity." Peer-aware, so where Linear's opinions have limits (platforms, APIs as contracts, metrics vs taste, keyboard vs discoverability) it names the boundary and which peer answer applies. Not for cloning the Linear visual look (dark mode, gradients); this is product method.
---

# Linear Design Principles

Apply how Linear thinks about UI, UX, and product. The throughline: **design is product judgment, not decoration**, and it only works when backed by structure, opinionated defaults, near-zero latency, trained quality, and small teams that own problems end to end.

> [!info] Terminology trap
> "Linear design" in most search results means a generic SaaS *aesthetic* (dark mode, gradients, minimal landing pages) named after the company. That is the look, not the method. This skill is about how Linear actually works. Ignore the aesthetic literature.

## When to apply this

Reach for these principles when the task is one of:

- **Designing or reviewing an interface** → use the hierarchy + clarity rules below, then `references/ui-ux-craft.md`.
- **Framing a product problem** → "problem before solution"; interpret requests, don't transcribe them.
- **Planning a redesign or paying down design debt** → `references/ui-ux-craft.md` (redesign strategy).
- **Designing AI/agent features** → "build the workbench, not the chatbox," then `references/agent-experience.md` (Linear's Agent Interaction Guidelines, delegation, autonomy levels, agent tool design).
- **Designing workflow UX** (intake, notifications, keyboard model, automation, mobile) → `references/workflow-ux.md`.
- **Deciding process, org, or how decisions get made** → `references/operating-model.md`.
- **Building, not just deciding** (accessibility, the checkable craft details) → `references/accessibility-and-craft-specs.md`.
- **Tempted to apply a principle as universal law** (or the product isn't Linear-shaped, a platform, an API, a consumer app) → `references/boundaries-and-peers.md` for where Linear's opinions have limits and which peer answer applies.
- **Citing or sourcing a claim** → `references/sources.md`.

> [!note] Scope
> This is about **product judgment, what to build and whether the problem is real**: not pixel-level execution. Pair it with a visual-craft/implementation skill: use this to decide what should exist, then a craft skill to execute. The interaction guidance here is **desktop- and keyboard-first** (command palette, dense lists, keyboard as primary input); defer touch/responsive/small-screen mechanics to skills built for that. Linear's published mobile stance is narrow: mobile is an away-from-keyboard "sidekick" with a smaller job (capture, triage, updates, reading), native, and dense-professional rather than trendy (`references/workflow-ux.md`).

---

## The core principles

### 1. Design for someone specific. Be opinionated.

You cannot build something excellent for everyone. Pick a specific user and a specific use case and optimize hard for it; accept that it will be a poor fit outside that lane. Restraint is the strategy, not a limitation.

- A product needs a clear value proposition to win trust. Generic = invisible.
- Be most opinionated at the **atomic level** (what properties an issue has), more flexible at **broad containers** (how projects are structured), because every company is shaped differently.
- **Mind the novelty tax.** Every unfamiliar concept charges a learning cost that must be repaid in benefit. Be distinctive only where the payoff clearly exceeds the tax; for mainstream reach, lean on familiar conventions ("a piano, not a saxophone"). Power-user love is not proof of mainstream fit, The Browser Company's Arc won devoted fans on novel concepts but capped broad adoption, and the team wound it down. (See `references/boundaries-and-peers.md`, #1 and #5.)

### 2. Ship one really good way, not infinite flexibility.

Ship strong defaults that guide users toward a good workflow. Flexible software lets everyone invent their own process, which becomes chaos as teams scale.

- Sometimes the opinionated answer is **"no."** Refuse whole categories of requests that protect managers at the expense of the daily IC workflow (e.g., required fields, multiple assignees), saying no is a feature of an opinionated tool, not a failure to satisfy it. (Interpreting the underlying need is principle 10; this is the case where, even interpreted, the right call is still to decline.)
- Default to "simple first, then powerful": simple to start, more capable as you scale.

### 3. Use plain language. No invented jargon.

Vocabulary is a design surface. Use universal units (issues, projects, teams) so nobody needs a handbook. Don't invent terms, they mean different things to different people. Write issues, not "As a user, I want…" user stories that hide the actual need.

- Extend this to **all words on screen**, not just object names: button labels, error messages, empty-state copy, and notification voice are part of the calm. Aim for terse, human, jargon-free microcopy. (Linear has no dedicated essay on voice; treat the specific tone calls as inference from the product, not a sourced rule.)
- **The interface isn't only pixels.** For developer and agent audiences, the **API, SDK, CLI, error payload, and docs *are* the primary UI** and deserve identical craft, naming, progressive disclosure, plain language, and errors that teach the next step. Stripe's principle is "the API is the UI": an error should say `No such customer: cus_…`, not return a 500. Apply the same hierarchy and plain-language discipline to a schema or a CLI flag that you'd apply to a screen. (Stripe.)

### 4. Understand the problem before drawing the screen.

The most common reason design projects drag or fail is an unclear problem. Generating the form is the easy part; knowing what should exist at all is the hard part.

- Write the problem in your own words first. Ask: is this real? What happens if we don't do it? Who defined it?
- If feedback feels contradictory, people are probably reacting to **different problem definitions**.
- Separate **problem design → conceptual solution → execution**. Decide concepts (is a "project" an issue, a label, or its own entity?) before UI details.
- **Output isn't design.** Polished AI-generated UI can have the form without the fit. Use AI for prototyping and exploration; keep human judgment responsible for problem framing.

### 5. Calm but dense: make hierarchy do the ranking.

Dense interfaces can still feel calm if hierarchy is sharp. Don't let every element compete for attention.

- Use **visual weight as a ranking system**: work content dominates; navigation and chrome recede.
- Borders, icons, backgrounds, and separators must **earn their existence**. If they don't clarify a relationship, they're clutter.
- "Structure should be felt, not seen." If most people don't consciously notice a refinement, that's a good sign.
- Test against **real app states** (full lists, empty states, long text), not isolated Dribbble-style mockups. Stress-test across browser/desktop, light/dark/custom themes, and edge cases.
- Treat **theming as a system**: derive themes from a few perceptual parameters (base color, accent, contrast in a perceptually-uniform space like LCH) plus a baked-in accessibility contrast variable, not by hand-tuning dozens of independent color values. Set hierarchy and elevation in black/white opacities before adding color, and keep accent chroma out of the neutrals.
- **Put chrome in predictable places.** The same action (share, copy link, open PR) sits in the same spot on every object type, and core components (sidebar, tabs, headers) have written behavior definitions before they're built. Linear's 2026 refresh started from header actions that had drifted.
- For **data views and dashboards**, give every view a clear purpose and owner, and pair every metric with comparison, history, or a threshold, a raw number with no context is usually noise. (More in `references/ui-ux-craft.md`.)
- **Accessibility is structure, not polish.** Keyboard operability, visible focus, reduced-motion variants, perceptual contrast (APCA), and adequate hit targets are *inputs* to a calm interface, not a final-pass checklist. Linear documents little here (a contrast variable, Increase Contrast parity on iOS, an underline-links preference); the full checkable set is in `references/accessibility-and-craft-specs.md`, along with the quantified craft thresholds (16px inputs, press/dialog scale, "never `transition: all`," tabular numerals, optical alignment) that an agent can enforce mechanically.

### 6. Speed is architecture and input design, not polish.

"Calm, dense, fast" is not achievable with visual design alone. Linear bought the headroom for its minimal UI by making latency near zero, so the interface needs no spinners, skeletons, or progress affordances that add noise.

- Treat **latency as a UX bug**. Aim for instant (optimistic local writes, local-first data) before adding features. Eliminate spinners by having nothing to wait for. This rule covers **deterministic** operations ("if something takes more than a few hundred milliseconds, we try to make it faster").
- **When the wait is inherent (LLM and agent work), design the wait instead.** Acknowledge within seconds, show honest live progress (Linear's triage uses a thinking state with a timer and an inspectable trace), and treat silence past a set timeout as a defined failure state. Detail in `references/agent-experience.md`.
- Speed is also an **input-model problem**: a fast backend still loses if the fastest path to an action needs a mouse and three menus. Make keyboard a primary input; a command palette should search the local object pool, not a server.
- **Removing spinners is only half of feedback.** The hard, mandatory half is signaling when an optimistic write *fails* and rolls back. Optimistic local writes make the happy path instant, but they also mean the UI can show "saved" for something that didn't. Design the failure and reconciliation state explicitly (a clear, recoverable rollback), don't only design the success path. (Apple HIG, "Feedback." Pairs with principle 12.)

### 7. Treat quality as a trained habit and a hiring filter, not a final pass.

Craft is deliberate attention paid because it matters to the maker, not because someone is checking. It compounds through many small decisions.

- Quality is **everyone's job**, not just the designer's. Review UI as a group, different people notice different defects (misaligned pixels, animation timing, papercuts).
- Track papercuts as real work; keep fixes small enough to be sustainable. Run a recurring quality ritual.
- **Zero bugs is a mechanism, not an aspiration.** Every bug is fixed within an SLA (48h high priority, 7 days otherwise) or explicitly marked won't-fix; there is no backlog option. Linear started with a three-week reset that paused project work, and rebalances load weekly from a per-engineer bug dashboard. (Details in `references/operating-model.md`.)
- **Codify the checkable layer of taste in the toolchain.** Taste stays tacit for judgment calls, but tokens, interaction consistency, and component styling contracts are enforced by types and lint, so neither humans nor agents drift. Linear's StyleX migration made "styling at a distance deliberately difficult, not just discouraged by convention," explicitly because agents write more of the code.
- Trust intuition and customers over pure data. Keep each feature internal (dogfood, gated beta) until it's polished, while still launching the product early and often (see boundary #4).

### 8. For AI features, build the workbench, not just a chatbox.

Generic chat is a weak, imprecise form for most workflows. Design structured surfaces ("workbenches") where AI operates inside clear context. Full detail, with sources, in `references/agent-experience.md`.

- **Follow Linear's Agent Interaction Guidelines.** An agent (1) always discloses it's an agent, (2) works through the platform's normal UI and actions, (3) gives instant, unobtrusive feedback, (4) makes its state (thinking, waiting, executing, done) readable at a glance and its reasoning inspectable, (5) stops cleanly when asked and re-engages only on a clear signal, and (6) cannot be held accountable, so a human always is.
- **Put accountability in the data model.** Issues are *assigned* to humans and *delegated* to agents; an agent can never occupy the owner field. When a role must never belong to an agent, give it a field the agent can't fill, rather than a policy.
- **Embed agents where the work already lives**: inside the issue, the triage queue, the review, not in a bolted-on chat panel. Let work auto-start from existing signals (e.g., triage).
- **Make agent sessions shared and observable** through a small, typed activity vocabulary (thought, action, elicitation, response, error) from which the platform derives state. A finite vocabulary is what lets a dense UI show many agents calmly.
- **Autonomy is a dial, granted one decision type at a time.** Suggest → take a first pass you correct → run end to end. Mark every AI-set value as distinct from human-set ones, show the reasoning on hover, make overriding cheap, and let teams opt into auto-apply per property.
- **Accountability is not per-step approval.** Literal human-in-the-loop turns the person into a rubber stamp. Design the context and constraints up front, delegate visibly, keep standing agent jobs inspectable, and reserve explicit confirmation for consequential or irreversible actions.
- **The agent is also a user you design for.** Give it product-level tools, not raw API primitives, and put constraints in tool design so invalid actions are impractical, not forbidden by prompt prose. Human-readable fields over opaque IDs, a least-privilege identity of its own (not a borrowed login), and context pushed to it rather than scraped. (Linear's own agent; Anthropic, "Writing tools for agents.")
- **Evals and observability are the quality signal for non-deterministic features.** Linear's quality model (principle 7) assumes deterministic UI you can review by hand. For stochastic features, systematic evals and tracing are the *only* way to know if quality changed. This is the one place "taste over metrics" must bend. (Anthropic, LangChain.)
- **Guardrails are part of the design.** Treat prompt injection as a first-class risk, never let an agent touch credentials, and layer defenses rather than relying on one check. (OpenAI; Operator.)
- **As agents handle correctness, the human's job moves up to judgment:** is the work *useful*, not just correct? Unbounded AI is powerful but directionless.

### 9. Use settings for preferences, not deferred decisions.

Settings aren't automatically a sign of poor design. Use them for genuine preferences and repeated-use friction, not as a dumping ground for unresolved product decisions. Settings can also teach power users what's possible.

- Decision test: **is there a right default the product should just get right?** If yes, pick it, don't ship a toggle to avoid choosing. If it's genuine taste/habit the product shouldn't hold an opinion on, a setting is appropriate.

### 10. Build what customers need, not just what they ask for.

Treat requests as **input, not instructions**. Users describe symptoms or name a familiar solution; infer the deeper need. Don't tally feature requests blindly, research is interpretation, not transcription. (Example: users asked for "custom fields" but were really trying to track customer needs → build the purpose-built thing.)

### 11. Design for shared context, not handoffs.

As agents do more of the procedural work (Linear's own point-in-time figures: agents installed in 95% of paid workspaces in 2026, and agent-created work up from about 3% to about half of everything created in a year), the bottleneck moves from execution to **context**. The job of the system is to capture customer feedback, decisions, strategic direction, and code in one place that both humans and agents can work from, so nothing has to be re-explained at a handoff.

- Linear's original "no handoffs, small connected teams" model is the **precursor** to this, not a contradiction: both eliminate the lossy PM→designer→engineer relay. Now the relay to eliminate also includes the human→agent one.
- Make the work the source of truth. If a decision or its "why" only lives in a chat thread or someone's head, an agent (and the next human) can't use it.
- This is *why* plain language (3), opinionated structure (2), and the workbench (8) matter more, not less, in the agent era, shared context only works if the vocabulary and structure are legible to everyone, human or machine.
- **"Context" has a second, literal meaning here.** Linear's "context" is *organizational* (decisions, the "why," code in one place). When you actually build the agent, there's also the model's **context window**: a finite resource with diminishing returns and "context rot." Engineer it: retrieve just-in-time rather than front-loading everything, compact near the limit, and isolate sub-agents so they return distilled summaries instead of raw transcripts. Capturing context organizationally (this principle) and budgeting it at inference time are two different jobs. (Anthropic, "Effective context engineering for AI agents.")

### 12. Make actions reversible. Forgiveness is what lets people move fast.

Undo and clean recovery from mistakes are what let people act confidently without fear. This is a precondition for speed, not a nicety. Linear writes about it for AI actions ("we clearly identify these AI actions after they've been taken, so you can easily reverse or modify them") but has no general essay on forgiveness, so the general principle comes from Apple HIG "Forgiveness" and Dieter Rams.

- **Optimistic writes make reversibility mandatory, not optional** (ties to principle 6). The moment the UI shows "done" before the server confirms, you owe the user a visible, trustworthy rollback path when it didn't.
- Prefer **undo over confirmation dialogs** for routine actions; reserve confirmation for the consequential and irreversible (and for agent actions, see principle 8).
- Design the **error and recovery state**, not just the happy path. "How does this fail, and how does the user get back?" is a design question, not an edge case to handle later.

---

## How decisions and teams should work (brief)

These structural facts are *why* the principles above hold. Full detail in `references/operating-model.md`.

- **No handoffs.** Small connected teams (≈1 designer + 2 engineers) own a problem end to end; design and engineering iterate toward "right" together. Quality improves when everyone understands implementation.
- **Taste decides; dogfooding and betas validate.** No OKRs, no metric goals per project, no A/B tests as decision-makers. Feature-flag to internal dogfooding within days, then optional customer beta. Senior taste applied continuously, not at checkpoints.
- **No formal design reviews.** Post early work async (e.g., a project channel) for feedback.
- **Speed is a result of competence, not corner-cutting.** Better to be decisively wrong and pivot than cautiously mediocre. Decide and move on.
- **Scope small, launch often.** Projects fit 1–3 weeks and 1–3 people; deadlines are rare but real, and scope gets cut to meet them. Keep each feature internal until polished, but launch the company and product early, repeatedly, and in public.
- **Plan continuously.** Triage incoming ideas into candidate projects all year so planning is prioritization, not archaeology, with "won't do this quarter" as an explicit priority tier.
- **Say no to busy work.** "A tool should work for you, not the other way around." Status comes from existing signals (PRs, commits), not manual upkeep.

---

## Where these principles have limits

Linear's answers are confident on purpose, but they're **conditional, not universal**. Peer companies with comparable craft reach the opposite conclusion in some cases, and they're right for the products they build. Know the deciding variable before applying a principle as law. Full treatment, with sources and "when each side is right," in `references/boundaries-and-peers.md`.

- **Opinionated "one good way" (1, 2) breaks for platforms and creative substrates.** Notion, Raycast, Figma, and shadcn win on *flexibility* because their users' jobs are unknowably diverse or the artifact is personal. Deciding variable: how knowable/homogeneous the workflow is. Either way, owe the user the opposite counterweight (escape hatches for opinionated apps; templates for flexible ones).
- **Taste-over-metrics breaks pre-PMF and for stochastic features.** Superhuman's PMF survey, Intercom's RICE, Arc's adoption telemetry, and agent evals all decide by data where taste can't. "Taste tells you if it's good; metrics tell you if it's being adopted." ("No OKRs" is not "no goals": Linear still sets measurable company goals and works backward from them.)
- **Keyboard-first (6) assumes daily expert users.** For occasional users, touch, or rarely-used surfaces, see-and-point discoverability wins (Apple HIG).
- **"Decisively wrong and pivot" breaks for contracts other software depends on.** A human re-learns a redesign overnight; an API/schema/file format is a production outage. Linear itself splits along this line: bold UI redesigns, but a managed-deprecation API (`@deprecated`, stubs, notice). Stripe's never-break versioning is the strict end.
- **Tacit, unwritten taste (no formal reviews) doesn't scale to agents.** Machines can't read taste, so if agents produce or check your craft, the checkable layer must be codified. Linear now does this itself (StyleX lint rules for tokens and styling contracts) while keeping reviews informal; Vercel ships its guidelines as a linter.
- **Calm restraint (5) isn't the whole emotional register.** High-frequency work surfaces want calm; milestones and consumer apps want deliberate delight and communicative motion (Superhuman, Apple "Depth," Airbnb).
- **The Linear Method is one cadence, not the only one.** Shape Up's appetite + no-backlog + cooldown + circuit-breaker suits teams that want long protected focus (Basecamp).

---

## A working checklist

Copy this when designing or reviewing a feature:

```
Linear-style review:
- [ ] Who specifically is this for? Is it opinionated, or generically for "everyone"?
- [ ] Is the problem written clearly, in my own words? Is it the real problem or a symptom?
- [ ] Concept decided before pixels? (What is each entity, really?)
- [ ] Plain language, universal terms, no invented jargon? Is microcopy (labels, errors, empty states) terse and human?
- [ ] Does every border/icon/separator earn its place? Does chrome recede? Do shared actions sit in the same place on every surface?
- [ ] Tested against real/full/empty states and light/dark/custom themes?
- [ ] If a data view: clear purpose + owner, and every metric paired with comparison, history, or a threshold?
- [ ] Any spinner that near-zero latency could remove instead? If writes are optimistic, is the failure/rollback state designed (not just the happy path)?
- [ ] Are actions reversible, undo over confirmation for routine actions, recovery path designed for mistakes?
- [ ] Is there a fast keyboard path to the primary action, and, for occasional users, a discoverable see-and-point path too? Is each action reachable by shortcut, command palette, and context menu, and does it work the same on a multi-selection?
- [ ] Does any status here need manual upkeep that an existing signal (PR, commit, merge) could drive?
- [ ] If it notifies: who gets auto-subscribed, is it de-duplicated across channels, and can it be deferred?
- [ ] Accessibility treated as input, not polish (keyboard, visible focus, reduced-motion, perceptual contrast, hit targets)?
- [ ] Are we adding a setting to dodge a product decision the product should get right by default?
- [ ] Are we honoring a request literally instead of the underlying need?
- [ ] Distinctive only where the payoff beats the novelty tax, or are we taxing users for novelty's sake?
- [ ] If a developer/agent surface: are the API, CLI, errors, and docs designed with the same craft as a screen?
- [ ] If AI: is there a structured workbench with review/approval, not just a chatbox?
- [ ] If AI: does the agent identify itself, acknowledge within seconds, show its state, and stop when told? Does a human stay the owner (assign vs delegate)?
- [ ] If AI: are AI-set values visibly distinct from human-set ones, with reasoning on hover and cheap override? Is autonomy granted per decision type rather than all at once?
- [ ] If AI work is slow by nature: is the wait designed (acknowledgement, live progress, a staleness timeout)?
- [ ] If AI: is the agent's *own* interface (product-level tools with constraints built in, its own least-privilege identity) designed, are there evals/observability for the non-deterministic parts, and are consequential/irreversible actions gated behind consent?
- [ ] If AI/agents: is context (decisions, the "why," code) captured where humans and agents can both use it, nothing re-explained at a handoff? And is the model's context window budgeted at inference time?
- [ ] Can a consumer restyle this component from outside? Should they be able to, or is its styling contract explicit and linted?
- [ ] Am I applying a principle as universal law where a boundary applies? (Check `references/boundaries-and-peers.md`.)
```

---

## Reference files

- **`references/ui-ux-craft.md`**: The Linear blog posts worth reading (calmer interface, redesign strategy and politics, output isn't design, design is more than code, design for the AI age, quality rituals, settings, customer needs, dashboards, Liquid Glass on iOS, StyleX, Triage Intelligence's visual language, plus the 2026 agent-era cluster), each with its core lessons and link.
- **`references/agent-experience.md`**: Designing for agents and for humans working with them: the Agent Interaction Guidelines, assign vs delegate, the typed activity model, graded autonomy, designing the wait, agent tool design, and agent identity.
- **`references/workflow-ux.md`**: Linear's interaction model beyond the screen: busy-work automation, triage as the intake boundary, attention and notifications, the keyboard grammar, standing automation (Loops), and the mobile stance.
- **`references/operating-model.md`**: How Linear actually operates: org structure, decision-making and goals, opinionated software, speed-as-architecture, the Linear Method practices (scope, launching, changelog, enablers/blockers, building with users), the zero-bugs system, continuous planning, the competitive MVP, economics, and hiring (plus Shape Up as an alternative cadence).
- **`references/boundaries-and-peers.md`**: Where Linear's principles have limits: 8 productive contradictions with peer companies (Notion, Stripe, Basecamp, Apple, Vercel, Superhuman, The Browser Company), each with the deciding variable, plus a corroboration table of where the design canon independently agrees with Linear.
- **`references/accessibility-and-craft-specs.md`**: The checkable layer Linear under-documents: accessibility as a discipline (keyboard, focus, ARIA, APCA contrast, reduced motion) and quantified craft thresholds (hit targets, 16px inputs, press/dialog scale, tabular numerals) an agent can enforce mechanically.
- **`references/sources.md`**: Primary Linear sources plus peer-company sources, interviews/profiles, technical breakdowns, and background, with sourcing caveats.
