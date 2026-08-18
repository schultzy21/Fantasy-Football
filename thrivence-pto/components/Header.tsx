import Link from "next/link";

export default function Header() {
  return (
    <div className="navbar">
      <div className="navbar-inner">
        <div className="brand">
          <img src="/thrivence-logo.png" alt="Thrivence Consulting" />
          <div className="brand-text">
            <h1>PTO Dashboard</h1>
            <p>Thrivence Consulting &middot; team time-off calendar</p>
          </div>
        </div>
        <div className="nav-links">
          <Link href="/">Calendar</Link>
          <Link href="/leadership">Leadership Summary</Link>
        </div>
      </div>
    </div>
  );
}
