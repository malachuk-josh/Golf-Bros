"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Horizontally-scrollable container with edge fades that appear only when there
 * is more content to scroll to in that direction — so the fade never sits on
 * top of (and visually clips) the last column when everything already fits.
 */
export default function ScrollX({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(false);

  function update() {
    const el = ref.current;
    if (!el) return;
    setLeft(el.scrollLeft > 1);
    setRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  // recompute after every render (content/size can change) and on resize
  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  });

  return (
    <div className="relative">
      <div ref={ref} onScroll={update} className={`overflow-x-auto ${className}`}>
        {children}
      </div>
      {left && (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-5 rounded-l-xl bg-gradient-to-r from-panel to-transparent" />
      )}
      {right && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 rounded-r-xl bg-gradient-to-l from-panel to-transparent" />
      )}
    </div>
  );
}
