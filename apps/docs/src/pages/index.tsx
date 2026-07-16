import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import clsx from "clsx";
import type { ReactNode } from "react";

import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/intro">
            Get started
          </Link>
          <Link
            className="button button--outline button--lg"
            to="/docs/api/"
            style={{ marginLeft: 12 }}
          >
            API reference
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              <div className="col col--4">
                <h3>Architecture</h3>
                <p>Pure-API Next.js frontend, Hono Workers API, shared packages.</p>
                <Link to="/docs/architecture">Read more →</Link>
              </div>
              <div className="col col--4">
                <h3>Self-host</h3>
                <p>Docker Compose, Traefik, MinIO or Cloudinary via the Hope CLI.</p>
                <Link to="/docs/self-host">Read more →</Link>
              </div>
              <div className="col col--4">
                <h3>API client</h3>
                <p>Typed Hono RPC with Clerk Bearer tokens for SSR and the browser.</p>
                <Link to="/docs/guides/api-client">Read more →</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
