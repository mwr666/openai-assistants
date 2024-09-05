import { Organization, WithContext } from "schema-dts";

export const structuredData: WithContext<Organization> = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Who Covers It?",
  description: "Identify journalists, bloggers, and publications to pitch your story",
  url: "https://www.whocoversit.com/",
  logo: "https://www.whocoversit.com/hypelab-logo.png",
};
