# Agent experience (AX): designing for agents and the humans who work with them

SKILL.md principle 8 is the summary. This file has the detail and the sources. It covers two audiences:

- **The human** who delegates to, watches, and corrects an agent.
- **The agent** itself, which consumes tools, schemas, and context.

Linear designs both, and most of what follows is Linear's own published practice from 2025–2026.

## Contents
- 1. The Agent Interaction Guidelines (AIG)
- 2. Assign vs delegate: accountability in the data model
- 3. A typed activity vocabulary, not free-form comments
- 4. Autonomy is a dial, granted per decision type
- 5. Designing the wait when latency is inherent
- 6. Accountability is not per-step approval
- 7. The agent's own interface: tools, identity, context
- 8. A visual language for AI state

---

## 1. The Agent Interaction Guidelines (AIG)
🔗 https://linear.app/developers/aig (published with the Agent Interaction SDK, Aug 2025; Linear calls it "a living document")

Linear's six rules for any agent that works in a shared product alongside people:

1. **An agent should always disclose that it's an agent.** "Humans need instant certainty about who they are interacting with." In Linear, agents carry an "Agent" badge in the assignee menu.
2. **An agent should inhabit the platform natively.** It works through existing UI patterns and standard actions, so its work shows up in the same activity feed as a human's.
3. **An agent should provide instant feedback.** "Silence leads to uncertainty." Acknowledge immediately, but unobtrusively.
4. **An agent should be clear and transparent about its internal state.** Thinking, waiting for input, executing, or finished should be readable at a glance. Reasoning, tool calls, prompts, and decision logic should be open to inspection on demand.
5. **An agent should respect requests to disengage.** It steps back right away and re-engages only on a clear signal. Karri Saarinen: an agent that keeps going "erodes trust faster than one that makes mistakes."
6. **An agent cannot be held accountable.** There is a clear delegation model, and final responsibility stays with a human.

This is the origin of the "an agent cannot be held accountable" line. The 2026 Linear Agent posts and Saarinen's Every essay (Apr 2026) restate it.

## 2. Assign vs delegate: accountability in the data model
🔗 https://linear.app/now/our-approach-to-building-the-agent-interaction-sdk (Leela Senthil Nathan, Aug 1, 2025) · https://linear.app/docs/agents-in-linear

"Issues can only be assigned to humans, and only delegated to agents." An issue has two separate fields: the human **assignee**, who is accountable, and the agent **delegate**, who does the work. Assigning an issue to an agent makes the agent the delegate, and the human stays the assignee.

- **The problem it solved:** before delegation, "you'd sometimes see an agent with dozens of issues assigned, but no clear sense of who was behind them."
- **A rejected alternative:** sub-issues. They were ruled out because sub-issues have their own independent owners.
- **Delegated work stays visible to the owner:** it appears in the human's My issues, and views and Insights can filter or segment by delegate.
- **Rule for agent builders** (from https://linear.app/developers/agent-best-practices): set yourself as delegate only when you are actually implementing. If an automation, not a human, delegated the work, leave the issue in triage and leave assignment to a human.

**The general lesson:** when a role must never belong to an agent, make it a separate field the agent cannot occupy. A policy the agent is asked to follow is weaker.

## 3. A typed activity vocabulary, not free-form comments
🔗 https://linear.app/developers/agent-interaction

Each agent run is an **AgentSession**, and the agent communicates only by emitting typed activities, which the server validates:

| Activity | Meaning |
|---|---|
| `thought` | reasoning or status |
| `action` | a tool call, optionally with its result |
| `elicitation` | a question for the user |
| `response` | the work is done |
| `error` | something failed |

- **Who can send what:** a user's reply is a separate `prompt` type that the agent cannot emit.
- **State is derived:** Linear works out the visible session state (pending, active, awaitingInput, error, complete, stale) from the last activity. Developers never set state by hand.
- **Transient status doesn't pile up:** `thought` and `action` can be marked **ephemeral**, so the next activity replaces them.
- **Plans:** agents can publish a Plan, a list of steps each marked pending, inProgress, completed or canceled. Each update replaces the whole Plan (technology preview).
- **History is trustworthy:** it is read from activities, which are immutable snapshots, not from editable comments.

**The design method:** give agent status a finite vocabulary and derive the state machine from it. Only then can a dense UI show many third-party agents calmly and consistently. Linear calls this "flexible guardrails": a few platform primitives, plus constraints agents opt into.

## 4. Autonomy is a dial, granted per decision type
🔗 https://linear.app/now/self-driving-saas (Saarinen, Oct 22, 2025) · https://linear.app/now/how-we-built-triage-intelligence (Yann-Edern Gillet and Matthijs Wolting, Sep 3, 2025) · https://linear.app/changelog/2025-09-19-auto-apply-triage-suggestions

"Self-driving SaaS" names three levels of autonomy:

- **Assistive:** the system suggests, "the way a lane-departure warning beeps."
- **Interactive:** "the system takes the first pass and you correct what doesn't fit."
- **Full:** the system drives start to finish, and you confirm the destination.

Humans keep direction ("you decide which projects to pursue"). "We also clearly identify these AI actions after they've been taken, so you can easily reverse or modify them."

Triage Intelligence is the worked example:

- **What it suggests:** team, project, assignee, labels, duplicates, and related issues, drawn from the existing backlog.
- **Autonomy per decision type:** each team chooses show, hide, or auto-apply for each property type, and can auto-apply only certain values (auto-apply the "bug" label but no others).
- **Visible provenance:** auto-applied values are clearly marked and can be reviewed or changed on hover.
- **Steering:** teams add plain-language **Additional guidance** at workspace, team, or sub-team level, and the most local level carries the most weight. Linear recommends adding guidance *reactively* when a wrong pattern keeps recurring, not writing it all up front.
- **Stated principles:** trust (you can see where a suggestion came from), transparency (the reasoning is visible), and "a natural extension of Linear, not an add-on."

**The lesson:** grant autonomy one narrow, trusted decision type at a time. Always mark what the machine did, and make overriding it cheap. This is also a case of settings holding a real preference (principle 9).

## 5. Designing the wait when latency is inherent
🔗 https://linear.app/now/how-we-built-triage-intelligence · https://linear.app/developers/agent-best-practices

Principle 6's "nothing to wait for" rule covers deterministic operations. LLM work is slow by nature, so Linear designs the wait instead of pretending it away:

- **Quality over speed:** Triage Intelligence moved from small fast models to larger reasoning models. Suggestions now take about 1–4 minutes, which the team accepted because most issues aren't triaged that quickly anyway.
- **Visible progress:** it shows a **thinking state with a timer**, so the feature "feels active rather than idle," and a thinking panel with the full trace (the context pulled in and the decisions made).
- **Hard limits for third-party agents:**
  - acknowledge the webhook within 5s;
  - emit a first `thought` (or an external URL) within 10s, or the session shows as unresponsive;
  - after 30 minutes without activity the session goes **stale**, which is recoverable.

**The rule:** remove the wait when you can. When you can't, acknowledge within seconds, show honest live progress, and make silence a defined failure state.

## 6. Accountability is not per-step approval
🔗 https://every.to/thesis/how-to-design-for-human-agent-interaction (Saarinen, Apr 3, 2026) · https://linear.app/now/introducing-loops (Nan Yu, Jul 20, 2026)

Saarinen warns that "human in the loop," taken literally, means a person approving every step. That makes the human "a bottleneck, rubber-stamping work rather than directing it." In his view, AI's "slippery feeling" is usually an interface problem, not a model problem.

The important design work happens before the agent starts:

1. Shape the system (plans, backlog, code, docs) so the agent already has the context and constraints it needs.
2. Delegate visibly.
3. Hold the person who delegated accountable for the outcome.

Standing agent work follows the same pattern. **Skills** (saved from a good conversation), **Automations** (for example, on entering triage), and **Loops** (plain-language recurring jobs, run on a schedule or on events) keep their instructions, configuration, and every run's results open to anyone with access.

**How this fits with peer guidance:** keep explicit confirmation for consequential or irreversible actions (OpenAI, Operator). Don't turn routine agent work into step-by-step approval; make it inspectable and attributable instead.

## 7. The agent's own interface: tools, identity, context
🔗 https://linear.app/now/how-we-built-linear-agent (Matthijs Wolting, Aug 10, 2026) · https://linear.app/developers/agents

- **Product-level tools, not raw primitives.** Linear did not give its own agent its SDK, CLI, or GraphQL API. Those "would arguably enable more sophisticated behavior" but "increase the surface area for mistakes." Linear traded "some breadth for predictability."
- **Constraints live in tool design, not the prompt.** "We shape each tool so its parameters are easy to understand, and make invalid actions impractical to take." It works like a good UI, where intuitive behavior needs no explanation.
- **Confirmation depends on context.** The agent deletes what it created in the current session without asking, but "should pause before deleting an existing issue." It asks before posting to a comment thread synced with a public repo, and before substantially expanding a request's scope.
- **Load capabilities progressively.** "System skills" (metadata, a prompt fragment, and tools) are preloaded based on where the agent was invoked, or loaded on demand. Invoking it from a project's Slack channel loads the projects skill. Tone adapts to the surface: more conversational in Slack than in a Loop.
- **Give the agent its own least-privilege identity.** Installing with OAuth `actor=app` creates a dedicated app user.
  - The installing admin chooses which teams it can access.
  - Interactive capabilities are opt-in (`app:assignable`, `app:mentionable`).
  - App users cannot sign in, use admin functions, or manage users, and they aren't billable seats.

  The developer's rule of thumb: build an *integration* when actions should be attributed to individual people, and build an *agent* when it should appear as a distinct workspace member.
- **Push context to the agent; don't make it scrape.** The session-created webhook carries a formatted `promptContext` (the issue, its parent, the project, comment threads) plus the Additional guidance. Linear's MCP server offers a read-only endpoint and scope. Later changes let its tools accept names instead of UUIDs, which matches Anthropic's human-readable-fields advice.

## 8. A visual language for AI state
🔗 https://linear.app/now/how-we-built-triage-intelligence · Gillet, "Faster loops" (Dec 4, 2025)

- **One dedicated module:** AI suggestions live in their own module, "visible enough to be useful, without adding extra noise to an already dense screen."
- **Familiar visual language:** suggestions "use the same visual language as the rest of Linear."
- **Clear provenance:** Linear is careful "not to blur the line between issue metadata set by humans or rules and suggestions," so "you always know what came from the system and what came from your team."
- **An owned design area:** Gillet describes 2025's work as setting "the foundations of our design language when it comes to AI: the activity states, the agent statuses, how progress is shown, and how the system reacts."
- **The open problem:** orchestration, meaning how users "maintain control when many things happen in parallel," and how to surface all that activity without overwhelming people.

> **Sourcing note:** almost everything here is first-party, from launch posts and developer docs. The rules (disclosure, delegation, typed state, graded autonomy) are the durable part. Timeouts, scope names, and feature names are a 2025–2026 snapshot.
