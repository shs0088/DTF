# M1 portable deployment

Target Ubuntu 24.04 ARM64/aarch64, including Oracle OCI Ampere A1 without Oracle-specific dependencies. Actual ARM64 runtime support remains unverified. Copy `.env.example` to `.env`, set strong secrets, run `docker compose up -d`, then `./healthcheck.sh`. PostgreSQL has no host port mapping; Nginx is the only public port.
