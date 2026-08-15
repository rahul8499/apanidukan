import React from 'react'
import { Navigate } from 'react-router-dom'

/** An installed store app returns directly to the storefront it was installed from. */
export default function PwaLaunch(){
  const store = localStorage.getItem('multistore-installed-store')
  return <Navigate to={store ? `/store/${store}` : '/start'} replace />
}
