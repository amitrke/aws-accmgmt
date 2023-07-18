# Hello World Lambda Function

import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def delete_unused_iam_policies(accountNumber: str):
    iam = boto3.client('iam')
    policies = iam.list_policies()

    #Loop through all policies considering the limit
    while policies['IsTruncated']:
        policies = iam.list_policies(Marker=policies['Marker'])
        #Filter Custom Policies that are not being used.
        unused_policies = [policy for policy in policies['Policies'] if policy['AttachmentCount'] == 0]
        for policy in unused_policies:
            #Check if Policy belongs to this account
            if policy['Arn'].split(':')[4] != accountNumber:
                continue
            logger.info('Deleting Policy: %s', policy['PolicyName'])
            #Delete Policy and all Versions
            versions = iam.list_policy_versions(PolicyArn=policy['Arn'])
            for version in versions['Versions']:
                if not version['IsDefaultVersion']:
                    iam.delete_policy_version(PolicyArn=policy['Arn'], VersionId=version['VersionId'])
            iam.delete_policy(PolicyArn=policy['Arn'])

    # #Filter Custom Policies that are not being used.
    # policies = [policy for policy in policies['Policies'] if policy['AttachmentCount'] == 0]
    # for policy in policies:
    #     #Check if Policy belongs to this account
    #     if policy['Arn'].split(':')[4] != accountNumber:
    #         continue
    #     logger.info('Deleting Policy: %s', policy['PolicyName'])
    #     #Delete Policy and all Versions
    #     versions = iam.list_policy_versions(PolicyArn=policy['Arn'])
    #     for version in versions['Versions']:
    #         if not version['IsDefaultVersion']:
    #             iam.delete_policy_version(PolicyArn=policy['Arn'], VersionId=version['VersionId'])
    #     iam.delete_policy(PolicyArn=policy['Arn'])


def lambda_handler(event, context):
    logger.info('## EVENT')
    logger.info(event)

#context.invoked_function_arn.split(':')[4]
delete_unused_iam_policies("975848467324")