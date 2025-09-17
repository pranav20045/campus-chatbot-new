const DEFAULT_BASE = 'http://127.0.0.1:8000'
const BASE = (import.meta.env.VITE_API_BASE as string) || DEFAULT_BASE

export async function api(path:string, options: RequestInit = {}){
	const token = localStorage.getItem('token')
	const headers:Record<string,string> = { ...(options.headers as any) }
	if(token) headers['Authorization'] = `Bearer ${token}`
	return fetch(BASE + path, { ...options, headers })
}

export async function parseJSON(res: Response){
	const ct = res.headers.get('content-type') || ''
	if(ct.includes('application/json')) return res.json()
	const text = await res.text()
	throw new Error(`Expected JSON but got ${ct||'unknown'}: ${text.slice(0,120)}`)
}
