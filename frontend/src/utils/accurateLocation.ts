export type AccurateLocationError = Error & {
  bestAccuracy?: number
  locationErrorCode?: number
  position?: GeolocationPosition
}

/**
 * Fast, highly resilient device geolocation capture:
 * 1. Checks cached/network location first (maximumAge: 10 mins) — returns in <200ms on mobile.
 * 2. If cached or network accuracy is acceptable (<= 200m), resolves immediately.
 * 3. Starts high accuracy in parallel; if any valid position arrives, accepts it within 2.5s
 *    instead of blocking the user indoors waiting for impossible satellite locks.
 * 4. Never fails with false timeouts if any position exists.
 */
export function captureAccurateLocation(
  onAccuracy?: (accuracy: number) => void,
  accuracyThreshold = 200,
  timeoutMs = 15000,
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      const err = new Error('Location is not supported on this device.') as AccurateLocationError
      err.locationErrorCode = 2
      reject(err)
      return
    }

    let resolved = false
    let bestPosition: GeolocationPosition | null = null
    let bestAccuracy = Number.POSITIVE_INFINITY
    let watchId: number | null = null
    let timeoutTimer: number | null = null
    let quickResolveTimer: number | null = null

    const finish = (pos: GeolocationPosition) => {
      if (resolved) return
      resolved = true
      if (timeoutTimer !== null) clearTimeout(timeoutTimer)
      if (quickResolveTimer !== null) clearTimeout(quickResolveTimer)
      if (watchId !== null) {
        try {
          navigator.geolocation.clearWatch(watchId)
        } catch { }
      }
      resolve(pos)
    }

    const onPos = (position: GeolocationPosition) => {
      const acc = position.coords.accuracy
      if (Number.isFinite(acc) && acc > 0) {
        if (acc < bestAccuracy) {
          bestAccuracy = acc
          bestPosition = position
        }
        onAccuracy?.(bestAccuracy)
      } else if (!bestPosition) {
        bestPosition = position
      }

      // If accuracy is good enough (<= threshold), resolve immediately
      if (acc <= accuracyThreshold) {
        finish(position)
        return
      }

      // If we got ANY valid position (e.g. 250m-500m Wi-Fi/Cell lock),
      // give high accuracy 2.5 seconds to refine, then resolve with what we have.
      // This prevents indoor satellite timeouts completely!
      if (!quickResolveTimer) {
        quickResolveTimer = window.setTimeout(() => {
          if (bestPosition && !resolved) {
            finish(bestPosition)
          }
        }, 2500)
      }
    }

    // Stage 1: Fast attempt with network/cached accuracy (returns in 100-300ms on mobile)
    try {
      navigator.geolocation.getCurrentPosition(
        pos => onPos(pos),
        err => {
          if (err.code === err.PERMISSION_DENIED && !resolved) {
            resolved = true
            if (timeoutTimer !== null) clearTimeout(timeoutTimer)
            const permError = new Error('Location permission denied hai.') as AccurateLocationError
            permError.locationErrorCode = 1
            reject(permError)
          }
        },
        { enableHighAccuracy: false, maximumAge: 600000, timeout: 8000 },
      )
    } catch { }

    // Stage 2: Parallel high-accuracy attempt for satellite refinement
    try {
      navigator.geolocation.getCurrentPosition(
        pos => onPos(pos),
        err => {
          if (err.code === err.PERMISSION_DENIED && !resolved) {
            resolved = true
            if (timeoutTimer !== null) clearTimeout(timeoutTimer)
            const permError = new Error('Location permission denied hai.') as AccurateLocationError
            permError.locationErrorCode = 1
            reject(permError)
          }
        },
        { enableHighAccuracy: true, maximumAge: 60000, timeout: timeoutMs },
      )
    } catch { }

    // Stage 3: Watch position for active GPS updates
    try {
      watchId = navigator.geolocation.watchPosition(
        pos => onPos(pos),
        () => {},
        { enableHighAccuracy: true, maximumAge: 60000, timeout: timeoutMs },
      )
    } catch { }

    // Safety timeout: Never fail if ANY position was captured!
    timeoutTimer = window.setTimeout(() => {
      if (resolved) return
      if (bestPosition) {
        finish(bestPosition)
        return
      }
      resolved = true
      if (watchId !== null) {
        try {
          navigator.geolocation.clearWatch(watchId)
        } catch { }
      }
      const timeoutError = new Error('Location detect nahi ho saki. Upar address likhkar "Find on Map" dabayein.') as AccurateLocationError
      timeoutError.locationErrorCode = 3
      reject(timeoutError)
    }, timeoutMs)
  })
}