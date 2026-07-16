import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

const config: Config = {
  title: "Hope Docs",
  tagline: "Workout consistency tracker — architecture and API reference",
  favicon: "img/logo.svg",

  future: {
    v4: true,
  },

  // Project site: https://lcaohoanq.github.io/hope/
  url: "https://lcaohoanq.github.io",
  baseUrl: "/hope/",
  trailingSlash: false,

  organizationName: "lcaohoanq",
  projectName: "hope",

  onBrokenLinks: "throw",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  plugins: [
    [
      "docusaurus-plugin-typedoc",
      {
        entryPoints: [
          "../../packages/shared/src/index.ts",
          "../../packages/api-client/src/index.ts",
        ],
        tsconfig: "./tsconfig.typedoc.json",
        out: "docs/api",
        sidebar: { pretty: true },
        readme: "none",
        name: "Library Reference",
        entryFileName: "README.md",
        useCodeBlocks: true,
        parametersFormat: "table",
        typeDeclarationFormat: "table",
        interfacePropertiesFormat: "table",
        classPropertiesFormat: "table",
        enumMembersFormat: "table",
        propertyMembersFormat: "table",
        indexFormat: "table",
        hideBreadcrumbs: true,
        hidePageHeader: true,
      },
    ],
  ],

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          routeBasePath: "docs",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/logo.svg",
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "Hope",
      logo: {
        alt: "Hope",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docsSidebar",
          position: "left",
          label: "Docs",
        },
        {
          type: "doc",
          docId: "api/README",
          position: "left",
          label: "Library",
        },
        {
          type: "doc",
          docId: "http/index",
          position: "left",
          label: "HTTP API",
        },
        {
          href: "https://github.com/lcaohoanq/hope",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            { label: "Introduction", to: "/docs/intro" },
            { label: "Architecture", to: "/docs/architecture" },
            { label: "Self-host", to: "/docs/self-host" },
            { label: "API client", to: "/docs/guides/api-client" },
          ],
        },
        {
          title: "Reference",
          items: [
            { label: "Library Reference", to: "/docs/api/" },
            { label: "HTTP API", to: "/docs/http/" },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Hope. Built with Docusaurus + TypeDoc.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json", "typescript"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
