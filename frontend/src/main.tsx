import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './styles.css'
import App from './pages/App'
import Login from './pages/Login'
import Student from './pages/Student'
import Admin from './pages/Admin'
import Staff from './pages/Staff'

// Apply persisted theme early to affect whole page
const persistedDark = typeof window!=='undefined' && localStorage.getItem('theme-dark')==='1'
if(persistedDark){ document.documentElement.classList.add('dark') }

const router = createBrowserRouter([
	{ path: '/', element: <Login /> },
	{ path: '/app', element: <App />,
		children: [
			{ path: 'student', element: <Student /> },
			{ path: 'admin', element: <Admin /> },
			{ path: 'staff', element: <Staff /> },
		]
	},
])

createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>
)


