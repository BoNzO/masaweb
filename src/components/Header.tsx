import React from 'react';

const Header: React.FC = () => {
    return (
        <div className="mb-2">
            <svg width="410" height="80" viewBox="0 0 600 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
                <g transform="translate(10, 15)">
                    <path d="M30 0 L80 0 L105 43 L80 86 L30 86 L5 43 Z" stroke="#00D4FF" strokeWidth="3" fill="none" />
                    <path d="M30 20 L80 66 M80 20 L30 66" stroke="#00D4FF" strokeWidth="5" strokeLinecap="round">
                        <animate attributeName="opacity" values="0.8;1;0.8" dur="3s" repeatCount="indefinite" />
                    </path>
                </g>
                <text x="130" y="75" fill="#FFFFFF" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="42" letterSpacing="-1">
                    ABSOLUTE MASA <tspan fill="#00D4FF">X</tspan>
                </text>
            </svg>
        </div>
    );
};

export default Header;
