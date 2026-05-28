import { clsx, type ClassValue } from 'clsx'

/**
 * Merge Tailwind classes safely — use this everywhere instead of raw clsx.
 * Prevents class conflicts and keeps conditional classes clean.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
