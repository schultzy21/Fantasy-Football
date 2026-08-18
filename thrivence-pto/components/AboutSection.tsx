export default function AboutSection() {
  return (
    <section className="card">
      <div className="card-accent" />
      <div className="card-body">
        <p className="section-eyebrow">About this page</p>
        <h2>See who&apos;s out, and log your own time off</h2>
        <p>
          This is a shared calendar for the whole Thrivence team. Use it to check
          who else is out before you book travel, schedule a client call, or plan
          a project deadline -- and to let everyone know when you&apos;ll be away.
        </p>
        <div className="about-grid">
          <div className="about-step">
            <span className="step-num">1</span>
            <h3>Check the calendar</h3>
            <p>
              The calendar below shows the next three months by default. Use the
              arrows or the month picker to look further ahead, up to a year out.
            </p>
          </div>
          <div className="about-step">
            <span className="step-num">2</span>
            <h3>Add your time off</h3>
            <p>
              Use the form under the calendar to enter the dates you&apos;ll be
              out. You can add time as far in advance as you&apos;d like.
            </p>
          </div>
          <div className="about-step">
            <span className="step-num">3</span>
            <h3>It shows up instantly</h3>
            <p>
              Once submitted, your dates appear on the calendar and the upcoming
              list for everyone -- no approval step, this is just a shared
              heads-up board.
            </p>
          </div>
          <div className="about-step">
            <span className="step-num">4</span>
            <h3>Leadership summary</h3>
            <p>
              A password-protected summary tracks PTO taken vs. remaining for the
              year. Find it under &ldquo;Leadership Summary&rdquo; above.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
