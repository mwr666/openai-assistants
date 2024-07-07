"use client";

import React from "react";

import Chat from "../../components/chat";
import styles from "../shared/page.module.css";

const FunctionCalling = () => {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.column}>
          <h1>Who Covers It?</h1>
          <p>
            Identify journalists, bloggers, and publications to pitch your story
          </p>
        </div>
        <div className={styles.chatContainer}>
          <div className={styles.chat}>
            <Chat />
          </div>
        </div>
      </div>
    </main>
  );
};

export default FunctionCalling;
