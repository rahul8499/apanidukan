export type AccurateLocationError = Error & {
  bestAccuracy?: number
  locationErrorCode?: number
}

export function captureAccurateLocation(
  onAccuracy?: (accuracy: number) => void,
  accuracyThreshold = 50,
  timeoutMs = 30000,
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is not supported on this device.'))
      return
    }

    let watchId: number | null = null
    let timeoutId = 0
    let bestAccuracy = Number.POSITIVE_INFINITY
    let finished = false

    const finish = (callback: () => void) => {
      if (finished) return
      finished = true
      window.clearTimeout(timeoutId)
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
      callback()
    }

    timeoutId = window.setTimeout(() => {
      const error = new Error(
        bestAccuracy < Number.POSITIVE_INFINITY
          ? `GPS accuracy stayed at ±${Math.round(bestAccuracy)} m. Move near an open area and try again.`
          : 'GPS could not get a location fix. Check location permission and try again.',
      ) as AccurateLocationError
      if (bestAccuracy < Number.POSITIVE_INFINITY) error.bestAccuracy = bestAccuracy
      finish(() => reject(error))
    }, timeoutMs)

    try {
      watchId = navigator.geolocation.watchPosition(
        position => {
          const accuracy = position.coords.accuracy
          if (Number.isFinite(accuracy) && accuracy > 0) {
            bestAccuracy = Math.min(bestAccuracy, accuracy)
            onAccuracy?.(bestAccuracy)
          }
          if (Number.isFinite(accuracy) && accuracy > 0 && accuracy <= accuracyThreshold) {
            finish(() => resolve(position))
          }
        },
        error => {
          if (error.code === error.TIMEOUT) return
          const locationError = new Error(error.message || 'Location permission denied or GPS unavailable.') as AccurateLocationError
          locationError.locationErrorCode = error.code
          if (bestAccuracy < Number.POSITIVE_INFINITY) locationError.bestAccuracy = bestAccuracy
          finish(() => reject(locationError))
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs },
      )
    } catch (error) {
      finish(() => reject(error))
    }
  })
}