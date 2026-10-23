import { Link } from "wouter";
import ReadingLayout from "@/components/ReadingLayout";
import PageHead from "@/components/PageHead";
import { SITE_URL } from "@/lib/siteConfig";
const DESCRIPTION =
  "A plain-language overview of UnifyOne's React application, server API, account boundaries, and separate PostgreSQL data stores.";
export default function Architecture() {
  return (
    <ReadingLayout kind="reference">
      <PageHead
        title="How UnifyOne is built | UnifyOne"
        description={DESCRIPTION}
        canonical={SITE_URL + "/architecture"}
      />
      <article className="reading-content">
        <header>
          <span className="marketing-eyebrow">Behind the product</span>
          <h1>A clear record needs a solid foundation.</h1>
          <p>
            UnifyOne combines a public guide and calculator library with an
            account-based application. Here's how the main pieces fit together.
          </p>
        </header>
        <section>
          <h2>The public tools</h2>
          <p>
            The browser renders the website with React, TypeScript, and Vite.
            The free calculators work with numbers you enter. Their results
            depend on those inputs and the assumptions shown on each page.
          </p>
          <p>You can explore these tools before creating an account.</p>
          <Link href="/tools">Browse the free tools →</Link>
        </section>
        <section>
          <h2>The account application</h2>
          <p>
            The application uses an Express server and a tRPC API with input
            validation. Account sessions and server-side authorization control
            access to protected features and records.
          </p>
          <p>
            Features such as tracking, billing, and optional AI services depend
            on account access and the relevant service configuration. A public
            guide or code example is not a confirmation that an integration is
            enabled for a particular account.
          </p>
        </section>
        <section>
          <h2>Two data stores with different jobs</h2>
          <p>
            Neon PostgreSQL, accessed through Drizzle, stores the primary
            application records, including accounts and commerce data. Supabase
            supports specialized features such as credit metering and
            billing-related records, with optional real-time updates.
          </p>
          <p>
            Keeping these responsibilities distinct matters when maintaining or
            troubleshooting the application.
          </p>
        </section>
        <section>
          <h2>Account and data boundaries</h2>
          <p>
            The code uses authenticated sessions and role or tenant checks on
            protected server operations. Those controls need to be tested
            throughout the application as it changes; this overview is not an
            independent security certification.
          </p>
          <p>
            Read the privacy policy for the published data-handling policy, and
            contact support with account or access questions.
          </p>
          <Link href="/privacy">Read the privacy policy →</Link>
        </section>
        <section>
          <h2>Explore the implementation</h2>
          <p>
            Technical references and the repository history provide more detail
            about the work behind the product.
          </p>
          <div className="reference-actions">
            <Link href="/documents/integrations">Technical reference →</Link>
            <Link href="/documents/work-proof">Project history →</Link>
          </div>
        </section>
      </article>
    </ReadingLayout>
  );
}
