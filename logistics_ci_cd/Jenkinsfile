pipeline {
    agent any

    stages {

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t logistics-app .'
            }
        }

        stage('Run Tests Inside Container') {
            steps {
                sh 'docker run --rm logistics-app pytest'
            }
        }
    }
}
