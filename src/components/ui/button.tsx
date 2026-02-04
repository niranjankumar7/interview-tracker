import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90",
        secondary: "bg-secondary text-secondary-foreground hover:opacity-90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3",
        lg: "h-10 rounded-md px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonAsButtonProps = React.ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: false;
  };

type ButtonAsChildProps = React.ComponentPropsWithoutRef<typeof Slot> &
  VariantProps<typeof buttonVariants> & {
    asChild: true;
  };

export type ButtonProps = ButtonAsButtonProps | ButtonAsChildProps;

export const Button = React.forwardRef<
  HTMLButtonElement | HTMLElement,
  ButtonProps
>((props, ref) => {
  const { asChild, className, variant, size, ...rest } = props;
  const classes = cn(buttonVariants({ variant, size }), className);

  if (asChild) {
    return (
      <Slot
        ref={ref as React.Ref<HTMLElement>}
        className={classes}
        {...(rest as Omit<
          ButtonAsChildProps,
          "asChild" | "className" | "variant" | "size"
        >)}
      />
    );
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      className={classes}
      {...(rest as Omit<
        ButtonAsButtonProps,
        "asChild" | "className" | "variant" | "size"
      >)}
    />
  );
});

Button.displayName = "Button";
