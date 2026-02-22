import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// GST Number validation function
export function validateGSTNumber(gst: string): boolean {
  // Remove spaces and convert to uppercase
  const cleanedGST = gst.replace(/\s+/g, '').toUpperCase();
  
  // GST number should be 15 characters
  if (cleanedGST.length !== 15) {
    return false;
  }
  
  // Format: 2 digits (state code) + 10 alphanumeric (PAN) + 1 digit (entity number) + 1 letter (Z) + 1 digit (check digit)
  const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  if (!gstPattern.test(cleanedGST)) {
    return false;
  }
  
  // Additional validation: Check digit validation (simplified)
  // In production, you might want to implement full check digit algorithm
  return true;
}
