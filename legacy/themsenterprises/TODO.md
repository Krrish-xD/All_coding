# Project Tasks & Optimization Goals

## Performance Targets
- [ ] **Initial Payload Optimization (14 KB Rule)**: Ensure critical HTML and inline CSS fit within the first 14.6 KB to avoid extra TCP round-trips.
- [ ] **CSS Budget (60 KB)**: Keep the initial render-blocking CSS bundle under 60 KB (compressed).
- [ ] **JS Bundle Budget (170 KB - 250 KB)**: Limit the main JavaScript bundle to under 170 KB gzipped / 250 KB uncompressed to ensure fast "Time to Interactive" on mobile devices.

## Feature Tasks
- [ ] Implement Code Splitting for React routes (e.g., lazy load Admin pages).
- [ ] Audit and optimize image assets (convert to WebP/AVIF).
- [ ] Verify Gzip/Brotli compression on the production server (AWS Lambda/CloudFront).
