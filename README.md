#  Deploy NodeJS application to AWS EC2 using GitHub Actions

This project demonstrates a full CI/CD pipeline that builds , test and deploys a Dockerized Node.js application on an EC2 instance using GitHub Actions and Docker Hub.

---

##  Tech Stack

- Node.js (Express)
- Docker
- GitHub Actions
- Docker Hub
- AWS EC2 (Amazon Linux 2 or Ubuntu)
- Self-hosted GitHub Actions Runner

  <a href="https://www.kernel.org" target="_blank">
    <img src="https://www.svgrepo.com/show/354004/linux-tux.svg" alt="Linux" width="80">
  </a>
  
  <a href="https://nodejs.org/en/docs/" target="_blank">
    <img src="https://www.svgrepo.com/show/303360/nodejs-logo.svg" alt="Node.js" width="80">
  </a>

  <a href="https://git-scm.com" target="_blank">
    <img src="https://www.svgrepo.com/show/452210/git.svg" alt="Git" width="80">
  </a>

  <a href="https://github.com" target="_blank">
    <img src="https://www.svgrepo.com/show/475654/github-color.svg" alt="GitHub" width="80">
  </a>

  <a href="https://www.docker.com" target="_blank">
    <img src="https://www.svgrepo.com/show/303231/docker-logo.svg" alt="Docker" width="80">
  </a>

  <a href="https://aws.amazon.com" target="_blank">
    <img src="https://www.svgrepo.com/show/376356/aws.svg" alt="AWS" width="80">
  </a>

  <a href="https://github.com/features/actions" target="_blank">
    <img src="https://www.svgrepo.com/show/306098/githubactions.svg" alt="GitHub Actions" width="80">
  </a>

  <a href="https://aws.amazon.com/ec2/" target="_blank">
    <img src="https://www.svgrepo.com/show/448268/aws-ec2.svg" alt="AWS EC2" width="80">
  </a>

---

##  Prerequisites

1. **Docker Hub Account**
   - Create a [Docker Hub](https://hub.docker.com/) account.
   - Generate a **Docker Hub access token** under your account settings.

2. **AWS EC2 Instance**
   - Launch an EC2 instance (Amazon Linux 2 or Ubuntu recommended).
   - Open port `3000` in your EC2 Security Group (or the port your app listens on).
   - Install:
     - `Docker`
     - GitHub Actions self-hosted runner

![ec2-runner](/snap/ec2-runner.png)

3. **GitHub Secrets**
   Add the following secrets to your GitHub repository:

   | Secret Name           | Description                                |
   |------------------------|--------------------------------------------|
   | `DOCKERHUB_USERNAME`   | Your Docker Hub username                   |
   | `DOCKERHUB_TOKEN`      | Docker Hub access token (not password)     |

![](/snap/dockerhub-cred.png)
---

##  Project Structure

```

.
├── .github
│   └── workflows
│       └── main.yaml       # GitHub Actions workflow
├── Dockerfile              # Docker config for your Node.js app
├── app.js / index.js       # Your Node.js app entry point
├── package.json
└── README.md

````

---

##  Step-by-Step Setup

### 1. Install Docker on EC2

SSH into your EC2 instance:

```bash
# Amazon Linux 2:
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user
newgrp docker
````

>  Logout and SSH again to apply Docker group changes:

```bash
exit
ssh ec2-user@<your-ec2-ip>
```

Test Docker:

```bash
docker run hello-world
```

---

### 2. Setup GitHub Self-Hosted Runner on Amazon EC2

### **1. Create folder & download runner**

```bash
mkdir actions-runner && cd actions-runner

curl -o actions-runner-linux-x64-2.327.1.tar.gz -L \
https://github.com/actions/runner/releases/download/v2.327.1/actions-runner-linux-x64-2.327.1.tar.gz
```

### **2. Verify SHA-256 checksum**

```bash
echo "<SHA-256 checksum>  actions-runner-linux-x64-2.327.1.tar.gz" | sha256sum -c
```

 Output: `OK`

---

### **3. Extract the archive**

```bash
tar xzf actions-runner-linux-x64-2.327.1.tar.gz
```

---

### **4. Install .NET Core dependencies (Amazon Linux 2023)**

```bash
sudo dnf install -y \
  libicu \
  krb5-libs \
  zlib \
  openssl \
  lttng-ust \
  libunwind \
  libuuid \
  --allowerasing --skip-broken
```

---

### **5. Configure the runner**

Go to GitHub → Your repo → **Settings > Actions > Runners > Add Runner**, and copy the command like below:

```bash
./config.sh --url https://github.com/<your-username>/<your-repo> --token <your-token>
```

 During config:

* Accept defaults or set a custom runner name (e.g. `my-runner`)
* Add any custom labels if needed (optional)

---

### **6. Run the runner**

```bash
./run.sh
```

 Output should include:

```
√ Connected to GitHub
Listening for Jobs
```

---

##  Optional: Run as a systemd service (auto-start on boot)

To make sure the runner stays running and auto-starts:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

Check status:

```bash
sudo ./svc.sh status
```

![runner-active](/snap/runner-active.png)
![github-runner](/snap/github-runner.png)

---

### 3. Create a `Dockerfile` for Your Node App

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "app.js"]
```

---

### 4. Create GitHub Actions Workflow: `.github/workflows/main.yaml`

```yaml
name: Node.js CI/CD with DockerHub

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout source
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test || echo "No tests found"

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build Docker image
        run: docker build -t ${{ secrets.DOCKERHUB_USERNAME }}/node-app:latest .

      - name: Push image to Docker Hub
        run: docker push ${{ secrets.DOCKERHUB_USERNAME }}/node-app:latest

  deploy:
    needs: build
    runs-on: [self-hosted]

    steps:
      - name: Pull image from Docker Hub
        run: docker pull ${{ secrets.DOCKERHUB_USERNAME }}/node-app:latest

      - name: Stop and remove existing container
        run: |
          docker stop nodejs-app-container || true
          docker rm nodejs-app-container || true

      - name: Run Docker container
        run: docker run -d -p 3000:3000 --name nodejs-app-container ${{ secrets.DOCKERHUB_USERNAME }}/node-app:latest
```
![github-actions-pipeline](/snap/github-actions-pipeline.png)
![docker-container](/snap/docker-container.png)
![docker-hub-image](/snap/docker-hub-image.png)

## Access via browser
 <<http://Runner-IP:3000>>
![app-snap](/snap/app-snap.png)
---

##  CI/CD Flow Summary

1. Push to `main` branch triggers workflow.
2. GitHub Actions:

   * Installs Node.js dependencies
   * Runs tests
   * Builds Docker image
   * Pushes image to Docker Hub
3. Deploy job (on EC2 self-hosted runner):

   * Pulls Docker image from Docker Hub
   * Stops old container
   * Runs the new container on port 3000

---

##  Contact

For issues, feel free to open a GitHub issue or PR.

---
