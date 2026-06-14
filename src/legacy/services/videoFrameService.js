const captureCurrentFrame = (video) => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    return {
        time: video.currentTime.toFixed(2),
        image: canvas.toDataURL('image/jpeg', 0.8),
    };
};

const captureLastFrame = async (video, keyframes, duration) => {
    if (keyframes.length > 0 && parseFloat(keyframes[keyframes.length - 1].time) >= duration - 0.5) return;

    video.currentTime = Math.max(0, duration - 0.1);
    await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(), 200);
        video.onseeked = () => {
            clearTimeout(timeout);
            keyframes.push(captureCurrentFrame(video));
            resolve();
        };
    });
};

export const detectScenesAndCapture = async (videoUrl, threshold = 30) => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.src = videoUrl;
        video.muted = true;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const keyframes = [];
        let prevData = null;

        video.onloadeddata = async () => {
            canvas.width = 320;
            canvas.height = Math.floor(320 * (video.videoHeight / video.videoWidth));

            const duration = video.duration;
            const sampleRate = 2;
            video.currentTime = 0;

            const scan = async () => {
                const currentTime = video.currentTime;
                if (currentTime >= duration || Math.abs(currentTime - duration) < 0.01) {
                    await captureLastFrame(video, keyframes, duration);
                    resolve(keyframes.map((keyframe) => ({ time: parseFloat(keyframe.time), url: keyframe.image })));
                    return;
                }

                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

                if (prevData) {
                    let diff = 0;
                    for (let i = 0; i < frameData.length; i += 4) {
                        diff += Math.abs(frameData[i] - prevData[i])
                            + Math.abs(frameData[i + 1] - prevData[i + 1])
                            + Math.abs(frameData[i + 2] - prevData[i + 2]);
                    }
                    const avgDiff = diff / (frameData.length / 4 * 3);

                    if (avgDiff > threshold) {
                        keyframes.push(captureCurrentFrame(video));
                        prevData = null;
                    } else {
                        prevData = frameData;
                    }
                } else {
                    prevData = frameData;
                    keyframes.push(captureCurrentFrame(video));
                }

                const nextTime = video.currentTime + (1 / sampleRate);
                if (nextTime >= duration) {
                    await captureLastFrame(video, keyframes, duration);
                    resolve(keyframes.map((keyframe) => ({ time: parseFloat(keyframe.time), url: keyframe.image })));
                    return;
                }

                video.currentTime = nextTime;
                await new Promise((resolveSeek) => {
                    const timeout = setTimeout(() => resolveSeek(), 200);
                    video.onseeked = () => {
                        clearTimeout(timeout);
                        resolveSeek();
                    };
                });
                scan();
            };

            scan();
        };

        video.onerror = () => reject(new Error('视频加载失败，请检查格式或跨域设置'));
    });
};
