export const formatPhoneNumber = (value: string): string => {
    // 1. Clean: remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '');

    // 2. Normalize
    let number = cleaned;
    if (number.startsWith('56')) {
        // ok
    } else if (number.startsWith('9') && number.length === 9) {
        number = '56' + number;
    } else if (number.length === 8) {
        number = '569' + number;
    } else if (number.length > 0 && !number.startsWith('56')) {
        number = '56' + number;
    }

    // 3. Format: +56 9 XXXX XXXX
    const maxLen = 11;
    const limited = number.substring(0, maxLen);

    let formatted = '';
    if (limited.length > 0) formatted += '+56';
    if (limited.length > 2) {
        const after56 = limited.substring(2);
        if (after56.length > 0) formatted += ' ' + after56.substring(0, 1); // 9
        if (after56.length > 1) formatted += ' ' + after56.substring(1, 5); // XXXX
        if (after56.length > 5) formatted += ' ' + after56.substring(5, 9); // XXXX
    }

    if (value === '') return '';
    return formatted;
};

export const capitalizeWords = (str: string): string => {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export const cleanName = (value: string): string => {
    // Keep only letters and spaces
    return value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
};

export const validateName = (name: string): boolean => {
    if (!name) return false;
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    return nameRegex.test(name);
};

export const validatePhone = (phone: string): boolean => {
    // Expected: +56 9 XXXX XXXX
    const phoneRegex = /^\+56 9 \d{4} \d{4}$/;
    return phoneRegex.test(phone);
};
