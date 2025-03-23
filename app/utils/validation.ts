/**
 * Common validation utilities for form fields
 */

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

export const validateIndianPhone = (phone: string): boolean => {
  // Indian mobile numbers should:
  // 1. Be exactly 10 digits
  // 2. Start with 6, 7, 8, or 9
  return phone.length === 10 && /^[6-9]\d{9}$/.test(phone);
};

export const validateUPI = (upiId: string): boolean => {
  // UPI ID format: username@bankname
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/;
  return upiRegex.test(upiId);
};

export const validatePincode = (pincode: string): boolean => {
  // Indian PIN codes are 6 digits
  return /^\d{6}$/.test(pincode);
};

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateFormFields = (fields: Record<string, any>, rules: Record<string, (value: any) => boolean>): ValidationResult => {
  const errors: Record<string, string> = {};
  let isValid = true;

  Object.entries(rules).forEach(([field, validator]) => {
    if (!validator(fields[field])) {
      isValid = false;
      errors[field] = `Invalid ${field}`;
    }
  });

  return { isValid, errors };
};

export default {
  validateEmail,
  validatePassword,
  validateIndianPhone,
  validateUPI,
  validatePincode,
  validateFormFields,
}; 