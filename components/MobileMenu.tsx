"use client";

import { useState, useEffect, useRef } from "react";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Hamburger / close button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        className="flex flex-col items-center justify-center w-9 h-9 rounded-full hover:bg-[#f4f0eb] transition-colors gap-[5px]"
      >
        {open ? (
          /* × close */
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3d3a38" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          /* ☰ three lines */
          <>
            <span className="block w-[18px] h-[1.5px] rounded-full" style={{ background: "#3d3a38" }} />
            <span className="block w-[18px] h-[1.5px] rounded-full" style={{ background: "#3d3a38" }} />
            <span className="block w-[18px] h-[1.5px] rounded-full" style={{ background: "#3d3a38" }} />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-2 rounded-xl overflow-hidden"
          style={{
            top: "100%",
            width: 200,
            background: "#ffffff",
            border: "1px solid #ece8e4",
            boxShadow: "0 8px 24px rgba(44,40,37,0.12)",
          }}
        >
          <a
            href="/favorites"
            className="flex items-center gap-3 px-4 py-3 text-[14px] hover:bg-[#faf8f6] transition-colors"
            style={{ color: "#1e1c1a", borderBottom: "1px solid #f4f0eb" }}
            onClick={() => setOpen(false)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
            </svg>
            Favoritos
          </a>
          <a
            href="/login"
            className="flex items-center gap-3 px-4 py-3 text-[14px] hover:bg-[#faf8f6] transition-colors"
            style={{ color: "#1e1c1a" }}
            onClick={() => setOpen(false)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a8680" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Mi cuenta
          </a>
        </div>
      )}
    </div>
  );
}
