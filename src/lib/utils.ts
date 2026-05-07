import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatError(error: any): string {
  if (!error) return "UNKNOWN ERROR";
  
  let msg = "";
  if (typeof error === 'string') {
    msg = error;
  } else if (error.message) {
    msg = error.message;
  } else {
    msg = String(error);
  }

  try {
    const parsed = JSON.parse(msg);
    if (parsed && parsed.error) return parsed.error;
  } catch {
    // Not JSON, use as is
  }

  return msg;
}
