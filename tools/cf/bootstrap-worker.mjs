export default {
  async fetch() {
    return new Response('Worker aguardando versão verificada', {
      status: 503,
      headers: {
        'cache-control': 'no-store',
        'content-type': 'text/plain; charset=utf-8',
      },
    });
  },
};
