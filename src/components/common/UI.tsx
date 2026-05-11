import React from 'react';
import { cn } from '../../lib/utils';

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/30',
      secondary: 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20',
      outline: 'border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 text-white',
      ghost: 'bg-transparent hover:bg-white/5 text-slate-300 hover:text-white',
      danger: 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 shadow-none',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

export const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn('glass-card overflow-hidden', className)}>
    {children}
  </div>
);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-white placeholder-slate-500 transition-all focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);

export const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'info' | 'error' }) => {
  const variants = {
    default: 'bg-white/10 border border-white/10 text-slate-300',
    success: 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400',
    warning: 'bg-orange-500/20 border border-orange-500/30 text-orange-400',
    info: 'bg-blue-500/20 border border-blue-500/30 text-blue-400',
    error: 'bg-red-500/20 border border-red-500/30 text-red-400',
  };
  return (
    <span className={cn('inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider', variants[variant])}>
      {children}
    </span>
  );
};
