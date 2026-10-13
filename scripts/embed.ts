// `npm run embed`: embeds the causes and every post that has no vector yet.
// `npm run embed -- --all` re-embeds every post (e.g. after changing the model
// or what gets embedded). Safe to run any time.
import { db } from "@/db";
import { embedCauses, embedPosts } from "@/lib/ai/embed-posts";

async function main() {
  const all = process.argv.includes("--all");
  const started = Date.now();
  const causeCount = await embedCauses();
  const postCount = await embedPosts({ onlyMissing: !all });
  console.log(`Embedded ${causeCount} causes and ${postCount} posts in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$client.end());
