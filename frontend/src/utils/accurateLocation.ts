export type AccurateLocationError = Error & {
  bestAccuracy?: number
  locationErrorCode?: number
  position?: GeolocationPosition
}

/**
 * Try a cached/network fix first, then allow Android browsers time to acquire GPS.
 * If only a coarse position arrives, use it as a fallback after GPS has had time to refine it.
 */
export function captureAccurateLocation(
  onAccuracy?: (accuracy: number) => void,
  accuracyThreshold = 200,
  timeoutMs = 30000,
  fresh = false,
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

      // Keep the coarse fix briefly while GPS refines it, then fall back to it.
      if (acc > accuracyThreshold && quickResolveTimer === null) {
        quickResolveTimer = window.setTimeout(() => {
          if (bestPosition && !resolved) {
            finish(bestPosition)
          }
        }, fresh ? 20000 : 10000)
      }
    }

    // Browsing can use a recent network fix. Checkout can opt into a fresh GPS-only request.
    if (!fresh) {
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
          { enableHighAccuracy: false, maximumAge: 600000, timeout: Math.min(timeoutMs, 15000) },
        )
      } catch { }
    }

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
        { enableHighAccuracy: true, maximumAge: fresh ? 0 : 60000, timeout: timeoutMs },
      )
    } catch { }

    // Stage 3: Watch position for active GPS updates
    try {
      watchId = navigator.geolocation.watchPosition(
        pos => onPos(pos),
        () => {},
        { enableHighAccuracy: true, maximumAge: fresh ? 0 : 60000, timeout: timeoutMs },
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
    }, timeoutMs + 1000)
  })
}
