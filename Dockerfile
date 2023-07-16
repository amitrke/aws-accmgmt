FROM alpine:latest

#Install NodeJS, AWS CLI, Python3, Pip3
RUN apk add --update git nodejs npm python3 py3-pip aws-cli
WORKDIR /app

# RUN npm install

CMD tail -f /dev/null