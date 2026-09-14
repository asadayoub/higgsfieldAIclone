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
Both hook definitions were reviewed and trusted through Codex's native hook-review
screen; Codex persisted their hashes in `~/.codex/config.toml`.

Config changed: `.codex/hooks.json`

Capture script: `scripts/capture-agent-turn.sh`

## Canary log paths

- `.agent-logs/2026-09-14_08-25-17_01a09f05-43bf-71b1-89d2-0c24d81c4181.md`
- `.agent-logs/2026-09-14_08-26-03_01a09f05-f7fe-7f30-8207-9b4cccc248bd.md`

## Raw canary entries

[LOG_ENTRY type=PROMPT num=1 session=01a09f05]
timestamp: 2026-09-14T08:25:22.819Z
model: gpt-5.6-sol

CAPTURE TEST — 8x assignment, Asad

[LOG_ENTRY type=RESPONSE num=1 session=01a09f05]
timestamp: 2026-09-14T08:25:26.732Z
model: gpt-5.6-sol

Captured: **8× assignment — Asad**.

---

[LOG_ENTRY type=PROMPT num=1 session=01a09f05]
timestamp: 2026-09-14T08:26:11.355Z
model: gpt-5.6-sol

CAPTURE TEST — 8x assignment, Asad

[LOG_ENTRY type=RESPONSE num=1 session=01a09f05]
timestamp: 2026-09-14T08:26:22.258Z
model: gpt-5.6-sol

Captured: **TEST — 8x assignment, Asad**.

## Initial attempt that did not work

The first automatic canary session (`01a09f01-8931-75b3-beb9-889e2bac2da7`)
successfully fired both hooks, but the first version of the extractor looked for
`event_msg` prompt/response records. Non-interactive Codex sessions store those
messages as `response_item` records, so it produced a zero-exchange log at
`.agent-logs/2026-09-14_08-21-13_01a09f01-8931-75b3-beb9-889e2bac2da7.md`.
The extractor was updated to consume `response_item` messages after each
`turn_context`.

Two corrected canaries were then run with the per-invocation hook-trust bypass and
captured successfully. A subsequent normal non-interactive run showed that trust had
not yet been persisted and correctly did not run the hooks. I opened Codex's native
hook-review screen, selected **Trust all and continue**, and Codex stored trusted
hashes for both hook definitions. The two fresh-session canaries pasted above were
then run without any trust-bypass flag and both passed.
