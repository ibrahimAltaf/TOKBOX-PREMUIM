// app/chat/_components/Column.tsx
"use client";

export default function Column({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3 font-semibold">
        {title}
      </div>
      <div className="flex-1 overflow-auto p-4">{children}</div>
    </section>
  );
}
