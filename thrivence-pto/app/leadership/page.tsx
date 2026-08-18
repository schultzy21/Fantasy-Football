import Header from "@/components/Header";
import LeadershipSummary from "@/components/LeadershipSummary";

export default function LeadershipPage() {
  return (
    <>
      <Header />
      <div className="wrap">
        <LeadershipSummary />
        <footer className="site-footer">
          Thrivence Consulting &middot; internal team tool
        </footer>
      </div>
    </>
  );
}
