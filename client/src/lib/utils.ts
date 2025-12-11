import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAlertStatus(alcoholLevel: number): string {
  if (alcoholLevel >= 2500) {
    return "Completely Drunk";
  } else if (alcoholLevel >= 1700) {
    return "Moderate Drunk";
  } else {
    return "Normal";
  }
}
