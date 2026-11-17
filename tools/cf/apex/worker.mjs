// Worker só do apex csbrasil.online: 308 para o www com caminho e query, sem assets nem SSR.
// Mantém o csb-prod fora do caminho dos estáticos (run_worker_first só na home).
import { redirectDeHost } from '../../../src/cf/borda.mjs';

export default {
  fetch(request) {
    return redirectDeHost(new URL(request.url)) ?? new Response('host fora do apex', { status: 404 });
  },
};
