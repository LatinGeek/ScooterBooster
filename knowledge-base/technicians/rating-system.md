# ScooterBooster — Rating System

## Overview

Users can rate and review technicians after a completed booking. Ratings help other users choose technicians and maintain quality on the platform.

## Rating Scale

- **1 star:** Muy malo (Very bad)
- **2 stars:** Malo (Bad)
- **3 stars:** Regular (Average)
- **4 stars:** Bueno (Good)
- **5 stars:** Excelente (Excellent)

## Review Rules

### Who Can Review

- Only users with a **completed** booking can leave a review
- One review per booking
- Reviews can be edited within 48 hours of submission
- Reviews cannot be deleted by the user (admin can remove inappropriate reviews)

### Review Content

| Field           | Required | Type   | Constraints         |
| --------------- | -------- | ------ | ------------------- |
| Rating          | ✅       | number | 1-5 (whole numbers) |
| Comment         | ✅       | text   | 10-500 characters   |
| Service quality | ❌       | number | 1-5 (sub-rating)    |
| Punctuality     | ❌       | number | 1-5 (sub-rating)    |
| Communication   | ❌       | number | 1-5 (sub-rating)    |

### Technician Average Rating

```typescript
// Average rating is recalculated on each new review
const avgRating = totalStars / reviewCount
// Stored as a number with 1 decimal: e.g., 4.3
// Updated in the technician document for fast querying
```

### Display Format

- Stars displayed as filled/empty star icons (Lucide: `Star` icon)
- Average shown as "4.3 ★ (27 reseñas)"
- Individual reviews show: user name, date, rating stars, comment text

## Moderation

- Admin can hide reviews that violate community guidelines
- Technicians can flag reviews for admin review
- No automated content moderation in MVP (manual only)

## Impact on Technician Visibility

- Technicians with 0 reviews show "Nuevo" (New) badge
- Technicians are sorted by: rating (descending) → review count (descending)
- Minimum 3.0 average rating required to remain active (after 10+ reviews)
- "Top Rated" badge for technicians with 4.5+ average and 10+ reviews

## Review Timing

- Review prompt appears on the user's dashboard after booking status = "completed"
- User can leave a review up to 30 days after completion
- After 30 days, the review window closes
