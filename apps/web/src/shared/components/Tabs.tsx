import { Tabs as TabsPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';

interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  tabs: TabItem[];
  label: string;
}

export function Tabs({ value, onValueChange, tabs, label }: TabsProps) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange}>
      <TabsPrimitive.List aria-label={label} className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className="focus-ring -mb-px border-b-2 border-transparent px-4 py-2 text-sm font-medium whitespace-nowrap text-text-muted data-[state=active]:border-primary data-[state=active]:text-text"
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((tab) => (
        <TabsPrimitive.Content key={tab.value} value={tab.value} className="focus-ring pt-6">
          {tab.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
