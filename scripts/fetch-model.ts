// `npm run models:fetch`: downloads the embedding model into .cache/models.
// Run during the Render build so the server never downloads it at runtime.
import { embedTexts, EMBEDDING_MODEL } from "@/lib/ai/embeddings";

embedTexts(["warm-up"])
  .then(() => console.log(`Embedding model ready: ${EMBEDDING_MODEL}`))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
