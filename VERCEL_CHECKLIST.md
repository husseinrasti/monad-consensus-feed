# Vercel Deployment Verification Checklist

## Pre-Deployment Checklist

### ✅ Dependencies
- [x] `monopulse` is listed under "dependencies" (not "devDependencies") in package.json
- [x] All required packages are properly installed

### ✅ Environment Variables
- [x] Removed dotenv usage in production code
- [x] Using `process.env` values directly (Vercel compatible)
- [x] Added validation for required environment variables
- [x] Clear error messages when RPC_URL is missing

### ✅ SSE/WebSocket Handling
- [x] Wrapped MonoPulse initialization in try/catch blocks
- [x] Added comprehensive error logging
- [x] Implemented HTTP polling fallback mode
- [x] Added `FORCE_POLLING` option for manual control
- [x] Automatic Vercel detection (`process.env.VERCEL === '1'`)

### ✅ Build Configuration
- [x] Next.js build completes successfully
- [x] Dynamic import for MonoPulse to avoid BigInt issues
- [x] Proper TypeScript types for all functions
- [x] Vercel.json configured with appropriate timeouts

## Deployment Steps

### 1. Push to GitHub
```bash
git push origin main
```

### 2. Deploy to Vercel
```bash
# Option A: Using Vercel CLI
vercel --prod

# Option B: Using deployment script
./scripts/deploy.sh

# Option C: Via Vercel Dashboard
# - Import GitHub repository
# - Configure environment variables
# - Deploy
```

### 3. Configure Environment Variables in Vercel Dashboard

**Required:**
```
RPC_URL=wss://your-monad-testnet-rpc-url
```

**Optional (automatically set):**
```
FORCE_POLLING=true
MONOPULSE_LOG_LEVEL=warn
```

## Post-Deployment Verification

### ✅ Basic Functionality
- [ ] App loads without errors at `https://your-project.vercel.app`
- [ ] No "MonoPulse library not available" error in console
- [ ] SSE connection establishes successfully (check Network tab)
- [ ] No WebSocket connection errors (should fallback to polling gracefully)

### ✅ MonoPulse Integration
- [ ] Chain ID is fetched and displayed correctly
- [ ] Block stats updates are received (via polling if WebSocket fails)
- [ ] Terminal log shows incoming block updates
- [ ] Tetris-style visualization updates with new blocks

### ✅ Error Handling
- [ ] Clear error messages when RPC_URL is missing
- [ ] Graceful fallback from WebSocket to polling mode
- [ ] Proper cleanup when client disconnects
- [ ] No memory leaks from uncleaned intervals

### ✅ Performance
- [ ] App loads quickly (< 3 seconds)
- [ ] Smooth animations and transitions
- [ ] No excessive API calls or polling
- [ ] Proper resource cleanup

## Troubleshooting

### Common Issues and Solutions

#### 1. "MonoPulse library not available"
- **Cause**: MonoPulse package not properly installed
- **Solution**: Ensure `monopulse` is in dependencies, not devDependencies

#### 2. "RPC_URL is required" Error
- **Cause**: Environment variable not set in Vercel
- **Solution**: Add `RPC_URL` in Vercel dashboard environment variables

#### 3. No Block Updates
- **Cause**: WebSocket connection failed, polling not working
- **Solution**: Check Vercel logs, verify RPC endpoint is accessible

#### 4. Build Failures
- **Cause**: BigInt issues with MonoPulse import
- **Solution**: Use dynamic import with require() (already implemented)

### Vercel Logs
Check deployment logs in Vercel dashboard:
- Build logs for compilation issues
- Function logs for runtime errors
- Real-time logs for debugging

### Local Testing
Test locally with production build:
```bash
npm run build
npm start
```

## Success Criteria

The deployment is successful when:
1. ✅ App loads without errors
2. ✅ MonoPulse SDK initializes correctly
3. ✅ Block updates are received (WebSocket or polling)
4. ✅ Tetris visualization works smoothly
5. ✅ Terminal log shows real-time updates
6. ✅ No console errors or warnings
7. ✅ Proper fallback behavior in serverless environment

## Support

If issues persist:
1. Check Vercel function logs
2. Verify environment variables
3. Test with `FORCE_POLLING=true`
4. Review MonoPulse SDK documentation
5. Check Monad testnet RPC endpoint status
