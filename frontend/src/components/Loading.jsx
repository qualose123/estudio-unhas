import React from 'react';

const Loading = ({ message = 'Carregando...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="spinner"></div>
      <p className="text-neutral-600 font-medium">{message}</p>
    </div>
  );
};

export default Loading;
