import { resolve } from "node:path"
import dotenv from "dotenv"
import type { Page } from "@playwright/test"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

dotenv.config({ path: resolve(process.cwd(), ".env.local") })

interface SignInOptions {
  uid: string
  role: "user" | "technician" | "admin"
  email: string
  displayName: string
}

function getAdminSdk() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
  }

  return {
    adminAuth: getAuth(),
    adminDb: getFirestore(),
  }
}

async function exchangeCustomTokenForIdToken(customToken: string): Promise<string> {
  return customToken
}

async function upsertUserProfile({ uid, role, email, displayName }: SignInOptions) {
  const { adminDb } = getAdminSdk()

  await adminDb.collection("users").doc(uid).set(
    {
      displayName,
      email,
      photoURL: null,
      role,
      phone: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  )
}

export async function signInAs(page: Page, options: SignInOptions) {
  const { adminAuth } = getAdminSdk()

  await upsertUserProfile(options)

  const customToken = await adminAuth.createCustomToken(options.uid, {
    role: options.role,
  })
  const token = await exchangeCustomTokenForIdToken(customToken)

  await page.goto("/")
  await page.waitForFunction(() => typeof window.__scooterboosterE2EAuth?.signInWithCustomToken === "function")
  await page.evaluate(async (value) => {
    await window.__scooterboosterE2EAuth?.signInWithCustomToken(value)
  }, token)
  await page.waitForFunction(() => document.cookie.includes("__role="))
}

export async function signOut(page: Page) {
  await page.goto("/")
  await page.waitForFunction(() => typeof window.__scooterboosterE2EAuth?.signOut === "function")
  await page.evaluate(async () => {
    await window.__scooterboosterE2EAuth?.signOut()
  })
  await page.waitForFunction(() => !document.cookie.includes("__role="))
}
