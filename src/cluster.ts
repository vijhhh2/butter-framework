import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';
import { jobs } from './services/job-queue';

if (cluster.isPrimary) {
    const coreCount = availableParallelism() - 1;
    for (let i = 0; i < coreCount; i++) {
        cluster.fork();
    }

    cluster.on('message', (worker, message) => {
        if (message.messageType === 'new-resize') {
            const { videoId, height, width } = message.data;
            jobs.enqueue({
                type: 'resize',
                videoId,
                width,
                height,
            });
        }
    });

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died (${signal} | ${code}). Restarting!`);
        cluster.fork();
    });
} else {
    import('./index');
}
