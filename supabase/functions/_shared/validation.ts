/**
 * Input validation utilities for edge functions
 * SECURITY: Always validate and sanitize user inputs
 */

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationError | null {
  if (!email || typeof email !== 'string') {
    return { field: 'email', message: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { field: 'email', message: 'Invalid email format' };
  }
  
  if (email.length > 255) {
    return { field: 'email', message: 'Email too long' };
  }
  
  return null;
}

/**
 * Validate phone number (Brazilian format)
 */
export function validatePhone(phone: string): ValidationError | null {
  if (!phone || typeof phone !== 'string') {
    return { field: 'phone', message: 'Phone is required' };
  }
  
  // Remove all non-digits
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Brazilian phone: 10-11 digits (with DDD)
  if (cleanPhone.length < 10 || cleanPhone.length > 11) {
    return { field: 'phone', message: 'Invalid phone number format' };
  }
  
  return null;
}

/**
 * Validate string length
 */
export function validateStringLength(
  value: string,
  fieldName: string,
  minLength: number,
  maxLength: number
): ValidationError | null {
  if (!value || typeof value !== 'string') {
    return { field: fieldName, message: `${fieldName} is required` };
  }
  
  if (value.length < minLength) {
    return { field: fieldName, message: `${fieldName} must be at least ${minLength} characters` };
  }
  
  if (value.length > maxLength) {
    return { field: fieldName, message: `${fieldName} must be less than ${maxLength} characters` };
  }
  
  return null;
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string, fieldName: string = 'id'): ValidationError | null {
  if (!uuid || typeof uuid !== 'string') {
    return { field: fieldName, message: `${fieldName} is required` };
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    return { field: fieldName, message: `Invalid ${fieldName} format` };
  }
  
  return null;
}

/**
 * Validate amount (positive number)
 */
export function validateAmount(amount: number, fieldName: string = 'amount'): ValidationError | null {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { field: fieldName, message: `${fieldName} must be a number` };
  }
  
  if (amount < 0) {
    return { field: fieldName, message: `${fieldName} must be positive` };
  }
  
  if (amount > 999999999) {
    return { field: fieldName, message: `${fieldName} is too large` };
  }
  
  return null;
}

/**
 * Sanitize string to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .trim()
    .substring(0, 10000); // Max length protection
}

/**
 * Validate array of items
 */
export function validateItems(items: any[]): ValidationError | null {
  if (!Array.isArray(items)) {
    return { field: 'items', message: 'Items must be an array' };
  }
  
  if (items.length === 0) {
    return { field: 'items', message: 'At least one item is required' };
  }
  
  if (items.length > 100) {
    return { field: 'items', message: 'Too many items (max 100)' };
  }
  
  return null;
}

/**
 * Batch validate multiple fields
 */
export function batchValidate(validations: (ValidationError | null)[]): ValidationError[] {
  return validations.filter((v): v is ValidationError => v !== null);
}
