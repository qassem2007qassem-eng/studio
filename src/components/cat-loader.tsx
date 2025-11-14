
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export const CatLoader = ({ className }: { className?: string }) => {
  return (
    <div className={cn("relative w-24 h-24", className)}>
      <style>
        {`
          @keyframes run-cycle {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
            100% { transform: translateY(0px); }
          }
          @keyframes leg-swing-front {
            0% { transform: rotate(15deg); }
            50% { transform: rotate(-35deg); }
            100% { transform: rotate(15deg); }
          }
          @keyframes leg-swing-back {
            0% { transform: rotate(-35deg); }
            50% { transform: rotate(15deg); }
            100% { transform: rotate(-35deg); }
          }
          @keyframes tail-wag {
            0% { transform: rotate(-20deg) translateY(-2px); }
            50% { transform: rotate(20deg) translateY(0px); }
            100% { transform: rotate(-20deg) translateY(-2px); }
          }
          @keyframes speed-line {
            0% { transform: translateX(120%) scaleX(2.5); opacity: 0; }
            40%, 60% { transform: translateX(0) scaleX(1); opacity: 1; }
            100% { transform: translateX(-150%) scaleX(0.5); opacity: 0; }
          }
        `}
      </style>
      
      {/* Speed Lines */}
      <div className="absolute top-1/2 left-0 w-full h-1/2">
        <div className="absolute w-1/4 h-1 bg-muted/80 rounded-full" style={{ animation: 'speed-line 0.9s ease-in-out infinite', animationDelay: '0s' }}></div>
        <div className="absolute top-1/3 w-1/3 h-1 bg-muted/80 rounded-full" style={{ animation: 'speed-line 0.9s ease-in-out infinite', animationDelay: '-0.2s' }}></div>
        <div className="absolute top-2/3 w-1/5 h-1 bg-muted/80 rounded-full" style={{ animation: 'speed-line 0.9s ease-in-out infinite', animationDelay: '-0.4s' }}></div>
      </div>
      
      {/* Cat Body */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-14 h-14" style={{ animation: 'run-cycle 0.4s linear infinite' }}>
        {/* Tail */}
        <div className="absolute bottom-2 -right-5 w-8 h-2.5 bg-foreground rounded-full origin-left" style={{ animation: 'tail-wag 0.8s ease-in-out infinite' }}></div>
        
        {/* Legs */}
        <div className="absolute bottom-0 left-7 w-2 h-6 bg-foreground rounded-b-full origin-top" style={{ animation: 'leg-swing-front 0.4s linear infinite' }}></div>
        <div className="absolute bottom-0 left-2 w-2 h-6 bg-foreground rounded-b-full origin-top" style={{ animation: 'leg-swing-back 0.4s linear infinite' }}></div>

        {/* Body */}
        <div className="absolute bottom-0 left-0 w-11 h-8 bg-foreground rounded-t-xl rounded-b-lg"></div>
        
        {/* Head */}
        <div className="absolute -top-6 right-0 w-8 h-8 bg-foreground rounded-full">
          {/* Eyes */}
          <div className="absolute top-3 right-2 w-1 h-1.5 bg-background rounded-full"></div>
          {/* Ears */}
          <div className="absolute -top-2 left-0 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[9px] border-b-foreground transform rotate-[-10deg]"></div>
          <div className="absolute -top-2 right-0 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[9px] border-b-foreground transform rotate-[10deg]"></div>
        </div>

        {/* Far side legs */}
         <div className="absolute bottom-0 left-6 w-2 h-6 bg-foreground/70 rounded-b-full origin-top" style={{ animation: 'leg-swing-back 0.4s linear infinite' }}></div>
         <div className="absolute bottom-0 left-1 w-2 h-6 bg-foreground/70 rounded-b-full origin-top" style={{ animation: 'leg-swing-front 0.4s linear infinite' }}></div>
      </div>
    </div>
  );
};
