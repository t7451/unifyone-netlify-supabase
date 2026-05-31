import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Section, SectionHeader } from "@/components/ui/section";

export interface FaqItem {
  q: string;
  a: React.ReactNode;
}

export function FAQ({
  title = "Questions, answered straight",
  eyebrow = "FAQ",
  items,
}: {
  title?: string;
  eyebrow?: string;
  items: FaqItem[];
}) {
  return (
    <Section tone="muted">
      <SectionHeader eyebrow={eyebrow} title={title} />
      <div className="mx-auto mt-10 max-w-3xl">
        <Accordion type="single" collapsible className="w-full">
          {items.map((it, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger>{it.q}</AccordionTrigger>
              <AccordionContent>{it.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  );
}
