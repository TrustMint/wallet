
/**
 * PRODUCTION UUID GENERATOR
 * Generates standard UUID v4 strings compliant with PostgreSQL 'uuid' columns.
 */

export const generateId = (): string => {
  // Use native crypto API if available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Aliases for compatibility with existing code structure
export const generateUserId = (role: string, existingIds: string[] = []): string => {
    return generateId();
};

export const generateOrderId = (existingIds: string[] = []): string => {
    return generateId();
};

export const generateReviewId = (existingIds: string[] = []): string => {
    return generateId();
};
