import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sso from 'aws-cdk-lib/aws-sso';
import * as iam from 'aws-cdk-lib/aws-iam';
export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    const queue = new sqs.Queue(this, 'AppQueue', {
      visibilityTimeout: cdk.Duration.seconds(300)
    });

    //Create an IAM Identity Center Permission set

    // List of Accounts in the Organisation
    const accountList = {
      master: '975848467324'
    };

    // List of Groups in SSO
    const groupList = {
      Developers: 'e478f438-d011-7082-e065-20c145364809',
      // ReadOnly: '9a67298558-8fb7193d-7b2f-4161-a372-xxxxxxxxxxxx',
    };

    // Example Inline Policy
    const examplePolicy = {
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
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess').managedPolicyArn,
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess').managedPolicyArn,
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSAppSyncAdministrator').managedPolicyArn,
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSBillingReadOnlyAccess').managedPolicyArn,
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSLambda_FullAccess').managedPolicyArn,
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchFullAccess').managedPolicyArn
      ],
      inlinePolicy: examplePolicy
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

  }
}
