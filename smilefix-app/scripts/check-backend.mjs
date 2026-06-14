/**
 * check-backend.mjs
 * Quick smoke test: verifies the frontend can reach all public license endpoints
 * on the backend without auth tokens, and that the device-id payload shape is correct.
 *
 * Usage:
 *   node scripts/check-backend.mjs
 */

const BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:3002'

const ENDPOINTS = [
  { label: 'Health',     path: '/api/v1/health' },
  { label: 'Lic Health', path: '/api/v1/license/health' },
  { label: 'Lic Status', path: '/api/v1/license/status' },
  { label: 'Device ID',  path: '/api/v1/license/device-id' },
]

let allOk = true

for (const { label, path } of ENDPOINTS) {
  const url = `${BASE}${path}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    const json = await res.json().catch(() => null)

    if (!res.ok) {
      console.error(`❌  [${label}] HTTP ${res.status}  ${url}`)
      console.error('    Response:', JSON.stringify(json))
      allOk = false
      continue
    }

    // Validate device-id payload shape specifically
    if (path.includes('device-id')) {
      const payload = json?.data
      if (!payload?.activationRequestCode) {
        console.error(`❌  [${label}] Missing activationRequestCode in response`)
        console.error('    Received:', JSON.stringify(json))
        allOk = false
        continue
      }
      console.log(`✅  [${label}] activationRequestCode = "${payload.activationRequestCode}"`)
      console.log(`    hostname=${payload.hardwareInfo?.hostname}  isFallback=${payload.hardwareInfo?.isFallback}`)
    } else {
      console.log(`✅  [${label}] ${res.status}  ${url}`)
    }
  } catch (err) {
    console.error(`❌  [${label}] UNREACHABLE — ${err.message}`)
    console.error(`    Make sure the backend is running: cd dental-clinic-backend && npm start`)
    allOk = false
  }
}

console.log('')
if (allOk) {
  console.log('🎉  All endpoints OK — frontend-backend handshake is healthy.')
} else {
  console.log('⚠️   One or more endpoints failed. Check backend logs and .env config.')
  process.exit(1)
}
