import * as React from "react";

import { fieldStyles } from "@/components/common/control-styles";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          cn(fieldStyles, "flex file:border-0 file:bg-transparent file:text-sm file:font-medium"),
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
