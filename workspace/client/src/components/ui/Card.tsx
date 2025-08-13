import { cn } from '../../lib/utils';
import { HTMLAttributes } from 'react';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur-md', className)} {...props} />;
}