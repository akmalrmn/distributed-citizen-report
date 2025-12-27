# Load Testing for Citizen Report

This directory contains k6 load testing scripts to demonstrate auto-scaling behavior.

## Prerequisites

1. Install k6: https://k6.io/docs/getting-started/installation/

   ```bash
   # Windows (with Chocolatey)
   choco install k6

   # macOS
   brew install k6

   # Linux
   sudo apt-get install k6
   ```

## Running the Load Test

### Local Development

```bash
# Start the services first
docker-compose up -d

# Run the load test
k6 run k6-script.js
```

### Against Kubernetes

```bash
# Set the base URL to your ingress/LoadBalancer IP
k6 run -e BASE_URL=http://your-ingress-ip k6-script.js
```

## Monitoring During Load Test

While the load test runs, monitor scaling in another terminal:

```bash
# Watch pods scaling
kubectl get pods -n citizen-report -w

# Watch HPA status
kubectl get hpa -n citizen-report -w

# Check pod metrics
kubectl top pods -n citizen-report
```

## Expected Behavior

1. **Warm up (0-30s)**: 0-20 VUs, pods should stay at minimum (2)
2. **Ramp up (30s-1m30s)**: 20-100 VUs, HPA should start scaling
3. **Peak (1m30s-3m30s)**: 100-200 VUs, maximum scaling activity
4. **Sustain (3m30s-4m30s)**: 200 VUs, pods should stabilize
5. **Ramp down (4m30s-6m)**: Decreasing load, scale down begins
6. **Cool down (6m-7m)**: Minimal load, pods should reduce

## Demo Video Recording Tips

1. Open split terminal view:
   - Left: `k6 run k6-script.js`
   - Right: `kubectl get pods -n citizen-report -w`

2. Key moments to capture:
   - Initial pod count (2 replicas)
   - First scale-up event
   - Peak pod count
   - Scale-down event

3. Show Grafana dashboard if available
