"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import styles from './Header.module.css';

const Header = () => {
  const { isSignedIn } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.authButtons}>
        {isSignedIn ? (
          <>
            <Link href="/dashboard" className={styles.authButton}>Dashboard</Link>
            <UserButton afterSignOutUrl="/" />
          </>
        ) : (
          <>
            <SignInButton mode="modal">
              <button className={styles.authButton}>Sign In</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className={styles.authButton}>Sign Up</button>
            </SignUpButton>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
