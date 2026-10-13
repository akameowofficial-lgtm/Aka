import { ProcessedWork } from '../types';

const STORAGE_KEY = 'markclear_saved_works_v1';

export function getSavedWorks(): ProcessedWork[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveWork(work: ProcessedWork): void {
  try {
    const current = getSavedWorks();
    const updated = [work, ...current.filter((w) => w.id !== work.id)].slice(0, 30);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

export function deleteWork(id: string): void {
  try {
    const current = getSavedWorks();
    const updated = current.filter((w) => w.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to delete work:', e);
  }
}

export function clearAllWorks(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear works:', e);
  }
}
