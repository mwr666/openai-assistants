import { Organization, WebSite, WithContext } from "schema-dts";

// Make sure this export exists
export const structuredData = {}; // or provide actual data here

export const organizationStructuredData: WithContext<Organization> = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Who Covers It?",
  description: "Identify journalists, bloggers, and publications to pitch your story",
  url: "https://www.whocoversit.com/",
  logo: "https://www.whocoversit.com/hypelab-logo.png",
};

export const websiteStructuredData: WithContext<WebSite> = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Who Covers It?",
  url: "https://www.whocoversit.com/",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://www.whocoversit.com/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  } as any
};
