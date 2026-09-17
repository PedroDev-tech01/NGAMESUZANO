import React from 'react';
import logoImg from '../assets/images/ngames_logo_1788365729018.jpg';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`relative rounded-full shrink-0 overflow-hidden border-2 border-[#E51D24] shadow-[0_0_12px_rgba(229,29,36,0.5)] ${sizeClasses[size]}`}>
        <img
          src={logoImg}
          alt="N! GAMES Logo"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="font-black text-base tracking-tight text-white uppercase">
              N<span className="text-[#E51D24]">!</span> GAMES
            </span>
          </div>
          <span className="text-[10px] font-mono tracking-wider font-extrabold text-[#E51D24] uppercase">
            #TMJ<span className="text-white">SEMPRE</span>
          </span>
        </div>
      )}
    </div>
  );
};
