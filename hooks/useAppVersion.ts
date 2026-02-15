
import { useEffect } from 'react';

const STORAGE_KEY_VERSION = 'kvant_app_version';

export const useAppVersion = (currentVersion: string) => {
  useEffect(() => {
    const checkAndPerformUpdate = () => {
        const storedVersion = localStorage.getItem(STORAGE_KEY_VERSION);
        if (storedVersion !== currentVersion) {
            localStorage.setItem(STORAGE_KEY_VERSION, currentVersion);
            if ('caches' in window) {
                caches.keys().then((names) => {
                    names.forEach((name) => {
                        caches.delete(name);
                    });
                });
            }
            window.location.reload();
        }
    };
    checkAndPerformUpdate();
  }, [currentVersion]);
};
