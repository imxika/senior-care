import { HTMLAttributes, ReactNode } from 'react';

interface SeniorCardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  image?: string;
  badge?: string;
  footer?: ReactNode;
  clickable?: boolean;
}

export default function SeniorCard({
  title,
  description,
  image,
  badge,
  footer,
  clickable = false,
  children,
  className = '',
  ...props
}: SeniorCardProps) {
  const baseStyles = 'bg-white rounded-2xl shadow-lg overflow-hidden';
  const clickableStyles = clickable
    ? 'cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]'
    : '';

  return (
    <div
      className={`${baseStyles} ${clickableStyles} ${className}`}
      {...props}
    >
      {/* 이미지 영역 */}
      {image && (
        <div className="relative h-48 bg-gray-200">
          <img
            src={image}
            alt={title || ''}
            className="w-full h-full object-cover"
          />
          {badge && (
            <div className="absolute top-4 right-4 bg-[var(--senior-primary)] text-white px-4 py-2 rounded-lg text-[var(--font-size-senior-sm)] font-bold">
              {badge}
            </div>
          )}
        </div>
      )}

      {/* 내용 영역 */}
      <div className="p-6">
        {title && (
          <h3 className="text-[var(--font-size-senior-xl)] font-bold text-gray-900 mb-3">
            {title}
          </h3>
        )}

        {description && (
          <p className="text-[var(--font-size-senior-base)] text-gray-700 leading-relaxed mb-4">
            {description}
          </p>
        )}

        {children}
      </div>

      {/* 푸터 영역 */}
      {footer && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-200">
          {footer}
        </div>
      )}
    </div>
  );
}
