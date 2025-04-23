import { signIn, signOut } from "@/lib/auth"

export function SignIn({
    provider,
    ...props
}: { provider?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <form
            action= { async() => {
        "use server"
        await signIn(provider)
    }
}
        >
    <button
                { ...props }
className = "bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
    >
    Sign In
        </button>
        </form>
    )
}

export function SignOut(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <form
            action= { async() => {
        "use server"
        await signOut()
    }
}
className = "w-full"
    >
    <button
                className="w-full p-0 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
{...props }
            >
    Sign Out
        </button>
        </form>
    )
}