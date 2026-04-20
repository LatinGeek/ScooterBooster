import * as React from "react"
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface BaseEmailProps {
  preview: string
  title: string
  intro: string
  ctaLabel?: string
  ctaHref?: string
  children?: React.ReactNode
}

export function BaseEmail({
  preview,
  title,
  intro,
  ctaLabel,
  ctaHref,
  children,
}: BaseEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={hero}>
            <Text style={brand}>ScooterBooster</Text>
            <Heading style={heading}>{title}</Heading>
            <Text style={introText}>{intro}</Text>
            {ctaLabel && ctaHref ? (
              <Button href={ctaHref} style={button}>
                {ctaLabel}
              </Button>
            ) : null}
          </Section>

          {children ? <Section style={content}>{children}</Section> : null}

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>
              Este mensaje fue enviado por ScooterBooster, la plataforma para reservas de servicio
              técnico para scooters eléctricos en Uruguay.
            </Text>
            <Text style={footerText}>
              <Link href="https://scooterbooster.uy/legal/privacy" style={footerLink}>
                Privacidad
              </Link>{" "}
              ·{" "}
              <Link href="https://scooterbooster.uy/legal/terms" style={footerLink}>
                Términos
              </Link>{" "}
              ·{" "}
              <Link href="https://scooterbooster.uy/legal/cookies" style={footerLink}>
                Cookies
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const body: React.CSSProperties = {
  backgroundColor: "#f4f7f5",
  fontFamily: "Arial, Helvetica, sans-serif",
  margin: 0,
  padding: "32px 12px",
}

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #d1e7db",
  borderRadius: "20px",
  margin: "0 auto",
  maxWidth: "600px",
  overflow: "hidden",
}

const hero: React.CSSProperties = {
  background: "linear-gradient(135deg, #111827 0%, #0f766e 100%)",
  color: "#ffffff",
  padding: "32px",
}

const brand: React.CSSProperties = {
  color: "#a7f3d0",
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  margin: "0 0 8px",
  textTransform: "uppercase",
}

const heading: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "28px",
  lineHeight: 1.2,
  margin: "0 0 12px",
}

const introText: React.CSSProperties = {
  color: "#e5f8ef",
  fontSize: "16px",
  lineHeight: 1.6,
  margin: "0 0 18px",
}

const button: React.CSSProperties = {
  backgroundColor: "#10b981",
  borderRadius: "999px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 700,
  padding: "14px 24px",
  textDecoration: "none",
}

const content: React.CSSProperties = {
  padding: "28px 32px 12px",
}

const divider: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "12px 32px 0",
}

const footer: React.CSSProperties = {
  padding: "16px 32px 28px",
}

const footerText: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: 1.6,
  margin: "0 0 6px",
}

const footerLink: React.CSSProperties = {
  color: "#0f766e",
  textDecoration: "none",
}
