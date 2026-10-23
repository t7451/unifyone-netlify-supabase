import { Link, useLocation } from "wouter";

const PICKS = [
  {
    href: "/tools/gig-hourly-rate",
    title: "Check your real hourly rate",
    text: "Compare what a shift pays after costs.",
  },
  {
    href: "/tools/tax-set-aside",
    title: "Explore a tax set-aside",
    text: "Work through a 2025 planning estimate.",
  },
  {
    href: "/gig-worker-budgeting",
    title: "Plan around irregular pay",
    text: "Build a budget for different kinds of weeks.",
  },
  {
    href: "/gig-worker-emergency-fund",
    title: "Build a buffer",
    text: "Think through saving for the unexpected.",
  },
];

export default function GigResourceLinks() {
  const [location] = useLocation();
  return (
    <section className="reading-next">
      <div>
        <p className="marketing-eyebrow">A useful next step</p>
        <h2>Put it into practice.</h2>
      </div>
      <div className="reading-next-grid">
        {PICKS.filter(item => item.href !== location)
          .slice(0, 3)
          .map(item => (
            <Link key={item.href} href={item.href}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
      </div>
      <p className="reading-next-all">
        <Link href="/resources">Browse the guide library →</Link>
        <Link href="/tools">All free tools →</Link>
      </p>
    </section>
  );
}
