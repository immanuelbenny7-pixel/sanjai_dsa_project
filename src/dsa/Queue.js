/**
 * STREET RACER: ALGORITHM WARS
 * FIFO Queue Data Structure (Circular Buffer Array)
 * 
 * Used for the starting grid racer countdown release order.
 * Guarantees true FIFO without Array.shift() overhead.
 * Time Complexity:
 *  - enqueue: O(1) amortized
 *  - dequeue: O(1)
 *  - peek: O(1)
 *  - isEmpty: O(1)
 *  - size: O(1)
 * Space Complexity: O(n)
 */

export class Queue {
  /**
   * @param {number} [initialCapacity=8]
   */
  constructor(initialCapacity = 8) {
    this.capacity = Math.max(4, initialCapacity);
    this.buffer = new Array(this.capacity);
    this.head = 0;   // Index of the front element
    this.tail = 0;   // Index where next element will be written
    this.count = 0;  // Current number of elements

    // Instrumentation for DSA Lab visualization
    this.operationsHistory = [];
  }

  /**
   * Check if queue is empty. O(1)
   */
  isEmpty() {
    return this.count === 0;
  }

  /**
   * Number of elements in the queue. O(1)
   */
  size() {
    return this.count;
  }

  /**
   * Peek at front element without removing it. O(1)
   */
  peek() {
    if (this.isEmpty()) return null;
    return this.buffer[this.head];
  }

  /**
   * Add element to the rear of the queue. O(1) amortized
   * @param {any} item
   */
  enqueue(item) {
    if (this.count === this.capacity) {
      this.resize(this.capacity * 2);
    }

    this.buffer[this.tail] = item;
    const oldTail = this.tail;
    this.tail = (this.tail + 1) % this.capacity;
    this.count++;

    this.operationsHistory.push({
      type: 'enqueue',
      item,
      head: this.head,
      tail: this.tail,
      count: this.count,
      capacity: this.capacity,
      snapshot: this.getItems()
    });

    return true;
  }

  /**
   * Remove and return the front element in FIFO order. O(1)
   */
  dequeue() {
    if (this.isEmpty()) return null;

    const item = this.buffer[this.head];
    this.buffer[this.head] = undefined; // clear reference
    const oldHead = this.head;
    this.head = (this.head + 1) % this.capacity;
    this.count--;

    // Shrink if capacity is large and sparsely populated
    if (this.count > 0 && this.count <= Math.floor(this.capacity / 4) && this.capacity > 8) {
      this.resize(Math.floor(this.capacity / 2));
    }

    this.operationsHistory.push({
      type: 'dequeue',
      item,
      head: this.head,
      tail: this.tail,
      count: this.count,
      capacity: this.capacity,
      snapshot: this.getItems()
    });

    return item;
  }

  /**
   * Resize the circular buffer
   */
  resize(newCapacity) {
    const newBuffer = new Array(newCapacity);
    for (let i = 0; i < this.count; i++) {
      newBuffer[i] = this.buffer[(this.head + i) % this.capacity];
    }
    this.buffer = newBuffer;
    this.head = 0;
    this.tail = this.count;
    this.capacity = newCapacity;
  }

  /**
   * Get all active elements in FIFO order
   * @returns {Array<any>}
   */
  getItems() {
    const items = [];
    for (let i = 0; i < this.count; i++) {
      items.push(this.buffer[(this.head + i) % this.capacity]);
    }
    return items;
  }

  /**
   * Internal representation for DSA Lab circular memory buffer display
   */
  getBufferDebug() {
    return {
      buffer: [...this.buffer],
      head: this.head,
      tail: this.tail,
      capacity: this.capacity,
      count: this.count
    };
  }

  /**
   * Clear the queue
   */
  clear() {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
    this.operationsHistory = [];
  }
}
