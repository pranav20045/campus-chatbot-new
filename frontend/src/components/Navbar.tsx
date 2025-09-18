import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'

export default function Navbar(){
	const role = typeof window!=='undefined' ? localStorage.getItem('role') : null
	const { pathname } = useLocation()
	const [dark,setDark] = useState<boolean>(false)
  const nav = useNavigate()
  const { signOut } = useAuth()

	useEffect(()=>{
		const pref = typeof window!=='undefined' && localStorage.getItem('theme-dark')==='1'
		setDark(pref)
		if(pref) document.documentElement.classList.add('dark')
	},[])

	function toggleTheme(){
		setDark(d=>{
			const next = !d
			if(next) document.documentElement.classList.add('dark')
			else document.documentElement.classList.remove('dark')
			localStorage.setItem('theme-dark', next?'1':'0')
			return next
		})
	}
	const NavLink = ({to,label}:{to:string,label:string})=> (
		<Link to={to} className={`px-4 py-2 rounded-xl transition-colors ${pathname.startsWith(to)?'bg-primary text-white':'text-dark hover:text-primary dark:text-background dark:hover:text-primary'}`}>{label}</Link>
	)
	return (
		<header className="bg-card/80 dark:bg-dark/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 dark:supports-[backdrop-filter]:bg-dark/60 sticky top-0 z-50 text-dark dark:text-background border-b border-secondary/20 dark:border-secondary/30">
			<div className="container flex items-center justify-between py-4">
				<Link to="/" className="flex items-center gap-3">
					<div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-primary-muted shadow-lg flex items-center justify-center" aria-hidden>
						<span className="text-white font-bold text-lg">🎓</span>
					</div>
					<span className="font-bold text-xl text-dark dark:text-background">Campus Chatbot</span>
				</Link>
				<nav className="hidden md:flex gap-2 text-sm items-center">
					{role==='student' && <NavLink to="/app/student" label="💬 Chat"/>}
					{role==='staff' && <NavLink to="/app/staff" label="👨‍🏫 Staff"/>}
					{role==='admin' && (
						<>
							<NavLink to="/app/student" label="💬 Chat"/>
							<NavLink to="/app/staff" label="👨‍🏫 Staff"/>
							<NavLink to="/app/admin" label="📄 Upload PDF"/>
						</>
					)}
				</nav>
				<div className="flex items-center gap-2">
					<button onClick={toggleTheme} className="btn px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-dark dark:bg-secondary/30 dark:hover:bg-secondary/40 dark:text-background">{dark? '☀️ Light':'🌙 Dark'}</button>
					{role && (
						<button
							className="btn px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
							onClick={async ()=>{
								await signOut()
								localStorage.removeItem('token')
								localStorage.removeItem('role')
								nav('/')
							}}
						>
							Logout
						</button>
					)}
				</div>
			</div>
		</header>
	)
}
