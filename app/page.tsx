"use client";

import React from "react";

import Chat from "./components/chat";
import styles from "./page.module.css";

const FunctionCalling = () => {
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
            <Chat searchWebHandler={async (query) => {
              const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ search_query: query }),
              });
              const data = await response.json();
              return data.result;
            }} />
          </div>
        </div>
        <div className={styles.footer}>
          <br />
          <p>
            Information <em>may</em> be out of date or incorrect. Verify everything.{" "}
          </p>
        </div>
      </div>
    </main>
  );
};

export default FunctionCalling;