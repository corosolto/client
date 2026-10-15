const fail = message => {throw new Error(message || 'garment assertion failed');};
function same(a, b, depth = 0) {
  if (depth > 64) return false;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return Object.is(a, b);
  const supported = v => Array.isArray(v) || Object.getPrototypeOf(v) === Object.prototype;
  if (!supported(a) || !supported(b) || Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && a.length !== b.length) return false;
  const ak = Reflect.ownKeys(a), bk = Reflect.ownKeys(b);
  return ak.length === bk.length && ak.every(k => typeof k === 'string' && Object.hasOwn(b, k) && same(a[k], b[k], depth + 1));
}
export default {
  ok(value, message) {if (!value) fail(message);},
  equal(a, b, message) {if (!Object.is(a, b)) fail(message);},
  notEqual(a, b, message) {if (Object.is(a, b)) fail(message);},
  deepEqual(a, b, message) {if (!same(a, b)) fail(message);},
};
