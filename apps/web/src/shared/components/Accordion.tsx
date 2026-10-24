import { ChevronDown } from 'lucide-react';
import { Accordion as AccordionPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';

export interface AccordionItem {
  value: string;
  title: ReactNode;
  content: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  value: string[];
  onValueChange: (value: string[]) => void;
}

export function Accordion({ items, value, onValueChange }: AccordionProps) {
  return (
    <AccordionPrimitive.Root type="multiple" value={value} onValueChange={onValueChange} className="flex flex-col gap-2">
      {items.map((item) => (
        <AccordionPrimitive.Item key={item.value} value={item.value} className="rounded-md border border-border">
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="focus-ring group flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-semibold">
              {item.title}
              <ChevronDown aria-hidden size={16} className="shrink-0 transition-transform group-data-[state=open]:rotate-180" />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="px-1 pb-2">{item.content}</AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
