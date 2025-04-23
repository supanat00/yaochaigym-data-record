import { auth } from '@/lib/auth'
import React from 'react'
import { SignIn, SignOut } from './auth-components'

const Navbar = async () => {
    const session = await auth()
    console.log(session?.user)

    return (
        <nav className="bg-gray-800 p-4">
            <div className="container mx-auto flex justify-between items-center">
                <div>
                    {
                        session?.user && session?.user ? (
                            <div className='flex items-center space-x-4'>
                                <SignOut className="text-white" />
                            </div>
                        ) : <SignIn className='text-white' />
                    }

                </div>
            </div>
        </nav>
    )
}



export default Navbar