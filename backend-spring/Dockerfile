# 1단계: 빌드
FROM amazoncorretto:17 AS builder
WORKDIR /app
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./
COPY src src
RUN chmod +x gradlew && ./gradlew clean bootJar -x test

# 2단계: 실행
FROM amazoncorretto:17-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/backend-spring-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]