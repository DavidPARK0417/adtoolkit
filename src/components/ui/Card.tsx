'use client';

import React, { ReactNode } from 'react';

/**
 * Card Props Types
 *
 * 기본 카드 컴포넌트의 Props 인터페이스입니다.
 */
interface CardBaseProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick' | 'children'> {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  ariaLabel?: string;
}

interface BasicCardProps extends CardBaseProps {
  variant?: 'basic';
}

interface Card3DProps extends CardBaseProps {
  variant: '3d';
  intensity?: 'normal' | 'strong';
}

interface StatusCardProps extends CardBaseProps {
  variant: 'status';
  status: 'pending' | 'confirmed' | 'shipped' | 'completed' | 'inactive';
  icon?: ReactNode;
  label?: string;
}

type CardProps = BasicCardProps | Card3DProps | StatusCardProps;

/**
 * 패딩 맵핑
 */
const PADDING_MAP = {
  sm: 'p-4 sm:p-6',
  md: 'p-6 sm:p-8',
  lg: 'p-8 sm:p-12',
} as const;

/**
 * 카드 컴포넌트
 *
 * 3가지 변형을 지원합니다:
 * 1. Basic Card: 표준 카드 (shadow-md → shadow-xl)
 * 2. 3D Card: 입체감 있는 카드 (초록색 그림자)
 * 3. Status Card: 상태 표시 카드 (색상 코딩)
 *
 * @example
 * // 기본 카드
 * <Card hoverable>
 *   <h3>제목</h3>
 *   <p>설명</p>
 * </Card>
 *
 * @example
 * // 3D 효과 카드
 * <Card variant="3d" hoverable>
 *   <h3>프리미엄 컨텐츠</h3>
 * </Card>
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className = '',
      onClick,
      disabled = false,
      padding = 'md',
      hoverable = true,
      ariaLabel,
      ...props
    },
    ref
  ) => {
    // variant 타입 확인
    const variant = 'variant' in props ? props.variant : 'basic';
    const isStatusCard = variant === 'status';
    const is3DCard = variant === '3d';

    // 패딩 클래스 결정
    const paddingClass = PADDING_MAP[padding];

    // 기본 공통 클래스
    const baseClasses = `
      bg-white dark:bg-gray-800
      text-gray-900 dark:text-white
      border border-gray-200 dark:border-gray-700
      transition-all
      duration-300
      ease-out
      ${paddingClass}
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      ${!disabled && onClick ? 'cursor-pointer' : ''}
      ${className}
    `;

    // 상태 카드 처리
    if (isStatusCard) {
      const statusProps = props as StatusCardProps;
      // variant, status, icon, label을 제외한 HTML 속성 추출
      const { variant: _, status: __, icon: ___, label: ____, ...htmlProps } = statusProps;
      const statusConfig = {
        pending: {
          borderColor: '#FBBF24',
          bgColor: '#FEF3C7',
          textColor: '#92400E',
          label: '대기중',
        },
        confirmed: {
          borderColor: '#3B82F6',
          bgColor: '#DBEAFE',
          textColor: '#1E40AF',
          label: '확인됨',
        },
        shipped: {
          borderColor: '#8B5CF6',
          bgColor: '#EDE9FE',
          textColor: '#5B21B6',
          label: '배송중',
        },
        completed: {
          borderColor: '#10B981',
          bgColor: '#D1FAE5',
          textColor: '#065F46',
          label: '완료',
        },
        inactive: {
          borderColor: '#6B7280',
          bgColor: '#F3F4F6',
          textColor: '#374151',
          label: '비활성',
        },
      }[statusProps.status];

      return (
        <div
          ref={ref}
          {...htmlProps}
          className={`
            rounded-2xl
            shadow-md dark:shadow-gray-900/50
            hover:shadow-lg dark:hover:shadow-gray-900/70
            ${hoverable && !disabled ? 'hover:-translate-y-1' : ''}
            ${baseClasses}
          `}
          style={{
            borderLeft: `4px solid ${statusConfig.borderColor}`,
            backgroundColor: statusConfig.bgColor,
            color: statusConfig.textColor,
            ...htmlProps.style,
          }}
          onClick={!disabled ? onClick : undefined}
          role={htmlProps.role || (onClick ? 'button' : undefined)}
          aria-label={ariaLabel || statusProps.label || statusConfig.label || htmlProps['aria-label']}
          aria-disabled={disabled}
          tabIndex={!disabled && onClick ? 0 : undefined}
          onKeyPress={(e) => {
            if (!disabled && onClick && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onClick();
            }
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {statusProps.label && (
                <p className="text-sm font-semibold mb-1">{statusProps.label}</p>
              )}
              {children}
            </div>
            {statusProps.icon && (
              <div className="text-2xl flex-shrink-0">{statusProps.icon}</div>
            )}
          </div>
        </div>
      );
    }

    // 3D 효과 카드 처리
    if (is3DCard) {
      const card3DProps = props as Card3DProps;
      const intensity = card3DProps.intensity || 'normal';
      // variant, intensity를 제외한 HTML 속성 추출
      const { variant: _, intensity: __, ...htmlProps } = card3DProps;
      const shadowValue =
        intensity === 'strong'
          ? '0 30px 60px rgba(16, 185, 129, 0.2)'
          : '0 20px 50px rgba(16, 185, 129, 0.15)';
      const hoverShadowValue =
        intensity === 'strong'
          ? '0 30px 60px rgba(16, 185, 129, 0.25)'
          : '0 20px 50px rgba(16, 185, 129, 0.2)';

      return (
        <div
          ref={ref}
          {...htmlProps}
          className={`
            rounded-3xl
            ${hoverable && !disabled ? 'hover:-translate-y-2' : ''}
            ${baseClasses}
          `}
          style={{
            boxShadow: shadowValue,
            ...(hoverable && !disabled && {
              '--hover-shadow': hoverShadowValue,
            } as React.CSSProperties),
            ...htmlProps.style,
          }}
          onClick={!disabled ? onClick : undefined}
          role={htmlProps.role || (onClick ? 'button' : undefined)}
          aria-label={ariaLabel || htmlProps['aria-label']}
          aria-disabled={disabled}
          tabIndex={!disabled && onClick ? 0 : undefined}
          onKeyPress={(e) => {
            if (!disabled && onClick && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onClick();
            }
          }}
          onMouseEnter={(e) => {
            if (hoverable && !disabled) {
              (e.currentTarget as HTMLElement).style.boxShadow = hoverShadowValue;
            }
          }}
          onMouseLeave={(e) => {
            if (hoverable && !disabled) {
              (e.currentTarget as HTMLElement).style.boxShadow = shadowValue;
            }
          }}
        >
          {children}
        </div>
      );
    }

    // 기본 카드 처리
    // variant를 제외한 HTML 속성 추출
    const { variant: _, ...htmlProps } = props as BasicCardProps;
    return (
      <div
        ref={ref}
        {...htmlProps}
        className={`
          rounded-2xl
          shadow-md dark:shadow-gray-900/50
          hover:shadow-xl dark:hover:shadow-gray-900/70
          ${hoverable && !disabled ? 'hover:-translate-y-1' : ''}
          ${baseClasses}
        `}
        onClick={!disabled ? onClick : undefined}
        role={htmlProps.role || (onClick ? 'button' : undefined)}
        aria-label={ariaLabel || htmlProps['aria-label']}
        aria-disabled={disabled}
        tabIndex={!disabled && onClick ? 0 : undefined}
        onKeyPress={(e) => {
          if (!disabled && onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
export type { CardProps, BasicCardProps, Card3DProps, StatusCardProps };

