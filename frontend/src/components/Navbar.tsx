import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function Navbar(){
	const role = typeof window!=='undefined' ? localStorage.getItem('role') : null
	const { pathname } = useLocation()
	const [dark,setDark] = useState<boolean>(false)

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
				<nav className="hidden md:flex gap-2 text-sm">
					{role==='student' && <NavLink to="/app/student" label="💬 Chat"/>}
					{role==='admin' && <NavLink to="/app/admin" label="📄 Upload PDF"/>}
					{role==='staff' && <NavLink to="/app/staff" label="👨‍🏫 Staff"/>}
				</nav>
				<button onClick={toggleTheme} className="btn px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-dark dark:bg-secondary/30 dark:hover:bg-secondary/40 dark:text-background">{dark? '☀️ Light':'🌙 Dark'}</button>
			</div>
		</header>
	)
}
