export default function TechChips({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="rounded border border-line bg-surface-2 px-2 py-1 font-mono text-[11px] leading-none text-muted"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
