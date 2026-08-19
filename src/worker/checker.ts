export interface CheckResult {
  statusCode: number | null;
  responseTimeMs: number;
  isFailure: boolean;
  error?: string;
}

export async function performCheck(url: string, timeoutMs: number): Promise<CheckResult> {
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    return {
      statusCode: response.status,
      responseTimeMs: Date.now() - start,
      isFailure: response.status >= 400,
    };
  } catch (error) {
    return {
      statusCode: null,
      responseTimeMs: Date.now() - start,
      isFailure: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}