/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
// IndexedDB utility for To-Do List storage

const DB_NAME = 'PrismSpaceTodoDB';
const DB_VERSION = 1;
const TODO_STORE = 'todos';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  createdAt: number;
  updatedAt: number;
  dueDate?: number;
}

// Open or create database
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(TODO_STORE)) {
        const objectStore = db.createObjectStore(TODO_STORE, { keyPath: 'id' });
        
        // Create indexes
        objectStore.createIndex('completed', 'completed', { unique: false });
        objectStore.createIndex('priority', 'priority', { unique: false });
        objectStore.createIndex('category', 'category', { unique: false });
        objectStore.createIndex('createdAt', 'createdAt', { unique: false });
        objectStore.createIndex('dueDate', 'dueDate', { unique: false });
      }
    };
  });
}

// Get all todos
export async function getAllTodos(): Promise<Todo[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TODO_STORE, 'readonly');
    const objectStore = transaction.objectStore(TODO_STORE);
    const request = objectStore.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const todos = request.result as Todo[];
      // Sort by createdAt descending (newest first)
      todos.sort((a, b) => b.createdAt - a.createdAt);
      resolve(todos);
    };
  });
}

// Add a new todo
export async function addTodo(todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Todo> {
  const db = await openDB();
  const newTodo: Todo = {
    ...todo,
    id: `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TODO_STORE, 'readwrite');
    const objectStore = transaction.objectStore(TODO_STORE);
    const request = objectStore.add(newTodo);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(newTodo);
  });
}

// Update a todo
export async function updateTodo(id: string, updates: Partial<Omit<Todo, 'id' | 'createdAt'>>): Promise<Todo> {
  const db = await openDB();
  
  return new Promise(async (resolve, reject) => {
    const transaction = db.transaction(TODO_STORE, 'readwrite');
    const objectStore = transaction.objectStore(TODO_STORE);
    const getRequest = objectStore.get(id);

    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const todo = getRequest.result as Todo;
      if (!todo) {
        reject(new Error('Todo not found'));
        return;
      }

      const updatedTodo: Todo = {
        ...todo,
        ...updates,
        updatedAt: Date.now(),
      };

      const updateRequest = objectStore.put(updatedTodo);
      updateRequest.onerror = () => reject(updateRequest.error);
      updateRequest.onsuccess = () => resolve(updatedTodo);
    };
  });
}

// Delete a todo
export async function deleteTodo(id: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TODO_STORE, 'readwrite');
    const objectStore = transaction.objectStore(TODO_STORE);
    const request = objectStore.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Delete completed todos
export async function deleteCompletedTodos(): Promise<number> {
  const todos = await getAllTodos();
  const completedTodos = todos.filter(t => t.completed);
  
  await Promise.all(completedTodos.map(t => deleteTodo(t.id)));
  
  return completedTodos.length;
}

// Get todos by category
export async function getTodosByCategory(category: string): Promise<Todo[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(TODO_STORE, 'readonly');
    const objectStore = transaction.objectStore(TODO_STORE);
    const index = objectStore.index('category');
    const request = index.getAll(category);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as Todo[]);
  });
}

// Get todos stats
export async function getTodoStats(): Promise<{
  total: number;
  completed: number;
  pending: number;
  high: number;
  medium: number;
  low: number;
}> {
  const todos = await getAllTodos();
  
  return {
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    pending: todos.filter(t => !t.completed).length,
    high: todos.filter(t => t.priority === 'high').length,
    medium: todos.filter(t => t.priority === 'medium').length,
    low: todos.filter(t => t.priority === 'low').length,
  };
}
