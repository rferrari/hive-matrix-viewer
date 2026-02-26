'use client';

import { useEffect, useRef } from 'react';

export default function MatrixRain() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';
        let drops: number[] = [];

        const initCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const cols = Math.floor(canvas.width / 16);
            drops = Array.from({ length: cols }, () => Math.random() * -canvas.height / 16);
        };

        const draw = () => {
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0f0';
            ctx.font = '14px Courier New';
            for (let i = 0; i < drops.length; i++) {
                ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 16, drops[i] * 16);
                if (drops[i] * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            }
        };

        initCanvas();
        window.addEventListener('resize', initCanvas);
        const interval = setInterval(draw, 40);

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', initCanvas);
        };
    }, []);

    return <canvas ref={canvasRef} id="matrix" />;
}
