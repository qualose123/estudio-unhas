import React from 'react';

const Card = ({ children, className = '', hover = false }) => {
  return (
    <div className={`card ${hover ? 'hover:scale-105 cursor-pointer' : ''} ${className}`}>
      {children}
    </div>
  );
};

export default Card;
