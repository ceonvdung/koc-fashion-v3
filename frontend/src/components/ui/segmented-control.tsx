"use client";

import { Tabs, TabsList, TabsTrigger } from "./tabs";

interface SegmentedControlProps {
  options: { value: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({ options, value, onValueChange, className }: SegmentedControlProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className={className}>
      <TabsList className="w-full rounded-2xl p-0.5 bg-[#1E1B2E] gap-0 h-auto">
        {options.map((opt) => (
          <TabsTrigger
            key={opt.value}
            value={opt.value}
            className="flex-1 h-9 rounded-xl text-sm font-medium transition-all duration-200 text-[#94A3B8] hover:text-white data-active:bg-gradient-to-r data-active:from-[#8B5CF6] data-active:to-[#A855F7] data-active:text-white data-active:shadow-sm data-active:shadow-[#8B5CF6]/20"
          >
            {opt.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
