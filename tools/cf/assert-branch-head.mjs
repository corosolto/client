#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SHA = /^[0-9a-f]{40}$/;
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const REPOSITORY = /^[^/\s]+\/[^/\s]+$/;

export async function assertBranchHead({
  branch,
  sha,
  repository = process.env.GITHUB_REPOSITORY,
  token = process.env.GITHUB_TOKEN,
  apiUrl = process.env.GITHUB_API_URL || 'https://api.github.com',
  fetchImpl = fetch,
} = {}) {
  if (!BRANCH.test(branch || '') || branch.includes('..')) throw new Error(`ramo inválido: ${branch || '(vazio)'}`);
  if (!SHA.test(sha || '')) throw new Error(`SHA inválido: ${sha || '(vazio)'}`);
  if (!REPOSITORY.test(repository || '')) throw new Error(`GITHUB_REPOSITORY inválido: ${repository || '(vazio)'}`);
  if (!token) throw new Error('GITHUB_TOKEN ausente');

  const endpoint = `${apiUrl.replace(/\/$/, '')}/repos/${repository}/git/ref/heads/${encodeURIComponent(branch)}`;
  const response = await fetchImpl(endpoint, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
    },
  });
  if (!response.ok) throw new Error(`GitHub recusou leitura de ${branch}: HTTP ${response.status}`);
  const current = (await response.json())?.object?.sha;
  if (!SHA.test(current || '')) throw new Error(`GitHub não retornou SHA válido para ${branch}`);
  if (current !== sha) throw new Error(`deploy obsoleto bloqueado: ${branch} está em ${current}, candidato é ${sha}`);
  return current;
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const arg = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3) || '';
  const branch = arg('branch');
  const sha = arg('sha');
  await assertBranchHead({ branch, sha });
  console.log(`branch-head: ${branch} continua em ${sha}`);
}
