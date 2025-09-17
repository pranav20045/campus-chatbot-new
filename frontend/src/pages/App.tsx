import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useEffect } from 'react'

export default function App(){
	const nav = useNavigate()
	const { pathname } = useLocation()
	useEffect(()=>{
		const role = localStorage.getItem('role')
		if(!role){ nav('/'); return }
		if(pathname.startsWith('/app/admin') && role!=='admin') nav('/app/student')
		if(pathname.startsWith('/app/staff') && role!=='staff') nav('/app/student')
		if(pathname.startsWith('/app/student') && role!=='student'){
			if(role==='admin') nav('/app/admin')
			else if(role==='staff') nav('/app/staff')
		}
	},[pathname])
	return (
		<div className="min-h-dvh flex flex-col bg-gradient-to-br from-background via-secondary-light to-secondary">
			<Navbar />
			<main className="container flex-1 py-6">
				<Outlet />
			</main>
		</div>
	)
}
