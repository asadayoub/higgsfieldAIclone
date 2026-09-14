# Agent Capture Verification

## Tool and model

- Tool: Codex app, backed by Codex CLI `0.154.0-alpha.6.2`
- Model: `gpt-5.6-sol`
- Reasoning effort: `medium`
- Planning/execution: the same `gpt-5.6-sol` model handles both; no separate planner model is configured

## Automatic capture mechanism

Codex's native project lifecycle hooks are configured in `.codex/hooks.json`.
Both `UserPromptSubmit` and `Stop` invoke `./scripts/capture-agent-turn.sh`
automatically. The script reads the Codex session transcript supplied to the hook,
keeps only user prompt messages and assistant messages whose phase is
`final_answer`, and writes one Markdown file per session under `.agent-logs/`.

Config changed: `.codex/hooks.json`

Capture script: `scripts/capture-agent-turn.sh`

## Canary log paths

- `.agent-logs/2026-09-14_08-22-22_01a09f02-95ff-7c33-b488-9b4af19ea73c.md`
- `.agent-logs/2026-09-14_08-22-46_01a09f02-f63b-7812-ad99-68bb362670b5.md`

## Raw canary entries

[LOG_ENTRY type=PROMPT num=1 session=01a09f02]
timestamp: 2026-09-14T08:22:25.824Z
model: gpt-5.6-sol

CAPTURE TEST — 8x assignment, Asad

[LOG_ENTRY type=RESPONSE num=1 session=01a09f02]
timestamp: 2026-09-14T08:22:30.022Z
model: gpt-5.6-sol

Captured: **8× assignment — Asad**.

---

[LOG_ENTRY type=PROMPT num=1 session=01a09f02]
timestamp: 2026-09-14T08:22:50.800Z
model: gpt-5.6-sol

CAPTURE TEST — 8x assignment, Asad

[LOG_ENTRY type=RESPONSE num=1 session=01a09f02]
timestamp: 2026-09-14T08:22:54.106Z
model: gpt-5.6-sol

Captured: “CAPTURE TEST — 8x assignment, Asad”

## Initial attempt that did not work

The first automatic canary session (`01a09f01-8931-75b3-beb9-889e2bac2da7`)
successfully fired both hooks, but the first version of the extractor looked for
`event_msg` prompt/response records. Non-interactive Codex sessions store those
messages as `response_item` records, so it produced a zero-exchange log at
`.agent-logs/2026-09-14_08-21-13_01a09f01-8931-75b3-beb9-889e2bac2da7.md`.
The extractor was updated to consume `response_item` messages after each
`turn_context`, and the two fresh-session canaries above then passed.
