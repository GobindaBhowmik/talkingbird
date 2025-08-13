import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn('h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-brand-500', className)}
    {...props}
  />
));
Input.displayName = 'Input';