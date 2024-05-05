import { Nav, NavLink } from "@/components/Nav"

// THIS CODE BELOW FORCES NEXTJS TO NOT CACHE ANY OF OUR ADMIN PAGES
export const dynamic = 'force-dynamic'

export default function Layout({
    children, 
}: Readonly<{
    children: React.ReactNode
}>) {
    return <>
    <Nav>
        <NavLink href='/'>Home</NavLink>
        <NavLink href='/products'>Products</NavLink>
        <NavLink href='/orders'>My Orders</NavLink>
    </Nav>
    <div className="container my-6">{children}</div>
    </>
}