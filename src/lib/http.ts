// Respostas JSON das API routes. O par JSON.stringify + header
// 'content-type' estava repetido ~30 vezes nos endpoints.
export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

// atalho pro caso mais comum: { error: '...' } com status de erro
export const jsonError = (error: string, status: number): Response => json({ error }, status);
