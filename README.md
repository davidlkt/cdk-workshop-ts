# CDK Typescript Workshop

CDK INIT
Create project directory
Create an empty directory on your system:

mkdir cdk-workshop && cd cdk-workshop
cdk init
We will use cdk init to create a new TypeScript CDK project:

cdk init sample-app --language typescript
Output should look like this (you can safely ignore warnings about initialization of a git repository, this probably means you don’t have git installed, which is fine for this workshop):

Applying project template app for typescript
Initializing a new git repository...
Executing npm install...
npm notice created a lockfile as package-lock.json. You should commit this file.
npm WARN tst@0.1.0 No repository field.
npm WARN tst@0.1.0 No license field.

# Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
As you can see, it shows us a bunch of useful commands to get us started.

See Also
AWS CDK Command Line Toolkit (cdk) in the AWS CDK User Guide

-----

NPM RUN WATCH
Compiling your TypeScript code
Since TypeScript sources need to be compiled to JavaScript, every time we make a modification to our source files, we would want them to be compiled to .js.

This is an important step. Make sure you leave the “watch” terminal session open at the end of this step.

Your project is already configured with a nice little npm script called watch.

Open new terminal window
Open a new terminal session (or tab). You will keep this window open in the background for the duration of the workshop.

Start watching for changes
From your project directory run:

cd cdk-workshop
And:

npm run watch
Then, screen will be cleared and you’ll see:

Starting compilation in watch mode...
Found 0 errors. Watching for file changes.
...
This will start the TypeScript compiler (tsc) in “watch” mode, which will monitor your project directory and will automatically compile any changes to your .ts files to .js.

‼️ Keep this terminal window open with watch running for the duration of the workshop.

---------

PROJECT STRUCTURE
Open your IDE
Now’s a good time to open the project in your favorite IDE and explore.

If you use VSCode, you can just type code . within the project directory.

Explore your project directory
You’ll see something like this:



lib/cdk-workshop-stack.ts is where the your CDK application’s main stack is defined. This is the file we’ll be spending most of our time in.
bin/cdk-workshop.ts is the entrypoint of the CDK application. It will load the stack defined in lib/cdk-workshop-stack.ts.
package.json is your npm module manifest. It includes information like the name of your app, version, dependencies and build scripts like “watch” and “build” (package-lock.json is maintained by npm)
cdk.json tells the toolkit how to run your app. In our case it will be "node bin/cdk-workshop.js"
tsconfig.json your project’s typescript configuration
.gitignore and .npmignore tell git and npm which files to include/exclude from source control and when publishing this module to the package manager.
node_modules is maintained by npm and includes all your project’s dependencies.
Your app’s entry point
Let’s have a quick look at bin/cdk-workshop.ts:

import cdk = require('@aws-cdk/core');
import { CdkWorkshopStack } from '../lib/cdk-workshop-stack';

const app = new cdk.App();
new CdkWorkshopStack(app, 'CdkWorkshopStack');
This code loads and instantiate the CdkWorkshopStack class from the lib/cdk-workshop-stack.ts file. We won’t need to look at this file anymore.

The main stack
Open up lib/cdk-workshop-stack.ts. This is where the meat of our application is:

import sns = require('@aws-cdk/aws-sns');
import subs = require('@aws-cdk/aws-sns-subscriptions');
import sqs = require('@aws-cdk/aws-sqs');
import cdk = require('@aws-cdk/core');

export class CdkWorkshopStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const queue = new sqs.Queue(this, 'CdkWorkshopQueue', {
      visibilityTimeout: cdk.Duration.seconds(300)
    });

    const topic = new sns.Topic(this, 'CdkWorkshopTopic');

    topic.addSubscription(new subs.SqsSubscription(queue));
  }
}
As you can see, our app was created with a sample CDK stack (CdkWorkshopStack).

The stack includes:

SQS Queue (new sqs.Queue)
SNS Topic (new sns.Topic)
Subscribes the queue to receive any messages published to the topic (topic.addSubscription)

--------------------

CDK SYNTH
Synthesize a template from your app
AWS CDK apps are effectively only a definition of your infrastructure using code. When CDK apps are executed, they produce (or “synthesize”, in CDK parlance) an AWS CloudFormation template for each stack defined in your application.

To synthesize a CDK app, use the cdk synth command. Let’s check out the template synthesized from the sample app:

cdk synth
Will output the following CloudFormation template:

Resources:
    CdkWorkshopQueue50D9D426:
        Type: 'AWS::SQS::Queue'
        Properties:
            VisibilityTimeout: 300
    CdkWorkshopQueuePolicyAF2494A5:
        Type: 'AWS::SQS::QueuePolicy'
        Properties:
            PolicyDocument:
                Statement:
                    -
                        Action: 'sqs:SendMessage'
                        Condition:
                            ArnEquals:
                                'aws:SourceArn':
                                    Ref: CdkWorkshopTopicD368A42F
                        Effect: Allow
                        Principal:
                            Service: sns.amazonaws.com
                        Resource:
                            'Fn::GetAtt':
                                - CdkWorkshopQueue50D9D426
                                - Arn
                Version: '2012-10-17'
            Queues:
                -
                    Ref: CdkWorkshopQueue50D9D426
    CdkWorkshopTopicD368A42F:
        Type: 'AWS::SNS::Topic'
    CdkWorkshopTopicCdkWorkshopQueueSubscription88D211C7:
        Type: 'AWS::SNS::Subscription'
        Properties:
            Endpoint:
                'Fn::GetAtt':
                    - CdkWorkshopQueue50D9D426
                    - Arn
            Protocol: sqs
            TopicArn:
                Ref: CdkWorkshopTopicD368A42F
    CDKMetadata:
        Type: 'AWS::CDK::Metadata'
        Properties:
            Modules: >-
                aws-cdk=0.39.0,jsii-runtime=node.js/v12.2.0
As you can see, this template includes four resources:

AWS::SQS::Queue - our queue
AWS::SNS::Topic - our topic
AWS::SNS::Subscription - the subscription between the queue and the topic
AWS::SQS::QueuePolicy - the IAM policy which allows this topic to send messages to the queue
The AWS::CDK::Metadata resource is automatically added by the toolkit to every stack. It is used by the AWS CDK team for analytics and to allow us to identify versions with security issues. See Version Reporting in the AWS CDK User Guide for more details. We will omit the metadata resource in diff views for the rest of this workshop

-----------------------

CDK DEPLOY
Okay, we’ve got a CloudFormation template. What’s next? Let’s deploy it into our account!

Bootstrapping an environment
The first time you deploy an AWS CDK app into an environment (account/region), you’ll need to install a “bootstrap stack”. This stack includes resources that are needed for the toolkit’s operation. For example, the stack includes an S3 bucket that is used to store templates and assets during the deployment process.

You can use the cdk bootstrap command to install the bootstrap stack into an environment:

cdk bootstrap
Then:

 ⏳  Bootstrapping environment 999999999999/us-east-1...
...
Hopefully this command finished successfully and we can move on to deploy our app.

Let’s deploy
Use cdk deploy to deploy a CDK app:

cdk deploy
You should see a warning like the following:

This deployment will make potentially sensitive changes according to your current security approval level (--require-approval broadening).
Please confirm you intend to make the following modifications:

IAM Statement Changes
┌───┬─────────────────────────┬────────┬─────────────────┬───────────────────────────┬──────────────────────────────────────────┐
│   │ Resource                │ Effect │ Action          │ Principal                 │ Condition                                │
├───┼─────────────────────────┼────────┼─────────────────┼───────────────────────────┼──────────────────────────────────────────┤
│ + │ ${CdkWorkshopQueue.Arn} │ Allow  │ sqs:SendMessage │ Service:sns.amazonaws.com │ "ArnEquals": {                           │
│   │                         │        │                 │                           │   "aws:SourceArn": "${CdkWorkshopTopic}" │
│   │                         │        │                 │                           │ }                                        │
└───┴─────────────────────────┴────────┴─────────────────┴───────────────────────────┴──────────────────────────────────────────┘
(NOTE: There may be security-related changes not in this list. See http://bit.ly/cdk-2EhF7Np)

Do you wish to deploy these changes (y/n)?
This is warning you that deploying the app entails some risk. Since we need to allow the topic to send messages to the queue, enter y to deploy the stack and create the resources.

Output should look like the following, where ACCOUNT-ID is your account ID, REGION is the region in which you created the app, and STACK-ID is the unique identifier for your stack:

CdkWorkshopStack: deploying...
CdkWorkshopStack: creating CloudFormation changeset...
 0/6 | 1:12:48 PM | CREATE_IN_PROGRESS   | AWS::SQS::Queue        | CdkWorkshopQueue (CdkWorkshopQueue50D9D426)
 0/6 | 1:12:48 PM | CREATE_IN_PROGRESS   | AWS::SNS::Topic        | CdkWorkshopTopic (CdkWorkshopTopicD368A42F)
 0/6 | 1:12:48 PM | CREATE_IN_PROGRESS   | AWS::CDK::Metadata     | CDKMetadata
 0/6 | 1:12:48 PM | CREATE_IN_PROGRESS   | AWS::SQS::Queue        | CdkWorkshopQueue (CdkWorkshopQueue50D9D426) Resource creation Initiated
 0/6 | 1:12:48 PM | CREATE_IN_PROGRESS   | AWS::SNS::Topic        | CdkWorkshopTopic (CdkWorkshopTopicD368A42F) Resource creation Initiated
 1/6 | 1:12:48 PM | CREATE_COMPLETE      | AWS::SQS::Queue        | CdkWorkshopQueue (CdkWorkshopQueue50D9D426)
 1/6 | 1:12:51 PM | CREATE_IN_PROGRESS   | AWS::CDK::Metadata     | CDKMetadata Resource creation Initiated
 2/6 | 1:12:51 PM | CREATE_COMPLETE      | AWS::CDK::Metadata     | CDKMetadata
 3/6 | 1:12:59 PM | CREATE_COMPLETE      | AWS::SNS::Topic        | CdkWorkshopTopic (CdkWorkshopTopicD368A42F)
 3/6 | 1:13:01 PM | CREATE_IN_PROGRESS   | AWS::SQS::QueuePolicy  | CdkWorkshopQueue/Policy (CdkWorkshopQueuePolicyAF2494A5)
 3/6 | 1:13:01 PM | CREATE_IN_PROGRESS   | AWS::SNS::Subscription | CdkWorkshopTopic/CdkWorkshopQueueSubscription (CdkWorkshopTopicCdkWorkshopQueueSubscription88D211C7)
 3/6 | 1:13:02 PM | CREATE_IN_PROGRESS   | AWS::SNS::Subscription | CdkWorkshopTopic/CdkWorkshopQueueSubscription (CdkWorkshopTopicCdkWorkshopQueueSubscription88D211C7) Resource creation Initiated
 3/6 | 1:13:02 PM | CREATE_IN_PROGRESS   | AWS::SQS::QueuePolicy  | CdkWorkshopQueue/Policy (CdkWorkshopQueuePolicyAF2494A5) Resource creation Initiated
 4/6 | 1:13:02 PM | CREATE_COMPLETE      | AWS::SNS::Subscription | CdkWorkshopTopic/CdkWorkshopQueueSubscription (CdkWorkshopTopicCdkWorkshopQueueSubscription88D211C7)
 5/6 | 1:13:03 PM | CREATE_COMPLETE      | AWS::SQS::QueuePolicy  | CdkWorkshopQueue/Policy (CdkWorkshopQueuePolicyAF2494A5)
 6/6 | 1:13:05 PM | CREATE_COMPLETE      | AWS::CloudFormation::Stack | CdkWorkshopStack

 ✅  CdkWorkshopStack

Stack ARN:
arn:aws:cloudformation:REGION:ACCOUNT-ID:stack/CdkWorkshopStack/STACK-ID
The CloudFormation Console
CDK apps are deployed through AWS CloudFormation. Each CDK stack maps 1:1 with CloudFormation stack.

This means that you can use the AWS CloudFormation console in order to manage your stacks.

Let’s take a look at the AWS CloudFormation console.

You will likely see something like this:



If you select CdkWorkshopStack and open the Resources tab, you will see the physical identities of our resources:



I AM READY FOR SOME ACTUAL CODING!

-----------------------

CLEANUP SAMPLE
Delete the sample code from your stack
The project created by cdk init sample-app includes an SQS queue, and an SNS topic. We’re not going to use them in our project, so remove them from your the CdkWorkshopStack constructor.

Open lib/cdk-workshop-stack.ts and clean it up. Eventually it should look like this:

import cdk = require('@aws-cdk/core');

export class CdkWorkshopStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // nothing here!
  }
}
cdk diff
Now, that we modified our stack’s contents, we can ask the toolkit to show us what will happen if we run cdk deploy (the difference between our CDK app and what’s currently deployed):

cdk diff
Output should look like the following:

IAM Statement Changes
┌───┬─────────────────────────────────┬────────┬─────────────────┬───────────────────────────┬──────────────────────────────────────────────────┐
│   │ Resource                        │ Effect │ Action          │ Principal                 │ Condition                                        │
├───┼─────────────────────────────────┼────────┼─────────────────┼───────────────────────────┼──────────────────────────────────────────────────┤
│ - │ ${CdkWorkshopQueue50D9D426.Arn} │ Allow  │ sqs:SendMessage │ Service:sns.amazonaws.com │ "ArnEquals": {                                   │
│   │                                 │        │                 │                           │   "aws:SourceArn": "${CdkWorkshopTopicD368A42F}" │
│   │                                 │        │                 │                           │ }                                                │
└───┴─────────────────────────────────┴────────┴─────────────────┴───────────────────────────┴──────────────────────────────────────────────────┘
(NOTE: There may be security-related changes not in this list. See http://bit.ly/cdk-2EhF7Np)

Resources
[-] AWS::SQS::Queue CdkWorkshopQueue50D9D426 destroy
[-] AWS::SQS::QueuePolicy CdkWorkshopQueuePolicyAF2494A5 destroy
[-] AWS::SNS::Topic CdkWorkshopTopicD368A42F destroy
[-] AWS::SNS::Subscription CdkWorkshopTopicCdkWorkshopQueueSubscription88D211C7 destroy
As expected, all of our resources are going to be brutally destroyed.

cdk deploy
Run cdk deploy and proceed to the next section (no need to wait):

cdk deploy
You should see the resources being deleted.

-----------------------

HELLO LAMBDA
Lambda handler code
We’ll start with the AWS Lambda handler code.

Create a directory lambda in the root of your project tree (next to bin and lib).
Add a file called lambda/hello.js with the following contents:
exports.handler = async function(event) {
  console.log('request:', JSON.stringify(event, undefined, 2));
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/plain' },
    body: `Hello, CDK! You've hit ${event.path}\n`
  };
};
This is a simple Lambda function which returns the text “Hello, CDK! You’ve hit [url path]”. The function’s output also includes the HTTP status code and HTTP headers. These are used by API Gateway to formulate the HTTP response to the user.

Install the AWS Lambda construct library
The AWS CDK is shipped with an extensive library of constructs called the AWS Construct Library. The construct library is divided into modules, one for each AWS service. For example, if you want to define an AWS Lambda function, we will need to use the AWS Lambda construct library.

To discover and learn about AWS constructs, you can browse the AWS Construct Library reference.



Okay, let’s use npm install (or in short npm i) to install the AWS Lambda module and all it’s dependencies into our project:

npm install @aws-cdk/aws-lambda
Output should look like this:

+ @aws-cdk/aws-lambda@0.37.0
updated 1 package and audited 1571 packages in 5.098s
You can safely ignore any warnings from npm about your package.json file.

A few words about copying & pasting in this workshop
In this workshop, we highly recommended to type CDK code instead of copying & pasting (there’s usually not much to type). This way, you’ll be able to fully experience what it’s like to use the CDK. It’s especially cool to see your IDE help you with auto-complete, inline documentation and type safety.



Add an AWS Lambda Function to your stack
Add an import statement at the beginning of lib/cdk-workshop-stack.ts, and a lambda.Function to your stack.

import cdk = require('@aws-cdk/core');
import lambda = require('@aws-cdk/aws-lambda');

export class CdkWorkshopStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // defines an AWS Lambda resource
    const hello = new lambda.Function(this, 'HelloHandler', {
      runtime: lambda.Runtime.NODEJS_8_10,      // execution environment
      code: lambda.Code.asset('lambda'),  // code loaded from the "lambda" directory
      handler: 'hello.handler'                // file is "hello", function is "handler"
    });
  }
}
A few things to notice:

Once you save cdk-workshop-stack.ts, you should see an error message in the npm run watch window that hello is declared but never use. Cool huh?
Our function uses NodeJS 8.10 runtime
The handler code is loaded from the lambda directory which we created earlier. Path is relative to where you execute cdk from, which is the project’s root directory
The name of the handler function is hello.handler (“hello” is the name of the file and “handler” is the exported function name)
A word about constructs and constructors
As you can see, the class constructors of both CdkWorkshopStack and lambda.Function (and many other classes in the CDK) have the signature (scope, id, props). This is because all of these classes are constructs. Constructs are the basic building block of CDK apps. They represent abstract “cloud components” which can be composed together into higher level abstractions via scopes. Scopes can include constructs, which in turn can include other constructs, etc.

Constructs are always created in the scope of another construct and must always have an identifier which must be unique within the scope it’s created. Therefore, construct initializers (constructors) will always have the following signature:

scope: the first argument is always the scope in which this construct is created. In almost all cases, you’ll be defining constructs within the scope of current construct, which means you’ll usually just want to pass this for the first argument. Make a habit out of it.
id: the second argument is the local identity of the construct. It’s an ID that has to be unique amongst construct within the same scope. The CDK uses this identity to calculate the CloudFormation Logical ID for each resource defined within this scope. _To read more about IDs in the CDK, see the CDK user manual._
props: the last (sometimes optional) argument is always a set of initialization properties. Those are specific to each construct. For example, the lambda.Function construct accepts properties like runtime, code and handler. You can explore the various options using your IDE’s auto-complete or in the online documentation.
Diff
Save your code, and let’s take a quick look at the diff before we deploy:

cdk diff
Output would look like this:

The CdkWorkshopStack stack uses assets, which are currently not accounted for in the diff output! See https://github.com/awslabs/aws-cdk/issues/395
IAM Statement Changes
┌───┬─────────────────────────────────┬────────┬────────────────┬──────────────────────────────┬───────────┐
│   │ Resource                        │ Effect │ Action         │ Principal                    │ Condition │
├───┼─────────────────────────────────┼────────┼────────────────┼──────────────────────────────┼───────────┤
│ + │ ${HelloHandler/ServiceRole.Arn} │ Allow  │ sts:AssumeRole │ Service:lambda.amazonaws.com │           │
└───┴─────────────────────────────────┴────────┴────────────────┴──────────────────────────────┴───────────┘
IAM Policy Changes
┌───┬─────────────────────────────┬────────────────────────────────────────────────────────────────────────────────┐
│   │ Resource                    │ Managed Policy ARN                                                             │
├───┼─────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
│ + │ ${HelloHandler/ServiceRole} │ arn:${AWS::Partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole │
└───┴─────────────────────────────┴────────────────────────────────────────────────────────────────────────────────┘
(NOTE: There may be security-related changes not in this list. See http://bit.ly/cdk-2EhF7Np)

Parameters
[+] Parameter HelloHandler/Code/S3Bucket HelloHandlerCodeS3Bucket4359A483: {"Type":"String","Description":"S3 bucket for asset \"CdkWorkshopStack/HelloHandler/Code\""}
[+] Parameter HelloHandler/Code/S3VersionKey HelloHandlerCodeS3VersionKey07D12610: {"Type":"String","Description":"S3 key for asset version \"CdkWorkshopStack/HelloHandler/Code\""}
[+] Parameter HelloHandler/Code/ArtifactHash HelloHandlerCodeArtifactHash5DF4E4B6: {"Type":"String","Description":"Artifact hash for asset \"CdkWorkshopStack/HelloHandler/Code\""}

Resources
[+] AWS::IAM::Role HelloHandler/ServiceRole HelloHandlerServiceRole11EF7C63
[+] AWS::Lambda::Function HelloHandler HelloHandler2E4FBA4D
As you can see, this code synthesizes an AWS::Lambda::Function resource. It also synthesized a couple of CloudFormation parameters that are used by the toolkit to propagate the location of the handler code.

Deploy
Let’s deploy:

cdk deploy
You’ll notice that cdk deploy not only deployed your CloudFormation stack, but also archived and uploaded the lambda directory from your disk to the bootstrap bucket.

Testing our function
Let’s go to the AWS Lambda Console and test our function.

Open the AWS Lambda Console (make sure you are in the correct region).

You should see our function:



Click on the function name to go to the console.

Click on the Test button to open the Configure test event dialog:



Select Amazon API Gateway AWS Proxy from the Event template list.

Enter test under Event name.



Hit Create.

Click Test again and wait for the execution to complete.

Expand Details in the Execution result pane and you should see our expected output:

👏

-------------------------------

API GATEWAY
Next step is to add an API Gateway in front of our function. API Gateway will expose a public HTTP endpoint that anyone on the internet can hit with an HTTP client such as curl or a web browser.

We will use Lambda proxy integration mounted to the root of the API. This means that any request to any URL path will be proxied directly to our Lambda function, and the response from the function will be returned back to the user.

Install the API Gateway construct library
npm install @aws-cdk/aws-apigateway
Windows users: on Windows, you will have to stop the npm run watch command that is running in the background, then run npm install, then start npm run watch again. Otherwise you will get an error about files being in use.

Add a LambdaRestApi construct to your stack
Let’s define an API endpoint and associate it with our Lambda function:

import cdk = require('@aws-cdk/core');
import lambda = require('@aws-cdk/aws-lambda');
import apigw = require('@aws-cdk/aws-apigateway');

export class CdkWorkshopStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // defines an AWS Lambda resource
    const hello = new lambda.Function(this, 'HelloHandler', {
      runtime: lambda.Runtime.NODEJS_8_10,      // execution environment
      code: lambda.Code.asset('lambda'),  // code loaded from the "lambda" directory
      handler: 'hello.handler'                // file is "hello", function is "handler"
    });

    // defines an API Gateway REST API resource backed by our "hello" function.
    new apigw.LambdaRestApi(this, 'Endpoint', {
      handler: hello
    });

  }
}
That’s it. This is all you need to do in order to define an API Gateway which proxies all requests to an AWS Lambda function.

cdk diff
Let’s see what’s going to happen when we deploy this:

cdk diff
Output should look like this:

IAM Statement Changes
┌───┬───────────────────────────┬────────┬───────────────────────────┬───────────────────────────┬─────────────────────────────┐
│   │ Resource                  │ Effect │ Action                    │ Principal                 │ Condition                   │
├───┼───────────────────────────┼────────┼───────────────────────────┼───────────────────────────┼─────────────────────────────┤
│ + │ ${Endpoint/CloudWatchRole │ Allow  │ sts:AssumeRole            │ Service:apigateway.${AWS: │                             │
│   │ .Arn}                     │        │                           │ :URLSuffix}               │                             │
├───┼───────────────────────────┼────────┼───────────────────────────┼───────────────────────────┼─────────────────────────────┤
│ + │ ${HelloHandler.Arn}       │ Allow  │ lambda:InvokeFunction     │ Service:apigateway.amazon │ "ArnLike": {                │
│   │                           │        │                           │ aws.com                   │   "AWS:SourceArn": "arn:${A │
│   │                           │        │                           │                           │ WS::Partition}:execute-api: │
│   │                           │        │                           │                           │ ${AWS::Region}:${AWS::Accou │
│   │                           │        │                           │                           │ ntId}:${EndpointEEF1FD8F}/$ │
│   │                           │        │                           │                           │ {Endpoint/DeploymentStage.p │
│   │                           │        │                           │                           │ rod}/*/"                    │
│   │                           │        │                           │                           │ }                           │
│ + │ ${HelloHandler.Arn}       │ Allow  │ lambda:InvokeFunction     │ Service:apigateway.amazon │ "ArnLike": {                │
│   │                           │        │                           │ aws.com                   │   "AWS:SourceArn": "arn:${A │
│   │                           │        │                           │                           │ WS::Partition}:execute-api: │
│   │                           │        │                           │                           │ ${AWS::Region}:${AWS::Accou │
│   │                           │        │                           │                           │ ntId}:${EndpointEEF1FD8F}/t │
│   │                           │        │                           │                           │ est-invoke-stage/*/"        │
│   │                           │        │                           │                           │ }                           │
│ + │ ${HelloHandler.Arn}       │ Allow  │ lambda:InvokeFunction     │ Service:apigateway.amazon │ "ArnLike": {                │
│   │                           │        │                           │ aws.com                   │   "AWS:SourceArn": "arn:${A │
│   │                           │        │                           │                           │ WS::Partition}:execute-api: │
│   │                           │        │                           │                           │ ${AWS::Region}:${AWS::Accou │
│   │                           │        │                           │                           │ ntId}:${EndpointEEF1FD8F}/$ │
│   │                           │        │                           │                           │ {Endpoint/DeploymentStage.p │
│   │                           │        │                           │                           │ rod}/*/{proxy+}"            │
│   │                           │        │                           │                           │ }                           │
│ + │ ${HelloHandler.Arn}       │ Allow  │ lambda:InvokeFunction     │ Service:apigateway.amazon │ "ArnLike": {                │
│   │                           │        │                           │ aws.com                   │   "AWS:SourceArn": "arn:${A │
│   │                           │        │                           │                           │ WS::Partition}:execute-api: │
│   │                           │        │                           │                           │ ${AWS::Region}:${AWS::Accou │
│   │                           │        │                           │                           │ ntId}:${EndpointEEF1FD8F}/t │
│   │                           │        │                           │                           │ est-invoke-stage/*/{proxy+} │
│   │                           │        │                           │                           │ "                           │
│   │                           │        │                           │                           │ }                           │
└───┴───────────────────────────┴────────┴───────────────────────────┴───────────────────────────┴─────────────────────────────┘
IAM Policy Changes
┌───┬────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────┐
│   │ Resource                   │ Managed Policy ARN                                                                      │
├───┼────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
│ + │ ${Endpoint/CloudWatchRole} │ arn:${AWS::Partition}:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs │
└───┴────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────┘
(NOTE: There may be security-related changes not in this list. See http://bit.ly/cdk-2EhF7Np)

Resources
[+] AWS::Lambda::Permission HelloHandler/ApiPermission.ANY.. HelloHandlerApiPermissionANYAC4E141E
[+] AWS::Lambda::Permission HelloHandler/ApiPermission.Test.ANY.. HelloHandlerApiPermissionTestANYDDD56D72
[+] AWS::Lambda::Permission HelloHandler/ApiPermission.ANY..{proxy+} HelloHandlerApiPermissionANYproxy90E90CD6
[+] AWS::Lambda::Permission HelloHandler/ApiPermission.Test.ANY..{proxy+} HelloHandlerApiPermissionTestANYproxy9803526C
[+] AWS::ApiGateway::RestApi Endpoint EndpointEEF1FD8F
[+] AWS::ApiGateway::Deployment Endpoint/Deployment EndpointDeployment318525DA37c0e38727e25b4317827bf43e918fbf
[+] AWS::ApiGateway::Stage Endpoint/DeploymentStage.prod EndpointDeploymentStageprodB78BEEA0
[+] AWS::IAM::Role Endpoint/CloudWatchRole EndpointCloudWatchRoleC3C64E0F
[+] AWS::ApiGateway::Account Endpoint/Account EndpointAccountB8304247
[+] AWS::ApiGateway::Resource Endpoint/Default/{proxy+} Endpointproxy39E2174E
[+] AWS::ApiGateway::Method Endpoint/Default/{proxy+}/ANY EndpointproxyANYC09721C5
[+] AWS::ApiGateway::Method Endpoint/Default/ANY EndpointANY485C938B

Outputs
[+] Output Endpoint/Endpoint Endpoint8024A810: {"Value":{"Fn::Join":["",["https://",{"Ref":"EndpointEEF1FD8F"},".execute-api.",{"Ref":"AWS::Region"},".",{"Ref":"AWS::URLSuffix"},"/",{"Ref":"EndpointDeploymentStageprodB78BEEA0"},"/"]]}}
That’s nice. This one line of code added 12 new resources to our stack.

cdk deploy
Okay, ready to deploy?

cdk deploy
Stack outputs
When deployment is complete, you’ll notice this line:

CdkWorkshopStack.Endpoint8024A810 = https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/
This is a stack output that’s automatically added by the API Gateway construct and includes the URL of the API Gateway endpoint.

Testing your app
Let’s try to hit this endpoint with curl. Copy the URL and execute (your prefix and region will likely be different).

If you don’t have curl installed, you can always use your favorite web browser to hit this URL.

curl https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/
Output should look like this:

Hello, CDK! You've hit /
You can also use your web browser for this:



If this is the output you received, your app works!

What if it didn’t work?
If you received a 5xx error from API Gateway, it is likely one of two issues:

The response your function returned is not what API Gateway expects. Go back and make sure your handler returns a response that includes a statusCode, body and header fields (see Write handler runtime code).
Your function failed for some reason. To debug this, you can quickly jump to this section to learn how to view your Lambda logs.
Good job! In the next chapter, we’ll write our own reusable construct.

-----------------------------------------------

DEFINE THE HITCOUNTER API
Create a new file for our hit counter construct
Create a new file under lib called hitcounter.ts with the following content:

import cdk = require('@aws-cdk/core');
import lambda = require('@aws-cdk/aws-lambda');

export interface HitCounterProps {
  /** the function for which we want to count url hits **/
  downstream: lambda.IFunction;
}

export class HitCounter extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: HitCounterProps) {
    super(scope, id);

    // TODO
  }
}
Save the file. Oops, an error! No worries, we’ll be using props shortly.

What’s going on here?
We declared a new construct class called HitCounter.
As usual, constructor arguments are scope, id and props, and we propagate them to the cdk.Construct base class.
The props argument is of type HitCounterProps which includes a single property downstream of type lambda.Function. This is where we are going to “plug in” the Lambda function we created in the previous chapter so it can be hit-counted.
Next, are are going to write the handler code of our hit counter.

------------------------------------------

HIT COUNTER HANDLER
Hit counter Lambda handler
Okay, now let’s write the Lambda handler code for our hit counter.

Create the file lambda/hitcounter.js:

const { DynamoDB, Lambda } = require('aws-sdk');

exports.handler = async function(event) {
  console.log("request:", JSON.stringify(event, undefined, 2));

  // create AWS SDK clients
  const dynamo = new DynamoDB();
  const lambda = new Lambda();

  // update dynamo entry for "path" with hits++
  await dynamo.updateItem({
    TableName: process.env.HITS_TABLE_NAME,
    Key: { path: { S: event.path } },
    UpdateExpression: 'ADD hits :incr',
    ExpressionAttributeValues: { ':incr': { N: '1' } }
  }).promise();

  // call downstream function and capture response
  const resp = await lambda.invoke({
    FunctionName: process.env.DOWNSTREAM_FUNCTION_NAME,
    Payload: JSON.stringify(event)
  }).promise();

  console.log('downstream response:', JSON.stringify(resp, undefined, 2));

  // return response back to upstream caller
  return JSON.parse(resp.Payload);
};
Discovering resources at runtime
You’ll notice that this code relies on two environment variables:

HITS_TABLE_NAME is the name of the DynamoDB table to use for storage.
DOWNSTREAM_FUNCTION_NAME is the name of the downstream AWS Lambda function.
Since the actual name of the table and the downstream function will only be decided when we deploy our app, we need to wire up these values from our construct code. We’ll do that in the next section.

-----------------------------------

DEFINE RESOURCES
Add resources to the hit counter construct
Now, let’s define the AWS Lambda function and the DynamoDB table in our HitCounter construct.

As usual, we first need to install the DynamoDB construct library (we already have the Lambda library installed):

npm install @aws-cdk/aws-dynamodb
Windows users: on Windows, you will have to stop the npm run watch command that is running in the background, then run npm install, then start npm run watch again. Otherwise you will get an error about files being in use.

Now, go back to lib/hitcounter.ts and add the following highlighted code:

import cdk = require('@aws-cdk/core');
import lambda = require('@aws-cdk/aws-lambda');
import dynamodb = require('@aws-cdk/aws-dynamodb');

export interface HitCounterProps {
  /** the function for which we want to count url hits **/
  downstream: lambda.Function;
}

export class HitCounter extends cdk.Construct {

  /** allows accessing the counter function */
  public readonly handler: lambda.Function;

  constructor(scope: cdk.Construct, id: string, props: HitCounterProps) {
      super(scope, id);

    const table = new dynamodb.Table(this, 'Hits', {
        partitionKey: { name: 'path', type: dynamodb.AttributeType.STRING }
    });

    this.handler = new lambda.Function(this, 'HitCounterHandler', {
        runtime: lambda.Runtime.NODEJS_8_10,
        handler: 'hitcounter.handler',
        code: lambda.Code.asset('lambda'),
        environment: {
            DOWNSTREAM_FUNCTION_NAME: props.downstream.functionName,
            HITS_TABLE_NAME: table.tableName
        }
    });
  }
}
What did we do here?
This code is hopefully quite easy to understand:

We defined a DynamoDB table with path as the partition key (every DynamoDB table must have a single partition key).
We defined a Lambda function which is bound to the lambda/hitcounter.handler code.
We wired the Lambda’s environment variables to the functionName and tableName of our resources.
Late-bound values
The functionName and tableName properties are values that only resolve when we deploy our stack (notice that we haven’t configured these physical names when we defined the table/function, only logical IDs). This means that if you print their values during synthesis, you will get a “TOKEN”, which is how the CDK represents these late-bound values. You should treat tokens as opaque strings. This means you can concatenate them together for example, but don’t be tempted to parse them in your code.

-------------------------------

USE THE HIT COUNTER
Add a hit counter to our stack
Okay, our hit counter is ready. Let’s use it in our app. Open lib/cdk-workshop-stack.ts and add the following highlighted code:

import cdk = require('@aws-cdk/core');
import lambda = require('@aws-cdk/aws-lambda');
import apigw = require('@aws-cdk/aws-apigateway');
import { HitCounter } from './hitcounter';

export class CdkWorkshopStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const hello = new lambda.Function(this, 'HelloHandler', {
      runtime: lambda.Runtime.NODEJS_8_10,
      code: lambda.Code.asset('lambda'),
      handler: 'hello.handler'
    });

    const helloWithCounter = new HitCounter(this, 'HelloHitCounter', {
      downstream: hello
    });

    // defines an API Gateway REST API resource backed by our "hello" function.
    new apigw.LambdaRestApi(this, 'Endpoint', {
      handler: helloWithCounter.handler
    });
  }
}
Notice that we changed our API Gateway handler to helloWithCounter.handler instead of hello. This basically means that whenever our endpoint is hit, API Gateway will route the request to our hit counter handler, which will log the hit and relay it over to the hello function. Then, the responses will be relayed back in the reverse order all the way to the user.

Deploy
cdk deploy
And the output:

CdkWorkshopStack.Endpoint8024A810 = https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/
Test
Okay, ready to give this a go? (you should, again, see the URL of your API in the output of the “deploy” command).

Use curl or your web browser to hit your endpoint (we use -i to show HTTP response fields and status code):

curl -i https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/
Oh no… seems like something went wrong:

HTTP/1.1 502 Bad Gateway
...

{"message": "Internal server error"}
Let’s see how to find out what happened and fix it.

---------------------

CLOUDWATCH LOGS
Viewing CloudWatch logs for our Lambda function
The first thing to do is to go and look at the logs of our hit counter AWS Lambda function.

There are many tools that help you do that like SAM CLI and awslogs. In this workshop, we’ll show you how to find your logs through the AWS console.

Open the AWS Lambda console (make sure you are connected to the correct region).

Click on the HitCounter Lambda function (the name should contain the string CdkWorkshopStack-HelloHitCounter): 

Click on Monitoring 

Click on View on CloudWatch Logs. This will open the AWS CloudWatch console. 

Select the most-recent log group.

Look for the most-recent message containing the string “errorMessage”. You’ll likely see something like this:

   {
       "errorMessage": "User: arn:aws:sts::585695036304:assumed-role/CdkWorkshopStack-HelloHitCounterHitCounterHandlerS-TU5M09L1UBID/CdkWorkshopStack-HelloHitCounterHitCounterHandlerD-144HVUNEWRWEO is not authorized to perform: dynamodb:UpdateItem on resource: arn:aws:dynamodb:us-east-1:585695036304:table/CdkWorkshopStack-HelloHitCounterHits7AAEBF80-1DZVT3W84LJKB",
       "errorType": "AccessDeniedException",
       "stackTrace": [
           "Request.extractError (/var/runtime/node_modules/aws-sdk/lib/protocol/json.js:48:27)",
           "Request.callListeners (/var/runtime/node_modules/aws-sdk/lib/sequential_executor.js:105:20)",
           "Request.emit (/var/runtime/node_modules/aws-sdk/lib/sequential_executor.js:77:10)",
           "Request.emit (/var/runtime/node_modules/aws-sdk/lib/request.js:683:14)",
           "Request.transition (/var/runtime/node_modules/aws-sdk/lib/request.js:22:10)",
           "AcceptorStateMachine.runTo (/var/runtime/node_modules/aws-sdk/lib/state_machine.js:14:12)",
           "/var/runtime/node_modules/aws-sdk/lib/state_machine.js:26:10",
           "Request.<anonymous> (/var/runtime/node_modules/aws-sdk/lib/request.js:38:9)",
           "Request.<anonymous> (/var/runtime/node_modules/aws-sdk/lib/request.js:685:12)",
           "Request.callListeners (/var/runtime/node_modules/aws-sdk/lib/sequential_executor.js:115:18)"
       ]
   }
It seems like our Lambda function can’t write to our DynamoDB table. This actually makes sense - we didn’t grant it those permissions! Let’s go do that now.

------------------

GRANTING PERMISSIONS
Allow Lambda to read/write our DynamoDB table
Let’s give our Lambda’s execution role permissions to read/write from our table.

Go back to hitcounter.ts and add the following highlighted lines:

import cdk = require('@aws-cdk/core');
import lambda = require('@aws-cdk/aws-lambda');
import dynamodb = require('@aws-cdk/aws-dynamodb');

export interface HitCounterProps {
  /** the function for which we want to count url hits **/
  downstream: lambda.Function;
}

export class HitCounter extends cdk.Construct {

  /** allows accessing the counter function */
  public readonly handler: lambda.Function;

  constructor(scope: cdk.Construct, id: string, props: HitCounterProps) {
    super(scope, id);

    const table = new dynamodb.Table(this, 'Hits', {
        partitionKey: { name: 'path', type: dynamodb.AttributeType.STRING }
    });

    this.handler = new lambda.Function(this, 'HitCounterHandler', {
      runtime: lambda.Runtime.NODEJS_8_10,
      handler: 'hitcounter.handler',
      code: lambda.Code.asset('lambda'),
      environment: {
        DOWNSTREAM_FUNCTION_NAME: props.downstream.functionName,
        HITS_TABLE_NAME: table.tableName
      }
    });

    // grant the lambda role read/write permissions to our table
    table.grantReadWriteData(this.handler);
  }
}
Deploy
Save & deploy:

cdk deploy
Test again
Okay, deployment is complete. Let’s run our test again (either use curl or your web browser):

curl -i https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/
Again?

HTTP/1.1 502 Bad Gateway
...

{"message": "Internal server error"}
😢
Still getting this pesky 5xx error! Let’s look at our CloudWatch logs again (click “Refresh”):

{
    "errorMessage": "User: arn:aws:sts::585695036304:assumed-role/CdkWorkshopStack-HelloHitCounterHitCounterHandlerS-TU5M09L1UBID/CdkWorkshopStack-HelloHitCounterHitCounterHandlerD-144HVUNEWRWEO is not authorized to perform: lambda:InvokeFunction on resource: arn:aws:lambda:us-east-1:585695036304:function:CdkWorkshopStack-HelloHandler2E4FBA4D-149MVAO4969O7",
    "errorType": "AccessDeniedException",
    "stackTrace": [
        "Object.extractError (/var/runtime/node_modules/aws-sdk/lib/protocol/json.js:48:27)",
        "Request.extractError (/var/runtime/node_modules/aws-sdk/lib/protocol/rest_json.js:52:8)",
        "Request.callListeners (/var/runtime/node_modules/aws-sdk/lib/sequential_executor.js:105:20)",
        "Request.emit (/var/runtime/node_modules/aws-sdk/lib/sequential_executor.js:77:10)",
        "Request.emit (/var/runtime/node_modules/aws-sdk/lib/request.js:683:14)",
        "Request.transition (/var/runtime/node_modules/aws-sdk/lib/request.js:22:10)",
        "AcceptorStateMachine.runTo (/var/runtime/node_modules/aws-sdk/lib/state_machine.js:14:12)",
        "/var/runtime/node_modules/aws-sdk/lib/state_machine.js:26:10",
        "Request.<anonymous> (/var/runtime/node_modules/aws-sdk/lib/request.js:38:9)",
        "Request.<anonymous> (/var/runtime/node_modules/aws-sdk/lib/request.js:685:12)"
    ]
}
Another access denied, but this time, if you take a close look:

User: <VERY-LONG-STRING> is not authorized to perform: lambda:InvokeFunction on resource: <VERY-LONG-STRING>"
So it seems like our hit counter actually managed to write to the database. We can confirm by going to the DynamoDB Console:



But, we must also give our hit counter permissions to invoke the downstream lambda function.

Grant invoke permissions
Add the highlighted lines to lib/hitcounter.ts:

import cdk = require('@aws-cdk/core');
import lambda = require('@aws-cdk/aws-lambda');
import dynamodb = require('@aws-cdk/aws-dynamodb');

export interface HitCounterProps {
  /** the function for which we want to count url hits **/
  downstream: lambda.Function;
}

export class HitCounter extends cdk.Construct {

  /** allows accessing the counter function */
  public readonly handler: lambda.Function;

  constructor(scope: cdk.Construct, id: string, props: HitCounterProps) {
    super(scope, id);

    const table = new dynamodb.Table(this, 'Hits', {
        partitionKey: { name: 'path', type: dynamodb.AttributeType.STRING }
    });

    this.handler = new lambda.Function(this, 'HitCounterHandler', {
      runtime: lambda.Runtime.NODEJS_8_10,
      handler: 'hitcounter.handler',
      code: lambda.Code.asset('lambda'),
      environment: {
        DOWNSTREAM_FUNCTION_NAME: props.downstream.functionName,
        HITS_TABLE_NAME: table.tableName
      }
    });

    // grant the lambda role read/write permissions to our table
    table.grantReadWriteData(this.handler);

    // grant the lambda role invoke permissions to the downstream function
    props.downstream.grantInvoke(this.handler);
  }
}
Diff
You can check what this did using cdk diff:

cdk diff
The Resource section should look something like this, which shows the IAM statement was added to the role:

Resources
[~] AWS::IAM::Policy HelloHitCounter/HitCounterHandler/ServiceRole/DefaultPolicy HelloHitCounterHitCounterHandlerServiceRoleDefaultPolicy1487A60A
 └─ [~] PolicyDocument
     └─ [~] .Statement:
         └─ @@ -19,5 +19,15 @@
            [ ]         "Arn"
            [ ]       ]
            [ ]     }
            [+]   },
            [+]   {
            [+]     "Action": "lambda:InvokeFunction",
            [+]     "Effect": "Allow",
            [+]     "Resource": {
            [+]       "Fn::GetAtt": [
            [+]         "HelloHandler2E4FBA4D",
            [+]         "Arn"
            [+]       ]
            [+]     }
            [ ]   }
            [ ] ]
Which is exactly what we wanted.

Deploy
Okay… let’s give this another shot:

cdk deploy
Then hit your endpoint with curl or with your web browser:

curl -i https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/
Output should look like this:

HTTP/1.1 200 OK
...

Hello, CDK! You've hit /
If you still get 5xx, give it a few seconds and try again. Sometimes API Gateway takes a little bit to “flip” the endpoint to use the new deployment.

😲

--------------------

TEST THE HIT COUNTER
Issue a few test requests
Let’s issue a few requests and see if our hit counter works. You can also use your web browser to do that:

curl https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/
curl https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/
curl https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/hello
curl https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/hello/world
curl https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/hello/world
Open DynamoDB console
Go to the DynamoDB console.
Make sure you are in the region where you created the table.
Select Tables in the navigation pane and select the table that starts with CdkWorkdShopStack-HelloHitCounterHits.
Open the table and select “Items”.
You should see how many hits you got for each path.



Try hitting a new path and refresh the Items view. You should see a new item with a hits count of one.

Good job!
The cool thing about our HitCounter is that it’s quite useful. It basically allows anyone to “attach” it to any Lambda function that serves as an API Gateway proxy backend and it will log hits to this API.

Since our hit counter is a simple JavaScript class, you could package it into an npm module and publish it to npmjs.org, which is the JavaScript package manager. Then, anyone could npm install it and add it to their CDK apps.

In the next chapter we consume a construct library published to npm, which enables us to view the contents of our hit counter table from any browser.
