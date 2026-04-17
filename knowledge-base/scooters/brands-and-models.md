# ScooterBooster — Scooter Brands & Models

## Supported Brands

### 1. Xiaomi

One of the most popular scooter brands in Uruguay due to availability and affordability.

| Model                       | Max Speed | Range | Battery | Motor | Weight  |
| --------------------------- | --------- | ----- | ------- | ----- | ------- |
| Mi Electric Scooter 1S      | 25 km/h   | 30 km | 275 Wh  | 300W  | 12.5 kg |
| Mi Electric Scooter Pro 2   | 25 km/h   | 45 km | 474 Wh  | 300W  | 14.2 kg |
| Mi Electric Scooter 3       | 25 km/h   | 30 km | 275 Wh  | 300W  | 13.2 kg |
| Mi Electric Scooter 4 Pro   | 25 km/h   | 55 km | 474 Wh  | 350W  | 16.5 kg |
| Mi Electric Scooter 4 Ultra | 25 km/h   | 70 km | 561 Wh  | 500W  | 24 kg   |

### 2. Segway-Ninebot

Premium quality with strong firmware ecosystem.

| Model                       | Max Speed | Range | Battery | Motor | Weight  |
| --------------------------- | --------- | ----- | ------- | ----- | ------- |
| Ninebot KickScooter E2      | 20 km/h   | 20 km | 184 Wh  | 250W  | 13 kg   |
| Ninebot KickScooter F2      | 25 km/h   | 40 km | 367 Wh  | 350W  | 15.8 kg |
| Ninebot KickScooter Max G30 | 30 km/h   | 65 km | 551 Wh  | 350W  | 18.7 kg |
| Ninebot KickScooter Max G2  | 25 km/h   | 70 km | 551 Wh  | 450W  | 20 kg   |
| Ninebot KickScooter GT2     | 70 km/h   | 90 km | 1512 Wh | 3000W | 52.6 kg |

### 3. Dualtron

High-performance scooters for enthusiasts.

| Model                  | Max Speed | Range  | Battery | Motor | Weight |
| ---------------------- | --------- | ------ | ------- | ----- | ------ |
| Dualtron Mini          | 45 km/h   | 55 km  | 748 Wh  | 1000W | 20 kg  |
| Dualtron Compact       | 60 km/h   | 60 km  | 1036 Wh | 1800W | 25 kg  |
| Dualtron Thunder 2     | 100 km/h  | 150 km | 2700 Wh | 5400W | 47 kg  |
| Dualtron Victor Luxury | 80 km/h   | 100 km | 2268 Wh | 4000W | 38 kg  |
| Dualtron Storm Limited | 100 km/h  | 160 km | 2700 Wh | 6640W | 46 kg  |

### 4. Kaabo

Performance-oriented brand gaining popularity.

| Model                  | Max Speed | Range  | Battery | Motor | Weight |
| ---------------------- | --------- | ------ | ------- | ----- | ------ |
| Kaabo Mantis 10 Lite   | 48 km/h   | 50 km  | 748 Wh  | 1000W | 22 kg  |
| Kaabo Mantis King GT   | 70 km/h   | 100 km | 1512 Wh | 2000W | 33 kg  |
| Kaabo Wolf Warrior 11+ | 80 km/h   | 110 km | 1680 Wh | 5400W | 46 kg  |
| Kaabo Wolf King GT Pro | 90 km/h   | 120 km | 2520 Wh | 4800W | 50 kg  |

### 5. VSETT

Solid mid-to-high-range scooters with good customization options.

| Model     | Max Speed | Range  | Battery | Motor | Weight |
| --------- | --------- | ------ | ------- | ----- | ------ |
| VSETT 8   | 40 km/h   | 50 km  | 748 Wh  | 800W  | 18 kg  |
| VSETT 9+  | 52 km/h   | 60 km  | 840 Wh  | 1400W | 23 kg  |
| VSETT 10+ | 65 km/h   | 90 km  | 1560 Wh | 2800W | 34 kg  |
| VSETT 11+ | 80 km/h   | 110 km | 2100 Wh | 3600W | 42 kg  |

### 6. Zero

Affordable performance scooters popular in Latin America.

| Model    | Max Speed | Range  | Battery | Motor | Weight |
| -------- | --------- | ------ | ------- | ----- | ------ |
| Zero 8   | 40 km/h   | 35 km  | 499 Wh  | 500W  | 16 kg  |
| Zero 9   | 40 km/h   | 40 km  | 600 Wh  | 600W  | 18 kg  |
| Zero 10X | 65 km/h   | 80 km  | 1560 Wh | 2400W | 35 kg  |
| Zero 11X | 100 km/h  | 120 km | 2700 Wh | 5600W | 46 kg  |

### 7. Inokim

Premium build quality with sleek designs.

| Model                | Max Speed | Range  | Battery | Motor | Weight  |
| -------------------- | --------- | ------ | ------- | ----- | ------- |
| Inokim Light 2       | 35 km/h   | 30 km  | 374 Wh  | 350W  | 13.6 kg |
| Inokim OX            | 45 km/h   | 60 km  | 720 Wh  | 800W  | 20.5 kg |
| Inokim OXO           | 65 km/h   | 100 km | 1440 Wh | 2600W | 33 kg   |
| Inokim Quick 4 Super | 50 km/h   | 50 km  | 780 Wh  | 1200W | 22 kg   |

## Notes

- **Factory speed limits:** Most consumer scooters (Xiaomi, Segway) have firmware-enforced speed limits (typically 25 km/h in Europe/LATAM settings). These can be modified via custom firmware.
- **Compatibility:** Not all services are available for all models. See `/knowledge-base/scooters/compatibility-matrix.md` for details.
- **Adding new models:** Admin can add new brands/models via the admin panel. The catalog is stored in Firestore and can be updated dynamically.
