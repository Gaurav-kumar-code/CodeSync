/** @type {import('tailwindcss').Config} */
export default {
    content: ["./src/**/*.{js,jsx,ts,tsx}", "./*.html"],
    theme: {
        extend: {
            colors: {
                dark: "#212429",
                darkHover: "#3D404A",
                light: "#f5f5f5",
                primary: "#39E079",
                danger: "#ef4444",
                brand: {
                    50: "#E9FAF0",
                    100: "#CFF5DD",
                    200: "#A0EBBC",
                    300: "#72E29B",
                    400: "#4CD680",
                    500: "#41C87A",
                    600: "#2BA760",
                    700: "#23884E",
                    800: "#1E6D40",
                    900: "#1B5A37",
                },
                accent: {
                    400: "#1FA8FF",
                    500: "#0EA5E9",
                    600: "#0284C7",
                },
                neutral: {
                    950: "#08090C",
                    900: "#101217",
                    800: "#1E2230",
                    700: "#2A3144",
                    600: "#3F4963",
                    500: "#77829F",
                    400: "#AAB4C9",
                    300: "#CDD4E2",
                    200: "#E7EBF3",
                    100: "#F5F7FB",
                    50: "#FAFCFF",
                },
            },
            fontFamily: {
                display: ["Sora", "sans-serif"],
                sans: ["Plus Jakarta Sans", "sans-serif"],
                mono: ["JetBrains Mono", "monospace"],
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                fadeOut: {
                    "0%": { opacity: "1" },
                    "100%": { opacity: "0" },
                },
                slideUp: {
                    "0%": { transform: "translateY(20px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
                slideDown: {
                    "0%": { transform: "translateY(-20px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
                slideLeft: {
                    "0%": { transform: "translateX(20px)", opacity: "0" },
                    "100%": { transform: "translateX(0)", opacity: "1" },
                },
                slideRight: {
                    "0%": { transform: "translateX(-20px)", opacity: "0" },
                    "100%": { transform: "translateX(0)", opacity: "1" },
                },
                scaleUp: {
                    "0%": { transform: "scale(0.95)", opacity: "0" },
                    "100%": { transform: "scale(1)", opacity: "1" },
                },
                pulseSoft: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.5" },
                },
                spinSlow: {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                },
                bounceSoft: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-8px)" },
                },
                shake: {
                    "0%, 100%": { transform: "translateX(0)" },
                    "20%, 60%": { transform: "translateX(-6px)" },
                    "40%, 80%": { transform: "translateX(6px)" },
                },
                typewriter: {
                    "0%": { width: "0" },
                    "100%": { width: "100%" },
                },
                floatUp: {
                    "0%": { transform: "translateY(8px)" },
                    "100%": { transform: "translateY(0)" },
                },
            },
            animation: {
                "fade-in": "fadeIn 300ms ease-out",
                "fade-out": "fadeOut 300ms ease-out",
                "slide-up": "slideUp 300ms ease-out",
                "slide-down": "slideDown 300ms ease-out",
                "slide-left": "slideLeft 300ms ease-out",
                "slide-right": "slideRight 300ms ease-out",
                "scale-up": "scaleUp 250ms ease-out",
                "pulse-soft": "pulseSoft 2s ease-in-out infinite",
                "spin-slow": "spinSlow 1.4s linear infinite",
                "bounce-soft": "bounceSoft 1.2s ease-in-out infinite",
                shake: "shake 420ms ease-in-out",
                typewriter: "typewriter 1.5s steps(30, end)",
                "float-up": "floatUp 1.2s ease-out",
            },
            screens: {
                xs: "480px",
            },
        },
    },
    plugins: [
        function ({ addUtilities }: { addUtilities: (utilities: Record<string, Record<string, string | Record<string, string>>>) => void }) {
            addUtilities({
                ".scrollbar-hide": {
                    "-ms-overflow-style": "none",
                    "scrollbar-width": "none",
                    "&::-webkit-scrollbar": {
                        display: "none",
                    },
                },
            })
        },
    ],
}