export type AccurateLocationError = Error & {
  bestAccuracy?: number
  locationErrorCode?: number
  position?: GeolocationPosition
}

export function captureAccurateLocation(
  onAccuracy?: (accuracy: number) => void,
  accuracyThreshold = 100,
  timeoutMs = 8000,
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is not supported on this device.'))
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
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
      callback()
    }

    timeoutId = window.setTimeout(() => {
      // If we got a reasonable position (e.g. <= 500m), resolve it directly
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
      if (bestAccuracy < Number.POSITIVE_INFINITY) error.bestAccuracy = bestAccuracy
      if (bestPosition) error.position = bestPosition
      finish(() => reject(error))
    }, timeoutMs)

    try {
      watchId = navigator.geolocation.watchPosition(
        position => {
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
        },
        error => {
          if (error.code === error.TIMEOUT) return
          const locationError = new Error(
            error.code === error.PERMISSION_DENIED
              ? 'Location permission denied hai. Kripya shop address manually type karein.'
              : (error.message || 'GPS location unavailable hai.')
          ) as AccurateLocationError
          locationError.locationErrorCode = error.code
          if (bestAccuracy < Number.POSITIVE_INFINITY) locationError.bestAccuracy = bestAccuracy
          if (bestPosition) locationError.position = bestPosition
          finish(() => reject(locationError))
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs },
      )
    } catch (error) {
      finish(() => reject(error))
    }
  })
}