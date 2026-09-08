FROM node:20-alpine
WORKDIR /app

RUN npm install -g @graphprotocol/subgraph-mcp || true

EXPOSE 7000
ENV PORT=7000

CMD ["npx", "-y", "@graphprotocol/subgraph-mcp"]
