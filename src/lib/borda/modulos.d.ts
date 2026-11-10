// `.wasm` importado como módulo compilado (regra CompiledWasm do @cloudflare/vite-plugin).
declare module '*.wasm' {
  const modulo: WebAssembly.Module;
  export default modulo;
}

// Tipos mínimos do runtime do Workers usados aqui (o repo não gera `wrangler types`).
declare module 'cloudflare:workers' {
  export const env: { ASSETS: { fetch(url: string | URL): Promise<Response> } };
}
