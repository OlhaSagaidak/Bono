import "server-only";
import path from "node:path";
import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { EMBEDDING_DIMENSIONS } from "@/db/schema";

// Turns text into a 384-number vector that captures its meaning, so that
// posts about similar things end up close together. Runs a small open-source
// model (all-MiniLM-L6-v2, 8-bit) inside the app: no API key, no cost.
// It's English-only; non-English posts also carry English cause tags.

export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

// Downloaded once into the project (gitignored). Render fetches it during the
// build (`npm run models:fetch`), so a restart doesn't download it again.
env.cacheDir = path.join(process.cwd(), ".cache", "models");

// Loading takes about a second and ~90 MB, so do it once per process and
// share it, including across Next's dev hot reloads.
const globalForModel = globalThis as unknown as { embedder?: Promise<FeatureExtractionPipeline> };

function embedder(): Promise<FeatureExtractionPipeline> {
  globalForModel.embedder ??= pipeline("feature-extraction", EMBEDDING_MODEL, { dtype: "q8" }).catch((error) => {
    globalForModel.embedder = undefined; // let the next call retry
    throw error;
  });
  return globalForModel.embedder;
}

/**
 * One vector per text. Vectors are normalized (length 1), so the similarity of
 * two of them is just their dot product, the same as cosine similarity.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const output = await (await embedder())(texts, { pooling: "mean", normalize: true });
  const vectors = output.tolist() as number[][];
  if (vectors.some((v) => v.length !== EMBEDDING_DIMENSIONS)) {
    throw new Error(`Expected ${EMBEDDING_DIMENSIONS}-dimension embeddings from ${EMBEDDING_MODEL}`);
  }
  return vectors;
}

/** What gets embedded for a post: its words plus its cause tags, in English. */
export function postEmbeddingText(body: string, causeLabels: string[]): string {
  return causeLabels.length ? `${body}\n\nCauses: ${causeLabels.join(", ")}` : body;
}
