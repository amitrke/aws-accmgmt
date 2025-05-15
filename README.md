# AWS Account Management

## Problem Statement

I prefer to not use AWS Root user to manage resources and instead create IAM users with appropriate permissions. This project is to automate the creation of IAM users and groups.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## Dependency updates

* `npm install -g npm-check-updates`
* `npm-check-updates -u`
* `npm install`
* `npm audit fix`
* `npm audit fix --force` (if needed)
