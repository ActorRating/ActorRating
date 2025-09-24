import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEmailSignIn(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return alert(error.message)
    window.location.href = '/'
  }

  async function handleEmailSignUp(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) return alert(error.message)
    alert('Check your email for confirmation or magic link.')
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) console.error(error)
  }

  return (
    <div>
      <h2>Sign in</h2>
      <form onSubmit={handleEmailSignIn}>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" disabled={loading}>Sign in</button>
      </form>

      <button onClick={signInWithGoogle}>Sign in with Google</button>
      <button onClick={handleEmailSignUp}>Sign up (email)</button>
    </div>
  )
}


