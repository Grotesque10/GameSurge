pipeline {
    agent any

    environment {
        // We assume you have a Jenkins credential with ID 'docker-hub-credentials'
        DOCKERHUB_CREDENTIALS = credentials('docker-hub-credentials')
        DOCKERHUB_USERNAME = 'vernon10'
    }

    stages {
        stage('Lint and Code Quality') {
            steps {
                script {
                    echo 'Linting Backend (FastAPI)...'
                    // Check backend for syntax errors & undefined names strictly (fails if syntax is broken)
                    sh 'docker run --rm -v ${WORKSPACE}/backend:/app -w /app python:3.10-slim sh -c "pip install flake8 && flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics"'
                    
                    // Report style warnings but do not fail the build
                    sh 'docker run --rm -v ${WORKSPACE}/backend:/app -w /app python:3.10-slim sh -c "pip install flake8 && flake8 . --count --exit-zero --max-line-length=120 --statistics"'

                    echo 'Linting Frontend (React)...'
                    // Run ESLint via node:20-alpine using host cache. Output warnings but do not fail the build.
                    sh 'docker run --rm -v ${WORKSPACE}/frontend:/app -w /app node:20-alpine sh -c "npm install && npm run lint || true"'
                }
            }
        }

        stage('Build Images') {
            steps {
                script {
                    echo 'Building Backend Image...'
                    // We use sh assuming Jenkins is running in Linux (e.g. docker container)
                    sh "docker build -t ${DOCKERHUB_USERNAME}/gamesurge-backend:latest ./backend"

                    echo 'Building Frontend Image...'
                    // Use production Dockerfile for frontend
                    sh "docker build --build-arg VITE_API_BASE_URL=http://backend:8080 -f ./frontend/Dockerfile -t ${DOCKERHUB_USERNAME}/gamesurge-frontend:latest ./frontend"
                }
            }
        }

        stage('Run E2E Tests') {
            steps {
                script {
                    echo 'Starting application for E2E testing...'
                    sh 'docker compose -f docker-compose.ci.yml -p gamesurge-ci up -d'
                    
                    echo 'Seeding database for E2E tests...'
                    sh 'docker compose -f docker-compose.ci.yml -p gamesurge-ci exec -T backend python seed_missing.py'
                    
                    dir('e2e') {
                        echo 'Building E2E test image...'
                        sh 'docker build -t gamesurge-e2e .'
                        
                        echo 'Running E2E tests inside container...'
                        sh 'docker run --rm --network gamesurge-ci_default -e PLAYWRIGHT_BASE_URL=http://frontend:80 -e CI=true gamesurge-e2e npx playwright test'
                    }
                }
            }
            post {
                always {
                    script {
                        echo 'Tearing down test environment...'
                        sh 'docker compose -f docker-compose.ci.yml -p gamesurge-ci down'
                    }
                }
            }
        }

        stage('Push Images') {
            // Uncomment the when block to only push on the 'main' branch
            // when { branch 'main' }
            steps {
                script {
                    // Log in to Docker Hub
                    sh "echo ${DOCKERHUB_CREDENTIALS_PSW} | docker login -u ${DOCKERHUB_CREDENTIALS_USR} --password-stdin"
                    
                    // Push the newly built images with retry to handle transient Docker Hub 502 errors
                    retry(3) {
                        sh "docker push ${DOCKERHUB_USERNAME}/gamesurge-backend:latest"
                        sh "docker push ${DOCKERHUB_USERNAME}/gamesurge-frontend:latest"
                    }
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline finished!'
        }
        success {
            echo 'Build, Test, and Push successful.'
        }
        failure {
            echo 'Pipeline failed. Please check the logs.'
        }
    }
}
