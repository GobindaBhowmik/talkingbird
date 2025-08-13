import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50 gap-2',
  {
    variants: {
      variant: {
        solid: 'bg-brand-600 hover:bg-brand-700 text-white',
        subtle: 'bg-white/10 hover:bg-white/15 text-white',
        outline: 'border border-white/20 bg-transparent hover:bg-white/10 text-white',
        ghost: 'bg-transparent hover:bg-white/10 text-white',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-10 px-4',
        lg: 'h-11 px-5',
      },
    },
    defaultVariants: { variant: 'solid', size: 'md' },
  }
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
));
Button.displayName = 'Button';