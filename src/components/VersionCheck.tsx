import React, { useState, useEffect } from 'react';
import { getBasePath } from '../utils/basePath';
import './VersionCheck.css';

const localBuild = typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : '';

function VersionCheck() {
  const [status, setStatus] = useState<'current' | 'stale' | 'unknown'>('unknown');
  const [remoteBuild, setRemoteBuild] = useState<string>('');

  useEffect(() => {
    if (!localBuild) return;

    const checkVersion = async () => {
      try {
        // Fetch the deployed index.html, bypassing cache
        const res = await fetch(`${getBasePath()}/`, {
          cache: 'no-store',
          headers: { Accept: 'text/html' },
        });
        if (!res.ok) return;
        const html = await res.text();

        // Parse the build-timestamp meta tag from the fetched HTML
        const match = html.match(/<meta\s+name="build-timestamp"\s+content="([^"]+)"/);
        if (!match) return;

        const remote = match[1];
        setRemoteBuild(remote);
        setStatus(remote === localBuild ? 'current' : 'stale');
      } catch {
        // Can't reach page — probably local dev
      }
    };

    checkVersion();
    // Re-check every 5 minutes
    const interval = setInterval(checkVersion, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!localBuild) return null;

  const shortDate = new Date(localBuild).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`version-check ${status}`}
      title={
        status === 'stale'
          ? `A newer build is available (${new Date(remoteBuild).toLocaleString()}). Hard-refresh to update.`
          : `Build: ${localBuild}`
      }
    >
      <span className="version-dot" />
      <span className="version-label">Deployed Last @ {shortDate}</span>
      {status === 'stale' && (
        <button className="version-update-btn" onClick={() => window.location.reload()}>
          Update
        </button>
      )}
    </div>
  );
}

export default VersionCheck;
