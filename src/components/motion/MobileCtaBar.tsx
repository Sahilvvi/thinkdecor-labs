import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { FREE_SIGNUP_CREDITS } from '@/lib/generation';

/**
 * Phones only: a slim "Try it free" bar that slides up once the visitor is
 * past the hero, tucks away while they scroll back up (the nav returns
 * then), and stays out of the way of the footer. Hidden for signed-in users.
 */
export function MobileCtaBar() {
  const { user } = useAuthStore();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const pastHero = y > window.innerHeight * 0.9;
      const footer = document.querySelector('footer');
      const nearFooter = footer ? footer.getBoundingClientRect().top < window.innerHeight : false;
      const goingDown = y > last + 2;
      const goingUp = y < last - 2;
      if (goingDown || goingUp) {
        setShow(pastHero && !nearFooter && goingDown);
        last = y;
      }
      if (!pastHero || nearFooter) setShow(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (user) return null;

  return (
    <div
      className={cn(
        'fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+12px)] z-50 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden',
        show ? 'translate-y-0' : 'translate-y-[160%]',
      )}
      aria-hidden={!show}
    >
      <Link
        to="/signup"
        tabIndex={show ? 0 : -1}
        className="flex items-center justify-between gap-3 rounded-full bg-[#00332C]/95 py-2 pl-5 pr-2 text-white shadow-[0_18px_40px_-14px_rgba(0,40,35,0.8)] ring-1 ring-white/10 backdrop-blur-md"
      >
        <span className="leading-tight">
          <b className="block text-[14.5px] font-semibold">Try it on your room</b>
          <small className="text-[12px] text-white/65">{FREE_SIGNUP_CREDITS} free redesigns · no card</small>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00A08C] px-4 py-2.5 text-[13.5px] font-semibold">
          Start free <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
    </div>
  );
}
