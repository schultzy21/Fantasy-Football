import Header from "@/components/Header";
import AboutSection from "@/components/AboutSection";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  return (
    <>
      <Header />
      <div className="wrap">
        <AboutSection />
        <Dashboard />
        <footer className="site-footer">
          Thrivence Consulting &middot; internal team tool
        </footer>
      </div>
    </>
  );
}
