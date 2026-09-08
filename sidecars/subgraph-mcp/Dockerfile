FROM node:20-alpine
WORKDIR /app

COPY server.js ./

EXPOSE 7000
ENV PORT=7000

USER node
CMD ["node", "server.js"]
