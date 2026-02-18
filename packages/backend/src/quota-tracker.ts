/**
 * Simple in-memory tracker for model quota exhaustion
 */

interface QuotaStatus {
  modelId: string;
  exhausted: boolean;
  retryAfter?: number; // Unix timestamp
  message?: string;
}

class QuotaTracker {
  private quotaMap = new Map<string, QuotaStatus>();

  /**
   * Mark a model as having exceeded its quota
   */
  markExhausted(modelId: string, retryAfter?: number, message?: string) {
    console.log(`📊 Marking model ${modelId} as quota exhausted until ${retryAfter ? new Date(retryAfter) : 'unknown'}`);
    this.quotaMap.set(modelId, {
      modelId,
      exhausted: true,
      retryAfter,
      message,
    });
  }

  /**
   * Clear quota exhaustion for a model
   */
  clearExhausted(modelId: string) {
    console.log(`✅ Clearing quota exhaustion for model ${modelId}`);
    this.quotaMap.delete(modelId);
  }

  /**
   * Check if a model's quota is currently exhausted
   */
  isExhausted(modelId: string): boolean {
    const status = this.quotaMap.get(modelId);
    if (!status || !status.exhausted) {
      return false;
    }

    // Check if retry time has passed
    if (status.retryAfter && Date.now() >= status.retryAfter) {
      this.clearExhausted(modelId);
      return false;
    }

    return true;
  }

  /**
   * Get quota status for a model
   */
  getStatus(modelId: string): QuotaStatus | null {
    const status = this.quotaMap.get(modelId);
    if (!status) {
      return null;
    }

    // Auto-clear if retry time has passed
    if (status.retryAfter && Date.now() >= status.retryAfter) {
      this.clearExhausted(modelId);
      return null;
    }

    return status;
  }

  /**
   * Get all quota statuses
   */
  getAllStatuses(): Record<string, QuotaStatus> {
    const now = Date.now();
    const statuses: Record<string, QuotaStatus> = {};

    for (const [modelId, status] of this.quotaMap.entries()) {
      // Skip expired entries
      if (status.retryAfter && now >= status.retryAfter) {
        this.clearExhausted(modelId);
        continue;
      }
      statuses[modelId] = status;
    }

    return statuses;
  }
}

export const quotaTracker = new QuotaTracker();
