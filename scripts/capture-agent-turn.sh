#!/bin/sh

set -eu

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
log_dir="$repo_root/.agent-logs"
hook_input=$(mktemp "${TMPDIR:-/tmp}/codex-capture.XXXXXX")
trap 'rm -f "$hook_input"' EXIT HUP INT TERM
cat >"$hook_input"

transcript_path=$(jq -r '.transcript_path // empty' "$hook_input")
session_id=$(jq -r '.session_id // empty' "$hook_input")

if [ -z "$transcript_path" ] || [ ! -f "$transcript_path" ]; then
  exit 0
fi

mkdir -p "$log_dir"

meta=$(sed -n '1p' "$transcript_path")
if [ -z "$session_id" ]; then
  session_id=$(printf '%s\n' "$meta" | jq -r '.payload.id // .payload.session_id // empty')
fi

started_at=$(printf '%s\n' "$meta" | jq -r '.payload.timestamp // .timestamp')
date=$(printf '%s' "$started_at" | cut -c1-10)
clock=$(printf '%s' "$started_at" | cut -c12-19 | tr ':' '-')
short_session=$(printf '%.8s' "$session_id")
model_fallback=$(jq -r '.model // empty' "$hook_input")
if [ -z "$model_fallback" ]; then
  model_fallback=$(jq -r 'select(.type == "turn_context") | .payload.model' "$transcript_path" | head -n 1)
fi
if [ -z "$model_fallback" ]; then
  model_fallback="unknown"
fi

author=$(git -C "$repo_root" config --get github.user 2>/dev/null || true)
if [ -z "$author" ]; then
  author=$(git -C "$repo_root" config --get user.name 2>/dev/null || true)
fi
if [ -z "$author" ]; then
  author="unknown"
fi

project=$(basename "$repo_root" | tr '[:upper:] ' '[:lower:]-')
output="$log_dir/${date}_${clock}_${session_id}.md"
tmp_output=$(mktemp "$log_dir/.capture.XXXXXX")
trap 'rm -f "$hook_input" "$tmp_output"' EXIT HUP INT TERM

jq -s --arg fallback_model "$model_fallback" '
  reduce .[] as $item (
    {model: $fallback_model, in_turn: false, pending: null, exchanges: []};
    if $item.type == "turn_context" then
      .model = ($item.payload.model // .model)
      | .in_turn = true
    elif $item.type == "response_item"
      and $item.payload.type == "message"
      and $item.payload.role == "user"
      and .in_turn
      and .pending == null then
      .pending = {
        prompt: ([$item.payload.content[]? | select(.type == "input_text") | .text] | join("\n\n")),
        prompt_time: $item.timestamp,
        model: .model
      }
    elif $item.type == "response_item"
      and $item.payload.type == "message"
      and $item.payload.role == "assistant"
      and $item.payload.phase == "final_answer"
      and .pending != null then
      .exchanges += [{
        prompt: .pending.prompt,
        prompt_time: .pending.prompt_time,
        response: ([$item.payload.content[]? | select(.type == "output_text") | .text] | join("\n\n")),
        response_time: $item.timestamp,
        model: .pending.model
      }]
      | .pending = null
      | .in_turn = false
    else . end
  ) | .exchanges
' "$transcript_path" >"$tmp_output.json"

total=$(jq 'length' "$tmp_output.json")
first_prompt_time=$(jq -r 'if length > 0 then .[0].prompt_time else "" end' "$tmp_output.json")
last_prompt_time=$(jq -r 'if length > 0 then .[-1].prompt_time else "" end' "$tmp_output.json")
models=$(jq -r 'map(.model) | unique | join(", ")' "$tmp_output.json")
if [ -z "$models" ]; then
  models="$model_fallback"
fi

{
  printf '%s\n' '---'
  printf 'session_id: %s\n' "$session_id"
  printf 'date: %s\n' "$date"
  printf 'author: %s\n' "$author"
  printf 'model: %s\n' "$models"
  printf 'tool: codex-app (codex-cli 0.154.0-alpha.6.2)\n'
  printf 'project: %s\n' "$project"
  printf 'total_exchanges: %s\n' "$total"
  printf 'first_prompt_time: %s\n' "$first_prompt_time"
  printf 'last_prompt_time: %s\n' "$last_prompt_time"
  printf '%s\n\n' '---'
  printf '# Session Log - %s\n\n' "$date"
  printf 'Session: `%s` | Project: `%s` | Author: `%s`\n\n' "$short_session" "$project" "$author"
  printf '%s\n' '---'

  jq -r --arg session "$short_session" '
    to_entries[] |
    "\n[LOG_ENTRY type=PROMPT num=\(.key + 1) session=\($session)]\n" +
    "timestamp: \(.value.prompt_time)\n" +
    "model: \(.value.model)\n\n" +
    .value.prompt + "\n\n" +
    "[LOG_ENTRY type=RESPONSE num=\(.key + 1) session=\($session)]\n" +
    "timestamp: \(.value.response_time)\n" +
    "model: \(.value.model)\n\n" +
    .value.response + "\n"
  ' "$tmp_output.json"
} >"$tmp_output"

mv "$tmp_output" "$output"
rm -f "$tmp_output.json"
trap 'rm -f "$hook_input"' EXIT HUP INT TERM
