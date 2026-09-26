const messages = new Set([
  "Use a 16:9 reference for this Hailuo workflow.",
  "Sign in to access private generations.",
  "Run unavailable.",
  "Results unavailable.",
  "Reference unavailable.",
  "Run identity unavailable.",
  "This run identity belongs to another recipe.",
  "This live provider is disabled. A superadmin can enable it in provider settings.",
  "Connect a valid provider key before running.",
  "Could not reserve this run. Check the database migration and the limit of 10 runs/hour and 3 active runs.",
  "Could not claim this run.",
  "Could not update this run.",
  "Reconnect this provider key to retrieve the run.",
  "This submission cannot be cancelled here. Check the provider dashboard.",
  "Reconnect your provider key to cancel this run.",
  "Choose a model available for this funding method.",
  "Verify your email before using the free daily allowance.",
  "This OpenRouter workflow is currently disabled.",
  "This huggingface workflow is currently disabled.",
  "Hugging Face is available only through the free allowance.",
  "Hugging Face capacity is temporarily unavailable.",
  "The free daily allowance is temporarily unavailable.",
  "Connect a valid OpenRouter key before using personal billing.",
  "Your three free generations are used for today.",
  "The platform-funded daily budget is currently used.",
  "Could not reserve this run. Check the database migration and generation limits.",
  "Reconnect your OpenRouter key to retrieve this run.",
  "System-funded retrieval is temporarily unavailable.",
  "This OpenRouter submission cannot be cancelled here. Closing the page does not cancel provider billing.",
]);
export function publicGenerationError(error: unknown): string {
  return error instanceof Error && messages.has(error.message)
    ? error.message
    : "Generation unavailable. Reopen this result before starting another paid run.";
}
