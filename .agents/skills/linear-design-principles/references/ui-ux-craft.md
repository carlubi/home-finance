# Linear UI/UX craft: the blog posts worth reading

Linear's blog is the **Now** section (`linear.app/now`). The useful categories for UI/UX are **Craft** and **Practices**, not the changelog. The posts are the *output*; the operating model in `operating-model.md` is the *input*.

## Contents
- 1. A calmer interface for a product in motion
- 2. How we redesigned the Linear UI + A design reset
- 3. Output isn't design
- 4. Design is more than code
- 5. Design for the AI age
- 6. Quality Wednesdays
- 7. Why is quality so rare?
- 8. Settings are not a design failure
- 9. Building what customers need, not just what they ask for
- 10. Best practices for designing Linear Dashboards
- 11. The agent era: "Issue tracking is dead" (2026)
- 12. Code review in the agent era (Diffs)
- 13. Teaching agents to do the work (2026)
- 14. How we built Triage Intelligence (2025)
- 15. A Linear spin on Liquid Glass (2025)
- 16. Styling Linear for the future: StyleX (2026)
- Suggested reading order

---

## 1. A calmer interface for a product in motion
**Best for:** visual hierarchy, density, interface pruning, product refreshes
🔗 https://linear.app/now/behind-the-latest-design-refresh (Mar 12, 2026, Charlie Aufmann and Maxime Heckel)

The most directly useful UI article. The interface became crowded as features accumulated; they reduced visual noise without reducing information density. Core principle: don't let every UI element compete for attention. They muted the sidebar, compacted tabs, reduced icon treatments, softened borders, and made structure "felt, not seen."

Two starting problems besides clutter:
- **Unpredictable chrome.** Header actions like sharing, copying a link, and opening a PR "no longer appeared in predictable places." After the refresh, "headers, navigation, and view controls are now consistent across projects, issues, reviews, and documents."
- **Palette temperature.** The default moved from a cool blue tone to "a warmer gray that still feels crisp, but less saturated". The caution: "go too warm, though, and the interface risks looking muddy."

How they worked:
- **A dev toolbar in the real app** could toggle feature flags to compare old and new.
- **A per-token color tool built with Claude Code** had hue, chroma, and lightness controls. People shared their preferred "recipes," exported as JSON into Figma.
- **A two-person team** used coding agents to explore two directions before committing to one.

Gillet ("Faster loops," Dec 2025) calls these "internal tweak systems," alongside Figma plugins that sync icons and color variables with code. He also defends designing on real screenshots: "Some people find this heretical, but designing in context keeps us fast and grounded."

- Use visual weight as a ranking system. Work content dominates; navigation recedes.
- Dense interfaces can still feel calm if hierarchy is sharp.
- Borders, icons, backgrounds, and separators should earn their existence. If they don't clarify relationships, they're clutter.
- Small refinements matter even when users don't consciously notice them. If most people don't notice what changed, that's a good sign.

## 2. How we redesigned the Linear UI + A design reset (two parts)
**Best for:** redesign strategy, design debt, scope control
🔗 https://linear.app/now/a-design-reset
🔗 https://linear.app/now/how-we-redesigned-the-linear-ui

Fast-moving products accumulate **design debt** as new features strain old surfaces. Some debt is better paid down in larger holistic sweeps than per-screen fixes ("no software design is truly timeless"). The redesign focused on accommodating product evolution, clarity, and navigation, but they cut navigation changes from scope due to behavioral and engineering risk.

- Redesigns should start from product evolution, not visual taste.
- Keep the user's mental model stable unless changing it is truly necessary.
- Test concepts against real app states, not isolated screens.
- Stress-test across environments: browser, desktop, platform conventions, light/dark mode, custom themes, edge cases.
- A serious redesign needs design and engineering working together daily, not a handoff.

**Redesign politics (part I):**
- **Pay the debt on a cadence:** "If your product evolves fast, you should be paying this debt every 2-3 years."
- **Refresh the product, not just the brand:** a brand refresh alone changes nothing about the experience.
- **Get the CEO behind it:** "I've never seen redesigns successfully executed without the CEO behind it."
- **Tie it to a directional shift:** Airbnb went mobile-first; Linear widened from issue tracker to product-development system.
- **Call early work a "concept"** so it is "less likely that the idea is attacked," and let repeated exposure make it easier to say yes to.
- **Expect a dip:** "every global redesign will tank the metrics in the short term."
- **Go fast (part II):** "It's always better to do a redesign quickly." Linear's took about six weeks with a dedicated team ("we couldn't treat it as a side project").

**Process details (part II):** two designers worked different parts simultaneously to speed decisions; prototypes stayed anchored to north-star example screens ("how real could this concept car be?"); rollout via private beta then percentage-based workspace rollout. Theme generation was rebuilt on the perceptually-uniform **LCH color space** (themes defined from base color, accent color, and contrast rather than ~98 variables), with an accessibility contrast variable.

Other process details:
- **Monochrome first.** "Karri mostly worked with opacities of black and white" to set elevation and hierarchy before color.
- **Neutrals stay neutral.** A more timeless look came from "limiting how much chrome (blue in our case) was used in the calculations applied to our color system."
- **Contrast was raised** with darker text and icons in light mode and lighter ones in dark mode.
- **Inter Display** added expression to headings.
- **Behavior definitions came first.** The team documented the behaviors of the sidebar, tabs, app headers, and view headers before building. The "inverted L" (sidebar plus top bar) is treated as the global chrome that controls the main view.

## 3. Output isn't design
**Best for:** design judgment, AI-assisted design
🔗 https://linear.app/now/output-isn-t-design

Generating interfaces is not the hard part of design. The hard part is understanding the problem, context, constraints, edge cases, and habits well enough to know what should exist at all. AI outputs can look polished while failing: the form is there, the fit is not. (Echoes Christopher Alexander: design is the search for a good fit between a form and its context.)

- Don't confuse polished UI with solved UX.
- Before screens, define the forces: user needs, technical constraints, habits, edge cases, business goals, existing workflows.
- Use AI for prototyping and exploration; keep human judgment responsible for problem framing and fit.

## 4. Design is more than code
**Best for:** problem framing, designer-engineer collaboration
🔗 https://linear.app/now/design-is-more-than-code

Not anti-code, but design shouldn't collapse into implementation. Separates design into **problem design**, **conceptual solution design**, and **execution**. Unclear problems are a major reason projects drag or fail. The worry about code-first tooling is cultural: when you build straight to production by default, the organizational reasons to consider the problem and intent evaporate.

- Start by writing the problem in your own words.
- If feedback feels contradictory, check whether people are reacting to different problem definitions.
- Explore concepts before committing to UI details.
- Code is powerful in execution (including "sketching" with throwaway code), but it shouldn't erase conceptual and divergent thinking.
- Saarinen (Dec 2025): "I tend to think about design as a search, not a production pipeline." "Tools have opinions," and "code is a medium of commitment": designing inside an existing system means inheriting its past decisions. Constraints are essential late, but when they arrive early they "start shaping your imagination." Know which mode you're in.
- How Linear designers use AI (Designer Fund, Aug 2026, https://designerfund.substack.com/p/ai-design-linear): agents gather context (codebase history, customer quotes), not opinions. Karri's own "/linear-way" skill is told to "act like a Linear product teammate, not a request-taking assistant." He asks it to argue *against* his view, and sets success criteria before building ("Otherwise, you always succeed"). "When you can do anything, what you choose not to do is far more important than doing everything much faster."

## 5. Design for the AI age
**Best for:** AI UX, agent interfaces, designing beyond chat
🔗 https://linear.app/now/design-for-the-ai-age

Traditional interfaces give predictable paths; AI introduces variance. Generic chat is a weak, imprecise form for many workflows. Argues for structured "workbenches" where AI operates inside clear context. "Without form, function gets lost. Unbounded AI, much like a river without banks, becomes powerful but directionless."

- Chat is not automatically the best AI interface.
- Good AI UX constrains, structures, and contextualizes AI behavior.
- For agentic workflows, design the review, approval, context, and control surfaces, not just the prompt box. Humans stay in the loop; responsibility doesn't transfer to the agent.

## 6. Quality Wednesdays
**Best for:** design QA, polish rituals
🔗 https://linear.app/now/quality-wednesdays

A weekly ritual where engineers find and fix small quality defects (origin: an offsite where engineers couldn't spot that a button "darkened instantly when the mouse moved away, rather than fading out over 150 milliseconds as it should have"). Note the framing: the defect was breaking an existing timing standard, not having motion at all. Key lesson: quality is trained. People get better at noticing inconsistent animations, misalignments, and papercuts by repeatedly inspecting the product together, and then ship fewer papercuts in the first place.

- Quality is not just the designer's job.
- Review UI as a group; different people notice different defects.
- Track papercuts as real work (e.g., a "quality" label). Keep fixes small enough to be sustainable.

## 7. Why is quality so rare?
**Best for:** product taste, quality as strategy
🔗 https://linear.app/now/why-is-quality-so-rare

Adapted from Karri Saarinen's Config 2025 keynote. Modern software optimizes for speed, metrics, and process at the expense of craft; technology cycles push toward speed and cheapness and craft gets forgotten. Craft = deliberate attention put into making something excellent because it matters to the maker. "Quality creates gravity, it pulls people in rather than requiring us to push."

- Quality as a north star; quality compounds through many small decisions.
- Trust intuition and customers over pure data.
- Small teams with strong taste beat large committees.
- Keep MVPs internal until they're ready. Pair with a zero-bugs policy (fix bugs fast; no permanent backlog). The dedicated post is https://linear.app/now/zero-bugs-policy (Sep 24, 2025); see `operating-model.md`.

## 8. Settings are not a design failure
**Best for:** customization, preferences
🔗 https://linear.app/now/settings-are-not-a-design-failure

Settings aren't automatically a sign of poor design. Some details are taste, habit, or repeated-use friction. Distinguish product settings the product must get right by default from genuine preferences designers shouldn't hold a strong opinion on. They redesigned settings as an onboarding surface with tutorials and tooltips.

- Use settings for preferences, not as a dumping ground for unresolved product decisions.
- Settings can teach advanced users what's possible.
- Repetitive micro-frictions are worth solving; power users feel them constantly.

## 9. Building what customers need, not just what they ask for
**Best for:** UX research interpretation, feedback synthesis
🔗 https://linear.app/now/building-what-customers-need

Users describe symptoms or request familiar solutions; teams must infer the deeper need. Example: many users asked for "custom fields," but ~40% really wanted to track customer needs, leading to a purpose-built Customer Requests workflow instead of a generic field.

- Treat user requests as input, not instructions.
- Don't tally feature requests blindly.
- Good UX research is interpretation, not transcription. ("I want to feel as bad as our customers do.")

## 10. Best practices for designing Linear Dashboards
**Best for:** data UX, dashboards, information architecture
🔗 https://linear.app/now/dashboards-best-practices

- Every dashboard needs a clear purpose and owner. (Median workspace makes ~2 dashboards; adoption drops fast beyond that, when teams spin up dozens, most go stale and stop being trusted.)
- Strategy dashboards: a handful of stable long-term trends for alignment. Operational dashboards: change, exceptions, action triggers.
- Executive dashboards need more explanation; team dashboards can be denser.
- A metric without comparison, history, or threshold is often useless (pair raw numbers with context like burn-up charts).

## 11. The agent era: "Issue tracking is dead" (2026)
**Best for:** product strategy in the agent era, context over handoffs
🔗 https://linear.app/next (Mar 24, 2026)

Linear's public reframing of its own thesis. The argument: issue trackers were built for **handoffs** (a PM scopes work, an engineer executes later): overhead that made sense when engineering time was scarce. As agents absorb procedural work, the bottleneck moves to **context**, so the system's job is to turn captured context into execution: "Linear is the shared product system that turns context into execution." Stated adoption at launch (Mar 2026): coding agents in **75%+ of enterprise workspaces**, agent-completed work up **5x in three months**, agents authoring **~25% of new issues**. Later 2026 figures: agents installed in 95% of paid workspaces, and agent-created work up from about 3% to about half of everything created in Linear (https://linear.app/data). Treat all of these as a dated trend.

- The next system is designed around **context and agents**, not handoffs.
- Capture customer feedback, internal ideas, strategic direction, decisions, and code in one place both humans and agents can use.
- Planning, implementation, and review compress; humans move up to intent, judgment, and taste.

## 12. Code review in the agent era (Diffs)
**Best for:** AI/agent review surfaces, human accountability
🔗 https://linear.app/now/reviewing-code-in-the-agent-era (Jun 10, 2026) · also https://linear.app/now/code-review-should-be-fast (May 28, 2026) and the review half of https://linear.app/now/coding-sessions-for-linear-agent, these describe the same **Diffs** feature; read as one.

When agents generate large volumes of code, review can't stay line-by-line syntax checking. Linear's stance: "quality code review has come to mean that the code is **useful**, not just correct." Diffs embeds review inside Linear next to the product context, and structures changes "into chunks that read like a story" (narrative diffs) so reviewers follow logic instead of drowning in volume.

- The reviewer's job elevates from code parser to **product thinker**: edge cases, UX implications, whether the change matters to users.
- Agents handle correctness/bug-finding; humans stay the gate on usefulness and intent.
- Keep review discussion among people, it reinforces engineering culture and accountability.

## 13. Teaching agents to do the work (2026)
**Best for:** agentic workflow design, gradual autonomy, accountability
🔗 https://linear.app/now/code-intelligence-for-linear-agent (May 14) · https://linear.app/now/coding-sessions-for-linear-agent (Jun 11) · https://linear.app/now/linear-agent-bug-fix (Jun 12)

How Linear ships its own agent capabilities: Code Intelligence (the agent reads the codebase and answers from source), Coding Sessions (it takes an issue through to a reviewed solution), and bug auto-fix (some bugs get fixed before an engineer picks them up). The throughline is **gradual autonomy with verification** and keeping a human accountable.

- Embed agents where work lives (triage, the issue) and let work **auto-start** from existing signals.
- Make agent runs **observable and shared**; gate autonomy on confidence, not all-or-nothing.
- The issue stays assigned to a person, "an agent cannot be held accountable." (The line originates in Linear's Agent Interaction Guidelines, 2025; see `agent-experience.md`.)
- Linear Agent (Mar 24, 2026) added Skills saved from conversations and Automations on triage; Loops (Jul 20, 2026) added recurring plain-language agent jobs. "How we built Linear Agent" (Aug 10, 2026) explains the tool-design choices, covered in `agent-experience.md` §7.

> **Sourcing note:** these 2026 posts are product-launch announcements as much as craft essays, candid but promotional, and partly aspirational about adoption. Treat the principles as durable; treat specific feature names and stats as point-in-time.

## 14. How we built Triage Intelligence (2025)
**Best for:** AI suggestions in a dense UI, graded autonomy, designing the wait
🔗 https://linear.app/now/how-we-built-triage-intelligence (Sep 3, 2025, Yann-Edern Gillet and Matthijs Wolting)

- **One module:** AI suggestions live in their own module, in Linear's normal visual language.
- **Provenance is always clear:** "you always know what came from the system and what came from your team."
- **Reasoning on demand:** hovering a suggestion shows plain-language reasoning and alternatives.
- **The wait is designed:** a thinking state with a timer, and a thinking panel with the full trace.
- **Autonomy is granted per property type,** and teams steer it with local natural-language guidance.

Full treatment in `agent-experience.md` §4, §5 and §8.

## 15. A Linear spin on Liquid Glass (2025)
**Best for:** mobile, adopting a platform design language, dense professional UI
🔗 https://linear.app/now/linear-liquid-glass (Oct 21, 2025, Robb Böhnke)

Linear applied Liquid Glass "with a ProKit philosophy":
- **Rebuilt the material** rather than using the stock one.
- **Dropped refraction** for legibility.
- **Mirrored Increase Contrast** exactly.
- **Let the tab bar grow** past five items.
- **Used motion to signal state.**

Full treatment in `workflow-ux.md` §6.

## 16. Styling Linear for the future: StyleX (2026)
**Best for:** codifying craft, design-system contracts, agents writing UI code
🔗 https://linear.app/now/styling-linear-for-the-future-stylex (Aug 26, 2026, Kenneth Skovhus)

Linear moved from styled-components to StyleX in more than 1,000 PRs. The goal: make "styling at a distance deliberately difficult, not just discouraged by convention." Patterns like `styled(Button)` had "made it normal to reopen a component from the outside rather than make its styling contract explicit."

- **One styling interface.** The `sx` prop is the standard way components are styled from outside.
- **Tokens are required.** Lint rules and a type-aware checker require shared tokens for colors, typography, shadows, animation, cursors, and thin borders, and standardize hover, press, and link behavior.
- **Exceptions are narrow.** Suppressions must be justified, and escape hatches stay explicit.
- **Agents were part of the reason.** Early agent output during the migration "looked correct but wasn't," and "defining these boundaries is becoming especially important as agents contribute more and more to our codebase."
- **An admission:** "Linear not having a formal design system made this harder."
- **A side effect:** removing runtime style injection cut main-thread CPU work by about 20–35%.

**The lesson:** keep judgment tacit, and enforce the checkable layer in the toolchain. See `boundaries-and-peers.md` #7.

---

## Suggested reading order
1. A calmer interface for a product in motion
2. How we redesigned the Linear UI
3. Output isn't design
4. Design is more than code
5. Design for the AI age
6. Quality Wednesdays
7. Settings are not a design failure
8. Building what customers need
9. Dashboards best practices
10. Why is quality so rare?

---

## Beyond Linear: two craft topics Linear under-documents

Everything above is Linear's own writing. Two craft areas the Linear posts barely touch, worth reading from peers:

### Motion as a communication channel (not only something to suppress)
Linear's desktop writing on motion is mostly about consistency: the Quality Wednesdays defect was a hover that broke the 150ms fade standard. Its iOS work goes further, with motion that signals state (lift on touch, distortion past an edge; see #15). Peers take this further still. Airbnb and Cultured Code treat motion as a designed, owned *artifact* that **communicates**: state changes, spatial continuity, and where something came from or went. Airbnb built and open-sourced **Lottie** so designers' After Effects motion ships pixel-faithfully into production rather than being re-approximated in code; Things uses physics-y "flocking" motion when dragging multiple items so the interaction reads as physical.
- The test for a flourish: does it *communicate* (mark a real state change or spatial relationship) or merely decorate? On a high-frequency work surface, most motion should be invisible (Linear's instinct); at milestones and on consumer/personal apps, expressive motion earns its place. See `boundaries-and-peers.md`, #8.
- 🔗 https://medium.com/airbnb-engineering/introducing-lottie-4ff4a0afac0e · https://medium.com/@jordanborth/an-ode-to-cultured-code-and-things-3-292e20112624

### Context engineering: the model's context window as a finite resource
Linear's agent-era posts use "context" to mean *organizational* context (decisions, the "why," code in one place, SKILL.md principle 11). When you actually build an agent feature, there's a second, literal meaning: the LLM's **context window**, which has diminishing returns and "context rot." Anthropic's guidance: retrieve just-in-time instead of front-loading everything, compact the history as you approach the limit, and isolate sub-agents so they hand back distilled summaries rather than raw transcripts. Pairs with the agent-computer-interface and evals points in SKILL.md principle 8.
- 🔗 https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents · https://www.anthropic.com/engineering/writing-tools-for-agents
