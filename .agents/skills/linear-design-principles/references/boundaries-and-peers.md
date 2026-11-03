# Boundaries: where Linear's principles have limits

The rest of this skill is confident in Linear's opinions on purpose, a coherent point of view is the whole value. But Linear's answers are **conditional, not universal**. Peer companies with comparable craft reach *opposite* conclusions in some cases, and they are right for the products they build. This file names those boundaries so the skill gives correct advice even when the user isn't building a Linear-shaped product.

Each boundary states Linear's position, the peer's, the **deciding variable** (what determines which one applies), and how to frame it. These are boundaries, not debates, when you know the deciding variable, you know which answer is right.

The companion to this file is the **corroboration table** at the end: where independent companies and the broader design canon reached the *same* conclusion as Linear (which makes those principles more credible, not Linear-specific dogma).

---

## 1. Opinionated "one good way" vs. flexibility / extensibility / ecosystem

- **Linear (P1, P2):** Ship one really good way; be opinionated; sometimes the answer is "no."
- **Peers:** Notion (blocks/LEGO, user-as-toolmaker), Raycast (an extension ecosystem for the long tail), shadcn/ui (you own the code), Figma (an infinite canvas, not a fixed workflow), Vercel (a platform).
- **Deciding variable:** *How knowable and homogeneous is the user's job, and is the artifact shared or personal?* Linear is right for a **bounded, knowable, shared workflow** (issue tracking for software teams): opinionation removes decisions and produces calm. The peers are right for **unknowably diverse users (platforms), a creative substrate (canvases, IDEs), or a single-user power tool**: there a fixed "one way" excludes most of the audience.
- **Frame:** Whichever you pick, you owe the user the *opposite* counterweight. Opinionated apps need escape hatches; flexible products need templates and a guided first run (Notion's own answer to the blank-page problem). For the long tail of requests, both "no" (Linear) and "yes, via an extension" (Raycast) are legitimate scope strategies, they just put the extensibility burden in different places.
- Sources: https://nesslabs.com/raycast-featured-tool · https://www.raycast.com/blog/how-raycast-api-extensions-work · https://ui.shadcn.com/docs · https://www.intercom.com/blog/product-strategy-means-saying-no/

## 2. Taste decides vs. metrics / evals decide

- **Linear:** Taste decides; dogfooding and betas validate. No OKRs, no A/B tests as arbiters, "data can be a crutch." (Nuance: Linear still sets measurable, work-backward company goals, and its own pre-PMF beta used survey-gated cohorts and a "stop asking for features" expansion signal; see `operating-model.md`.)
- **Peers:** Superhuman (the 40% "very disappointed" PMF survey as the central metric), Intercom (RICE, a Product Impact Framework, proxy metrics), The Browser Company (killed Arc partly on adoption telemetry, and has said publicly it trusted taste/vision too long), Anthropic/LangChain (systematic agent evals).
- **Deciding variable:** *Stage, signal density, scale, and determinism.* Taste wins for **atomic craft decisions, mature conviction, deterministic hand-reviewable UI, and small aligned teams.** Metrics/evals win **pre-PMF (Superhuman), at the strategic "is anyone actually adopting this?" altitude (Arc), when many stakeholders must align on priority (RICE), and for non-deterministic features you cannot eyeball (agents).**
- **Frame:** "Taste tells you if it's good; metrics tell you if it's being adopted, and those two can diverge for years." Linear's stance is safest once you already have conviction and a deterministic surface; it is most dangerous pre-PMF and for stochastic features.
- Sources: https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit/ · https://www.intercom.com/blog/rice-simple-prioritization-for-product-managers/ · https://www.intercom.com/blog/outcomes-vs-features/ · https://every.to/podcast/transcript-7d7adc44-103b-4483-a5a2-29a713085e33 · https://blog.langchain.com/agent-observability-powers-agent-evaluation/

## 3. The Linear Method vs. Shape Up

- **Linear:** Short continuous **cycles** (~2 weeks), a curated near-term backlog ("keep a manageable backlog"), always-assigned named owners, projects scoped to 1–3 weeks and 1–3 people.
- **Peer:** Basecamp's **Shape Up**: six-week **bets**, **no backlog at all**, a fixed **appetite** (time budget you design scope down to fit), a **cooldown** between cycles, and a **circuit breaker** (a project that misses its appetite stops by default rather than getting an extension).
- **Deciding variable:** *Iteration frequency and how you want focus protected.* Linear suits high-frequency iterative work where momentum and visible ownership matter. Shape Up suits teams that want long, uninterrupted, protected focus and reject the false obligation of an ever-growing list.
- **Frame:** "Linear curates the backlog; 37signals questions whether it should exist at all." Linear's "scope projects down" and "cut scope to hit a rare, serious deadline" come close to appetite, but the circuit breaker and cooldown are the Shape Up ideas the Linear Method lacks; both are worth offering when a team feels rushed or perpetually behind.
- Sources: https://basecamp.com/shapeup · https://basecamp.com/shapeup/2.2-chapter-08 (circuit breaker) · https://basecamp.com/shapeup/0.3-chapter-01 (appetite)

## 4. Who sees the rough version: gated exposure vs ship-to-learn in production

- **Linear:** Keep each feature internal until it's polished; validate via dogfooding, then hand-picked beta cohorts behind flags. But at the company and product level Linear says the opposite of "wait": "It's better to launch early and start getting users and momentum," launch multiple times, and "build in public."
- **Peers:** Intercom (ship "uncomfortably early," even incomplete, to real customers, "shipping is the beginning, not the end"), Vercel ("iterate to greatness" in public).
- **Deciding variable:** *Who sees the rough version, and whether your brand promise is "polished" or "fast-improving."* Linear exposes rough work to a chosen audience (itself, gated cohorts) and shows the public a steady cadence of *finished* progress (changelog, repeated launches). Intercom/Vercel expose rough work to everyone because only real usage reveals the truth, viable when feature-flag and fast-rollback infrastructure keeps each release low-risk.
- **Frame:** The more your brand promise *is* polish, the more you gate who sees the rough version; the more your edge is learning speed (and the cheaper a rollback), the more shipping rough-but-real to everyone wins. Neither side argues for waiting to launch.
- Sources: https://linear.app/method/launching · https://www.intercom.com/blog/shipping-is-the-beginning/ · https://vercel.com/design/engineer

## 5. Keyboard-first "remember and type" vs. see-and-point discoverability

- **Linear (P6):** Keyboard as a primary input; command palette over the local object pool; the fastest path beats a mouse and three menus.
- **Peer:** Apple HIG, see-and-point, direct manipulation, recognition over recall.
- **Deciding variable:** *User frequency and expertise.* Keyboard-first pays off **only for daily expert users** who have internalized the shortcuts. For occasional users, rarely-used surfaces, or touch, recall is a tax and see-and-point wins. Linear's own mobile stance agrees: mobile is a narrowed away-from-keyboard sidekick (capture, triage, reading), not keyboard-first desktop shrunk down (`workflow-ux.md` §6).
- **Frame:** Superhuman shows the bridge: a command palette that *teaches* its shortcuts (showing the keystroke next to each action) migrates users up the speed curve instead of demanding expertise on day one. Offer the keyboard path; don't make it the only path for infrequent actions.
- Sources: https://modelessdesign.com/backdrop/204 (See-and-point; Direct manipulation) · https://developer.apple.com/design/human-interface-guidelines/ · https://blog.superhuman.com/superhuman-is-built-for-speed/

## 6. Bold redesigns / "decisively wrong and pivot" vs. never break the contract

- **Linear:** Better to be decisively wrong and pivot than cautiously mediocre; holistic redesigns are healthy; "no software design is truly timeless."
- **Peer:** Stripe, API versioning, account pinning, additive-only change; a "pivot" to a public interface is a production outage for everyone depending on it.
- **Deciding variable:** *Is the interface consumed by humans or by other software?* Humans re-learn a redesign overnight, so pivoting is cheap. APIs, file formats, schemas, and public SDKs are embedded in running code, there a redesign breaks callers.
- **Frame:** "The more your interface is a contract other software depends on, the more Linear's 'move fast and redesign' must invert into Stripe's 'never break, only extend.'" The visual UI can pivot; the contract can only grow.
- **Linear itself sits on both sides.** Its UI gets bold holistic redesigns, but its GraphQL API is handled conservatively: no versioning, `@deprecated` fields announced in the changelog, removed functionality sometimes left as non-functioning stubs so existing queries don't break, and outreach with lead time before noticeable breaking changes. That's managed deprecation, gentler than Stripe's pinned versioning but not "decisively wrong and pivot." The deciding variable splits surfaces *within* one company.
- Sources: https://stripe.com/blog/api-versioning · https://stripe.dev/blog/payment-api-design · https://linear.app/developers/deprecations

## 7. Tacit taste / no formal review vs. codified, machine-readable craft

- **Linear:** No formal design reviews; judgment is tacit, applied continuously by a small high-taste team; async feedback in project channels. **But the checkable layer is codified:** the 2026 StyleX migration makes "styling at a distance deliberately difficult, not just discouraged by convention," with lint rules and a type-aware checker that require shared tokens and consistent hover/press/link behavior, explicitly because agents write more of the code. Linear still has no formal design system.
- **Peers:** Vercel (its Web Interface Guidelines shipped as an agent command/linter), Stripe (a formal API Review gate).
- **Deciding variable:** *Team scale, and whether agents must apply the standard.* Tacit judgment scales with a small, aligned, high-taste team. Codified rules scale across a large org **and**, crucially in the agent era, let AI agents apply and check craft consistently.
- **Frame:** Machines can't read taste, so the question isn't tacit *or* codified but *which layer is which*. Keep judgment calls (is this the right problem, does this feel calm) tacit and human; codify everything pass/fail (tokens, interaction timing, component styling contracts, accessibility thresholds). Linear and Vercel differ mainly in how far down the codified layer extends and whether it's published.
- Sources: https://linear.app/now/styling-linear-for-the-future-stylex · https://vercel.com/design/guidelines · https://vercel.com/changelog/web-interface-guidelines-now-available-as-an-agent-command · https://github.com/raunofreiberg/interfaces

## 8. Calm restraint vs. engineered delight / depth / motion

- **Linear (P5):** Calm, recessive, restraint; "structure felt, not seen." On desktop, motion writing is mostly about consistency (a hover that broke the 150ms fade standard was a defect). On iOS, Linear ships motion that signals state (lift on touch, distortion past an edge, a moving light source), so even Linear uses communicative motion where the platform register calls for it.
- **Peers:** Superhuman (game design, deliberate peak moments like Inbox Zero), Apple ("Depth"), Airbnb/Things (expressive, communicative motion as a shipped artifact).
- **Deciding variable:** *Usage frequency and emotional register.* Calm-and-recessive is right for **high-frequency, all-day work surfaces** where flourish becomes fatigue (Linear's issue lists). Engineered peak moments and expressive motion are right at **emotional milestones, habit formation, and consumer/personal apps.**
- **Frame:** The same product can want both, a calm steady state punctuated by deliberate delight, which the skill currently under-weights. The test for any flourish: does it mark a genuine moment, or does it fire on every routine action? Confetti on *every* data refresh fails; confetti once at a real milestone can earn its place.
- Sources: https://blog.superhuman.com/game-design-not-gamification/ · https://developer.apple.com/design/human-interface-guidelines/design-principles · https://medium.com/airbnb-engineering/introducing-lottie-4ff4a0afac0e

---

## Corroboration: where the canon independently agrees with Linear

These are *not* contradictions, they're independent companies and classic design canon reaching Linear's exact conclusion. Cite them to convert "Linear says" into "the canon of good design says, and Linear codified it."

| Linear principle | Independent corroboration | Source |
|---|---|---|
| **P5** Calm; elements earn their place; restraint | Dieter Rams: "less, but better" / "as little design as possible"; Apple HIG "Deference / defer to content" | https://www.vitsoe.com/us/about/good-design · https://developer.apple.com/design/human-interface-guidelines/design-principles |
| **P6** Speed is architecture; latency is a UX bug; keyboard-first | Superhuman (the 100ms rule, <50ms target, local DB, prerendering); Raycast (native feel as a literal acceptance test) | https://blog.superhuman.com/superhuman-is-built-for-speed/ · https://www.raycast.com/blog/a-technical-deep-dive-into-the-new-raycast |
| **P3** Plain language; errors are a design surface | Stripe (human-readable errors that name the next step); Vercel guidelines (active voice; errors guide resolution); Rams ("makes a product understandable… self-explanatory") | https://dev.to/stripe/designing-apis-for-humans-error-messages-94p · https://vercel.com/design/guidelines |
| **P4** Understand the problem before the screen | Intercom's first R&D principle is literally "Start with the problem" (~⅓ of effort before designing); Basecamp "Epicenter design" | https://www.intercom.com/blog/intercom-product-principles-start-with-the-problem/ · https://basecamp.com/gettingreal |
| **P1/P2** Opinionated; say no | Basecamp Getting Real "Make opinionated software" / "Start with no"; Intercom "opinionated by default, flexible under the hood" + "product strategy means saying no" / "death by preferences" (also corroborates P9) | https://basecamp.com/gettingreal · https://www.intercom.com/blog/product-strategy-means-saying-no/ |
| **P7** Quality as a recurring trained ritual | Figma's "Quality Week" is a near-exact independent parallel to Quality Wednesdays; Rams ("thorough down to the last detail"); Cultured Code / Things (multiple Apple Design Awards on obsessive detail) | https://www.figma.com/blog/little-big-updates-dispatches-from-quality-week/ · https://medium.com/@jordanborth/an-ode-to-cultured-code-and-things-3-292e20112624 |
| **P8/P11** Workbench not chatbox; human accountable; observable | Linear's own Agent Interaction Guidelines codify this for third-party agents (disclosure, native, instant feedback, visible state, disengage, human accountable); Anthropic ("show planning steps," "human review remains crucial"); OpenAI (confirmations, takeover); Smashing's named patterns (Intent Preview, Action Audit & Undo, Escalation Pathway) | https://linear.app/developers/aig · https://www.anthropic.com/research/building-effective-agents · https://www.smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/ |
| **P9** Settings for preferences, not deferred decisions | Stripe "account pinning" (the latest version is auto-assigned, zero config); Intercom "death by preferences" | https://stripe.com/blog/api-versioning · https://www.intercom.com/blog/product-strategy-means-saying-no/ |
| **P11** No handoffs / shared responsibility | Vercel design-engineering "skips the traditional handoff"; Basecamp Shape Up build teams (1 designer + 1–2 programmers, no PM layer). Note: Airbnb's DLS, led by Karri Saarinen pre-Linear, is the literal precursor to the Linear model. | https://vercel.com/design/engineer · https://karrisaarinen.com/posts/building-airbnb-design-system/ |
