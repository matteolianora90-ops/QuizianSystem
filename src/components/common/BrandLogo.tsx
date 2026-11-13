import React from 'react';

export const QUIZIAN_LOGO_SRC = `${import.meta.env.BASE_URL}assets/aistudio/download__3__de814aad.jfif`;

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<BrandLogoProps['size']>, string> = {
  xs: 'w-5 h-5',
  sm: 'w-7 h-7',
  md: 'w-10 h-10',
  lg: 'w-11 h-11',
  xl: 'w-14 h-14 sm:w-16 sm:h-16',
};

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', className = '' }) => {
  return (
    <span
      className={`inline-flex items-center justify-center aspect-square rounded-full overflow-hidden shrink-0 ${SIZE_CLASSES[size]} ${className}`}
    >
      <img
        src={QUIZIAN_LOGO_SRC}
        alt="Quizian logo"
        className="w-full h-full object-contain scale-[1.07] block"
      />
    </span>
  );
};
