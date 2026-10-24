const PELVIS_BONES = /^(Hips|LeftUpLeg|RightUpLeg|LeftLeg|RightLeg|Spine02)$/;

function unionFind(count, indices) {
  const parent = new Int32Array(count);
  for (let i = 0; i < count; i++) parent[i] = i;
  const find = (value) => {
    let root = value;
    while (parent[root] !== root) root = parent[root];
    while (parent[value] !== value) {
      const next = parent[value];
      parent[value] = root;
      value = next;
    }
    return root;
  };
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };
  for (let i = 0; i < indices.length; i += 3) {
    union(indices[i], indices[i + 1]);
    union(indices[i], indices[i + 2]);
  }
  return { parent, find };
}

function componentsOf(primitive, joints) {
  const positions = primitive.getAttribute('POSITION');
  const jointIds = primitive.getAttribute('JOINTS_0');
  const weights = primitive.getAttribute('WEIGHTS_0');
  const indices = primitive.getIndices()?.getArray();
  if (!positions || !jointIds || !weights || !indices) return [];
  const { find } = unionFind(positions.getCount(), indices);
  const pos = positions.getArray(), ids = jointIds.getArray(), ws = weights.getArray();
  const components = new Map();
  for (let i = 0; i < positions.getCount(); i++) {
    const root = find(i);
    let component = components.get(root);
    if (!component) {
      component = { vertices: [], min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], pelvisWeight: 0, totalWeight: 0 };
      components.set(root, component);
    }
    component.vertices.push(i);
    for (let axis = 0; axis < 3; axis++) {
      const value = pos[i * 3 + axis];
      component.min[axis] = Math.min(component.min[axis], value);
      component.max[axis] = Math.max(component.max[axis], value);
    }
    for (let slot = 0; slot < 4; slot++) {
      const weight = ws[i * 4 + slot];
      component.totalWeight += weight;
      if (PELVIS_BONES.test(joints[ids[i * 4 + slot]] || '')) component.pelvisWeight += weight;
    }
  }
  return [...components.values()];
}

export function inspectCanarinhoTail(document) {
  const root = document.getRoot();
  const joints = root.listSkins()[0]?.listJoints().map((joint) => joint.getName()) || [];
  let bodyMinY = Infinity, bodyMaxY = -Infinity;
  for (const mesh of root.listMeshes()) for (const primitive of mesh.listPrimitives()) {
    const position = primitive.getAttribute('POSITION');
    if (!position) continue;
    const array = position.getArray();
    for (let i = 1; i < array.length; i += 3) {
      bodyMinY = Math.min(bodyMinY, array[i]);
      bodyMaxY = Math.max(bodyMaxY, array[i]);
    }
  }
  const height = bodyMaxY - bodyMinY;
  const tails = [];
  for (const mesh of root.listMeshes()) for (const primitive of mesh.listPrimitives()) {
    for (const component of componentsOf(primitive, joints)) {
      const spanZ = component.max[2] - component.min[2];
      const pelvisShare = component.totalWeight ? component.pelvisWeight / component.totalWeight : 0;
      if (pelvisShare < 0.72) continue;
      if (component.max[1] > bodyMinY + height * 0.58 || component.min[2] > -0.12) continue;
      tails.push({ ...component, primitive, spanZ, pelvisShare });
    }
  }
  const tailMinZ = tails.reduce((min, tail) => Math.min(min, tail.min[2]), Infinity);
  const tailMaxZ = tails.reduce((max, tail) => Math.max(max, tail.max[2]), -Infinity);
  const maxDepth = tails.length ? tailMaxZ - tailMinZ : 0;
  return { height, maxDepth, ratio: height ? maxDepth / height : 0, tailMinZ, tailMaxZ, tails };
}

export function compactCanarinhoTail(document, targetRatio = 0.18) {
  const report = inspectCanarinhoTail(document);
  if (!report.tails.length) throw new Error('Canarinho tail geometry not found');
  if (report.ratio <= targetRatio + 1e-4) return { ...report, changed: false };
  const scale = targetRatio / report.ratio;
  const accessors = new Map(), selected = new Map();
  for (const tail of report.tails) {
    const accessor = tail.primitive.getAttribute('POSITION');
    if (!accessors.has(accessor)) accessors.set(accessor, new Float32Array(accessor.getArray()));
    if (!selected.has(accessor)) selected.set(accessor, new Set());
    for (const vertex of tail.vertices) selected.get(accessor).add(vertex);
  }
  const rootBand = Math.max(0.01, report.maxDepth * 0.12);
  const anchor = [0, 0, 0];
  let count = 0;
  for (const [accessor, vertices] of selected) {
    const positions = accessors.get(accessor);
    for (const vertex of vertices) {
      if (positions[vertex * 3 + 2] < report.tailMaxZ - rootBand) continue;
      for (let axis = 0; axis < 3; axis++) anchor[axis] += positions[vertex * 3 + axis];
      count++;
    }
  }
  if (!count) throw new Error('Canarinho tail attachment not found');
  for (let axis = 0; axis < 3; axis++) anchor[axis] /= count;
  for (const [accessor, vertices] of selected) {
    const positions = accessors.get(accessor);
    for (const vertex of vertices) for (let axis = 0; axis < 3; axis++) {
      const offset = vertex * 3 + axis;
      positions[offset] = anchor[axis] + (positions[offset] - anchor[axis]) * scale;
    }
    accessor.setArray(positions);
  }
  const after = inspectCanarinhoTail(document);
  return { ...after, changed: true, scale };
}
