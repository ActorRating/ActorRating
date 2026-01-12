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
    
    // Wait a moment for the session to clear, then force a full page reload
    // This ensures the session is fully cleared before redirecting
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Always use window.location.href for a full page reload to ensure session is cleared
    window.location.href = '/'
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
    
    // Wait a moment for the session to clear
    await new Promise(resolve => setTimeout(resolve, 100))
    
    window.location.href = '/'
  } catch (error) {
    console.error('Logout error:', error)
    window.location.href = '/'
  }
}
