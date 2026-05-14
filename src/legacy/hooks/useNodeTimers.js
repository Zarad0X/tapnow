import { useEffect, useState } from 'react';

export const useNodeTimers = (history) => {
    const [nodeTimers, setNodeTimers] = useState({});

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const activeTasks = history.filter((item) => (
                item.sourceNodeId &&
                item.status === 'generating' &&
                item.startTime
            ));

            const nextTimers = {};
            activeTasks.forEach((task) => {
                const elapsed = Math.floor((now - task.startTime) / 100);
                nextTimers[task.sourceNodeId] = elapsed / 10;
            });

            setNodeTimers(nextTimers);
        }, 100);

        return () => clearInterval(interval);
    }, [history]);

    return nodeTimers;
};
