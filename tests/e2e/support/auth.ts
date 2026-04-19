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
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is required for E2E auth helpers")
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: customToken,
        returnSecureToken: true,
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to exchange custom token: ${response.status} ${await response.text()}`)
  }

  const json = (await response.json()) as { idToken?: string }
  if (!json.idToken) {
    throw new Error("Identity Toolkit response did not include idToken")
  }

  return json.idToken
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
  const idToken = await exchangeCustomTokenForIdToken(customToken)

  const response = await page.request.post("/api/auth/session", {
    data: { idToken },
  })

  if (!response.ok()) {
    throw new Error(`Session exchange failed with status ${response.status()}`)
  }
}

export async function signOut(page: Page) {
  await page.request.post("/api/auth/signout")
}
