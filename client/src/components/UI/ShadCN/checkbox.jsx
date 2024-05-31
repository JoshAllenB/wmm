"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { useTheme } from "@mui/material";
import { tokens } from "../Theme/theme.utils";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef(({ className, ...props }, ref) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const checkboxStyles = {
    root: {
      width: "24px",
      height: "24px",
      border: `3px solid ${
        colors.mirage[theme.palette.mode === "dark" ? 500 : 100]
      }`,
      outline: "none",
      outlineOffset: "2px",
      outlineColor: `${
        colors.mirage[theme.palette.mode === "dark" ? 300 : 500]
      }`,
    },
    indicator: {
      backgroundColor: `${
        colors.mirage[theme.palette.mode === "dark" ? 500 : 300]
      }`,
      color: `${colors.white[theme.palette.mode === "dark" ? 400 : 200]}`,
      width: "100%",
      height: "100%",
    },
  };

  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        `peer h-4 w-4 shrink-0 rounded-sm disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:text-${colors.white[500]}`,
        className
      )}
      style={checkboxStyles.root}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn("flex items-center justify-center text-current")}
        style={checkboxStyles.indicator}
      >
        <Check className="h-4 w-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
