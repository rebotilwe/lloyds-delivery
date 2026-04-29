import React from 'react';

export default function Spinner({ size = 'md', color = 'green' }) {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };
  
  const colors = {
    white: 'border-white',
    green: 'border-green',
    navy: 'border-navy',
    gray: 'border-gray-500',
  };
  
  return (
    <div className="flex justify-center items-center">
      <div className={`${sizes[size]} border-4 ${colors[color]} border-t-transparent rounded-full animate-spin`} />
    </div>
  );
}