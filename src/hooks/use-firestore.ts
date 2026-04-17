"use client"

import { useEffect, useRef, useState } from "react"
import {
  collection,
  doc,
  onSnapshot,
  query,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"

export function useDocument<T extends DocumentData>(
  collectionName: string,
  documentId: string | null
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!documentId) {
      // Use a ref to avoid calling setState synchronously in effect body
      const timer = setTimeout(() => setLoading(false), 0)
      return () => clearTimeout(timer)
    }

    const docRef = doc(getFirebaseDb(), collectionName, documentId)

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() } as unknown as T)
        } else {
          setData(null)
        }
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [collectionName, documentId])

  return { data, loading, error }
}

export function useCollection<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = []
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Stable ref for constraints to avoid infinite re-renders from array identity changes
  const constraintsRef = useRef(constraints)

  useEffect(() => {
    constraintsRef.current = constraints
    const q = query(collection(getFirebaseDb(), collectionName), ...constraintsRef.current)

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as T)
        setData(docs)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
    // constraints intentionally omitted — callers often pass inline arrays which
    // would cause infinite re-subscriptions. Use constraintsRef for latest value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName])

  return { data, loading, error }
}
