# Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Ensure your code is pushed to GitHub
3. **Monad RPC URL**: You'll need a valid Monad testnet RPC WebSocket URL

## Deployment Steps

### 1. Connect Repository to Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select the repository containing this project

### 2. Configure Environment Variables

In the Vercel dashboard, go to your project settings and add these environment variables:

```
NEXT_PUBLIC_RPC_URL=wss://your-monad-testnet-rpc-url
MONOPULSE_LOG_LEVEL=info
```

**Important**: Replace `wss://your-monad-testnet-rpc-url` with your actual Monad testnet RPC WebSocket URL.

### 3. Build Configuration

The project is already configured for Vercel deployment with:

- **Framework**: Next.js 15.5.3
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install`

### 4. Deploy

1. Click "Deploy" in the Vercel dashboard
2. Wait for the build to complete
3. Your app will be available at `https://your-project-name.vercel.app`

## Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_RPC_URL` | Monad WebSocket RPC endpoint | Yes | `wss://monad-testnet-rpc.example.com` |
| `MONOPULSE_LOG_LEVEL` | Logging level for MonoPulse SDK | No | `info` |

## Features

- ✅ **Real-time Block Streaming**: Live updates of block commit states
- ✅ **Tetris-style Visualization**: Animated falling blocks showing consensus progress
- ✅ **Responsive Design**: Works on desktop and mobile devices
- ✅ **Terminal Log**: Real-time log of all block state changes
- ✅ **SSE Streaming**: Server-Sent Events for real-time updates

## Troubleshooting

### Build Issues

If you encounter build issues:

1. **BigInt Errors**: The project has been configured to handle BigInt operations properly
2. **Memory Issues**: Vercel configuration includes increased memory allocation
3. **API Route Issues**: The streaming API route is configured for Vercel's serverless environment

### Runtime Issues

1. **Connection Errors**: Verify your RPC URL is correct and accessible
2. **No Data**: Check that the Monad testnet is active and your RPC endpoint is working
3. **Performance**: The app is optimized for real-time updates with efficient rendering

## Local Development

To run locally:

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example .env.local

# Edit .env.local with your RPC URL
# NEXT_PUBLIC_RPC_URL=wss://your-monad-testnet-rpc-url

# Start development server
npm run dev
```

## Production Build

```bash
# Test production build locally
npm run build

# Start production server
npm start
```

## Support

For issues or questions:
- Check the [README.md](./README.md) for project details
- Review the [PRD.md](./PRD.md) for product requirements
- Open an issue in the GitHub repository
