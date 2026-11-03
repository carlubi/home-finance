# Workflow UX: how Linear's interaction model works beyond the screen

`ui-ux-craft.md` covers what the interface looks like. This file covers how work moves through the product: how it enters, how attention is routed, how the keyboard model holds together, what gets automated, and what mobile is for.

## Contents
- 1. Say no to busy work: automate the work around work
- 2. Triage is the intake boundary
- 3. Design attention on purpose
- 4. The keyboard model is a grammar
- 5. Standing automation is shared, inspectable infrastructure
- 6. Mobile is a sidekick, not a shrunken desktop

---

## 1. Say no to busy work: automate the work around work
🔗 https://linear.app/method/introduction · https://linear.app/now/cx-in-linear (Nov 6, 2025)

The Linear Method: "Your tools should not make you the designer and maintainer of them. A tool should work for you, not the other way around. Remove or automate 'work around work', so you can focus on what really matters."

- **Status comes from signals people already produce.** PR, branch, and commit activity moves an issue's status through the GitHub integration, so nobody updates it by hand.
- **Close the loop to where the request started.** When an issue resolves, the system "triggers an update back to wherever it originated" (for example, reopening the Intercom conversation so CX can reply to the customer).
- **Push status instead of chasing it.** Pulse delivers project and initiative updates as a daily or weekly digest in the Inbox.

**Test:** does any status here need manual upkeep that an existing signal could drive?

## 2. Triage is the intake boundary
🔗 https://linear.app/docs/triage · https://linear.app/docs/linear-asks

- **New work waits outside the workflow.** Issues from integrations and non-members land in Triage, a separate inbox, and are hidden from normal views because "triage is considered to be outside the normal workflow."
- **Each decision is one key:**
  - `1` accept (moves to the team's default status);
  - `2` duplicate (customer requests and attachments move to the canonical issue);
  - `3` decline;
  - `H` snooze.
- **Someone is named to watch the queue.** Triage Responsibility sets the owner, and the rotation can come from PagerDuty, OpsGenie, Rootly or incident.io.
- **Requesters stay in their own tools.** Linear Asks lets people without accounts file from Slack, email, or web forms, and "updates and replies stay in sync across surfaces."

**The pattern:** keep a hard boundary between "someone asked" and "we committed." Crossing it should take a fast, explicit, reversible decision by a named person.

## 3. Design attention on purpose
🔗 https://linear.app/docs/notifications · https://linear.app/changelog/2026-09-03-priority-inbox

- **Narrow auto-subscription.** You are subscribed when you create an issue, are assigned it, or are @mentioned. A mention in a thread subscribes you to that thread only, "but not to the overall issue."
- **One canonical inbox, de-duplicated across channels.** Email digests are sent with urgency-based delays, and "only sent if you haven't already read the Linear inbox notification."
- **An opinionated priority default, with an escape hatch.** Priority Inbox (Sep 2026) separates urgent items by default, so "a review blocking a release never gets buried." Users can customize it or keep the classic inbox.
- **Deferral is a first-class action:** snooze.

**Test:** who gets auto-subscribed, is it de-duplicated across channels, and can it be deferred?

## 4. The keyboard model is a grammar
🔗 https://linear.app/docs/select-issues · https://linear.app/docs/peek

Keyboard-first only works if the rules are consistent enough to learn once.

- **Highlight is not select.** Arrows or `J`/`K` highlight an item; `X`, Shift-click, or a hover checkbox select it.
- **One action model for one item or many.** Once items are selected you edit them "like you would any issue." The documented pattern: filter to "no priority", press ⌘A, then `P`.
- **Three equal ways in.** Every action can be reached by field shortcut, by ⌘K, or by right-click. Common bulk actions also appear in a bar.
- **Peek is a quasimode.** Tap Space to keep the preview open, or hold Space to preview and release to close (like macOS Quick Look). It turns on automatically while you move through the command menu.

**Test:** is each action reachable by shortcut, command palette, and context menu, and does it behave the same on a multi-selection?

## 5. Standing automation is shared, inspectable infrastructure
🔗 https://linear.app/now/introducing-loops (Nan Yu, Jul 20, 2026) · https://linear.app/docs/triage

- **Loops** automate "repetitive operational work" with Linear Agent, triggered on a schedule or by events. Unlike rigid scripts, they "apply judgment" on edge cases. "Anyone with access can review their instructions … inspect what happened during each run."
- **Triage Rules** are the deterministic counterpart. They run top-down in order, and "if rules conflict, this is surfaced" in the UI rather than resolved silently.

**The pattern:** automation that changes shared work is team infrastructure. Its instructions and run history must be as visible as the work it touches. See `agent-experience.md` §6.

## 6. Mobile is a sidekick, not a shrunken desktop
🔗 https://linear.app/mobile · https://linear.app/now/linear-liquid-glass (Robb Böhnke, Oct 21, 2025)

- **A narrowed job.** The app is a "sidekick, always available in your pocket," for "away from keyboard activities": fast capture (a speed-optimized composer, screenshot-to-issue), inbox triage (swipe, snooze), writing updates, and reading documents. It is native (Swift and Kotlin).
- **A deliberate design register.** For the iOS 26 redesign, Linear applied Liquid Glass "with a ProKit philosophy: purpose-built, disciplined, and designed for sustained focus." That refers to Apple's old split between Aqua and ProKit, the look for information-dense professional apps.
  - **Dropped refraction**, because it "can make dense professional interfaces harder to read."
  - **Kept accessibility settings working:** the custom material "mirrors [Increase Contrast] behavior exactly."
  - **Rebuilt the material itself:** the stock tab bar couldn't change shape or behavior, the rebuild also served iOS 18 users, and depending on "someone else's design system" while it was still moving meant accepting compromises.
  - **A tab bar that grows past five items**, and navigation restructured so managers and executives get a cross-team overview.
- **Motion that signals state.** Elements lift slightly on touch, distort when dragged past an edge, and blur toward the edges, and a modeled light source moves as you interact. This is communicative motion, not decoration (see `boundaries-and-peers.md` #8).

**The lesson:** match the design language to the work. Adopt a platform's aesthetic on your own terms, drop any effect that hurts dense legibility, and own the component when the platform's version blocks a product need.
