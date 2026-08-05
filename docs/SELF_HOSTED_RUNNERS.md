# Self-Hosted GitHub Actions Runners Implementation Guide

## 💰 Cost Analysis

### Current GitHub Actions Costs (Paid Plan)
- **Base Cost**: $0.008/minute for standard runners
- **macOS Runners**: $0.016/minute (2x standard)
- **Typical Workflow Duration**: 10-15 minutes
- **Monthly Cost Estimate**: $40-60 for moderate development

### Self-Hosted Runner Benefits
- **Cost Savings**: 100% free compute time (pay only for infrastructure)
- **Performance**: Faster builds with persistent caches
- **Customization**: Full control over environment and tools
- **Scalability**: Scale based on your needs

### Infrastructure Costs (AWS Example)
- **EC2 t3.medium** (2 vCPU, 4GB RAM): ~$30/month
- **EC2 t3.large** (2 vCPU, 8GB RAM): ~$60/month
- **Storage**: ~$5/month for 100GB
- **Network**: Minimal costs
- **Total Monthly**: $35-65 (similar to Actions, but more control)

## 🏗️ Implementation Strategy

### Phase 1: Proof of Concept (Development Only)
1. Set up 1-2 self-hosted runners for development workflows
2. Keep production deployments on GitHub runners initially
3. Test performance and reliability

### Phase 2: Full Migration
1. Scale self-hosted runners based on usage patterns
2. Migrate all workflows gradually
3. Optimize infrastructure costs

## 🛠️ Implementation Steps

### 1. Infrastructure Setup

#### Option A: AWS EC2 (Recommended)
```bash
# Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-groups github-runner-sg \
  --user-data file://runner-setup.sh
```

#### Option B: Docker on Existing Infrastructure
```bash
# Run as Docker container
docker run -d \
  --name github-runner \
  -e REPO_URL=https://github.com/your-org/your-repo \
  -e RUNNER_TOKEN=your_token \
  -v /var/run/docker.sock:/var/run/docker.sock \
  myoung34/github-runner:latest
```

### 2. Runner Registration Script

```bash
#!/bin/bash
# setup-github-runner.sh

# Install dependencies
sudo apt update
sudo apt install -y curl jq

# Download GitHub runner
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Create runner user
sudo useradd -m -s /bin/bash github-runner
sudo usermod -aG docker github-runner
sudo -u github-runner ./config.sh --url https://github.com/your-org/your-repo --token YOUR_TOKEN --labels self-hosted,ubuntu-latest

# Install as service
sudo ./svc.sh install github-runner
sudo ./svc.sh start
```

### 3. Workflow Updates

#### Current Workflows Using GitHub Runners:
- `master-pipeline.yml`: 8 jobs (ubuntu-latest)
- Reusable workflows invoked by `master-pipeline.yml` (iOS/Firebase/extension)
- Archived workflows under `.github/workflows/archive/` (legacy reference only)

#### Updated Workflow Labels:
```yaml
jobs:
  test:
    runs-on: [self-hosted, ubuntu-latest]  # Add self-hosted label
    # ... rest of job config
```

### 4. Runner Management

#### Auto-scaling Script
```bash
#!/bin/bash
# scale-runners.sh

# Check queue length
QUEUE_LENGTH=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/your-org/your-repo/actions/runners | \
  jq '.total_count')

# Scale based on queue
if [ "$QUEUE_LENGTH" -gt 5 ]; then
    echo "Scaling up runners..."
    aws ec2 run-instances --count 2 --instance-type t3.medium
elif [ "$QUEUE_LENGTH" -lt 1 ]; then
    echo "Scaling down runners..."
    # Terminate idle instances
fi
```

## 🔒 Security Considerations

### 1. Runner Security
- **Ephemeral Runners**: Destroy and recreate runners after each job
- **Network Isolation**: Use VPC/security groups to limit access
- **Secret Management**: Use GitHub secrets, not local environment variables

### 2. Repository Access
- **Limited Permissions**: Runners can only access the repository they're registered to
- **No Org Access**: Self-hosted runners don't have organization-wide access
- **Token Rotation**: Regularly rotate runner registration tokens

### 3. Compliance
- **Data Residency**: Keep data within your controlled infrastructure
- **Audit Logs**: Enable GitHub audit logs for runner activity
- **Vulnerability Scanning**: Regularly scan runner infrastructure

## 📊 Monitoring & Maintenance

### 1. Health Checks
```bash
# Check runner status
curl -s https://api.github.com/repos/your-org/your-repo/actions/runners | jq '.runners[] | select(.status == "online") | .name'

# Monitor resource usage
docker stats $(docker ps -q --filter "name=github-runner")
```

### 2. Cost Monitoring
```bash
# AWS Cost Explorer query
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=INSTANCE_TYPE
```

### 3. Performance Metrics
- **Job Duration**: Compare self-hosted vs GitHub runners
- **Queue Time**: Measure time jobs spend waiting
- **Success Rate**: Track job success/failure rates
- **Resource Utilization**: Monitor CPU, memory, disk usage

## 🚀 Migration Plan

### Week 1: Setup & Testing
- [ ] Set up 1-2 self-hosted runners
- [ ] Test with development workflows
- [ ] Compare performance metrics
- [ ] Document setup process

### Week 2: Gradual Migration
- [ ] Update development workflows to use self-hosted runners
- [ ] Monitor for issues and performance
- [ ] Optimize runner configuration
- [ ] Set up auto-scaling if needed

### Week 3: Production Migration
- [ ] Migrate production workflows (except iOS which needs macOS)
- [ ] Implement backup GitHub runners for critical jobs
- [ ] Update documentation and team training
- [ ] Monitor costs and performance

### Week 4: Optimization
- [ ] Fine-tune infrastructure sizing
- [ ] Implement cost optimization strategies
- [ ] Set up monitoring and alerting
- [ ] Document maintenance procedures

## 💡 Best Practices

### 1. Runner Configuration
- **Labels**: Use descriptive labels (e.g., `self-hosted`, `ubuntu-latest`, `gpu-enabled`)
- **Groups**: Organize runners into groups for different purposes
- **Ephemeral**: Prefer ephemeral runners for security

### 2. Workflow Optimization
- **Caching**: Use persistent caches on self-hosted runners
- **Parallel Jobs**: Run more jobs in parallel with your own infrastructure
- **Resource Allocation**: Match runner size to job requirements

### 3. Cost Optimization
- **Spot Instances**: Use AWS spot instances for cost savings
- **Auto-scaling**: Scale runners based on demand
- **Right-sizing**: Choose instance types that match workload requirements

## 🆘 Troubleshooting

### Common Issues
1. **Runner Offline**: Check network connectivity and service status
2. **Job Queue**: Monitor queue length and scale runners accordingly
3. **Resource Exhaustion**: Monitor CPU/memory usage and scale up
4. **Security Concerns**: Regularly audit runner access and permissions

### Support Resources
- [GitHub Self-hosted Runners Documentation](https://docs.github.com/en/actions/hosting-your-own-runners)
- [Runner Images](https://github.com/actions/runner-images)
- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)

---

## 🎯 Recommendation

**Yes, self-hosted runners can save significant costs** (potentially 80-90% reduction in compute costs), but they require infrastructure management overhead. For teams with DevOps resources and moderate-high CI/CD usage, this is highly recommended.

**Start small**: Begin with development workflows, prove the concept, then expand to production. The initial setup takes 1-2 days, and you'll see immediate cost benefits.
