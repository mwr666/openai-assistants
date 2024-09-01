"use client";

import React, { useEffect, useState } from "react";
import dynamic from 'next/dynamic';
import styles from "./page.module.css";
import Exa from "exa-js";

const Chat = dynamic(() => import('./components/chat'), { ssr: false });

const Home = () => {
  const [initialQuery, setInitialQuery] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedQuery = urlParams.get('query');
    if (sharedQuery) {
      setInitialQuery(decodeURIComponent(sharedQuery));
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.column}>
          <h1 className={styles.heading}>Who Covers It?</h1>
          <p>
            Identify journalists, bloggers, and publications to pitch your story
          </p>
          <br />
          <p>
            <em>
              Powered by everyone's favorite{" "}
              <a href="https://hypelab.digital" target="_blank">
                PR agency
              </a>
            </em>
          </p>
        </div>
        <div className={styles.chatContainer}>
          <div className={styles.chat}>
            <Chat
              initialQuery={initialQuery}
              searchWebHandler={async (query) => {
                console.log("searchWebHandler", query);

                const response = await fetch("/api/search", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ search_query: query }),
                });

                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let result = '';

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  result += decoder.decode(value);
                }

                return result;
              }}
              exaSearchHandler={async (query) => {
                console.log("exaSearchHandler", query);

                const exaApiKey = process.env.EXA_API_KEY;

                if (!exaApiKey) {
                  console.error("EXA_API_KEY is not set in the environment variables");
                  throw new Error("EXA_API_KEY is not set in the environment variables");
                }

                const exa = new Exa(exaApiKey);
                const exaResponse = await exa.search(query);

                const exaContent = exaResponse.results.map(result =>
                  `${result.title}\n${result.url}\n${result.text}`
                ).join('\n\n');

                return exaContent;
              }}
            />
          </div>
        </div>
        <div className={styles.footer}>
          <br />
          <p>
            Information <em>may</em> be out of date or incorrect. Verify
            everything.
          </p>
        </div>
      </div>
    </main>
  );
};

export default Home;