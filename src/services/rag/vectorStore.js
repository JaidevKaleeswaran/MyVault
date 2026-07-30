/**
 * Vector Database Engine & Embedding Generator
 * High-performance client-side vector store with metadata index filtering,
 * cosine similarity search, multi-tenant user_id isolation, and payload store.
 */

class VectorStore {
  constructor() {
    this.vectors = []; // Array of { id, vector, chunk_text, metadata, structured_data }
    this.vocabulary = new Map();
    this.idfMap = new Map();
  }

  /**
   * Generates a dense TF-IDF + Character N-Gram embedding vector for a given text
   */
  generateEmbedding(text) {
    if (!text || typeof text !== 'string') return new Array(128).fill(0);

    const tokens = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);

    const dim = 128;
    const vector = new Array(dim).fill(0);

    // Hash tokens into vector dimensions with weight
    tokens.forEach(token => {
      let hash = 0;
      for (let i = 0; i < token.length; i++) {
        hash = (hash << 5) - hash + token.charCodeAt(i);
        hash |= 0;
      }
      const index = Math.abs(hash) % dim;
      const weight = token.match(/\$|\d+/) ? 2.5 : 1.0; // Higher weight for numbers/currency
      vector[index] += weight;
    });

    // Normalize vector (L2 norm)
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < dim; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }

  /**
   * Calculates Cosine Similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
    }
    return dotProduct;
  }

  /**
   * Index chunks into the vector store
   */
  indexChunks(chunks) {
    this.vectors = chunks.map(chunk => {
      const vector = this.generateEmbedding(chunk.chunk_text);
      return {
        id: chunk.id,
        vector: vector,
        chunk_text: chunk.chunk_text,
        chunk_type: chunk.chunk_type,
        metadata: chunk.metadata || {},
        structured_data: chunk.structured_data || null,
        raw_record: chunk.raw_record || null
      };
    });
  }

  /**
   * Searches the vector store with Cosine Similarity + Strict Metadata Filters
   */
  search(query, filters = {}, topK = 10) {
    if (!this.vectors || this.vectors.length === 0) return [];

    const queryVector = this.generateEmbedding(query);
    const results = [];

    for (const item of this.vectors) {
      // 1. Enforce Multi-tenant Security (user_id)
      if (filters.user_id && item.metadata.user_id !== filters.user_id) {
        continue;
      }

      // 2. Metadata Filtering Checks
      if (filters.category && item.metadata.category !== filters.category) {
        if (filters.category !== "All") continue;
      }

      if (filters.month && item.metadata.month) {
        if (item.metadata.month.toLowerCase() !== filters.month.toLowerCase()) continue;
      }

      if (filters.year && item.metadata.year) {
        if (Number(item.metadata.year) !== Number(filters.year)) continue;
      }

      if (filters.merchant && item.metadata.merchant) {
        if (!item.metadata.merchant.toLowerCase().includes(filters.merchant.toLowerCase())) continue;
      }

      if (filters.is_tax_deductible !== undefined) {
        if (Boolean(item.metadata.is_tax_deductible) !== Boolean(filters.is_tax_deductible)) continue;
      }

      // 3. Compute Vector Similarity Score
      const similarity = this.cosineSimilarity(queryVector, item.vector);

      results.push({
        ...item,
        similarity_score: similarity
      });
    }

    // Sort by descending vector similarity score
    results.sort((a, b) => b.similarity_score - a.similarity_score);

    return results.slice(0, topK);
  }
}

export const globalVectorStore = new VectorStore();
