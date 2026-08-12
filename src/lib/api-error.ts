type ErrorPayload = {
  error: string;
  message?: string;
};

export function jsonError(status: number, error: string, message?: string) {
  const body: ErrorPayload = { error };
  if (message) body.message = message;
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function logInternalError(scope: string, error: unknown, extra?: Record<string, unknown>) {
  console.error(`[${scope}]`, {
    error,
    ...extra,
  });
}
