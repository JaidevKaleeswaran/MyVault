import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * Reveal — lightweight GSAP fade-up wrapper.
 *
 * Wraps any children and animates them from opacity:0 + y:24px → visible
 * when the element enters the viewport (IntersectionObserver at 15% threshold).
 *
 * Props:
 *   delay   {number}  Animation start delay in seconds (use for stagger: index * 0.08)
 *   y       {number}  Starting Y offset in px (default 24)
 *   duration{number}  Animation duration in seconds (default 0.7)
 *   as      {string}  HTML wrapper tag (default 'div')
 *   className {string} Extra classes on the wrapper
 */
export default function Reveal({
  children,
  delay = 0,
  y = 24,
  duration = 0.7,
  as: Tag = 'div',
  className = '',
  style,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect prefers-reduced-motion
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    // Start hidden
    gsap.set(el, { opacity: 0, y });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.to(el, {
              opacity: 1,
              y: 0,
              duration,
              delay,
              ease: 'power3.out',
              overwrite: 'auto',
            });
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.15 }
    );

    io.observe(el);

    return () => {
      io.disconnect();
    };
  }, [delay, y, duration]);

  return (
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  );
}
