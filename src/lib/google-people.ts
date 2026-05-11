type GooglePhoneNumber = {
  canonicalForm?: string
  type?: string
  value?: string
}

type GooglePeopleResponse = {
  phoneNumbers?: GooglePhoneNumber[]
}

const GOOGLE_PHONE_SCOPE = "https://www.googleapis.com/auth/user.phonenumbers.read"
const GOOGLE_PEOPLE_ENDPOINT = "https://people.googleapis.com/v1/people/me?personFields=phoneNumbers"
const URUGUAY_PHONE_REGEX = /^\+598\d{8}$/

const PHONE_TYPE_PRIORITY = new Map([
  ["mobile", 0],
  ["workMobile", 1],
  ["main", 2],
  ["other", 3],
  ["home", 4],
  ["work", 5],
  ["googleVoice", 6],
])

function getCandidatePhoneNumber(phone: GooglePhoneNumber): string | null {
  return phone.canonicalForm ?? phone.value ?? null
}

export function normalizeGooglePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone || !URUGUAY_PHONE_REGEX.test(phone)) return null
  return phone
}

export function selectGooglePhoneNumber(phoneNumbers: GooglePhoneNumber[] | null | undefined): string | null {
  if (!phoneNumbers?.length) return null

  const sortedPhones = [...phoneNumbers].sort((left, right) => {
    const leftPriority = PHONE_TYPE_PRIORITY.get(left.type ?? "") ?? 99
    const rightPriority = PHONE_TYPE_PRIORITY.get(right.type ?? "") ?? 99
    return leftPriority - rightPriority
  })

  for (const phone of sortedPhones) {
    const candidate = normalizeGooglePhoneNumber(getCandidatePhoneNumber(phone))
    if (candidate) return candidate
  }

  return null
}

export async function fetchGooglePhoneNumber(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(GOOGLE_PEOPLE_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) return null

    const payload = (await response.json()) as GooglePeopleResponse
    return selectGooglePhoneNumber(payload.phoneNumbers)
  } catch {
    return null
  }
}

export { GOOGLE_PHONE_SCOPE }
