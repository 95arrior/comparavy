import {
  getOpenAIReviewDiagnostics,
  probeOpenAIEditorialReview,
} from "@/lib/aiGuideReviewer";

function printDiagnostics(): void {
  const diagnostics = getOpenAIReviewDiagnostics();

  console.log("OpenAI diagnostics");
  console.log(`OPENAI_API_KEY present: ${diagnostics.apiKeyPresent ? "yes" : "no"}`);
  console.log(`OPENAI_MODEL value: ${diagnostics.model}`);
  console.log(`OPENAI_REASONING_EFFORT value: ${diagnostics.reasoningEffort}`);
  console.log(`Running in GitHub Actions: ${diagnostics.runningInGitHubActions ? "yes" : "no"}`);

  if (!diagnostics.apiKeyPresent) {
    console.error("OPENAI_API_KEY is missing.");
    console.error("Set or update repository secret OPENAI_API_KEY under Settings → Secrets and variables → Actions.");
    process.exitCode = 1;
    return;
  }
}

async function main(): Promise<void> {
  printDiagnostics();

  if (process.exitCode) {
    return;
  }

  const probe = await probeOpenAIEditorialReview();

  if (probe.available) {
    console.log(`OpenAI connectivity check: success using ${probe.model}`);
    return;
  }

  console.error("OpenAI connectivity check: failed");
  if (probe.statusCategory) {
    console.error(`Status category: ${probe.statusCategory}`);
  }
  if (probe.unavailableReason) {
    console.error(probe.unavailableReason);
  }
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(String(error));
  process.exitCode = 1;
});
