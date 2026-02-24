'use client';

import React from 'react';

interface FormFieldProps {
    label: string;
    name: string;
    type?: 'text' | 'email' | 'number' | 'password' | 'textarea' | 'select';
    value: string | number;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    options?: { label: string; value: string }[];
    rows?: number;
    helpText?: string;
}

export default function FormField({
    label, name, type = 'text', value, onChange,
    placeholder, error, required, disabled, options, rows = 3, helpText,
}: FormFieldProps) {
    const id = `field-${name}`;
    const hasError = !!error;

    return (
        <div className={`admin-form-field ${hasError ? 'admin-form-field--error' : ''}`}>
            <label className="admin-form-field__label" htmlFor={id}>
                {label}
                {required && <span className="admin-form-field__required">*</span>}
            </label>

            {type === 'textarea' ? (
                <textarea
                    id={id}
                    name={name}
                    className="admin-form-field__input admin-form-field__textarea"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={rows}
                />
            ) : type === 'select' ? (
                <select
                    id={id}
                    name={name}
                    className="admin-form-field__input admin-form-field__select"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                >
                    {placeholder && <option value="">{placeholder}</option>}
                    {options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            ) : (
                <input
                    id={id}
                    name={name}
                    type={type}
                    className="admin-form-field__input"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                />
            )}

            {helpText && !hasError && <p className="admin-form-field__help">{helpText}</p>}
            {hasError && <p className="admin-form-field__error">{error}</p>}
        </div>
    );
}
