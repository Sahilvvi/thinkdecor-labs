import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/Logo';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { PHASE1_PLAN, pence } from '@/lib/billing';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

const INTRO = pence(PHASE1_PLAN.introPrice ?? 0.69);

const navLinks = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#comparison', label: 'Compare' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
];

/** `overHero` lets the bar start transparent with light text — only for a page that opens on a dark hero (the homepage). Every other page gets the solid bar from the first pixel, so the nav is never white-on-white. */
export function Navbar({ overHero = false }: { overHero?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuthStore();
  const account = user ? { to: '/app', label: 'Dashboard' } : { to: '/login', label: 'Sign in' };
  const [scrolled, setScrolled] = useState(false);

  // Full-width and transparent at the top; a floating glass pill once the page moves.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const raised = !overHero || scrolled || mobileOpen;
  // Before the page scrolls, the pill is transparent and sits directly on the
  // dark hero — the usual dark nav-link/logo colours lose contrast there, so
  // this state alone goes light-on-dark. Once raised (scrolled, or the menu is
  // open), the pill is a solid white card again and the normal dark text returns.
  const light = !raised;

  return (
    <nav className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4">
      <div
        className={cn(
          'mx-auto rounded-[22px] border px-4 transition-all duration-500 sm:px-6',
          raised
            ? 'max-w-[1160px] border-border/70 bg-white/80 shadow-[0_12px_40px_-18px_hsl(168_30%_15%/0.28)] backdrop-blur-xl'
            : 'max-w-[1400px] border-transparent bg-white/0',
        )}
      >
        <div className="flex h-14 items-center justify-between">
          <Logo inverted={light} />

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'text-sm font-medium transition-colors',
                  light ? 'text-white/85 hover:text-white' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to={account.to}
              className={cn(
                'text-sm font-medium transition-colors',
                light ? 'text-white/85 hover:text-white' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {account.label}
            </Link>
            <Link to="/pricing">
              <Button variant="hero" size="sm">
                Start for {INTRO}
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className={cn('md:hidden p-2 transition-colors', light ? 'text-white' : 'text-foreground')}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-border/30">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-border/30">
                <Link to={account.to} onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full">
                    {account.label}
                  </Button>
                </Link>
                <Link to="/pricing" onClick={() => setMobileOpen(false)}>
                  <Button variant="hero" className="w-full">
                    Start for {INTRO}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
