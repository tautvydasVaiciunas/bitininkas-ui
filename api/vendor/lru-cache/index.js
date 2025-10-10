class LRUCache {
  constructor(options = {}) {
    const { max = Infinity } = options || {};
    this.max = max === 0 ? Infinity : max;
    this.cache = new Map();
  }

  clear() {
    this.cache.clear();
  }

  delete(key) {
    return this.cache.delete(key);
  }

  has(key) {
    return this.cache.has(key);
  }

  get(key) {
    if (!this.cache.has(key)) {
      return undefined;
    }

    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, value);

    if (this.cache.size > this.max) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    return this;
  }

  peek(key) {
    return this.cache.get(key);
  }

  get size() {
    return this.cache.size;
  }

  keys() {
    return this.cache.keys();
  }

  values() {
    return this.cache.values();
  }

  entries() {
    return this.cache.entries();
  }

  [Symbol.iterator]() {
    return this.cache[Symbol.iterator]();
  }
}

module.exports = { LRUCache };
