import { cn } from '../../lib/utils';
import { HTMLAttributes } from 'react';

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white', className)} {...props} />;
}