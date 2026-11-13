#!/usr/bin/env node
import Ajv from 'ajv/dist/2020.js';
import { constants } from 'node:fs';
import {
  lstat,
  link,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
} from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_SCHEMA = fileURLToPath(new URL('../schemas/asset-pack.schema.json', import.meta.url));
const INERT_ASSET_EXTENSIONS = new Set([
  '.aac', '.avif', '.basis', '.bin', '.collision', '.csv', '.dat', '.dds',
  '.exr', '.fixture', '.flac', '.gif', '.glb', '.gltf', '.hdr', '.jpeg',
  '.jpg', '.json', '.jsonl', '.ktx2', '.m4a', '.md', '.mesh', '.meshopt',
  '.mov', '.mp3', '.mp4', '.nav', '.navmesh', '.ogg', '.opus', '.otf',
  '.pdf', '.png', '.region', '.spawn', '.toml', '.ttf', '.txt', '.wav',
  '.webm', '.webp', '.woff', '.woff2', '.xml', '.yaml', '.yml',
]);

class PackError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.code = code;
  }
}

const fail = (code, message, options) => { throw new PackError(code, message, options); };
const isContained = (root, candidate) => {
  const relative = path.relative(root, candidate);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};

async function regularFile(file, label) {
  let info;
  try { info = await lstat(file); } catch (error) {
    if (error.code === 'ENOENT') fail('E_MISSING', `${label} does not exist: ${file}`);
    throw error;
  }
  if (info.isSymbolicLink()) fail('E_SYMLINK', `${label} must not be a symbolic link: ${file}`);
  if (!info.isFile()) fail('E_NOT_FILE', `${label} is not a regular file: ${file}`);
  return info;
}

async function canonicalDirectory(directory, label) {
  let info;
  try { info = await lstat(directory); } catch (error) {
    if (error.code === 'ENOENT') fail('E_MISSING', `${label} does not exist: ${directory}`);
    throw error;
  }
  if (!info.isDirectory() && !info.isSymbolicLink()) fail('E_NOT_DIRECTORY', `${label} is not a directory: ${directory}`);
  const resolved = await realpath(directory);
  const canonicalInfo = await lstat(resolved);
  if (!canonicalInfo.isDirectory()) fail('E_NOT_DIRECTORY', `${label} is not a directory: ${directory}`);
  return resolved;
}

function validatePath(entry) {
  const value = entry.path;
  if (value.includes('\0') || value.includes('\\') || value.includes(':') || path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) {
    fail('E_PATH', `Unsafe package path: ${JSON.stringify(value)}`);
  }
  const segments = value.split('/');
  const invalidSegment = segment => segment === '' || segment === '.' || segment === '..'
    || /[<>:"\\|?*\u0000-\u001f]/.test(segment) || /[. ]$/.test(segment)
    || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment);
  if (segments.some(invalidSegment) || path.posix.normalize(value) !== value) {
    fail('E_PATH', `Non-canonical or non-portable package path: ${JSON.stringify(value)}`);
  }
  if (value.normalize('NFC').toLowerCase() === 'manifest.json') fail('E_PATH', 'manifest.json is reserved for the pack manifest');
  if (!INERT_ASSET_EXTENSIONS.has(path.posix.extname(value).toLowerCase())) {
    fail('E_EXECUTABLE', `Unsupported or executable pack content is forbidden: ${value}`);
  }
}

function validateReleaseIdentity(manifest) {
  if (!['map', 'character', 'viewmodel', 'skin'].includes(manifest.kind)) fail('E_IDENTITY', `Unsafe pack kind: ${manifest.kind}`);
  if (typeof manifest.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(manifest.id)) fail('E_IDENTITY', `Unsafe pack ID: ${manifest.id}`);
  if (typeof manifest.version !== 'string' || !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(manifest.version)) fail('E_IDENTITY', `Unsafe pack version: ${manifest.version}`);
}

function validateInventory(manifest) {
  const files = new Map();
  const aliases = new Map();
  for (const entry of manifest.files) {
    validatePath(entry);
    if (!Number.isSafeInteger(entry.bytes)) fail('E_SIZE', `Byte size is not a safe integer: ${entry.path}`);
    if (files.has(entry.path)) fail('E_DUPLICATE_PATH', `Duplicate package path: ${entry.path}`);
    const alias = entry.path.normalize('NFC').toLowerCase();
    if (aliases.has(alias)) fail('E_DUPLICATE_PATH', `Package paths collide on portable filesystems: ${aliases.get(alias)} and ${entry.path}`);
    files.set(entry.path, entry);
    aliases.set(alias, entry.path);
  }
  for (const file of files.keys()) {
    const segments = file.split('/');
    for (let index = 1; index < segments.length; index++) {
      const parent = segments.slice(0, index).join('/');
      const parentAlias = parent.normalize('NFC').toLowerCase();
      if (aliases.has(parentAlias)) fail('E_PATH_CONFLICT', `File and directory paths conflict on portable filesystems: ${aliases.get(parentAlias)} and ${parent}`);
    }
  }
  if (manifest.kind === 'map') {
    const roleOwners = new Map();
    const ownRolePath = (role, rolePath) => {
      if (typeof rolePath !== 'string') fail('E_ROLE_REFERENCE', `Map ${role} path must be a string`);
      validatePath({ path: rolePath });
      if (!files.has(rolePath)) fail('E_ROLE_REFERENCE', `Map ${role} path is not declared in files: ${rolePath}`);
      if (roleOwners.has(rolePath)) fail('E_ROLE_REFERENCE', `Map path has multiple role declarations: ${rolePath} (${roleOwners.get(rolePath)} and ${role})`);
      roleOwners.set(rolePath, role);
    };
    const roles = ['geometry', 'textures', 'collision', 'navigation', 'spawns', 'regions', 'previews'];
    for (const role of roles) {
      if (!Array.isArray(manifest[role]) || manifest[role].length === 0) fail('E_MAP_CONTRACT', `Map role must be a non-empty path array: ${role}`);
      for (const rolePath of manifest[role]) ownRolePath(role, rolePath);
    }
    if (!manifest.lods || typeof manifest.lods !== 'object' || Array.isArray(manifest.lods) || !Array.isArray(manifest.lods.low) || manifest.lods.low.length === 0) {
      fail('E_MAP_CONTRACT', 'Map lods.low must be a non-empty path array');
    }
    for (const [profile, paths] of Object.entries(manifest.lods)) {
      if (!Array.isArray(paths) || paths.length === 0) fail('E_MAP_CONTRACT', 'Every LOD profile must be a non-empty path array');
      for (const rolePath of paths) ownRolePath(`lods.${profile}`, rolePath);
    }
    for (const rolePath of manifest.evidence || []) ownRolePath('evidence', rolePath);
    for (const file of files.keys()) {
      if (!roleOwners.has(file)) fail('E_ROLE_REFERENCE', `Pack file has no map role declaration: ${file}`);
    }
  }
  return [...files.values()].sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
}

async function readManifest(manifestPath) {
  await regularFile(manifestPath, 'Manifest');
  const beforeIdentity = await lstat(manifestPath, { bigint: true });
  let handle;
  try {
    handle = await open(manifestPath, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
    const opened = await handle.stat({ bigint: true });
    const canonical = await realpath(manifestPath);
    const canonicalIdentity = await lstat(canonical, { bigint: true });
    if (!opened.isFile() || opened.dev !== beforeIdentity.dev || opened.ino !== beforeIdentity.ino
      || opened.dev !== canonicalIdentity.dev || opened.ino !== canonicalIdentity.ino) {
      fail('E_RACE', `Manifest changed while being opened: ${manifestPath}`);
    }
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    if (after.dev !== opened.dev || after.ino !== opened.ino || after.size !== opened.size
      || after.mtimeNs !== opened.mtimeNs || after.ctimeNs !== opened.ctimeNs) {
      fail('E_RACE', `Manifest changed while being read: ${manifestPath}`);
    }
    let manifest;
    try { manifest = JSON.parse(bytes.toString('utf8')); } catch (error) {
      fail('E_MANIFEST_JSON', `Manifest is not valid JSON: ${error.message}`);
    }
    return { bytes, manifest };
  } finally {
    if (handle) await handle.close().catch(() => {});
  }
}

function executableMagic(bytes) {
  if (bytes.length >= 2 && bytes[0] === 0x23 && bytes[1] === 0x21) return true;
  if (bytes.length >= 2 && bytes[0] === 0x4d && bytes[1] === 0x5a) return true;
  if (bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) return true;
  if (bytes.length >= 4) {
    const magic = bytes.readUInt32BE(0);
    if ([
      0x0061736d,
      0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe,
      0xcafebabe, 0xbebafeca, 0xcafebabf, 0xbfbafeca,
    ].includes(magic)) return true;
  }
  return false;
}

async function verifyFile(root, entry) {
  const absolute = path.resolve(root, ...entry.path.split('/'));
  if (!isContained(root, absolute)) fail('E_PATH', `File escapes the package root: ${entry.path}`);
  let current = root;
  for (const segment of entry.path.split('/').slice(0, -1)) {
    current = path.join(current, segment);
    const info = await lstat(current).catch(error => {
      if (error.code === 'ENOENT') fail('E_MISSING', `Package directory is missing for: ${entry.path}`);
      throw error;
    });
    if (info.isSymbolicLink()) fail('E_SYMLINK', `Symbolic-link directory is forbidden: ${entry.path}`);
    if (!info.isDirectory()) fail('E_NOT_DIRECTORY', `Package parent is not a directory: ${entry.path}`);
  }
  const before = await regularFile(absolute, `Pack file ${entry.path}`);
  const beforeIdentity = await lstat(absolute, { bigint: true });
  if (before.mode & 0o111) fail('E_EXECUTABLE', `Executable file mode is forbidden: ${entry.path}`);
  if (before.size !== entry.bytes) fail('E_SIZE', `Byte size mismatch for ${entry.path}: expected ${entry.bytes}, received ${before.size}`);
  let handle;
  try {
    handle = await open(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
    const opened = await handle.stat({ bigint: true });
    const canonical = await realpath(absolute);
    const canonicalIdentity = await lstat(canonical, { bigint: true });
    if (!isContained(root, canonical)) fail('E_PATH', `Pack file resolves outside the package root: ${entry.path}`);
    if (!opened.isFile() || opened.dev !== beforeIdentity.dev || opened.ino !== beforeIdentity.ino
      || opened.dev !== canonicalIdentity.dev || opened.ino !== canonicalIdentity.ino) {
      fail('E_RACE', `Pack file changed while being verified: ${entry.path}`);
    }
    if (opened.mode & 0o111n) fail('E_EXECUTABLE', `Executable file mode is forbidden: ${entry.path}`);
    if (opened.size !== BigInt(entry.bytes)) fail('E_SIZE', `Opened byte size mismatch for ${entry.path}: expected ${entry.bytes}, received ${opened.size}`);
    const prefix = Buffer.alloc(Math.min(16, entry.bytes));
    await handle.read(prefix, 0, prefix.length, 0);
    if (executableMagic(prefix)) fail('E_EXECUTABLE', `Executable file signature is forbidden: ${entry.path}`);
    const hash = createHash('sha256');
    let streamedBytes = 0;
    for await (const chunk of handle.createReadStream({ start: 0, autoClose: false })) {
      streamedBytes += chunk.length;
      hash.update(chunk);
    }
    const after = await handle.stat({ bigint: true });
    if (after.dev !== opened.dev || after.ino !== opened.ino || after.size !== opened.size || after.mtimeNs !== opened.mtimeNs || after.ctimeNs !== opened.ctimeNs) {
      fail('E_RACE', `Pack file changed while being hashed: ${entry.path}`);
    }
    if (streamedBytes !== entry.bytes) fail('E_SIZE', `Streamed byte size mismatch for ${entry.path}: expected ${entry.bytes}, received ${streamedBytes}`);
    const sha256 = hash.digest('hex');
    if (sha256 !== entry.sha256) fail('E_HASH', `SHA-256 mismatch for ${entry.path}: expected ${entry.sha256}, received ${sha256}`);
  } finally {
    if (handle) await handle.close().catch(() => {});
  }
}

async function copyVerifiedFile(root, entry, destination, destinationRoot) {
  const source = path.resolve(root, ...entry.path.split('/'));
  let sourceHandle;
  let destinationHandle;
  try {
    sourceHandle = await open(source, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
    const opened = await sourceHandle.stat({ bigint: true });
    const canonical = await realpath(source);
    const canonicalIdentity = await lstat(canonical, { bigint: true });
    if (!isContained(root, canonical)) fail('E_PATH', `Pack file resolves outside the package root: ${entry.path}`);
    if (!opened.isFile() || opened.dev !== canonicalIdentity.dev || opened.ino !== canonicalIdentity.ino) {
      fail('E_RACE', `Pack file changed before copying: ${entry.path}`);
    }
    if (opened.size !== BigInt(entry.bytes)) fail('E_SIZE', `Pack file size changed before copying: ${entry.path}`);
    const destinationParent = path.dirname(destination);
    const parentCanonical = await realpath(destinationParent);
    const parentIdentity = await lstat(destinationParent, { bigint: true });
    const canonicalParentIdentity = await lstat(parentCanonical, { bigint: true });
    if (parentCanonical !== destinationRoot && !isContained(destinationRoot, parentCanonical)) {
      fail('E_DESTINATION', `Destination parent escapes staging: ${entry.path}`);
    }
    if (parentIdentity.isSymbolicLink() || !parentIdentity.isDirectory()
      || parentIdentity.dev !== canonicalParentIdentity.dev || parentIdentity.ino !== canonicalParentIdentity.ino) {
      fail('E_RACE', `Destination parent changed before copying: ${entry.path}`);
    }
    destinationHandle = await open(
      destination,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW || 0),
      0o644,
    );
    const destinationOpened = await destinationHandle.stat({ bigint: true });
    const destinationCanonical = await realpath(destination);
    const destinationCanonicalIdentity = await lstat(destinationCanonical, { bigint: true });
    if (!isContained(destinationRoot, destinationCanonical)
      || destinationOpened.dev !== destinationCanonicalIdentity.dev || destinationOpened.ino !== destinationCanonicalIdentity.ino) {
      fail('E_RACE', `Destination escaped staging while copying: ${entry.path}`);
    }
    const hash = createHash('sha256');
    const buffer = Buffer.allocUnsafe(64 * 1024);
    let position = 0;
    while (true) {
      const { bytesRead } = await sourceHandle.read(buffer, 0, buffer.length, position);
      if (bytesRead === 0) break;
      hash.update(buffer.subarray(0, bytesRead));
      let offset = 0;
      while (offset < bytesRead) {
        const { bytesWritten } = await destinationHandle.write(buffer, offset, bytesRead - offset, position + offset);
        if (bytesWritten === 0) fail('E_IO', `Zero-byte write while copying: ${entry.path}`);
        offset += bytesWritten;
      }
      position += bytesRead;
    }
    const after = await sourceHandle.stat({ bigint: true });
    if (after.dev !== opened.dev || after.ino !== opened.ino || after.size !== opened.size
      || after.mtimeNs !== opened.mtimeNs || after.ctimeNs !== opened.ctimeNs) {
      fail('E_RACE', `Pack file changed while being copied: ${entry.path}`);
    }
    if (position !== entry.bytes) fail('E_SIZE', `Copied byte size mismatch for ${entry.path}: expected ${entry.bytes}, received ${position}`);
    const sha256 = hash.digest('hex');
    if (sha256 !== entry.sha256) fail('E_HASH', `Pack file changed after verification: ${entry.path}`);
    await destinationHandle.sync();
  } finally {
    if (destinationHandle) await destinationHandle.close().catch(() => {});
    if (sourceHandle) await sourceHandle.close().catch(() => {});
  }
}


async function verifyDeclaredTree(root, entries, manifestPath) {
  const expected = new Set(entries.map(entry => entry.path));
  const manifestReal = await realpath(manifestPath);
  const visit = async (directory, prefix = '') => {
    const children = await readdir(directory, { withFileTypes: true });
    children.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    for (const child of children) {
      const absolute = path.join(directory, child.name);
      const relative = `${prefix}${child.name}`;
      if (child.isSymbolicLink()) fail('E_SYMLINK', `Symbolic link is forbidden in a pack: ${relative}`);
      if (child.isDirectory()) {
        await visit(absolute, `${relative}/`);
        continue;
      }
      if (!child.isFile()) fail('E_NOT_FILE', `Non-regular pack entry is forbidden: ${relative}`);
      if (absolute === manifestReal) continue;
      if (!expected.has(relative)) fail('E_UNDECLARED', `Pack contains an undeclared file: ${relative}`);
    }
  };
  await visit(root);
}

export async function verifyPack({ manifestPath, packageRoot, schemaPath = DEFAULT_SCHEMA }) {
  const absoluteManifest = path.resolve(manifestPath);
  const root = await canonicalDirectory(path.resolve(packageRoot || path.dirname(absoluteManifest)), 'Package root');
  const { bytes, manifest } = await readManifest(absoluteManifest, root);
  let schema;
  try { schema = JSON.parse(await readFile(schemaPath, 'utf8')); } catch (error) {
    fail('E_SCHEMA_IO', `Cannot read JSON Schema ${schemaPath}: ${error.message}`);
  }
  const validate = new Ajv({ allErrors: true, strict: true }).compile(schema);
  if (!validate(manifest)) {
    const details = validate.errors.map(error => `${error.instancePath || '/'} ${error.message}`).join('; ');
    fail('E_SCHEMA', `Manifest schema validation failed: ${details}`);
  }
  validateReleaseIdentity(manifest);
  const entries = validateInventory(manifest);
  await verifyDeclaredTree(root, entries, absoluteManifest);
  for (const entry of entries) await verifyFile(root, entry);
  const totalBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
  if (!Number.isSafeInteger(totalBytes)) fail('E_SIZE', 'Total pack size exceeds the safe integer range');
  return {
    operation: 'verify',
    status: 'verified',
    schemaVersion: manifest.schemaVersion,
    kind: manifest.kind,
    id: manifest.id,
    version: manifest.version,
    fileCount: entries.length,
    totalBytes,
    manifestSha256: createHash('sha256').update(bytes).digest('hex'),
    manifest,
    entries,
    root,
    manifestBytes: bytes,
  };
}

async function ensureDirectory(parent, name) {
  const directory = path.join(parent, name);
  if (!isContained(parent, directory)) fail('E_DESTINATION', `Install directory escapes its parent: ${name}`);
  let info = await lstat(directory).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (!info) {
    await mkdir(directory, { mode: 0o755 }).catch(error => { if (error.code !== 'EEXIST') throw error; });
    info = await lstat(directory);
  }
  if (info.isSymbolicLink() || !info.isDirectory()) fail('E_DESTINATION', `Install directory is not a real directory: ${directory}`);
  return directory;
}

const sameIdentity = (left, right) => left.dev === right.dev && left.ino === right.ino;

async function captureDirectoryIdentity(directory, label) {
  const direct = await lstat(directory, { bigint: true });
  if (direct.isSymbolicLink() || !direct.isDirectory()) fail('E_DESTINATION', `${label} is not a real directory: ${directory}`);
  const canonical = await realpath(directory);
  const resolved = await lstat(canonical, { bigint: true });
  if (canonical !== path.resolve(directory) || !sameIdentity(direct, resolved)) {
    fail('E_RACE', `${label} changed identity: ${directory}`);
  }
  return direct;
}

async function assertDirectoryIdentity(directory, expected, label) {
  const current = await captureDirectoryIdentity(directory, label);
  if (!sameIdentity(current, expected)) fail('E_RACE', `${label} was replaced during installation: ${directory}`);
}

async function reclaimStaleLock(lockPath, idDirectory, idIdentity) {
  let before;
  let handle;
  try {
    before = await lstat(lockPath, { bigint: true });
    if (before.isSymbolicLink() || !before.isFile()) return false;
    handle = await open(lockPath, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
    const opened = await handle.stat({ bigint: true });
    if (!sameIdentity(opened, before)) return false;
    const [pidText, createdText] = (await handle.readFile('utf8')).trim().split('\n');
    const pid = Number(pidText);
    const created = Date.parse(createdText);
    if (!Number.isSafeInteger(pid) || pid <= 0 || !Number.isFinite(created)) return false;
    let alive = true;
    try { process.kill(pid, 0); } catch (error) { alive = error.code !== 'ESRCH'; }
    if (alive) return false;
  } finally {
    if (handle) await handle.close().catch(() => {});
  }
  await assertDirectoryIdentity(idDirectory, idIdentity, 'Pack ID directory');
  const current = await lstat(lockPath, { bigint: true }).catch(() => null);
  if (!current || !sameIdentity(current, before)) return false;
  await rm(lockPath, { force: true });
  return true;
}

export async function installPack({ manifestPath, packageRoot, installRoot, schemaPath = DEFAULT_SCHEMA }) {
  const source = await verifyPack({ manifestPath, packageRoot, schemaPath });
  const requestedRoot = path.resolve(installRoot);
  await mkdir(requestedRoot, { recursive: true, mode: 0o755 });
  const root = await canonicalDirectory(requestedRoot, 'Install root');
  const kindDirectory = await ensureDirectory(root, source.kind);
  const idDirectory = await ensureDirectory(kindDirectory, source.id);
  const target = path.join(idDirectory, source.version);
  const staging = path.join(idDirectory, `.${source.version}.staging`);
  const lockPath = path.join(idDirectory, `.${source.version}.install.lock`);
  const reservationPath = path.join(target, '.installing.json');
  if (![target, staging, lockPath].every(candidate => isContained(idDirectory, candidate))) {
    fail('E_DESTINATION', 'Install target escapes its parent');
  }
  const relativeTarget = path.posix.join(source.kind, source.id, source.version);
  const rootIdentity = await captureDirectoryIdentity(root, 'Install root');
  const kindIdentity = await captureDirectoryIdentity(kindDirectory, 'Pack kind directory');
  const idIdentity = await captureDirectoryIdentity(idDirectory, 'Pack ID directory');
  const assertParents = async () => {
    await assertDirectoryIdentity(root, rootIdentity, 'Install root');
    await assertDirectoryIdentity(kindDirectory, kindIdentity, 'Pack kind directory');
    await assertDirectoryIdentity(idDirectory, idIdentity, 'Pack ID directory');
  };

  let lockHandle;
  let lockIdentity;
  let lockCandidate;
  let lockPublished = false;
  let reclaimedStaleLock = false;
  try {
    lockCandidate = path.join(idDirectory, `.version.install-lock-${process.pid}-${randomUUID()}.tmp`);
    lockHandle = await open(
      lockCandidate,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW || 0),
      0o600,
    );
    await lockHandle.writeFile(`${process.pid}\n${new Date().toISOString()}\n${source.manifestSha256}\n`);
    await lockHandle.sync();
    lockIdentity = await lockHandle.stat({ bigint: true });
    for (let attempt = 0; attempt < 2; attempt++) {
      await assertParents();
      try {
        await link(lockCandidate, lockPath);
        lockPublished = true;
        break;
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        if (attempt === 0 && await reclaimStaleLock(lockPath, idDirectory, idIdentity)) {
          reclaimedStaleLock = true;
          continue;
        }
        fail('E_INSTALL_BUSY', `Another install or non-reclaimable lock requires inspection: ${lockPath}`);
      }
    }
    if (!lockPublished) fail('E_INSTALL_BUSY', `Could not acquire install lock: ${lockPath}`);
    await rm(lockCandidate, { force: true });
    lockCandidate = null;
    await assertParents();

    let targetExists = await lstat(target).catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return null;
    });
    if (targetExists) {
      if (targetExists.isSymbolicLink() || !targetExists.isDirectory()) {
        fail('E_IMMUTABLE', `Existing install target is not a real directory: ${relativeTarget}`);
      }
      const targetIdentity = await captureDirectoryIdentity(target, 'Install target');
      const markerExists = await lstat(reservationPath).catch(error => error.code === 'ENOENT' ? null : (() => { throw error; })());
      const publishedManifest = await lstat(path.join(target, 'manifest.json')).catch(error => error.code === 'ENOENT' ? null : (() => { throw error; })());
      const targetEntries = await readdir(target);
      let recoveredInterrupted = false;
      if (!markerExists && !publishedManifest && targetEntries.length === 0) {
        await assertParents();
        await assertDirectoryIdentity(target, targetIdentity, 'Install target');
        await rm(target, { recursive: true, force: true });
        targetExists = null;
        recoveredInterrupted = true;
      } else if (markerExists) {
        let reservation;
        try { ({ manifest: reservation } = await readManifest(reservationPath)); } catch (error) {
          if (!publishedManifest && targetEntries.length === 1 && targetEntries[0] === '.installing.json') {
            await assertParents();
            await assertDirectoryIdentity(target, targetIdentity, 'Install target');
            await rm(target, { recursive: true, force: true });
            targetExists = null;
            recoveredInterrupted = true;
          } else {
            fail('E_IMMUTABLE', `Install reservation is invalid: ${relativeTarget}`, { cause: error });
          }
        }
        if (targetExists) {
          if (reservation?.manifestSha256 !== source.manifestSha256 || reservation?.version !== source.version) {
            fail('E_IMMUTABLE', `Install reservation belongs to a different release: ${relativeTarget}`);
          }
          await assertParents();
          await assertDirectoryIdentity(target, targetIdentity, 'Install target');
          if (publishedManifest) {
            await rm(reservationPath, { force: true });
          } else {
            await rm(target, { recursive: true, force: true });
            targetExists = null;
          }
          recoveredInterrupted = true;
        }
      }
      if (recoveredInterrupted && await lstat(staging).catch(error => error.code === 'ENOENT' ? null : (() => { throw error; })())) {
        await assertParents();
        const staleStagingIdentity = await captureDirectoryIdentity(staging, 'Stale staging directory');
        await assertDirectoryIdentity(staging, staleStagingIdentity, 'Stale staging directory');
        await rm(staging, { recursive: true, force: true });
      }
      if (targetExists) {
        let installed;
        try {
          installed = await verifyPack({ manifestPath: path.join(target, 'manifest.json'), packageRoot: target, schemaPath });
        } catch (error) {
          fail('E_IMMUTABLE', `Existing install is not a valid immutable pack: ${relativeTarget}`, { cause: error });
        }
        if (installed.manifestSha256 !== source.manifestSha256) fail('E_IMMUTABLE', `A different release is already installed: ${relativeTarget}`);
        return { ...source, operation: 'install', status: 'unchanged', installPath: relativeTarget };
      }
    }

    const staleStaging = await lstat(staging).catch(error => error.code === 'ENOENT' ? null : (() => { throw error; })());
    if (staleStaging) {
      if (!reclaimedStaleLock || staleStaging.isSymbolicLink() || !staleStaging.isDirectory()) {
        fail('E_STAGING_EXISTS', `Stale staging directory requires manual inspection: ${staging}`);
      }
      await assertParents();
      await rm(staging, { recursive: true, force: true });
    }

    let stagingCreated = false;
    let stagingIdentity;
    let targetCreated = false;
    let targetPublished = false;
    let targetIdentity;
    try {
      await assertParents();
      await mkdir(staging, { mode: 0o755 });
      stagingCreated = true;
      stagingIdentity = await captureDirectoryIdentity(staging, 'Staging directory');
      for (const entry of source.entries) {
        await assertParents();
        await assertDirectoryIdentity(staging, stagingIdentity, 'Staging directory');
        const destination = path.join(staging, ...entry.path.split('/'));
        await mkdir(path.dirname(destination), { recursive: true, mode: 0o755 });
        await copyVerifiedFile(source.root, entry, destination, staging);
      }
      const stagedManifest = path.join(staging, 'manifest.json');
      await assertDirectoryIdentity(staging, stagingIdentity, 'Staging directory');
      const manifestHandle = await open(
        stagedManifest,
        constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW || 0),
        0o644,
      );
      try {
        await manifestHandle.writeFile(source.manifestBytes);
        await manifestHandle.sync();
      } finally {
        await manifestHandle.close();
      }
      const staged = await verifyPack({ manifestPath: stagedManifest, packageRoot: staging, schemaPath });
      if (staged.manifestSha256 !== source.manifestSha256) fail('E_RACE', 'Manifest changed during installation');

      await assertParents();
      await assertDirectoryIdentity(staging, stagingIdentity, 'Staging directory');
      try {
        await mkdir(target, { mode: 0o755 });
      } catch (error) {
        if (error.code === 'EEXIST') fail('E_IMMUTABLE', `Install target appeared during promotion: ${relativeTarget}`);
        throw error;
      }
      targetCreated = true;
      targetIdentity = await captureDirectoryIdentity(target, 'Install target');
      const reservationHandle = await open(
        reservationPath,
        constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW || 0),
        0o600,
      );
      try {
        await reservationHandle.writeFile(`${JSON.stringify({ manifestSha256: source.manifestSha256, version: source.version })}\n`);
        await reservationHandle.sync();
      } finally {
        await reservationHandle.close();
      }

      const topLevel = (await readdir(staging, { withFileTypes: true }))
        .filter(entry => entry.name !== 'manifest.json')
        .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
      for (const entry of topLevel) {
        await assertParents();
        await assertDirectoryIdentity(staging, stagingIdentity, 'Staging directory');
        await assertDirectoryIdentity(target, targetIdentity, 'Install target');
        await rename(path.join(staging, entry.name), path.join(target, entry.name));
        await assertDirectoryIdentity(target, targetIdentity, 'Install target');
      }
      for (const entry of source.entries) await verifyFile(target, entry);

      const { bytes: manifestBytes } = await readManifest(stagedManifest);
      const manifestSha256 = createHash('sha256').update(manifestBytes).digest('hex');
      if (manifestSha256 !== source.manifestSha256) fail('E_RACE', 'Staged manifest changed before publication');
      await assertParents();
      await assertDirectoryIdentity(staging, stagingIdentity, 'Staging directory');
      await assertDirectoryIdentity(target, targetIdentity, 'Install target');
      await rename(stagedManifest, path.join(target, 'manifest.json'));
      targetPublished = true;
      await assertDirectoryIdentity(target, targetIdentity, 'Install target');
      await rm(reservationPath, { force: true });
      const installed = await verifyPack({ manifestPath: path.join(target, 'manifest.json'), packageRoot: target, schemaPath });
      if (installed.manifestSha256 !== source.manifestSha256) fail('E_RACE', 'Installed manifest changed during publication');
      return { ...source, operation: 'install', status: 'installed', installPath: relativeTarget };
    } finally {
      if (stagingCreated) {
        await assertParents();
        await assertDirectoryIdentity(staging, stagingIdentity, 'Staging directory');
        await rm(staging, { recursive: true, force: true });
      }
      if (targetCreated && !targetPublished) {
        await assertParents();
        await assertDirectoryIdentity(target, targetIdentity, 'Install target');
        await rm(target, { recursive: true, force: true });
      }
    }
  } finally {
    if (lockHandle) await lockHandle.close().catch(() => {});
    if (lockCandidate) await rm(lockCandidate, { force: true }).catch(() => {});
    if (lockPublished) {
      await assertParents();
      const current = await lstat(lockPath, { bigint: true }).catch(() => null);
      if (current && sameIdentity(current, lockIdentity)) await rm(lockPath, { force: true });
    }
  }
}

function publicReport(report) {
  const result = {
    operation: report.operation,
    status: report.status,
    schemaVersion: report.schemaVersion,
    kind: report.kind,
    id: report.id,
    version: report.version,
    fileCount: report.fileCount,
    totalBytes: report.totalBytes,
    manifestSha256: report.manifestSha256,
  };
  if (report.installPath) result.installPath = report.installPath;
  return result;
}

function usage() {
  return `Usage:
  node scripts/studio-pack.mjs verify <manifest.json> [--package-root=<dir>] [--schema=<file>] [--json]
  node scripts/studio-pack.mjs install <manifest.json> --install-root=<dir> [--package-root=<dir>] [--schema=<file>] [--json]`;
}

function parseArguments(argv) {
  if (argv.includes('--help') || argv.includes('-h')) return { help: true };
  const [operation, manifestPath, ...rest] = argv;
  if (!['verify', 'install'].includes(operation) || !manifestPath || manifestPath.startsWith('--')) {
    fail('E_USAGE', usage());
  }
  const options = { json: false };
  for (let index = 0; index < rest.length; index++) {
    const argument = rest[index];
    if (argument === '--json') { options.json = true; continue; }
    const match = /^--(package-root|install-root|schema)(?:=(.*))?$/.exec(argument);
    if (!match) fail('E_USAGE', `Unknown argument: ${argument}\n${usage()}`);
    const value = match[2] ?? rest[++index];
    if (!value || value.startsWith('--')) fail('E_USAGE', `Missing value for --${match[1]}\n${usage()}`);
    const key = { 'package-root': 'packageRoot', 'install-root': 'installRoot', schema: 'schemaPath' }[match[1]];
    if (options[key] !== undefined) fail('E_USAGE', `Duplicate option: --${match[1]}`);
    options[key] = value;
  }
  if (operation === 'install' && !options.installRoot) fail('E_USAGE', `install requires --install-root\n${usage()}`);
  if (operation === 'verify' && options.installRoot) fail('E_USAGE', '--install-root is valid only for install');
  return { operation, manifestPath, ...options };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
    } else {
      const run = options.operation === 'install' ? installPack : verifyPack;
      const report = publicReport(await run(options));
      if (options.json) console.log(JSON.stringify(report));
      else console.log(`PASS ${report.kind}/${report.id}@${report.version}: ${report.status}; ${report.fileCount} files, ${report.totalBytes} bytes, manifest SHA-256 ${report.manifestSha256}${report.installPath ? `, ${report.installPath}` : ''}`);
    }
  } catch (error) {
    const known = error instanceof PackError;
    console.error(`ERROR ${known ? error.code : 'E_IO'} ${error.message}`);
    process.exitCode = known && error.code === 'E_USAGE' ? 2 : 1;
  }
}
