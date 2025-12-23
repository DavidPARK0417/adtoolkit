'use client';

import React from 'react';

/**
 * Label Component
 */
interface LabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ children, htmlFor, required, optional, disabled, className = '' }, ref) => {
    return (
      <label
        ref={ref}
        htmlFor={htmlFor}
        className={`
          block text-sm font-medium mb-2
          ${disabled 
            ? 'text-gray-400 dark:text-gray-500' 
            : 'text-gray-900 dark:text-gray-100'
          }
          ${className}
        `}
      >
        {children}
        {required && <span className="text-red-500 dark:text-red-400"> *</span>}
        {optional && <span className="text-gray-400 dark:text-gray-500"> (선택사항)</span>}
      </label>
    );
  }
);

Label.displayName = 'Label';

/**
 * Input Component Props
 */
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  errorMessage?: string;
  label?: string;
  required?: boolean;
  helperText?: string;
}

/**
 * Input Component
 *
 * 디자인 시스템에 맞춘 입력 필드 컴포넌트입니다.
 * 다크모드, 에러 상태, 도움말 텍스트를 지원합니다.
 *
 * @example
 * // 기본 입력 필드
 * <Input label="이름" placeholder="이름을 입력하세요" />
 *
 * @example
 * // 필수 입력 필드
 * <Input label="이메일" type="email" required />
 *
 * @example
 * // 에러 상태
 * <Input 
 *   label="비밀번호" 
 *   type="password" 
 *   error 
 *   errorMessage="비밀번호는 8자 이상이어야 합니다" 
 * />
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = 'text',
      size = 'md',
      error = false,
      errorMessage,
      label,
      required,
      helperText,
      disabled,
      placeholder,
      className = '',
      ...props
    },
    ref
  ) => {
    // 크기 클래스
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-4 py-3 text-lg',
    };

    // 기본 클래스
    const baseClasses = `
      w-full
      border rounded-lg
      bg-white dark:bg-gray-800
      text-gray-900 dark:text-gray-100
      placeholder:text-gray-400 dark:placeholder:text-gray-500
      transition-colors duration-150
      focus:outline-none
      disabled:bg-gray-100 dark:disabled:bg-gray-700
      disabled:text-gray-300 dark:disabled:text-gray-500
      disabled:cursor-not-allowed
    `;

    // 상태별 클래스
    const stateClasses = error
      ? 'border-2 border-red-500 dark:border-red-400 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:ring-offset-2'
      : 'border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:ring-offset-2 focus:border-transparent';

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={props.id} required={required} disabled={disabled}>
            {label}
          </Label>
        )}
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            ${baseClasses}
            ${sizeClasses[size]}
            ${stateClasses}
            ${className}
          `}
          {...props}
        />
        {errorMessage && error && (
          <p className="text-xs text-red-500 dark:text-red-400">{errorMessage}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

