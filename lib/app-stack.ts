import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sso from 'aws-cdk-lib/aws-sso';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    const queue = new sqs.Queue(this, 'AppQueue', {
      visibilityTimeout: cdk.Duration.seconds(300)
    });

    // List of Accounts in the Organisation
    const accountList = {
      master: '975848467324'
    };

    // List of Applications, write access to resources related to these applications will be granted.
    const appList = [ "poc", "snxt" ]

    // List of common managed policies
    const managedPolicies = ['AWSBillingReadOnlyAccess', 'CloudWatchFullAccess', 'IAMReadOnlyAccess', 'AmazonRoute53ReadOnlyAccess', 'AdministratorAccess-Amplify', 'AWSLambda_ReadOnlyAccess', 'AmazonS3ReadOnlyAccess', 'AmazonDynamoDBReadOnlyAccess', 'AWSAppSyncAdministrator'];

    //IAM
    //Create an IAM User group for CI/CD
    const cicdGroup = new iam.Group(this, 'CICDGroup', {
      groupName: 'CICDGroup',
      managedPolicies: this.toIManagedPolicyList(managedPolicies)
    });

    //Create an IAM User for CI/CD
    const cicdUser = new iam.User(this, 'CICDUser', {
      userName: 'CICDUser',
      groups: [cicdGroup]
    });

    //Create an IAM Identity Center Permission set

    // List of Groups in SSO
    // const groupList = {
    //   Developers: 'e478f438-d011-7082-e065-20c145364809',
    //   // ReadOnly: '9a67298558-8fb7193d-7b2f-4161-a372-xxxxxxxxxxxx',
    // };

    /**
     * Create a policy for each application and attach it to the IAM User group
     * grant access to S3 buckets with the same name as the application
     * grant access to DynamoDB tables with the same name as the application
     * grant access to AppSync APIs with the same name as the application
     * grant access to Lambda functions with the same name as the application
     * grant access to API Gateway APIs with the same name as the application
     * 
     * TODO: Update ARNs to only us-east-1 region.
     */
    appList.forEach((app) => {
      const appPolicy = new iam.Policy(this, `${app}Policy`, {
        policyName: `${app}Policy`,
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              's3:*',
            ],
            resources: [
              `arn:aws:s3:::${app}*`
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'dynamodb:*',
            ],
            resources: [
              `arn:aws:dynamodb:*:*:table/${app}*`,
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'appsync:*'
            ],
            resources: [
              `arn:aws:appsync:*:*:apis/GraphQLAPI*`,
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'lambda:*'
            ],
            resources: [
              `arn:aws:lambda:*:*:function:${app}*`,
            ],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'apigateway:*'
            ],
            resources: [
              `arn:aws:apigateway:*::/restapis/*`,
            ],
          }),
        ],
      });
      
      appPolicy.attachToGroup(cicdGroup);
    });

    const permissionSet = new sso.CfnPermissionSet(this, 'PermissionSet', {
      instanceArn: 'arn:aws:sso:::instance/ssoins-72238797c66ec2b2',
      name: 'DeveloperPermissionSet',
      description: 'Developer Permission Set',
      // relayStateType: 'URL',
      managedPolicies: this.toManagedPolicyArnList(managedPolicies)
    });

    //Create an IAM Identity Center Assignment
    const assignment = new sso.CfnAssignment(this, 'DevAssignment', {
      instanceArn: 'arn:aws:sso:::instance/ssoins-72238797c66ec2b2',
      principalType: 'GROUP',
      principalId: 'e478f438-d011-7082-e065-20c145364809',
      permissionSetArn: permissionSet.attrPermissionSetArn,
      targetId: '975848467324',
      targetType: 'AWS_ACCOUNT',
    });

    //Deploy a Lambda Function

    //Create a Lambda Function Role
    const adminLambdaRole = new iam.Role(this, 'AdminLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        //IAM Full Access
        iam.ManagedPolicy.fromAwsManagedPolicyName('IAMFullAccess')
      ]
    });

    //Create a Python Lambda Function
    const adminLambda = new lambda.Function(this, 'AdminLambda', {
      runtime: lambda.Runtime.PYTHON_3_8,
      code: lambda.Code.fromAsset('lambda/rescleaner'),
      handler: 'main.lambda_handler',
      role: adminLambdaRole,
      functionName: 'ResourceCleaner'
    });

    //Create an S3 Bucket for Terraform State
    const tfBucket = new s3.Bucket(this, 'TerraformBucket', {
      versioned: true,
      bucketName: `terraform-state-bucket`,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    //Create a DynamoDB Table for Terraform State Locking
    const tfLockTable = new dynamodb.Table(this, 'TerraformLockTable', {
      tableName: 'TerraformLockTable',
      partitionKey: { name: 'LockID', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

  }

  toIManagedPolicyList = (managedPolicies: string[]) => {
    return managedPolicies.map((managedPolicy) => {
      return iam.ManagedPolicy.fromAwsManagedPolicyName(managedPolicy);
    });
  }

  toManagedPolicyArnList = (managedPolicies: string[]) => {
    return managedPolicies.map((managedPolicy) => {
      return iam.ManagedPolicy.fromAwsManagedPolicyName(managedPolicy).managedPolicyArn;
    });
  }
}

