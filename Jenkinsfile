pipeline {
    agent any

    environment {
        // We assume you have a Jenkins credential with ID 'docker-hub-credentials'
        DOCKERHUB_CREDENTIALS = credentials('docker-hub-credentials')
        DOCKERHUB_USERNAME = 'vernon10'
    }

    stages {
        stage('Build Images') {
            steps {
                script {
                    echo 'Building Backend Image...'
                    // We use sh assuming Jenkins is running in Linux (e.g. docker container)
                    sh "docker build -t ${DOCKERHUB_USERNAME}/gamesurge-backend:latest ./backend"

                    echo 'Building Frontend Image...'
                    // Use production Dockerfile for frontend
                    sh "docker build -f ./frontend/Dockerfile -t ${DOCKERHUB_USERNAME}/gamesurge-frontend:latest ./frontend"
                }
            }
        }

        stage('Run E2E Tests') {
            steps {
                script {
                    echo 'Starting application for E2E testing...'
                    sh 'docker compose up -d'
                    
                    dir('e2e') {
                        echo 'Installing dependencies and running Playwright tests...'
                        sh 'npm ci || npm install'
                        sh 'PLAYWRIGHT_BASE_URL=http://host.docker.internal:5173 npx playwright test'
                    }
                }
            }
            post {
                always {
                    script {
                        echo 'Tearing down test environment...'
                        sh 'docker compose down'
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
                    
                    // Push the newly built images
                    sh "docker push ${DOCKERHUB_USERNAME}/gamesurge-backend:latest"
                    sh "docker push ${DOCKERHUB_USERNAME}/gamesurge-frontend:latest"
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
