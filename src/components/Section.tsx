import type { ReactNode } from 'react';

export default function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 py-10 sm:py-14">
      <h2 className="mb-6 flex items-center gap-3 text-xl font-semibold tracking-tight sm:text-2xl">
        <span aria-hidden className="font-mono text-sm font-normal text-accent">
          //
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
