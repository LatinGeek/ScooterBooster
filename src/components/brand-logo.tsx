import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"

type BrandLogoProps = {
  className?: string
  textClassName?: string
  imageClassName?: string
  href?: string
  label?: ReactNode
}

export function BrandLogo({
  className = "",
  textClassName = "",
  imageClassName = "",
  href = "/",
  label = (
    <>
      <span className="text-[#006349]">Scooter</span>
      <span className="text-[#10b388]">Booster</span>
    </>
  ),
}: BrandLogoProps) {
  return (
    <Link
      href={href}
      aria-label="ScooterBooster"
      className={`inline-flex items-center gap-2 font-semibold tracking-[-0.04em] transition-colors duration-150 hover:opacity-90 ${className}`.trim()}
    >
      <Image
        src="/assets/scooterbooster-logo.png"
        alt=""
        aria-hidden="true"
        width={40}
        height={40}
        className={`h-10 w-10 shrink-0 ${imageClassName}`.trim()}
        priority
      />
      <span
        className={`text-lg font-black leading-none tracking-[-0.06em] ${textClassName}`.trim()}
        style={{ fontFamily: "var(--font-brand)" }}
      >
        {label}
      </span>
    </Link>
  )
}
