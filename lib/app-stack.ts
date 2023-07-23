import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sso from 'aws-cdk-lib/aws-sso';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
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

    // List of common managed policies
    const managedPolicies = [ 'AWSBillingReadOnlyAccess', 'CloudWatchFullAccess', 'IAMReadOnlyAccess', 'AmazonRoute53ReadOnlyAccess', 'AmplifyReadOnlyAccess', 'AWSLambdaReadOnlyAccess', 'AmazonS3ReadOnlyAccess', 'AmazonDynamoDBReadOnlyAccess', 'AWSAppSyncReadOnlyAccess' ];

    //IAM
    //Create an IAM User group for CI/CD
    const cicdGroup = new iam.Group(this, 'CICDGroup', {
      groupName: 'CICDGroup',
      managedPolicies: this.toIManagedPolicyList(managedPolicies)
    });

    //Create an IAM User for CI/CD
    const cicdUser = new iam.User(this, 'CICDUser', {
      userName: 'CICDUser',
      groups: [cicdGroup],
      // managedPolicies: [
      //   //S3 Full Access
      //   iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess')
      // ]
    });

    //Create an IAM Identity Center Permission set

    // List of Groups in SSO
    const groupList = {
      Developers: 'e478f438-d011-7082-e065-20c145364809',
      // ReadOnly: '9a67298558-8fb7193d-7b2f-4161-a372-xxxxxxxxxxxx',
    };

    // Developer Inline Policy
    const devInlinePolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'ManageEc2',
          Effect: 'Allow',
          Action: [
            'ec2:RebootInstances',
            'ec2:StartInstances',
            'ec2:StopInstances',
          ],
          Resource: '*',
        },
        {
          Sid: 'AllowS3Objects',
          Effect: 'Allow',
          Action: [
            's3:PutObject',
            's3:GetObject',
          ],
          Resource: '*',
        },
      ],
    };

    const permissionSet = new sso.CfnPermissionSet(this, 'PermissionSet', {
      instanceArn: 'arn:aws:sso:::instance/ssoins-72238797c66ec2b2',
      name: 'DeveloperPermissionSet',
      description: 'Developer Permission Set',
      // relayStateType: 'URL',
      managedPolicies: this.toManagedPolicyArnList(managedPolicies),
      inlinePolicy: devInlinePolicy
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

