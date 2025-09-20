# 🕐 Database Save Interval Configuration

## Location

File: `src/server/plugins/mqtt-database.ts`

## Current Setting

**Every 1 hour** (3,600,000 milliseconds)

## How to Change Save Interval

### Method 1: Using Helper Functions (Recommended)

```typescript
// In mqtt-database.ts, look for this line:
const SAVE_INTERVAL_MS = hours(1); // Current setting

// Change to:
const SAVE_INTERVAL_MS = minutes(30); // Every 30 minutes
const SAVE_INTERVAL_MS = hours(6); // Every 6 hours
const SAVE_INTERVAL_MS = days(1); // Every 1 day
```

### Method 2: Direct Milliseconds

```typescript
const SAVE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const SAVE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const SAVE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
```

## Available Helper Functions

- `minutes(n)` - Convert minutes to milliseconds
- `hours(n)` - Convert hours to milliseconds
- `days(n)` - Convert days to milliseconds

## Common Intervals

| Interval   | Code          | Milliseconds |
| ---------- | ------------- | ------------ |
| 1 minute   | `minutes(1)`  | 60,000       |
| 5 minutes  | `minutes(5)`  | 300,000      |
| 30 minutes | `minutes(30)` | 1,800,000    |
| 1 hour     | `hours(1)`    | 3,600,000    |
| 6 hours    | `hours(6)`    | 21,600,000   |
| 24 hours   | `days(1)`     | 86,400,000   |

## How It Works

1. MQTT data is received and stored in memory buffer
2. Every `SAVE_INTERVAL_MS`, the system automatically:
   - Takes latest data from buffer for each hospital
   - Saves to PostgreSQL database
   - Clears the buffer
3. Real-time dashboard still shows live MQTT data
4. Historical filters load data from database

## Testing

To manually trigger save without waiting for interval:

```javascript
// In browser console or server:
global.saveBufferToDatabase();
```

## Logs to Watch

When the interval triggers, you'll see:

```
⏰ Scheduled database save started...
📊 Data buffered for rs-a: {...}
✅ Saved data for rs-a
📈 Save completed: 2 saved, 0 errors
🧹 Buffer cleared
```

## Restart Required

After changing `SAVE_INTERVAL_MS`, restart the development server:

```bash
npm run dev
```
