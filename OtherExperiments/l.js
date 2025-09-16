class SuperSexyMap {
  constructor() {
    this.capacity = 10;
    this.data = new Array(this.capacity);
    this.mapper = {};
    this.size = 0;
    this.pos = 0;
    this.holes = [];
  }

  add(key, value) {
    if (this.mapper.hasOwnProperty(key)) {
      console.error(`Key '${key}' is already assigned`);
      return;
    }
    /* If there is an empty Index, pop it from the Holes-Array and use it, to assign
       the key to the index and then place the value in the data array using the index. */
    if (this.holes.length > 0) {
      const emptyIndex = this.holes.pop();
      this.mapper[key] = emptyIndex;
      this.data[emptyIndex] = value;
      return;
    }
    /* Assign the key the index (this.pos points on the position) and
       store it in the mapper */
    this.mapper[key] = this.pos;
    /* If the size exceeds the default size, create new Array with
     double the size and fill the data into it and replace the prev array */
    if (this.size >= this.capacity) {
      this.capacity *= 2;
      const newData = new Array(this.capacity);
      for (let i = 0; i < this.size; i++) {
        newData[i] = this.data[i];
      }
      this.data = newData;
    }
    /*
      Put the value in the data array on index of the current pointer on a position
     */
    this.data[this.pos] = value;
    this.pos++;
    this.size++;
  }

  remove(key) {
    let index = this.mapper[key];
    if (index === undefined) {
      console.error(`Key '${key}' not found`);
      return;
    }
    delete this.mapper[key]; // Remove the key-Index entry from the mapper
    this.data[index] = null; // Set index of removed element to null, it's remove you know
    this.size--;
    this.holes.push(index); // Store index of empty place to maybe use it.
  }

  get(key) {
    if (!this.mapper.hasOwnProperty(key)) {
      console.error(`Key '${key}' not found`);
      return;
    }
    return this.data[this.mapper[key]];
  }

  set(key, value) {
    if (!this.mapper.hasOwnProperty(key)) {
      console.error(`Key '${key}' not found`);
      return;
    }
    let index = this.mapper[key];
    this.data[index] = value;
  }

  getSize() {
    return this.size;
  }

  existsKey(key) {
    return this.mapper.hasOwnProperty(key);
  }
  existsValue(value) {
    return this.data.hasOwnProperty(value);
  }
}

function benchmark(name, fn) {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`${name}: ${(end - start).toFixed(2)} ms`);
}

// Test Setup
const N = 1_000_000;
const sexy = new SuperSexyMap();
const native = new Map();

// Benchmarks
benchmark("SuperSexyMap SET", () => {
  for (let i = 0; i < N; i++) {
    sexy.add(i, i);
  }
});

benchmark("Native Map SET", () => {
  for (let i = 0; i < N; i++) {
    native.set(i, i);
  }
});

benchmark("SuperSexyMap GET", () => {
  for (let i = 0; i < N; i++) {
    sexy.get(i);
  }
});

benchmark("Native Map GET", () => {
  for (let i = 0; i < N; i++) {
    native.get(i);
  }
});

benchmark("SuperSexyMap HAS", () => {
  for (let i = 0; i < N; i++) {
    sexy.existsKey(i);
  }
});

benchmark("Native Map HAS", () => {
  for (let i = 0; i < N; i++) {
    native.has(i);
  }
});

benchmark("SuperSexyMap DELETE", () => {
  for (let i = 0; i < N; i++) {
    sexy.remove(i);
  }
});

benchmark("Native Map DELETE", () => {
  for (let i = 0; i < N; i++) {
    native.delete(i);
  }
});
