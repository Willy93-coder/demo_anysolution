build-backend:
	cd backend && \
	docker build -t backend:0.1 . && \
	cd ..

build-frontend:
	cd frontend && \
	docker build -t frontend:0.1 . && \
	cd ..

build-security:
	cd security && \
	docker build -t security:0.1 . && \
	cd ..

run-backend:
	docker run -d --name backend-run backend:0.1

run-frontend:
	docker run -d -p 4321:4321 --name frontend-run frontend:0.1

run-security:
	docker run -d -p 80:80 --name security-run security:0.1