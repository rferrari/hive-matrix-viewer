# 🟩 Hive Matrix Viewer (Next.js Edition)

This is the **Next.js Pivot** of the Hive Matrix Viewer. It is designed to be deployed on Vercel and features a server-side buffering mechanism to reduce load on Hive RPC nodes.

## 🚀 Features

-   **Server-Side Buffering**: API route maintains an in-memory buffer of recent operations, providing instant data to new users and reducing RPC spikes.
-   **React Components**: Built with modern React (App Router, Hooks) for a smooth and responsive experience.
-   **Matrix UX**: Full Matrix rain background and leaderboard stats integrated natively into React.
-   **Vercel Optimized**: Ready for instant deployment on the Vercel platform.

## 🛠 Getting Started

1.  **Install dependencies**:
    ```bash
    pnpm install
    ```

2.  **Start development server**:
    ```bash
    pnpm dev
    ```

3.  **Build for production**:
    ```bash
    pnpm build
    ```

## 📦 Architecture

-   **`/app/api/hive`**: The backend engine. It starts a Hive operation stream and buffers the last 100 transactions in memory.
-   **`/app/components`**: Reusable UI components for the Matrix background, HUD, and Feed.
-   **`/app/hooks`**: Custom hooks for polling the internal API and managing real-time state.

## 👤 Author

**[vaipraonde](http://peakd.com/@vaipraonde/)** — Next.js flavor designed for high-availability web viewing.
