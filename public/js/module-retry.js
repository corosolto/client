const FALHA_TRANSITORIA = /failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module|load failed|network error|networkerror/i;

export async function carregarModuloComRetry(carregar, recarregar, { espera = 350, dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  try {
    return await carregar();
  } catch (error) {
    if (!FALHA_TRANSITORIA.test(String(error?.message || error))) throw error;
    await dormir(espera);
    return recarregar();
  }
}
