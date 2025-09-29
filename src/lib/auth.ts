import { useRouter } from 'next/navigation'
import supabase from './supabaseClient'

/**
 * Handles user logout with proper session cleanup and redirect
 */
export async function handleLogout(router?: ReturnType<typeof useRouter>) {
  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Logout error:', error)
    }
    
    // Clear any local storage items
    localStorage.removeItem('pendingRating')
    
    // Redirect to landing page
    if (router) {
      router.push('/')
    } else {
      // Fallback for cases where router is not available
      window.location.href = '/'
    }
  } catch (error) {
    console.error('Logout error:', error)
    // Force redirect even if logout fails
    window.location.href = '/'
  }
}

/**
 * Handles user logout with window redirect (for cases where router is not available)
 */
export async function handleLogoutWithRedirect() {
  try {
    await supabase.auth.signOut()
    localStorage.removeItem('pendingRating')
    window.location.href = '/'
  } catch (error) {
    console.error('Logout error:', error)
    window.location.href = '/'
  }
}
