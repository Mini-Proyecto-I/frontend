import * as React from "react";
import { cn } from "@/shared/utils/utils";

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        className={cn("grid gap-2", className)}
        ref={ref}
        role="radiogroup"
        {...props}
      />
    );
  }
);
RadioGroup.displayName = "RadioGroup";

export interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, label, id, ...props }, ref) => {
    const [radioId] = React.useState(() => id || `radio-${Math.random().toString(36).substr(2, 9)}`);
    
    return (
      <div className="flex items-center space-x-2">
        <input
          type="radio"
          id={radioId}
          className={cn(
            "h-4 w-4 border border-primary text-primary ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
            className
          )}
          ref={ref}
          {...props}
        />
        {label && (
          <label
            htmlFor={radioId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
