export type AccurateLocationError = Error & {
  bestAccuracy?: number
  locationErrorCode?: number
  position?: GeolocationPosition
}

export function captureAccurateLocation(
  onAccuracy?: (accuracy: number) => void,
  accuracyThreshold = 100,
  timeoutMs = 15000,
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      const err = new Error('Location is not supported on this device.') as AccurateLocationError
      err.locationErrorCode = 2
      reject(err)
      return
    }

    let watchId: number | null = null
    let timeoutId = 0
    let bestAccuracy = Number.POSITIVE_INFINITY
    let bestPosition: GeolocationPosition | null = null
    let finished = false

    const finish = (callback: () => void) => {
      if (finished) return
      finished = true
      window.clearTimeout(timeoutId)
      if (watchId !== null) {
        try {
          navigator.geolocation.clearWatch(watchId)
        } catch { }
      }
      callback()
    }

    // Handle position from either getCurrentPosition or watchPosition
    const handlePosition = (position: GeolocationPosition) => {
      const accuracy = position.coords.accuracy
      if (Number.isFinite(accuracy) && accuracy > 0) {
        if (accuracy < bestAccuracy) {
          bestAccuracy = accuracy
          bestPosition = position
        }
        onAccuracy?.(bestAccuracy)
      }
      if (Number.isFinite(accuracy) && accuracy > 0 && accuracy <= accuracyThreshold) {
        finish(() => resolve(position))
      }
    }

    // Safety timeout: If bestPosition obtained is <= 500m, resolve it, otherwise reject with timeout
    timeoutId = window.setTimeout(() => {
      if (bestPosition && bestAccuracy <= 500) {
        finish(() => resolve(bestPosition!))
        return
      }

      const isDesktopWifi = bestAccuracy > 2000
      const error = new Error(
        bestAccuracy < Number.POSITIVE_INFINITY
          ? (isDesktopWifi
              ? 'GPS signal weak hai (Wi-Fi/Desktop network). Kripya dukaan ka address manually type karein.'
              : `GPS reading capture nahi ho payi. Kripya apna address manually type karein.`)
          : 'GPS location fix nahi mil paya. Kripya address manually type karein.',
      ) as AccurateLocationError
      error.locationErrorCode = 3 // TIMEOUT
      if (bestAccuracy < Number.POSITIVE_INFINITY) error.bestAccuracy = bestAccuracy
      if (bestPosition) error.position = bestPosition
      finish(() => reject(error))
    }, timeoutMs)

    // Direct 1-shot fetch (prompts permission immediately if needed & grabs cached reading if available)
    try {
      navigator.geolocation.getCurrentPosition(
        position => {
          handlePosition(position)
        },
        error => {
          if (error.code === error.PERMISSION_DENIED) {
            const permError = new Error('Location permission denied hai.') as AccurateLocationError
            permError.locationErrorCode = 1
            finish(() => reject(permError))
          }
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: timeoutMs },
      )
    } catch { }

    // Active watch for refinement
    try {
      watchId = navigator.geolocation.watchPosition(
        position => {
          handlePosition(position)
        },
        error => {
          if (error.code === error.TIMEOUT) return
          if (error.code === error.PERMISSION_DENIED) {
            const locationError = new Error('Location permission denied hai. Kripya shop address manually type karein.') as AccurateLocationError
            locationError.locationErrorCode = 1
            finish(() => reject(locationError))
            return
          }
          const locationError = new Error(error.message || 'GPS location unavailable hai.') as AccurateLocationError
          locationError.locationErrorCode = error.code
          if (bestAccuracy < Number.POSITIVE_INFINITY) locationError.bestAccuracy = bestAccuracy
          if (bestPosition) locationError.position = bestPosition
          finish(() => reject(locationError))
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: timeoutMs },
      )
    } catch (error: any) {
      finish(() => reject(error))
    }
  })
}