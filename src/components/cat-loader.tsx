
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export const CatLoader = ({ className }: { className?: string }) => {
  return (
    <div className={cn("relative w-20 h-20", className)}>
      <style>
        {`
          @keyframes run-cycle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
          @keyframes leg-swing {
            0%, 100% { transform: rotate(20deg); }
            50% { transform: rotate(-20deg); }
          }
          @keyframes tail-wag {
            0%, 100% { transform: rotate(-15deg); }
            50% { transform: rotate(15deg); }
          }
          @keyframes speed-line {
            0% { transform: translateX(100%) scaleX(2); opacity: 0; }
            30%, 70% { transform: translateX(0) scaleX(1); opacity: 1; }
            100% { transform: translateX(-150%) scaleX(0.5); opacity: 0; }
          }
        `}
      </style>
      {/* Speed Lines */}
      <div className="absolute top-1/3 left-0 w-full h-2/3">
        <div className="absolute w-1/4 h-1 bg-muted-foreground/50 rounded-full" style={{ animation: 'speed-line 0.8s ease-in-out infinite', animationDelay: '0s' }}></div>
        <div className="absolute top-1/2 w-1/3 h-1 bg-muted-foreground/50 rounded-full" style={{ animation: 'speed-line 0.8s ease-in-out infinite', animationDelay: '0.2s' }}></div>
        <div className="absolute bottom-0 w-1/5 h-1 bg-muted-foreground/50 rounded-full" style={{ animation: 'speed-line 0.8s ease-in-out infinite', animationDelay: '0.4s' }}></div>
      </div>
      
      {/* Cat Body */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-10 h-10" style={{ animation: 'run-cycle 0.4s infinite' }}>
        {/* Tail */}
        <div className="absolute bottom-1 -right-4 w-5 h-1.5 bg-foreground rounded-full origin-left" style={{ animation: 'tail-wag 0.8s infinite' }}></div>
        {/* Body */}
        <div className="absolute bottom-0 left-0 w-6 h-5 bg-foreground rounded-t-lg rounded-bl-lg"></div>
        {/* Head */}
        <div className="absolute -top-4 right-0 w-5 h-5 bg-foreground rounded-full">
          {/* Ears */}
          <div className="absolute -top-1 left-0 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-foreground"></div>
          <div className="absolute -top-1 right-0 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-foreground"></div>
        </div>
        {/* Legs */}
        <div className="absolute bottom-0 left-1 w-1 h-3 bg-foreground origin-top" style={{ animation: 'leg-swing 0.4s infinite' }}></div>
        <div className="absolute bottom-0 left-4 w-1 h-3 bg-foreground origin-top" style={{ animation: 'leg-swing 0.4s infinite', animationDelay: '-0.2s' }}></div>
      </div>
    </div>
  );
};
