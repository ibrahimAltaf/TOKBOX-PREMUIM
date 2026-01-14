"use client";

import Image from "next/image";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  {
    src: "https://sendbird.imgix.net/cms/image2_2024-03-26-214252_jekb.png",
    alt: "Chat UI collage preview",
  },
  {
    src: "https://sendbird.imgix.net/cms/Blog-Mobile-Patterns-messaging-design-patterns.png",
    alt: "Messaging design patterns collage",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-zinc-900">
      {/* Background image (chat UI) */}
      <div className="absolute inset-0">
        <Image
          src={slides[0].src}
          alt="TokBox background"
          fill
          priority
          className="object-cover"
        />
        {/* Purple overlay to make it premium + readable */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.35),rgba(255,255,255,0.65)_55%,rgba(255,255,255,0.95))]" />
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/30 via-white/40 to-white" />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-6xl items-center px-5 py-14">
        <div className="grid w-full items-center gap-10 md:grid-cols-[1.05fr_0.95fr]">
          {/* Left: Hero */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white/70 px-3 py-1 text-xs font-semibold text-purple-700 shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              TokBox • Realtime Rooms
            </div>

            <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl">
              Join a{" "}
              <span className="bg-gradient-to-r from-purple-700 via-fuchsia-600 to-purple-700 bg-clip-text text-transparent">
                chat room
              </span>{" "}
              and start talking — instantly.
            </h1>

            <p className="mt-4 max-w-xl text-pretty text-base leading-7 text-zinc-600 sm:text-lg">
              TokBox is built for fast, room-based conversations with a clean,
              premium UI. One click and you’re in.
            </p>

            <div className="mt-7">
              <Link
                href="/profile/setup"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-700 via-fuchsia-600 to-purple-700 px-6 text-sm font-semibold text-white shadow-[0_16px_60px_rgba(168,85,247,0.35)] transition hover:translate-y-[-1px] hover:brightness-110"
              >
                Enter Chat Room
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="mt-5 text-xs text-zinc-500">
              No signup • Realtime updates • Smooth experience
            </div>
          </div>

          {/* Right: Slider */}
          <div className="relative">
            <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-purple-500/30 via-fuchsia-500/20 to-purple-500/30 blur-xl" />
            <div className="relative rounded-[28px] border border-purple-200 bg-white/80 p-4 shadow-[0_25px_90px_rgba(17,24,39,0.16)] backdrop-blur">
              <Slider />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Slider() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
  });
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setIndex(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-zinc-900">
          Chat UI Preview
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-purple-200 bg-white/70 shadow-sm transition hover:bg-white"
            type="button"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={next}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-purple-200 bg-white/70 shadow-sm transition hover:bg-white"
            type="button"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {slides.map((s) => (
            <div key={s.src} className="min-w-0 flex-[0_0_100%]">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-purple-200 bg-white">
                <Image src={s.src} alt={s.alt} fill className="object-cover" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* dots */}
      <div className="mt-4 flex justify-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            className={`h-2.5 w-2.5 rounded-full transition ${
              i === index
                ? "bg-purple-700"
                : "bg-purple-200 hover:bg-purple-300"
            }`}
            aria-label={`Go to slide ${i + 1}`}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
