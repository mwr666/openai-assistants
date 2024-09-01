"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from "@clerk/nextjs";
import styles from '../page.module.css';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const Dashboard = () => {
  const { isLoaded, userId } = useAuth();
  const [recentQueries, setRecentQueries] = useState([]);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const queries = JSON.parse(localStorage.getItem('recentQueries') || '[]');
      setRecentQueries(queries);
    }
  }, []);

  const handleQueryClick = (query) => {
    localStorage.setItem('pendingQuery', query);
    const sharedLink = `${window.location.origin}/?query=${encodeURIComponent(query)}`;
    navigator.clipboard.writeText(sharedLink).then(() => {
      toast.success('Sharable link copied to clipboard.', {
        description: 'You can now share this link with others.',
        duration: 10000,
      });
    });
    router.push('/');
  };

  if (!isLoaded || !userId) {
    return <div>Loading...</div>;
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.heading}>
          <Link href="/" className={styles.headingLink}>Who Covers It?</Link>
        </h1>
        <p>Welcome to your dashboard!</p>
        <div className={styles.recentQueries}>
          <h3>Recent Queries</h3>
          <ul>
            {recentQueries.map((query, index) => (
              <li key={index}>
                <button 
                  onClick={() => handleQueryClick(query)}
                  className={styles.queryLink}
                >
                  {query}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
};

export default Dashboard;
