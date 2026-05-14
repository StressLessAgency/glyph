"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap select-none font-medium tracking-tight transition-[background,color,border,box-shadow,transform] duration-200 ease-out disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-bg hover:bg-ink/90 shadow-soft hover:shadow-lift",
        secondary:
          "bg-surface text-fg hover:bg-surface-2 border border-border hover:border-border-strong",
        ghost: "text-fg hover:bg-surface",
        accent:
          "bg-accent text-accent-fg hover:brightness-105 shadow-soft hover:shadow-lift",
        outline:
          "border border-border-strong text-fg hover:bg-surface hover:border-ink/40",
        link: "text-fg underline-offset-4 hover:underline px-0",
      },
      size: {
        sm: "h-11 px-3 text-[13px] rounded-md md:h-9",
        md: "h-11 px-4 text-sm rounded-lg md:h-10",
        lg: "h-12 px-6 text-[15px] rounded-xl",
        icon: "h-11 w-11 rounded-md md:h-9 md:w-9",
        "icon-lg": "h-11 w-11 rounded-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
