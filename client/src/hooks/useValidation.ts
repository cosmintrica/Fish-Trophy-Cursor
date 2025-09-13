import { useState, useCallback } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface ValidationErrors {
  [key: string]: string;
}

export const useValidation = () => {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateField = useCallback((value: string, rules: ValidationRule, fieldName: string): string | null => {
    if (rules.required && (!value || value.trim() === '')) {
      return `${fieldName} este obligatoriu`;
    }

    if (value && rules.minLength && value.length < rules.minLength) {
      return `${fieldName} trebuie să aibă cel puțin ${rules.minLength} caractere`;
    }

    if (value && rules.maxLength && value.length > rules.maxLength) {
      return `${fieldName} trebuie să aibă maximum ${rules.maxLength} caractere`;
    }

    if (value && rules.pattern && !rules.pattern.test(value)) {
      return `${fieldName} nu are formatul corect`;
    }

    if (value && rules.custom) {
      return rules.custom(value);
    }

    return null;
  }, []);

  const validateForm = useCallback((data: Record<string, string>, rules: Record<string, ValidationRule>): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    Object.keys(rules).forEach(field => {
      const error = validateField(data[field] || '', rules[field], field);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [validateField]);

  const clearError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    errors,
    validateField,
    validateForm,
    clearError,
    clearAllErrors
  };
};

// Common validation rules
export const validationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    custom: (value: string) => {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Email-ul nu are formatul corect';
      }
      return null;
    }
  },
  password: {
    required: true,
    minLength: 6,
    custom: (value: string) => {
      if (value && value.length < 6) {
        return 'Parola trebuie să aibă cel puțin 6 caractere';
      }
      return null;
    }
  },
  displayName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    custom: (value: string) => {
      if (value && value.trim().length < 2) {
        return 'Numele trebuie să aibă cel puțin 2 caractere';
      }
      if (value && value.length > 50) {
        return 'Numele trebuie să aibă maximum 50 de caractere';
      }
      return null;
    }
  },
  phone: {
    pattern: /^(\+40|0)[0-9]{9}$/,
    custom: (value: string) => {
      if (value && !/^(\+40|0)[0-9]{9}$/.test(value)) {
        return 'Numărul de telefon trebuie să fie în format românesc (ex: 0712345678)';
      }
      return null;
    }
  },
  bio: {
    maxLength: 500,
    custom: (value: string) => {
      if (value && value.length > 500) {
        return 'Descrierea trebuie să aibă maximum 500 de caractere';
      }
      return null;
    }
  }
};
