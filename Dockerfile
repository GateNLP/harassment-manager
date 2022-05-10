FROM node:16.14.0 as build

WORKDIR /app
ENV NODE_ENV=development

RUN npm install -g typescript @angular/cli@13.1.4

COPY ["package.json", "package-lock.json*", "angular.json", "app.yaml", "firebase.json", "proxy.conf.js", "tsconfig.json", "./"]
RUN npx npm@6 install

COPY ["src/", "./src/"]
RUN ls -l
RUN mkdir -p build/server/ && mkdir -p build/config/ && mv ./src/server/server_config_template.json build/config/server_config.json && npm run build:all:dev

FROM node:10 as deploy

WORKDIR /app
EXPOSE 3000
COPY --from=build /app/dist ./dist
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./
# todo: figure out why i need node_modules. shouldn't this not be the case post build? massively increases size!
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "run", "start:dev-server"]