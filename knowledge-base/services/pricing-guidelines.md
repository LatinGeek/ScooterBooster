# ScooterBooster — Pricing Guidelines

## Pricing Structure

### Who Sets Prices?

- **Technicians** set their own **base prices** for each service they offer
- **ScooterBooster** adds a **service fee** (default 10%) on top
- **Users** pay the **total** (base price + service fee)

### Recommended Price Ranges (UYU)

| Service             | Min Price | Max Price | Typical Price |
| ------------------- | --------- | --------- | ------------- |
| Speed Limit Removal | $1,500    | $4,000    | $2,000        |
| Firmware Update     | $1,000    | $3,000    | $1,800        |
| Cruise Control      | $1,200    | $3,500    | $2,000        |
| General Maintenance | $800      | $5,000    | $1,500        |
| Tire Change         | $600      | $1,500    | $900          |
| Brake Adjustment    | $500      | $1,200    | $700          |
| Battery Diagnostic  | $400      | $1,000    | $600          |
| Full Diagnostic     | $1,000    | $2,500    | $1,500        |

### Factors That Affect Pricing

1. **Scooter brand/model complexity** — Performance scooters (Dualtron, Kaabo) typically cost more
2. **Parts required** — Maintenance services may need replacement parts (priced separately)
3. **Technician experience** — Higher-rated technicians may charge more
4. **Location** — Montevideo vs. interior may have different pricing
5. **Urgency** — Express service (if offered) at premium rate

## Display Format

### Currency

- Always display in **UYU** (Uruguayan Pesos)
- Symbol: `$` (peso sign, same as dollar)
- Thousands separator: `.` (dot) — e.g., `$1.650`
- No decimal places for whole numbers
- For cents: comma — e.g., `$1.650,50`

### Price Breakdown Display

```
Precio del servicio:    $1.500
Tarifa de plataforma:   $  150
─────────────────────────────
Total:                  $1.650
```

### Labels (Spanish)

- Base price: "Precio del servicio"
- Service fee: "Tarifa de plataforma"
- Total: "Total"
- VAT note: "IVA incluido" (if applicable)
- Price range: "Desde $X" (From $X)

## Service Fee Configuration

```typescript
// Current: environment variable
const SERVICE_FEE_PERCENTAGE = parseInt(process.env.SERVICE_FEE_PERCENTAGE || "10")

// Future: Firebase Remote Config
// const feeConfig = await remoteConfig.getValue("service_fee_percentage");
```

## Technician Payout (Future)

Currently, technician payouts are handled manually (bank transfer, MercadoPago transfer). In the future, this could be automated via MercadoPago split payments.
