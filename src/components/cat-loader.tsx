
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export const CatLoader = ({ className }: { className?: string }) => {
  return (
    <div className={cn("relative w-28 h-28", className)}>
      <style>
        {`
          .rabbit-loader__body {
            animation: rabbit-run 0.4s ease-in-out infinite;
          }
          .rabbit-loader__leg--front {
            animation: rabbit-leg-front 0.4s ease-in-out infinite;
          }
          .rabbit-loader__leg--back {
            animation: rabbit-leg-back 0.4s ease-in-out infinite;
          }
          .rabbit-loader__ear {
            animation: rabbit-ear-flap 1.2s ease-in-out infinite;
          }
           .rabbit-loader__speed-line {
            animation: rabbit-speed-line 0.9s ease-out infinite;
          }

          @keyframes rabbit-run {
            0% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
            100% { transform: translateY(0); }
          }

          @keyframes rabbit-leg-front {
            0% { transform: rotate(-25deg); }
            50% { transform: rotate(45deg); }
            100% { transform: rotate(-25deg); }
          }

          @keyframes rabbit-leg-back {
            0% { transform: rotate(45deg); }
            50% { transform: rotate(-25deg); }
            100% { transform: rotate(45deg); }
          }

          @keyframes rabbit-ear-flap {
            0%, 100% { transform: rotate(-10deg); }
            50% { transform: rotate(-15deg); }
          }

          @keyframes rabbit-speed-line {
            0% { transform: translateX(100px) scaleX(1); opacity: 0; }
            50% { transform: translateX(0) scaleX(1); opacity: 1; }
            100% { transform: translateX(-100px) scaleX(0.5); opacity: 0; }
          }
        `}
      </style>
      <div className="absolute w-full h-full flex items-center justify-center">
        {/* Speed Lines */}
        <div className="absolute top-[60%] left-0 w-full h-px">
          <div
            className="rabbit-loader__speed-line absolute h-1 w-8 bg-muted rounded-full"
            style={{ animationDelay: '0s' }}
          />
          <div
            className="rabbit-loader__speed-line absolute h-1 w-6 bg-muted rounded-full top-2"
            style={{ animationDelay: '-0.2s' }}
          />
           <div
            className="rabbit-loader__speed-line absolute h-0.5 w-4 bg-muted rounded-full top-[-6px]"
            style={{ animationDelay: '-0.4s' }}
          />
        </div>

        {/* Rabbit */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full rabbit-loader__body"
          style={{ transformOrigin: 'bottom center' }}
        >
          <g className="fill-current text-foreground">
            {/* Back Leg */}
            <path
              className="rabbit-loader__leg rabbit-loader__leg--back"
              style={{ transformOrigin: '28px 48px' }}
              d="M 28,48 C 22,58 20,70 30,75 C 40,80 45,70 42,60 L 28,48 Z"
            />
            {/* Front Leg */}
            <path
              className="rabbit-loader__leg rabbit-loader__leg--front"
              style={{ transformOrigin: '52px 48px' }}
              d="M 52,48 C 46,58 44,70 54,75 C 64,80 69,70 66,60 L 52,48 Z"
            />
            {/* Body */}
            <path d="M 25,55 a 25,18 0 0,1 50,0" />
            {/* Head */}
            <circle cx="75" cy="40" r="15" />
            {/* Ears */}
            <path
              className="rabbit-loader__ear"
              style={{ transformOrigin: '70px 30px' }}
              d="M 70,30 C 65,10 75,10 75,30 Z"
            />
             {/* Tail */}
            <circle cx="22" cy="45" r="5" />
          </g>
        </svg>
      </div>
    </div>
  );
};
