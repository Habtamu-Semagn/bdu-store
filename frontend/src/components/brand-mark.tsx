import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * BDU Store wordmark, used in the public, user and admin headers.
 *
 * The mark is the official Bahir Dar University seal from `/public`. That
 * artwork ships on a white square with its own generous margin, so it is
 * rendered without a border or box — on a white surface the margin reads as
 * intentional padding around the seal.
 */
export function BrandMark({
  className,
  href = '/',
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn('flex items-center gap-2.5 font-semibold', className)}
    >
      <Image
        src="/logo.jpeg"
        alt="Bahir Dar University"
        width={148}
        height={148}
        priority
        className="h-11 w-11 shrink-0 object-contain"
      />
      <span className="flex flex-col leading-tight">
        <span className="text-base">BDU Store</span>
        <span className="text-[11px] font-normal text-muted-foreground">
          Bahir Dar University
        </span>
      </span>
    </Link>
  );
}
