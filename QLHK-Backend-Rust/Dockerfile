FROM rust:slim-bookworm AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/qlhk-backend-rust /app/qlhk_backend
RUN mkdir -p /app/backups
EXPOSE 5002
CMD ["/app/qlhk_backend"]
