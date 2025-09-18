import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useEffect } from 'react'
import { useAuth } from '../lib/auth'

export default function App(){
	const nav = useNavigate()
	const { pathname } = useLocation()
	const { user, role } = useAuth()

	useEffect(()=>{
		// If no role and no firebase user, redirect to login
		const storedRole = role || localStorage.getItem('role')
		if(!storedRole && !user){ nav('/'); return }

		// Admin can access everything
		if(storedRole === 'admin') return

		// Staff restricted to /app/staff
		if(storedRole === 'staff'){
			if(!pathname.startsWith('/app/staff')) nav('/app/staff')
			return
		}

		// Student restricted to /app/student
		if(storedRole === 'student'){
			if(!pathname.startsWith('/app/student')) nav('/app/student')
			return
		}
	},[pathname, role, user, nav])
	return (
		<div className="min-h-dvh flex flex-col bg-gradient-to-br from-background via-secondary-light to-secondary">
			<Navbar />
			<main className="container flex-1 py-6">
				<Outlet />
			</main>
		</div>
	)
}
