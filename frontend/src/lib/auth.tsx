import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut, User, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from './firebase'

interface AuthContextValue {
  user: User | null
  loading: boolean
  role: 'student' | 'staff' | 'admin' | null
  signInEmailPassword: (email: string, password: string) => Promise<User | null>
  signUpEmailPassword: (email: string, password: string) => Promise<User | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }){
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<'student' | 'staff' | 'admin' | null>(
    (typeof window !== 'undefined' ? (localStorage.getItem('role') as any) : null)
  )

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u: User | null) => {
      setUser(u)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    // keep role in sync if changed elsewhere
    function onStorage(e: StorageEvent){
      if(e.key === 'role'){
        setRole((e.newValue as any) || null)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    role,
    async signInEmailPassword(email: string, password: string){
      try{
        const cred = await signInWithEmailAndPassword(auth, email, password)
        return cred.user
      }catch{
        // If Firebase auth user doesn't exist, we silently ignore to avoid blocking backend auth
        return null
      }
    },
    async signUpEmailPassword(email: string, password: string){
      try{
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        return cred.user
      }catch{
        return null
      }
    },
    async signOut(){
      try{ await fbSignOut(auth) }catch{}
    }
  }), [user, loading, role])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(){
  const ctx = useContext(AuthContext)
  if(!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
