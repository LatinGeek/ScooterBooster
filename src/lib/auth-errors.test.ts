import { describe, expect, it } from "vitest"
import { AuthFlowError, getLoginErrorMessage } from "@/lib/auth-errors"

describe("auth errors", () => {
  it("maps Firebase auth popup errors to actionable messages", () => {
    expect(getLoginErrorMessage({ code: "auth/popup-blocked" })).toContain("bloqueó")
    expect(getLoginErrorMessage({ code: "auth/unauthorized-domain" })).toContain("no está autorizado")
  })

  it("maps profile and session sync failures to specific messages", () => {
    expect(
      getLoginErrorMessage(
        new AuthFlowError(
          "auth/profile-sync-failed",
          "profile_sync",
          "Failed to sync user profile after Google sign-in."
        )
      )
    ).toContain("crear tu perfil")

    expect(
      getLoginErrorMessage(
        new AuthFlowError(
          "auth/session-sync-failed",
          "session_sync",
          "Failed to sync server session after Google sign-in."
        )
      )
    ).toContain("sincronizar tu sesión")
  })

  it("falls back to a generic message for unknown failures", () => {
    expect(getLoginErrorMessage(new Error("something else"))).toBe(
      "No se pudo iniciar sesión. Intentá de nuevo."
    )
  })
})
