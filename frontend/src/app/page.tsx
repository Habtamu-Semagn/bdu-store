import Image from 'next/image';
import Link from 'next/link';
import {
  ClipboardList,
  KeyRound,
  PackageCheck,
  ShieldCheck,
  Smartphone,
  Undo2,
} from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import SiteFooter from '@/components/site-footer';
import { Button } from '@/components/ui/button';

const CAPABILITIES = [
  {
    icon: KeyRound,
    title: 'Follow every request',
    description:
      'Track each device from pending review through to in storage, and see the storage token once it is issued.',
  },
  {
    icon: ShieldCheck,
    title: 'Only you can act',
    description:
      'Devices are tied to your account. Ownership and roles are enforced on the server, not in the browser.',
  },
  {
    icon: Undo2,
    title: 'Ask for it back',
    description:
      'Request release of a stored device and collect it once an administrator approves the handover.',
  },
];

const STEPS = [
  {
    icon: ClipboardList,
    title: 'Register your device',
    description:
      'Sign in with your university ID and submit the device you want to leave at the store — desktop, laptop, phone or tablet.',
  },
  {
    icon: PackageCheck,
    title: 'Hand it over at the store',
    description:
      'The clerk checks the device against your request. Once it is physically received, storage is approved and a token is issued.',
  },
  {
    icon: Undo2,
    title: 'Request release when you need it',
    description:
      'Ask for your device back from your dashboard. The store approves the release and you collect it at the counter.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-white/90 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <BrandMark />
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Register</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero — emblem-led, centred, on plain white. */}
        <section className="border-b border-border/70">
          <div className="container flex flex-col items-center py-20 text-center sm:py-28">
            <Image
              src="/logo.jpeg"
              alt="Bahir Dar University"
              width={148}
              height={148}
              priority
              className="h-28 w-28 object-contain sm:h-32 sm:w-32"
            />

            <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Bahir Dar University · Campus Store
            </p>

            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Safe storage for your devices while you are on campus
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Hand over personal computers, laptops, mobile phones and tablets to
              the campus store. Register the device online, hand it in at the
              counter, and request it back whenever you need it.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/register">Create an account</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Log in</Link>
              </Button>
            </div>

            <p className="mt-7 flex items-center gap-2 text-sm text-muted-foreground">
              <Smartphone className="h-4 w-4" aria-hidden />
              Registration and login use your Bahir Dar University ID — no email
              required.
            </p>
          </div>
        </section>

        {/* Capabilities — hairline-divided columns rather than boxed cards. */}
        <section className="border-b border-border/70">
          <div className="container py-16 sm:py-20">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              What you can do
            </h2>
            <div className="mt-8 grid gap-10 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border/70">
              {CAPABILITIES.map((item) => (
                <div key={item.title} className="sm:px-8 sm:first:pl-0 sm:last:pr-0">
                  <item.icon
                    className="h-5 w-5 text-primary"
                    aria-hidden
                  />
                  <h3 className="mt-4 font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works — numbered steps. */}
        <section>
          <div className="container py-16 sm:py-20">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              How storage works
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Submitting a request online does not mean the store has received
              your device. Only an administrator can approve storage, and only
              after the device has been handed over at the counter.
            </p>

            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="relative border-t border-border/70 pt-6"
                >
                  <span className="absolute -top-px left-0 h-px w-10 bg-primary" />
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                      <step.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Step {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
