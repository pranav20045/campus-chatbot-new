/** @type {import('tailwindcss').Config} */ 
export default {
	content: [
		"./index.html",
		"./src/**/*.{ts,tsx}",
	],
	theme: {
		extend: {
			colors: {
				primary: {
					DEFAULT: '#426bc2',
					muted: '#0b1957'
				},
				secondary: {
					DEFAULT: '#d2b3db',
					light: '#e8d9ed'
				},
				background: '#f7f4ed',
				card: '#f7f4ed',
				dark: '#0b1957',
				muted: '#d2b3db'
			},
			borderRadius: {
				xl: '1rem',
				'2xl': '1.25rem'
			}
		}
	}
};


