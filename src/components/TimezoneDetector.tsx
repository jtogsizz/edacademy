"use client"

import { useEffect, useRef } from 'react'
import { updateUserTimezone } from '@/app/actions/timezone'

export default function TimezoneDetector() {
  const hasChecked = useRef(false)

  useEffect(() => {
    if (hasChecked.current) return
    hasChecked.current = true

    const currentTz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const savedTz = localStorage.getItem('user_timezone')

    // Always ensure the backend knows the CURRENT timezone if it differs from local storage cache
    if (currentTz && currentTz !== savedTz) {
      updateUserTimezone(currentTz).then((res) => {
        if (res.success) {
          localStorage.setItem('user_timezone', currentTz)
        }
      }).catch(err => {
        console.error("Failed to sync timezone", err)
      })
    }
  }, [])

  return null
}
